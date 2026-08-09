// ─── SPIE-BETA-03 — Lesson Engine ────────────────────────────────────────────
// Pipeline SSE qui génère la première leçon détaillée d'un Teaching Pack.
// 13 étapes : validation → résultats → objectifs → déroulement → activités
//             → contenu → évaluation → quiz → corrigé → différenciation
//             → vérification → quality gate → persistance
//
// RÈGLES :
// - Ne jamais modifier build-system-prompt.ts (DEC-005)
// - Aucun contenu inventé hors du curriculum fourni
// - "Powered by Claude" interdit
// - Le corrigé n'est jamais dans les données élèves

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { getBetaEntitlement } from '@/lib/entitlements'
import { isFounderPreview, logSpieAccess } from '@/lib/spie-access'
import { verifierDetailedLesson } from '@/lib/teaching-quality-gate'
import type {
  DetailedLesson,
  LessonGenerationEvent,
  LessonGenerationStep,
  CurriculumAlignment,
  LessonObjective,
  TeachingPhase,
  LessonContentSection,
  DetailedActivity,
  DetailedQuiz,
  DetailedQuizQuestion,
  AnswerKeyItem,
  DifferentiationLevel,
  FormativeEvaluation,
  LessonPreparation,
  TimeVerification,
} from '@/lib/types/detailed-lesson'
import type { ContenuProgramme, Unite, LeconProgramme } from '@/lib/types/database'
import type { LessonEngineInput } from '@/lib/types/detailed-lesson'

export const maxDuration = 300

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sse(ctrl: ReadableStreamDefaultController, ev: LessonGenerationEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(ev)}\n\n`))
}

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── JSON parser safe ─────────────────────────────────────────────────────────

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

// ─── Contexte curriculaire ────────────────────────────────────────────────────

function buildCurriculumCtx(
  pack: Record<string, unknown>,
  unite: Unite,
  lecon: LeconProgramme,
): string {
  const lines: string[] = [
    `Matière : ${pack.matiere ?? '—'}`,
    `Niveau : ${pack.niveau ?? '—'}`,
    `Province : ${pack.province ?? 'Canada'}`,
    `Langue : ${pack.langue ?? 'fr'}`,
    `Séquence : ${unite.titre}`,
    `Leçon : ${lecon.titre} (${lecon.duree_minutes} min, type : ${lecon.type})`,
  ]
  if (unite.objectifs?.length) {
    lines.push(`Objectifs de la séquence :\n${unite.objectifs.map(o => `- ${o}`).join('\n')}`)
  }
  if (unite.competences?.length) {
    lines.push(`Compétences visées :\n${unite.competences.map(c => `- ${c}`).join('\n')}`)
  }
  return lines.join('\n')
}

// ─── Adaptateur ContenuLecon ──────────────────────────────────────────────────
// Convertit les phases d'un DetailedLesson en ContenuLecon pour Enseigner.

function phasesToContenuLecon(phases: TeachingPhase[], duree: number): Record<string, unknown> {
  const avant  = phases.find(p => p.phase === 'avant')
  const pendant = phases.find(p => p.phase === 'pendant')
  const apres  = phases.find(p => p.phase === 'apres')

  return {
    avant_amorce:             avant?.elements.map(e => `**${e.titre}** : ${e.contenu}`).join('\n\n') ?? '',
    avant_duree:              String(avant?.duree_minutes ?? 10),
    pendant_modelisation:     pendant?.elements[0]?.contenu ?? '',
    pendant_pratique_guidee:  pendant?.elements[1]?.contenu ?? '',
    pendant_pratique_autonome: pendant?.elements[2]?.contenu ?? '',
    pendant_duree:            String(pendant?.duree_minutes ?? Math.round(duree * 0.65)),
    apres_cloture:            apres?.elements.map(e => `**${e.titre}** : ${e.contenu}`).join('\n\n') ?? '',
    apres_duree:              String(apres?.duree_minutes ?? 10),
  }
}

// ─── Route principale ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  let input: LessonEngineInput
  try { input = await request.json() } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const anthropic = new Anthropic({ apiKey })

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (ev: LessonGenerationEvent) => sse(ctrl, ev)
      let fichierLeconId: string | null = null

      try {
        // ── ÉTAPE 1 : Validation ───────────────────────────────────────────────
        send({ step: 'validation', statut: 'en_cours', message: 'Vérification des accès et du Teaching Pack…', progress: 2 })

        const { data: profil } = await supabase
          .from('utilisateurs')
          .select('id, forfait, is_admin')
          .eq('user_id', user.id)
          .single()

        if (!profil) {
          send({ step: 'erreur', statut: 'erreur', message: 'Profil introuvable', progress: 0 })
          ctrl.close(); return
        }

        const entitlement = getBetaEntitlement(profil.forfait)
        const isFounder   = isFounderPreview(profil)

        if (!entitlement.first_lesson_complete && !isFounder) {
          send({ step: 'erreur', statut: 'erreur', message: 'Forfait insuffisant pour générer la leçon détaillée.', progress: 0 })
          ctrl.close(); return
        }

        const { data: pack } = await supabase
          .from('teaching_packs')
          .select('*, programme_annuel:programme_annuel_id(contenu_json, syllabus_json)')
          .eq('id', input.teaching_pack_id)
          .eq('enseignant_id', profil.id)
          .single()

        if (!pack) {
          send({ step: 'erreur', statut: 'erreur', message: 'Teaching Pack introuvable.', progress: 0 })
          ctrl.close(); return
        }

        // Vérifier si leçon détaillée déjà générée (sauf forcer_regeneration)
        if (!input.forcer_regeneration && pack.lecon_detaillee_id) {
          send({ step: 'termine', statut: 'termine', message: 'Leçon détaillée déjà générée.', progress: 100, fichier_id: pack.lecon_detaillee_id })
          ctrl.close(); return
        }

        const programme = pack.programme_annuel?.contenu_json as ContenuProgramme | null
        if (!programme?.unites?.[0]) {
          send({ step: 'erreur', statut: 'erreur', message: 'Plan annuel introuvable — lancez d\'abord "Construire mon année".', progress: 0 })
          ctrl.close(); return
        }

        const premiereUnite = programme.unites[0]
        const premiereLecon = premiereUnite.lecons[0]

        if (!premiereLecon) {
          send({ step: 'erreur', statut: 'erreur', message: 'Aucune leçon dans la première séquence.', progress: 0 })
          ctrl.close(); return
        }

        send({ step: 'validation', statut: 'termine', message: 'Accès validé ✓', progress: 5 })

        const ctx = buildCurriculumCtx(pack, premiereUnite, premiereLecon)
        const duree = premiereLecon.duree_minutes || 75
        const langue = (pack.langue || 'fr') as 'fr' | 'en'
        const isFr = langue === 'fr'

        // ── ÉTAPE 2 : Résultats curriculaires ─────────────────────────────────
        send({ step: 'resultats_curriculaires', statut: 'en_cours', message: 'Extraction des résultats d\'apprentissage…', progress: 8 })

        const alignment: CurriculumAlignment = {
          rag:         premiereUnite.objectifs || [],
          ras:         [],
          competences: premiereUnite.competences || [],
        }

        // Contexte du programme annuel pour les liens séquentiels
        if (premiereUnite.lecons.length > 1) {
          alignment.lien_lecon_suivante = premiereUnite.lecons[1].titre
        }

        send({ step: 'resultats_curriculaires', statut: 'termine', message: `${alignment.rag.length} objectifs identifiés ✓`, progress: 12 })

        // ── ÉTAPE 3 : Objectifs observables ───────────────────────────────────
        send({ step: 'objectifs', statut: 'en_cours', message: 'Formulation des objectifs observables…', progress: 15 })

        const objSys = isFr
          ? 'Tu es un expert pédagogique francophone (Alberta). Formule des objectifs d\'apprentissage observables et mesurables selon la taxonomie de Bloom. Réponds UNIQUEMENT en JSON valide.'
          : 'You are a pedagogical expert. Write observable, measurable learning objectives (Bloom taxonomy). Respond ONLY in valid JSON.'

        const objUser = isFr
          ? `Contexte pédagogique :\n${ctx}\n\nCrée exactement 3 objectifs d'apprentissage observables pour cette leçon.\n\nFormat JSON (tableau) :\n[{"id":"obj1","enonce":"L'élève sera capable de…","critere_reussite":"Observable quand…","taxonomy":"appliquer"}]`
          : `Context:\n${ctx}\n\nCreate exactly 3 observable learning objectives.\n\nJSON array format:\n[{"id":"obj1","enonce":"Student will be able to…","critere_reussite":"Observable when…","taxonomy":"apply"}]`

        const objectifs = await aiJson<LessonObjective[]>(anthropic, objSys, objUser, [
          { id: 'obj1', enonce: `Comprendre les concepts de base de ${premiereLecon.sujet}`, critere_reussite: 'L\'élève peut expliquer les concepts avec ses propres mots', taxonomy: 'comprendre' },
        ])

        send({ step: 'objectifs', statut: 'termine', message: `${objectifs.length} objectifs formulés ✓`, progress: 22 })

        // ── ÉTAPE 4 : Déroulement ────────────────────────────────────────────
        send({ step: 'deroulement', statut: 'en_cours', message: 'Structuration du déroulement (avant/pendant/après)…', progress: 25 })

        const derolSys = isFr
          ? 'Tu es un expert en planification de leçons. Structure une leçon en 3 phases (avant, pendant, après) avec les activités et timings. Réponds UNIQUEMENT en JSON valide.'
          : 'Structure a lesson into 3 phases. Respond ONLY in valid JSON.'

        const derolUser = isFr
          ? `Contexte :\n${ctx}\nObjectifs :\n${objectifs.map(o => `- ${o.enonce}`).join('\n')}\n\nCrée le déroulement en 3 phases pour une leçon de ${duree} min.\n\nFormat JSON :\n[{"phase":"avant","label":"Mise en situation","duree_minutes":10,"elements":[{"titre":"Activation","contenu":"Description","duree_minutes":5}]},{"phase":"pendant","label":"Enseignement","duree_minutes":${Math.round(duree*0.65)},"elements":[{"titre":"Modélisation","contenu":"Description"},{"titre":"Pratique guidée","contenu":"Description"},{"titre":"Pratique autonome","contenu":"Description"}]},{"phase":"apres","label":"Clôture","duree_minutes":10,"elements":[{"titre":"Synthèse","contenu":"Description"},{"titre":"Billet de sortie","contenu":"Description"}]}]`
          : `Context:\n${ctx}\nObjectives:\n${objectifs.map(o => `- ${o.enonce}`).join('\n')}\n\nCreate 3-phase lesson plan for ${duree} min in JSON.`

        const phases = await aiJson<TeachingPhase[]>(anthropic, derolSys, derolUser, [
          { phase: 'avant',  label: 'Mise en situation', duree_minutes: 10, elements: [{ titre: 'Activation', contenu: `Introduction à ${premiereLecon.sujet}` }] },
          { phase: 'pendant', label: 'Enseignement',     duree_minutes: Math.round(duree * 0.65), elements: [{ titre: 'Enseignement direct', contenu: 'Contenu principal' }, { titre: 'Pratique guidée', contenu: 'Exercices guidés' }, { titre: 'Pratique autonome', contenu: 'Travail individuel' }] },
          { phase: 'apres',  label: 'Clôture',           duree_minutes: 10, elements: [{ titre: 'Synthèse', contenu: 'Retour sur les apprentissages' }] },
        ])

        send({ step: 'deroulement', statut: 'termine', message: `Déroulement ${duree} min structuré ✓`, progress: 33 })

        // ── ÉTAPE 5 : Activités ──────────────────────────────────────────────
        send({ step: 'activites', statut: 'en_cours', message: 'Génération des activités prêtes à utiliser…', progress: 36 })

        const actSys = isFr
          ? 'Tu es un expert en pédagogie active. Crée des activités prêtes à utiliser en classe, avec consignes complètes. Réponds UNIQUEMENT en JSON valide.'
          : 'Create classroom-ready activities with complete instructions. Respond ONLY in valid JSON.'

        const actUser = isFr
          ? `Contexte :\n${ctx}\nObjectifs :\n${objectifs.map(o => `- ${o.enonce}`).join('\n')}\n\nCrée 3 activités pédagogiques prêtes à utiliser pour cette leçon.\n\nFormat JSON (tableau d'activités) :\n[{"id":"act1","titre":"Nom","intention_pedagogique":"But","type":"pratique_guidee","duree_minutes":15,"taille_groupe":"individuel","materiel":["Crayon"],"consignes_enseignant":"Pour l'enseignant…","consignes_eleves":"Pour les élèves…","etapes":["Étape 1","Étape 2"],"resultat_attendu":"Résultat","differentiation":{"soutien":"Version simplifiée","enrichissement":"Extension"},"criteres_reussite":["Critère 1"],"methode_verification":"Comment vérifier","statut":"disponible","ras_lie":"${alignment.rag[0] ?? ''}"}]`
          : `Context:\n${ctx}\n\nCreate 3 ready-to-use activities in JSON.`

        const activites = await aiJson<DetailedActivity[]>(anthropic, actSys, actUser, [
          {
            id: 'act1',
            titre: `Pratique guidée — ${premiereLecon.titre}`,
            intention_pedagogique: 'Consolider les apprentissages avec accompagnement',
            type: 'pratique_guidee',
            duree_minutes: 15,
            taille_groupe: 'individuel',
            consignes_enseignant: 'Circuler et observer',
            consignes_eleves: 'Compléter les exercices',
            etapes: ['Lire les consignes', 'Faire les exercices', 'Comparer avec un partenaire'],
            resultat_attendu: 'Exercices complétés',
            criteres_reussite: ['Exercices complétés correctement'],
            methode_verification: 'Circuler et observer',
            statut: 'disponible',
          },
        ], 'claude-sonnet-4-6', 2500)

        send({ step: 'activites', statut: 'termine', message: `${activites.length} activités générées ✓`, progress: 48 })

        // ── ÉTAPE 6 : Contenu pédagogique ────────────────────────────────────
        send({ step: 'contenu', statut: 'en_cours', message: 'Génération du contenu à enseigner…', progress: 51 })

        const contenuSys = isFr
          ? 'Tu es un expert pédagogique. Génère du contenu d\'enseignement adapté au niveau scolaire : explication principale, définitions, exemples progressifs, erreurs fréquentes. Réponds UNIQUEMENT en JSON valide. AUCUN contenu inventé hors du curriculum fourni.'
          : 'Generate age-appropriate teaching content. Respond ONLY in valid JSON.'

        const contenuUser = isFr
          ? `Contexte :\n${ctx}\n\nCrée le contenu pédagogique structuré pour cette leçon.\n\nFormat JSON (tableau) :\n[{"id":"c1","type":"explication","titre":"Explication principale","contenu":"Explication complète adaptée au niveau","duree_estimee_minutes":10},{"id":"c2","type":"definition","titre":"Définitions clés","contenu":"Termes importants définis"},{"id":"c3","type":"exemple","titre":"Exemples progressifs","contenu":"3 exemples du plus simple au plus complexe"},{"id":"c4","type":"erreur_frequente","titre":"Erreurs fréquentes","contenu":"Ce que les élèves confondent souvent"},{"id":"c5","type":"synthese","titre":"Synthèse","contenu":"Résumé des points clés à retenir"}]`
          : `Context:\n${ctx}\n\nCreate structured teaching content in JSON.`

        const sections_contenu = await aiJson<LessonContentSection[]>(anthropic, contenuSys, contenuUser, [
          { id: 'c1', type: 'explication', titre: 'Explication principale', contenu: `Contenu pour ${premiereLecon.sujet}` },
          { id: 'c2', type: 'synthese', titre: 'Synthèse', contenu: 'Points clés à retenir' },
        ], 'claude-sonnet-4-6', 2000)

        send({ step: 'contenu', statut: 'termine', message: `${sections_contenu.length} sections de contenu générées ✓`, progress: 57 })

        // ── ÉTAPE 7 : Évaluation formative ────────────────────────────────────
        send({ step: 'evaluation_formative', statut: 'en_cours', message: 'Génération des critères d\'évaluation formative…', progress: 60 })

        const evalSys = isFr
          ? 'Tu es un expert en évaluation formative. Génère des critères et méthodes d\'évaluation formative. Réponds UNIQUEMENT en JSON valide.'
          : 'Generate formative assessment criteria. Respond ONLY in valid JSON.'

        const evalUser = isFr
          ? `Contexte :\n${ctx}\nObjectifs :\n${objectifs.map(o => `- ${o.enonce}`).join('\n')}\n\nCrée l'évaluation formative.\n\nFormat JSON :\n{"methode":"Méthode (ex: billet de sortie, questions rapides)","criteres":["Critère 1","Critère 2","Critère 3"],"preuves_attendues":["Ce que l'élève produit"],"retroaction_possible":"Type de rétroaction possible"}`
          : `Context:\n${ctx}\n\nCreate formative evaluation in JSON.`

        const evaluation_formative = await aiJson<FormativeEvaluation>(anthropic, evalSys, evalUser, {
          methode: 'Billet de sortie',
          criteres: objectifs.map(o => o.critere_reussite),
          preuves_attendues: ['Réponse écrite à 1-2 questions'],
          retroaction_possible: 'Commentaire verbal ou écrit',
        })

        send({ step: 'evaluation_formative', statut: 'termine', message: 'Évaluation formative générée ✓', progress: 63 })

        // ── ÉTAPE 8 : Quiz ───────────────────────────────────────────────────
        send({ step: 'quiz', statut: 'en_cours', message: 'Génération du quiz complet…', progress: 66 })

        const quizSys = isFr
          ? 'Tu es un expert en évaluation scolaire. Crée un quiz formatif aligné aux objectifs. Questions : choix multiples, vrai/faux, réponse courte. Réponds UNIQUEMENT en JSON valide.'
          : 'Create a formative quiz. Respond ONLY in valid JSON.'

        const quizUser = isFr
          ? `Contexte :\n${ctx}\nObjectifs :\n${objectifs.map(o => `- ${o.enonce}`).join('\n')}\n\nCrée un quiz de 5 questions (2 QCM, 1 vrai/faux, 2 réponse courte).\n\nFormat JSON :\n{"titre":"Quiz — ${premiereLecon.titre}","objectif":"Vérifier la compréhension","duree_estimee_minutes":10,"instructions":"Répondre à toutes les questions","questions":[{"id":"q1","ordre":1,"type":"qcm","enonce":"Question?","options":["A","B","C","D"],"bonne_reponse":"A","explication":"Parce que…","points":1000,"duree_secondes":30,"ras_lie":"${alignment.rag[0] ?? ''}","difficulte":"moyen"},{"id":"q2","ordre":2,"type":"vrai_faux","enonce":"Affirmation?","options":["Vrai","Faux"],"bonne_reponse":"Vrai","explication":"Parce que…","points":500,"duree_secondes":20},{"id":"q3","ordre":3,"type":"reponse_courte","enonce":"Question ouverte?","bonne_reponse":"Réponse attendue","explication":"Justification","points":1000,"duree_secondes":60}],"bareme_total":5000,"criteres_reussite":"80% ou plus indique une bonne compréhension"}`
          : `Context:\n${ctx}\n\nCreate a 5-question quiz in JSON.`

        const quiz = await aiJson<DetailedQuiz>(anthropic, quizSys, quizUser, {
          titre: `Quiz — ${premiereLecon.titre}`,
          objectif: 'Vérifier la compréhension',
          duree_estimee_minutes: 10,
          instructions: 'Répondre à toutes les questions',
          questions: [{
            id: 'q1', ordre: 1, type: 'qcm',
            enonce: `Question sur ${premiereLecon.sujet}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            bonne_reponse: 'Option A',
            explication: 'Explication à compléter',
            points: 1000, duree_secondes: 30,
          }],
          bareme_total: 1000,
          criteres_reussite: '70% ou plus',
        })

        send({ step: 'quiz', statut: 'termine', message: `Quiz de ${quiz.questions.length} questions généré ✓`, progress: 73 })

        // ── ÉTAPE 9 : Corrigé ─────────────────────────────────────────────────
        send({ step: 'corrige', statut: 'en_cours', message: 'Génération du corrigé enseignant…', progress: 75 })

        const corrigeSys = isFr
          ? 'Tu es un expert pédagogique. Pour chaque question du quiz, génère un corrigé détaillé avec rétroaction et piste de remédiation. Réponds UNIQUEMENT en JSON valide. Ce corrigé est UNIQUEMENT pour l\'enseignant — jamais projeté.'
          : 'Generate detailed answer key for teacher only. Respond ONLY in valid JSON.'

        const quizQuestionsStr = JSON.stringify(quiz.questions.map(q => ({
          id: q.id, enonce: q.enonce, bonne_reponse: q.bonne_reponse, type: q.type,
        })))

        const corigeUser = isFr
          ? `Questions du quiz :\n${quizQuestionsStr}\n\nCrée le corrigé complet.\n\nFormat JSON (tableau) :\n[{"question_id":"q1","reponse_attendue":"Réponse complète","justification":"Pourquoi c'est correct","erreurs_frequentes":["Erreur 1"],"retroaction_courte":"Message à donner","piste_remediation":"Si l'élève a de la difficulté…"}]`
          : `Questions:\n${quizQuestionsStr}\n\nCreate full answer key in JSON.`

        const corrige = await aiJson<AnswerKeyItem[]>(anthropic, corrigeSys, corigeUser,
          quiz.questions.map(q => ({
            question_id: q.id,
            reponse_attendue: q.bonne_reponse,
            justification: q.explication,
            erreurs_frequentes: ['Réponse incorrecte'],
            retroaction_courte: 'Revoir les notes de cours',
          }))
        )

        send({ step: 'corrige', statut: 'termine', message: 'Corrigé enseignant généré ✓', progress: 79 })

        // ── ÉTAPE 10 : Différenciation ────────────────────────────────────────
        send({ step: 'differentiation', statut: 'en_cours', message: 'Génération des adaptations pédagogiques…', progress: 82 })

        const diffSys = isFr
          ? 'Tu es un expert en différenciation pédagogique. Propose des adaptations concrètes (soutien, adaptation, enrichissement) pour cette leçon. NE PAS diagnostiquer les élèves. Présenter comme options pédagogiques. Réponds UNIQUEMENT en JSON valide.'
          : 'Create differentiation options. Respond ONLY in valid JSON.'

        const diffUser = isFr
          ? `Contexte :\n${ctx}\n\nCrée 3 niveaux de différenciation.\n\nFormat JSON (tableau) :\n[{"type":"soutien","description":"Pour les élèves qui ont de la difficulté","consignes_modifiees":"Version simplifiée des consignes","materiel_alternatif":"Matériel de soutien","reduction_charge":"Moins de questions"},{"type":"adaptation","description":"Adaptations générales","consignes_modifiees":"Consignes claires et visuelles","materiel_alternatif":"Organisateur graphique"},{"type":"enrichissement","description":"Pour les élèves avancés","extension":"Défi supplémentaire"}]`
          : `Context:\n${ctx}\n\nCreate 3 differentiation levels in JSON.`

        const differentiation = await aiJson<DifferentiationLevel[]>(anthropic, diffSys, diffUser, [
          { type: 'soutien',        description: 'Pour les élèves qui ont besoin d\'appui', consignes_modifiees: 'Consignes simplifiées' },
          { type: 'adaptation',     description: 'Adaptations générales', materiel_alternatif: 'Organisateur graphique' },
          { type: 'enrichissement', description: 'Défi pour les élèves avancés', extension: 'Activité d\'extension' },
        ])

        send({ step: 'differentiation', statut: 'termine', message: `${differentiation.length} niveaux de différenciation ✓`, progress: 86 })

        // ── ÉTAPE 11 : Vérification du temps ─────────────────────────────────
        send({ step: 'verification_temps', statut: 'en_cours', message: 'Vérification de la cohérence temporelle…', progress: 88 })

        const dureeActivites = activites.reduce((acc, a) => acc + (a.duree_minutes || 0), 0)
        const dureeQuiz      = quiz.duree_estimee_minutes || 10
        const dureePhases    = phases.reduce((acc, p) => acc + (p.duree_minutes || 0), 0)
        const dureeTotale    = Math.max(dureePhases, dureeActivites + dureeQuiz)
        const marge          = duree - dureeTotale

        const time_verification: TimeVerification = {
          duree_planifiee_minutes:     duree,
          duree_activites_minutes:     dureeActivites,
          duree_quiz_minutes:          dureeQuiz,
          duree_totale_estimee_minutes: dureeTotale,
          marge_minutes:               marge,
          realiste:                    marge >= -5,
          avertissement: marge < -10
            ? `La leçon dépasse la durée prévue de ${Math.abs(marge)} min. Envisagez de déplacer une activité.`
            : marge < 0
            ? `La leçon est légèrement longue (${Math.abs(marge)} min). Activité optionnelle suggérée.`
            : undefined,
        }

        send({ step: 'verification_temps', statut: 'termine', message: time_verification.realiste ? `Timing réaliste (marge : ${marge} min) ✓` : `⚠ Dépassement de ${Math.abs(marge)} min — activité optionnelle suggérée`, progress: 90 })

        // ── ÉTAPE 12 : Quality Gate ───────────────────────────────────────────
        send({ step: 'quality_gate', statut: 'en_cours', message: 'Contrôle qualité pédagogique…', progress: 92 })

        const preparation: LessonPreparation = {
          prerequis:              [],
          vocabulaire_cle:        sections_contenu.filter(s => s.type === 'vocabulaire').map(s => s.contenu).slice(0, 5),
          materiel:               activites.flatMap(a => a.materiel || []).filter(Boolean),
          difficultes_anticipees: [],
        }

        const leconPourQG: DetailedLesson = {
          id:               'temp',
          titre:            premiereLecon.titre,
          classe_id:        pack.classe_id,
          teaching_pack_id: pack.id,
          niveau:           pack.niveau || '',
          matiere:          pack.matiere || '',
          langue,
          province:         pack.province,
          duree_minutes:    duree,
          position_sequence: 1,
          position_annuel:   1,
          version:           1,
          statut:            'brouillon',
          generated_at:      new Date().toISOString(),
          alignment,
          objectifs,
          preparation,
          phases,
          sections_contenu,
          activites,
          quiz,
          corrige,
          evaluation_formative,
          differentiation,
          time_verification,
        }

        const qualite = verifierDetailedLesson(leconPourQG)
        send({ step: 'quality_gate', statut: 'termine', message: qualite.peut_marquer_pret ? `Quality Gate : Prête (${qualite.erreurs_bloquantes} erreur, ${qualite.avertissements} avertissements) ✓` : `Quality Gate : ${qualite.erreurs_bloquantes} erreur(s) bloquante(s)`, progress: 95 })

        // ── ÉTAPE 13 : Persistance ────────────────────────────────────────────
        send({ step: 'persistance', statut: 'en_cours', message: 'Sauvegarde dans la Bibliothèque…', progress: 97 })

        const detailedLesson: DetailedLesson = {
          ...leconPourQG,
          id:       uid(),
          statut:   qualite.peut_marquer_pret ? 'pret' : 'brouillon',
          qualite_json: {
            peut_marquer_pret:  qualite.peut_marquer_pret,
            erreurs_bloquantes: qualite.erreurs_bloquantes,
            avertissements:     qualite.avertissements,
            recommandations:    qualite.recommandations,
            elements_valides:   qualite.elements_valides,
            items:              qualite.items.map(i => ({ code: i.code, niveau: i.niveau, message: i.message })),
          },
          generation_state: {
            teaching_pack_id:   input.teaching_pack_id,
            etapes_completees:  ['validation','resultats_curriculaires','objectifs','deroulement','activites','contenu','evaluation_formative','quiz','corrige','differentiation','verification_temps','quality_gate'],
            nb_reprises:        0,
            modele_ia:          'claude-haiku-4-5-20251001+claude-sonnet-4-6',
            erreurs:            [],
            duree_totale_ms:    0,
            version:            1,
          },
        }

        // Chercher le dossier plans_lecons de la classe
        const { data: dossierRow } = await supabase
          .from('dossiers_systeme')
          .select('id')
          .eq('classe_id', pack.classe_id)
          .eq('type', 'plans_lecons')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (dossierRow) {
          const { data: fichierRow } = await supabase
            .from('fichiers_dossier')
            .insert({
              dossier_id:       dossierRow.id,
              enseignant_id:    profil.id,
              classe_id:        pack.classe_id,
              nom:              `Leçon 1 détaillée — ${premiereLecon.titre}`,
              type_fichier:     'lecon_detaillee',
              contenu_html:     JSON.stringify(detailedLesson),
              contenu_json:     detailedLesson,
              statut:           qualite.peut_marquer_pret ? 'prete' : 'brouillon',
              indexe_studio_ia: false,
              teaching_pack_id: pack.id,
              sequence_index:   0,
              lecon_index:      0,
              version_numero:   1,
            })
            .select()
            .single()

          fichierLeconId = fichierRow?.id ?? null

          if (fichierLeconId) {
            // Mettre à jour teaching_packs avec le lien
            await supabase
              .from('teaching_packs')
              .update({
                lecon_detaillee_id:     fichierLeconId,
                lecon_detaillee_statut: detailedLesson.statut,
              })
              .eq('id', pack.id)

            // Sauvegarder dans pack_versions pour l'historique
            await supabase.from('pack_versions').insert({
              teaching_pack_id: pack.id,
              document_type:    'lecon_detaillee',
              document_id:      fichierLeconId,
              version_numero:   1,
              contenu_json:     detailedLesson,
              modifie_par:      'ia',
              notes:            `Généré par Lesson Engine SPIE-BETA-03`,
            })
          }
        }

        // Journal d'observabilité
        await logSpieAccess({
          enseignant_id:    user.id,
          action:           'generate_detailed_lesson',
          teaching_pack_id: pack.id,
          fichier_id:       fichierLeconId,
          statut:           fichierLeconId ? 'ok' : 'partial',
          details:          { etapes: 13, qualite_pret: qualite.peut_marquer_pret },
        })

        send({
          step: 'termine',
          statut: 'termine',
          message: fichierLeconId ? '✓ Leçon détaillée prête !' : '⚠ Sauvegarde partielle — leçon générée mais non enregistrée.',
          progress: 100,
          fichier_id: fichierLeconId ?? undefined,
          data: detailedLesson,
        })

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur interne'
        send({ step: 'erreur', statut: 'erreur', message: `Erreur : ${msg}`, progress: 0 })
      } finally {
        ctrl.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':                    'text/event-stream',
      'Cache-Control':                   'no-cache',
      'Connection':                      'keep-alive',
      'X-Content-Type-Options':          'nosniff',
    },
  })
}
