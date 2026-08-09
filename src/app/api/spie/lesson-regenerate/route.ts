// ─── SPIE-BETA-03 M16 — Régénération ciblée d'une section ───────────────────
// POST { fichier_id, target, instructions_supplementaires? }
// Régénère une section spécifique de la DetailedLesson.
// Archive la version précédente dans pack_versions.
//
// RÈGLES :
// - Ne jamais modifier build-system-prompt.ts (DEC-005)
// - "Powered by Claude" interdit
// - Le corrigé régénéré n'est jamais envoyé aux élèves

import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { requireEntitlement }    from '@/lib/spie-access'
import type {
  DetailedLesson,
  LessonRegenerateTarget,
  LessonObjective,
  TeachingPhase,
  DetailedActivity,
  LessonContentSection,
  DetailedQuizQuestion,
  AnswerKeyItem,
  DifferentiationLevel,
  FormativeEvaluation,
} from '@/lib/types/detailed-lesson'
import type { LessonRegenerateInput } from '@/lib/types/detailed-lesson'

export const maxDuration = 120

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeJson<T>(text: string, fallback: T): T {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(cleaned) as T } catch { return fallback }
}

async function aiJson<T>(
  anthropic: Anthropic,
  system: string,
  user: string,
  fallback: T,
  model: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6' = 'claude-haiku-4-5-20251001',
  maxTokens = 1500,
): Promise<T> {
  try {
    const msg = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return safeJson<T>(text, fallback)
  } catch {
    return fallback
  }
}

function lessonCtx(lecon: DetailedLesson): string {
  return [
    `Matière : ${lecon.matiere}`,
    `Niveau : ${lecon.niveau}`,
    `Titre : ${lecon.titre}`,
    `Durée : ${lecon.duree_minutes} min`,
    `Province : ${lecon.province ?? 'Canada'}`,
    `Objectifs : ${lecon.objectifs?.map(o => `- ${o.enonce}`).join('\n') ?? '—'}`,
  ].join('\n')
}

// ─── Régénérateurs par cible ─────────────────────────────────────────────────

async function regenObjectifs(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert pédagogique. Formule des objectifs d\'apprentissage observables. Réponds UNIQUEMENT en JSON valide.'
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions supplémentaires : ${extra}\n` : ''}
Régénère exactement 3 objectifs d'apprentissage observables.
Format JSON : [{"id":"obj1","enonce":"L'élève sera capable de…","critere_reussite":"Observable quand…","taxonomy":"appliquer"}]`

  const objectifs = await aiJson<LessonObjective[]>(anthropic, system, user, lecon.objectifs ?? [])
  return { objectifs }
}

async function regenPhases(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert en planification. Structure une leçon en 3 phases. Réponds UNIQUEMENT en JSON valide.'
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère le déroulement en 3 phases pour ${lecon.duree_minutes} min.
Format JSON : [{"phase":"avant","label":"Mise en situation","duree_minutes":10,"elements":[{"titre":"Activation","contenu":"..."}]},{"phase":"pendant","label":"Enseignement","duree_minutes":${Math.round(lecon.duree_minutes * 0.65)},"elements":[{"titre":"Modélisation","contenu":"..."},{"titre":"Pratique guidée","contenu":"..."},{"titre":"Pratique autonome","contenu":"..."}]},{"phase":"apres","label":"Clôture","duree_minutes":10,"elements":[{"titre":"Synthèse","contenu":"..."}]}]`

  const phases = await aiJson<TeachingPhase[]>(anthropic, system, user, lecon.phases ?? [])
  return { phases }
}

async function regenActivites(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert en pédagogie active. Crée des activités prêtes à utiliser. Réponds UNIQUEMENT en JSON valide.'
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère 3 activités pédagogiques.
Format JSON : [{"id":"act1","titre":"Nom","intention_pedagogique":"But","type":"pratique_guidee","duree_minutes":15,"taille_groupe":"individuel","consignes_enseignant":"…","consignes_eleves":"…","etapes":["Étape 1"],"resultat_attendu":"Résultat","criteres_reussite":["Critère"],"methode_verification":"Comment","statut":"disponible","differentiation":{"soutien":"…","enrichissement":"…"}}]`

  const activites = await aiJson<DetailedActivity[]>(anthropic, system, user, lecon.activites ?? [], 'claude-sonnet-4-6', 2500)
  return { activites }
}

async function regenContenu(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert pédagogique. Génère du contenu d\'enseignement structuré. Réponds UNIQUEMENT en JSON valide. AUCUN contenu inventé hors du curriculum.'
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère les sections de contenu pédagogique.
Format JSON : [{"id":"c1","type":"explication","titre":"Explication principale","contenu":"…","duree_estimee_minutes":10},{"id":"c2","type":"definition","titre":"Définitions","contenu":"…"},{"id":"c3","type":"exemple","titre":"Exemples","contenu":"…"},{"id":"c4","type":"erreur_frequente","titre":"Erreurs fréquentes","contenu":"…"}]`

  const sections_contenu = await aiJson<LessonContentSection[]>(anthropic, system, user, lecon.sections_contenu ?? [], 'claude-sonnet-4-6', 2000)
  return { sections_contenu }
}

async function regenQuiz(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert en évaluation formative. Crée des questions de quiz variées. Réponds UNIQUEMENT en JSON valide.'
  const nb = lecon.quiz?.questions?.length ?? 5
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère exactement ${nb} questions de quiz.
Format JSON : {"titre":"${lecon.quiz?.titre ?? 'Quiz'}","duree_estimee_minutes":${lecon.quiz?.duree_estimee_minutes ?? 10},"instructions":"${lecon.quiz?.instructions ?? ''}","questions":[{"id":"q1","ordre":1,"type":"qcm","enonce":"Question ?","options":["A","B","C","D"],"bonne_reponse":"A","explication":"Parce que…","points":1000,"duree_secondes":20}]}`

  const quiz = await aiJson<DetailedLesson['quiz']>(anthropic, system, user, lecon.quiz)
  return { quiz }
}

async function regenCorrige(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const questions = lecon.quiz?.questions ?? []
  if (!questions.length) return {}

  const system = 'Tu es un expert pédagogique. Crée un corrigé détaillé avec justifications et rétroaction. Réponds UNIQUEMENT en JSON valide.'
  const user = `Questions du quiz :\n${JSON.stringify(questions.map(q => ({ id: q.id, enonce: q.enonce, bonne_reponse: q.bonne_reponse })))}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère le corrigé.
Format JSON : [{"question_id":"q1","reponse_attendue":"Réponse complète","justification":"Pourquoi ?","erreurs_frequentes":["Erreur type 1"],"retroaction_courte":"Bravo si…","piste_remediation":"Revoir…"}]`

  const corrige = await aiJson<AnswerKeyItem[]>(anthropic, system, user, lecon.corrige ?? [])
  return { corrige }
}

async function regenDifferentiation(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert en différenciation pédagogique. Propose des adaptations inclusives. Réponds UNIQUEMENT en JSON valide.'
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère les adaptations de différenciation.
Format JSON : [{"type":"soutien","description":"Pour les élèves qui ont besoin de soutien…","consignes_modifiees":"Version simplifiée…"},{"type":"enrichissement","description":"Pour les élèves avancés…","extension":"Défi supplémentaire…"},{"type":"adaptation","description":"Adaptations universelles…"}]`

  const differentiation = await aiJson<DifferentiationLevel[]>(anthropic, system, user, lecon.differentiation ?? [])
  return { differentiation }
}

async function regenEvalFormative(anthropic: Anthropic, lecon: DetailedLesson, extra?: string): Promise<Partial<DetailedLesson>> {
  const ctx = lessonCtx(lecon)
  const system = 'Tu es un expert en évaluation formative. Décris une méthode d\'évaluation continue. Réponds UNIQUEMENT en JSON valide.'
  const user = `Contexte :\n${ctx}\n${extra ? `\nInstructions : ${extra}\n` : ''}
Régénère l'évaluation formative.
Format JSON : {"methode":"Nom de la méthode","criteres":["Critère 1","Critère 2"],"retroaction_possible":"Comment donner la rétroaction","indicateurs_succes":["Indicateur 1"]}`

  const evaluation_formative = await aiJson<FormativeEvaluation>(anthropic, system, user, lecon.evaluation_formative as FormativeEvaluation)
  return { evaluation_formative }
}

// ─── Map des régénérateurs ────────────────────────────────────────────────────

const REGENS: Record<LessonRegenerateTarget, (a: Anthropic, l: DetailedLesson, extra?: string) => Promise<Partial<DetailedLesson>>> = {
  objectifs:            regenObjectifs,
  phases:               regenPhases,
  activites:            regenActivites,
  contenu:              regenContenu,
  quiz:                 regenQuiz,
  corrige:              regenCorrige,
  differentiation:      regenDifferentiation,
  evaluation_formative: regenEvalFormative,
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let input: LessonRegenerateInput
  try { input = await req.json() } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!input.fichier_id || !input.target) {
    return NextResponse.json({ error: 'fichier_id et target requis' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const anthropic  = new Anthropic({ apiKey })

  const { data: profil } = await supabase
    .from('utilisateurs').select('id, forfait, is_admin')
    .eq('user_id', user.id).single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const denied = requireEntitlement('regenerate_lesson_section', profil.forfait, profil.is_admin)
  if (denied) return denied

  // Charger la leçon existante
  const { data: fichier } = await supabase
    .from('fichiers_dossier')
    .select('id, contenu_json, teaching_pack_id, enseignant_id')
    .eq('id', input.fichier_id)
    .eq('enseignant_id', profil.id)
    .single()

  if (!fichier?.contenu_json) {
    return NextResponse.json({ error: 'Leçon introuvable' }, { status: 404 })
  }

  const lecon = fichier.contenu_json as DetailedLesson
  const regenFn = REGENS[input.target]
  if (!regenFn) return NextResponse.json({ error: `Cible inconnue : ${input.target}` }, { status: 400 })

  // ── Archiver la version précédente ────────────────────────────────────────
  if (fichier.teaching_pack_id) {
    try {
      await supabase.from('pack_versions').insert({
        teaching_pack_id: fichier.teaching_pack_id,
        document_type:    'plan_lecon',
        document_id:      fichier.id,
        version_numero:   lecon.version ?? 1,
        label:            `avant_regen_section:${input.target}`,
        contenu_json:     lecon,
        modifie_par:      'ia',
        enseignant_id:    profil.id,
      })
    } catch { /* Non bloquant — table optionnelle */ }
  }

  // ── Régénérer la section ─────────────────────────────────────────────────
  const patch = await regenFn(anthropic, lecon, input.instructions_supplementaires)

  const leconMaj: DetailedLesson = {
    ...lecon,
    ...patch,
    version: (lecon.version ?? 1) + 1,
  }

  // ── Sauvegarder ──────────────────────────────────────────────────────────
  const { error: saveErr } = await supabase
    .from('fichiers_dossier').update({
      contenu_json: leconMaj,
      contenu_html: JSON.stringify(leconMaj),
      updated_at:   new Date().toISOString(),
    }).eq('id', fichier.id)

  if (saveErr) {
    console.error('[lesson-regenerate] save error:', saveErr)
    return NextResponse.json({ error: 'Erreur de sauvegarde' }, { status: 500 })
  }

  return NextResponse.json({ patch, version: leconMaj.version })
}
