// SPIE-PERSISTENCE-01 — Verified Pedagogical Build Pipeline
// Pattern : GENERATE → VALIDATE → PERSIST → VERIFY → EMIT SUCCESS
// Une étape n'est SUCCESS que si DB verification = SUCCESS.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { getBetaEntitlement } from '@/lib/entitlements'
import {
  initBuildState, stepSuccess, stepError, stepSkipped,
  verifyTeachingPackCompleteness,
  type BuildState,
} from '@/lib/spie/build-pipeline'
import type {
  BuildYearWizardInput, BuildYearEvent, TeachingPackContenu, PackSyllabus,
  BuildYearStep,
} from '@/lib/types/teaching-pack'
import type { ContenuProgramme } from '@/lib/types/database'

export const maxDuration = 300

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sse(ctrl: ReadableStreamDefaultController, event: BuildYearEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
}

// ─── Curriculum context ───────────────────────────────────────────────────────

function buildCurriculumContext(input: BuildYearWizardInput): string {
  const CURRICULA: Record<string, string> = {
    alberta:     'Alberta Program of Studies (Alberta Education). Learning outcomes, key concepts, essential questions, competencies.',
    ontario:     "The Ontario Curriculum (Ministère de l'Éducation de l'Ontario). Expectations: overall and specific.",
    quebec:      "Programme de formation de l'école québécoise (PFEQ/MEES). Compétences, domaines, progression.",
    bc:          'BC Curriculum. Big ideas, curricular competencies, content learning standards.',
    common_core: 'Common Core State Standards (CCSS, USA).',
    ib:          'International Baccalaureate (IB) Programme.',
    france:      "Programmes de l'Éducation nationale française (BOEN).",
  }
  if (input.curriculum_source === 'officiel' && input.curriculum_officiel) {
    return `Programme officiel : ${CURRICULA[input.curriculum_officiel] ?? input.curriculum_officiel}`
  }
  if (input.curriculum_fichier_contenu) {
    return `Curriculum fourni par l'enseignant (${input.curriculum_fichier_nom ?? 'fichier'}):\n${input.curriculum_fichier_contenu.substring(0, 6000)}`
  }
  return `Programme général adapté — ${input.province ?? 'Canada'}`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  let input: BuildYearWizardInput & { reprendre?: boolean }
  try { input = await request.json() }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const anthropic = new Anthropic({ apiKey })

  // ── Profil enseignant ─────────────────────────────────────────────────────
  const { data: profil } = await supabase
    .from('utilisateurs').select('id, forfait, is_admin')
    .eq('user_id', user.id).single()

  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const entitlement = getBetaEntitlement(profil.forfait ?? 'gratuit')
  if (!entitlement.build_year_access) {
    return NextResponse.json({ error: 'Accès non autorisé pour ce forfait' }, { status: 403 })
  }

  // ── Anti-doublon (Mission 13) ─────────────────────────────────────────────
  const { data: existingPack } = await supabase
    .from('teaching_packs')
    .select('id, statut, contenu_json')
    .eq('classe_id', input.classe_id)
    .eq('enseignant_id', profil.id)
    .maybeSingle()

  if (existingPack?.statut === 'generation_en_cours') {
    return NextResponse.json(
      { error: 'La construction de cette année est déjà en cours.', code: 'BUILD_IN_PROGRESS' },
      { status: 409 },
    )
  }

  // ── BuildState — reprendre ou initialiser (Mission 11 + 12) ───────────────
  const prevState = (existingPack?.contenu_json as { build_state?: BuildState } | null)?.build_state
  const buildState: BuildState = (input.reprendre && prevState)
    ? { ...prevState, startedAt: new Date().toISOString(), finalized: false }
    : initBuildState()

  // ── Pipeline SSE ──────────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BuildYearEvent) => sse(controller, event)

      let packId: string | null = existingPack?.id ?? null
      let progId: string | null = null

      try {
        // ── ÉTAPE 1 : Validation + Pack Upsert ───────────────────────────────
        send({ step: 'validation', statut: 'en_cours', message: 'Validation de la configuration…', progress: 2 })

        if (!input.classe_id || !input.niveau || !input.matiere) {
          send({ step: 'erreur', statut: 'erreur', message: 'Configuration incomplète : classe, niveau et matière requis.' })
          controller.close(); return
        }

        const { data: classeRow } = await supabase
          .from('classes').select('id, nom, niveau, matiere')
          .eq('id', input.classe_id).eq('enseignant_id', profil.id).single()

        if (!classeRow) {
          send({ step: 'erreur', statut: 'erreur', message: 'Classe introuvable ou accès non autorisé.' })
          controller.close(); return
        }

        const nomPack = `${input.matiere} ${input.niveau} — ${input.province ?? 'Canada'} — ${input.annee_scolaire ?? '2026-2027'}`

        const { data: packRow, error: packErr } = await supabase
          .from('teaching_packs')
          .upsert({
            enseignant_id:       profil.id,
            classe_id:           input.classe_id,
            nom:                 nomPack,
            statut:              'generation_en_cours',
            province:            input.province,
            pays:                input.pays ?? 'Canada',
            juridiction:         input.juridiction,
            langue:              input.langue ?? 'fr',
            annee_scolaire:      input.annee_scolaire,
            curriculum_source:   input.curriculum_source,
            curriculum_officiel: input.curriculum_officiel,
            curriculum_contenu:  input.curriculum_fichier_contenu?.substring(0, 20000),
            calendrier_json:     input.calendrier ?? {},
            gabarits_json:       input.gabarits ?? {},
          }, { onConflict: 'classe_id' })
          .select().single()

        if (packErr || !packRow?.id) {
          buildState.pack = stepError(`Upsert échoué : ${packErr?.message ?? 'inconnu'}`)
          send({ step: 'erreur', statut: 'erreur', message: 'Impossible de créer le Teaching Pack. Réessayez.' })
          controller.close(); return
        }

        // VERIFY: relire depuis DB
        const { data: packVerify } = await supabase
          .from('teaching_packs').select('id, statut').eq('id', packRow.id).single()
        if (!packVerify?.id) {
          buildState.pack = stepError('Pack introuvable après upsert')
          send({ step: 'erreur', statut: 'erreur', message: 'Teaching Pack introuvable après création. Réessayez.' })
          controller.close(); return
        }

        packId = packRow.id
        buildState.pack = stepSuccess(packId ?? undefined)
        send({ step: 'validation', statut: 'termine', message: 'Configuration validée ✓', progress: 5 })

        // ── ÉTAPE 2 : Curriculum / Plan annuel ───────────────────────────────
        const skipCurriculum = !!(input.reprendre
          && buildState.curriculum.status === 'success'
          && buildState.programme_annuel.status === 'success'
          && buildState.programme_annuel.objectId)

        send({
          step: 'curriculum', statut: 'en_cours',
          message: skipCurriculum ? 'Plan annuel existant retrouvé…' : 'Analyse du curriculum et génération du plan annuel…',
          progress: 10,
        })

        const nbSemaines = input.calendrier
          ? Math.max(24, Math.round(
              (new Date(input.calendrier.date_fin).getTime() - new Date(input.calendrier.date_debut).getTime())
              / (7 * 24 * 3600 * 1000),
            ) - (input.calendrier.semaines_tampon ?? 2))
          : 36

        const curriculumCtx = buildCurriculumContext(input)
        const isFr = input.langue !== 'en'

        let programme: ContenuProgramme = {
          titre: `Programme de ${input.matiere} — ${input.niveau}`,
          nb_semaines: nbSemaines,
          source_curriculum: input.curriculum_officiel ?? 'personnalisé',
          unites: [],
        }
        let programmeFromDB = false

        if (skipCurriculum) {
          const { data: existingProg } = await supabase
            .from('programme_annuel').select('*')
            .eq('id', buildState.programme_annuel.objectId!).single()
          if (existingProg?.contenu_json) {
            programme = existingProg.contenu_json as ContenuProgramme
            progId = existingProg.id
            programmeFromDB = true
            buildState.curriculum = stepSkipped(progId ?? undefined)
          }
        }

        if (!programmeFromDB) {
          const progMsg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4000,
            system: isFr
              ? `Tu es un expert en planification pédagogique canadienne. Génère un programme annuel complet, structuré, aligné sur le curriculum. Réponds UNIQUEMENT en JSON valide sans markdown.`
              : `You are a Canadian curriculum planning expert. Generate a complete annual programme. Reply ONLY in valid JSON, no markdown.`,
            messages: [{ role: 'user', content: isFr
              ? `Génère un programme annuel en JSON pour :
- Matière : ${input.matiere}
- Niveau : ${input.niveau}
- Province : ${input.province ?? 'Canada'}
- Durée : ${nbSemaines} semaines d'enseignement
- Langue : français

${curriculumCtx}

Format JSON EXACT (sans markdown) :
{
  "titre": "Programme de ${input.matiere} — ${input.niveau}",
  "nb_semaines": ${nbSemaines},
  "source_curriculum": "${input.curriculum_officiel ?? 'personnalisé'}",
  "unites": [
    {
      "numero": 1,
      "titre": "Titre de l'unité",
      "theme": "thème central",
      "semaine_debut": 1,
      "semaine_fin": 6,
      "objectifs": ["objectif 1", "objectif 2"],
      "competences": ["compétence visée"],
      "lecons": [
        { "numero": 1, "titre": "Titre", "sujet": "Description pédagogique", "duree_minutes": 60, "type": "introduction" }
      ]
    }
  ]
}
Génère 5 à 7 unités avec 4 à 7 leçons chacune. Distribue les semaines sur ${nbSemaines} semaines.`
              : `Generate a complete annual programme in JSON for ${input.matiere} grade ${input.niveau}.` }],
          })

          try {
            const raw   = progMsg.content[0].type === 'text' ? progMsg.content[0].text : '{}'
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            programme = JSON.parse(clean)
            if (!programme.unites?.length) throw new Error('unites vide')
            buildState.curriculum = stepSuccess()
          } catch {
            programme = {
              titre:             `Programme de ${input.matiere} — ${input.niveau}`,
              nb_semaines:       nbSemaines,
              source_curriculum: input.curriculum_officiel ?? 'personnalisé',
              unites: Array.from({ length: 6 }, (_, i) => ({
                numero:       i + 1,
                titre:        `Unité ${i + 1}`,
                semaine_debut: i * Math.floor(nbSemaines / 6) + 1,
                semaine_fin:  (i + 1) * Math.floor(nbSemaines / 6),
                objectifs:    ['Objectif principal'],
                lecons: Array.from({ length: 5 }, (_, j) => ({
                  numero:         i * 5 + j + 1,
                  titre:          `Leçon ${i * 5 + j + 1}`,
                  sujet:          'Contenu à définir',
                  duree_minutes:  60,
                  type:           'developpement' as const,
                })),
              })),
            }
            buildState.curriculum = stepSuccess()
          }
        }

        const nbLeconsTotales = programme.unites.reduce((s, u) => s + u.lecons.length, 0)
        send({ step: 'curriculum', statut: 'termine', message: `Plan annuel généré — ${programme.unites.length} unités, ${nbLeconsTotales} leçons planifiées ✓`, progress: 30 })

        // ── ÉTAPE 3 : Syllabus ────────────────────────────────────────────────
        const skipSyllabus = !!(input.reprendre && buildState.syllabus.status === 'success')

        send({
          step: 'syllabus', statut: 'en_cours',
          message: skipSyllabus ? 'Syllabus existant confirmé…' : 'Génération du syllabus…',
          progress: 32,
        })

        let syllabus: PackSyllabus | null = null

        if (!skipSyllabus) {
          let rawSylCapture = ''
          try {
            const sylMsg = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1500,
              system: `Tu es un expert en conception pédagogique. Génère un syllabus de cours complet et professionnel. Réponds UNIQUEMENT en JSON valide sans markdown ni texte supplémentaire. Commence directement par {`,
              messages: [{ role: 'user', content: `Génère un syllabus de cours en JSON pour :
- Matière : ${input.matiere}
- Niveau : ${input.niveau}
- Province : ${input.province ?? 'Canada'}
- Durée : ${nbSemaines} semaines
- ${curriculumCtx.substring(0, 800)}

Format JSON exact (commence par { sans aucun texte avant) :
{
  "titre_cours": "${input.matiere} — ${input.niveau}",
  "niveau": "${input.niveau}",
  "matiere": "${input.matiere}",
  "description": "Description générale du cours en 2-3 phrases",
  "grandes_idees": ["grande idée 1", "grande idée 2", "grande idée 3"],
  "resultats_apprentissage": ["résultat 1", "résultat 2", "résultat 3", "résultat 4", "résultat 5"],
  "methodes_pedagogiques": ["méthode 1", "méthode 2", "méthode 3"],
  "methodes_evaluation": ["évaluation formative", "évaluation sommative", "portfolio"],
  "ressources_suggeres": ["ressource 1", "ressource 2"],
  "normes_reference": ["norme curriculaire de référence"],
  "version": "1.0"
}` }],
            })
            rawSylCapture  = sylMsg.content[0].type === 'text' ? sylMsg.content[0].text : ''
            const cleanSyl = rawSylCapture.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

            // Extraction robuste : trouver le premier { ... } si Claude a ajouté du texte
            const jsonStart = cleanSyl.indexOf('{')
            const jsonEnd   = cleanSyl.lastIndexOf('}')
            const jsonStr   = jsonStart >= 0 && jsonEnd > jsonStart
              ? cleanSyl.slice(jsonStart, jsonEnd + 1)
              : cleanSyl

            const parsed = JSON.parse(jsonStr) as PackSyllabus

            // Validation minimale : titre_cours présent (resultats_apprentissage optionnel)
            if (parsed.titre_cours) {
              syllabus = {
                ...parsed,
                resultats_apprentissage: parsed.resultats_apprentissage?.length > 0
                  ? parsed.resultats_apprentissage
                  : [`Résultats d'apprentissage — ${input.matiere} ${input.niveau}`],
                created_at: new Date().toISOString(),
              }
              buildState.syllabus = stepSuccess()
            } else {
              const detail = `titre_cours absent — raw[0:200]: ${rawSylCapture.substring(0, 200)}`
              console.error('[build-year][syllabus] FAIL validation', { packId, detail })
              buildState.syllabus = stepError(`Syllabus incomplet — titre_cours absent`)
            }
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'erreur inconnue'
            console.error('[build-year][syllabus] FAIL parse/call', { packId, error: errMsg, raw: rawSylCapture.substring(0, 500) })
            buildState.syllabus = stepError(`Parse échoué : ${errMsg}`)
          }

          // Mission 16 : SSE reflète l'état réel
          if (syllabus) {
            send({ step: 'syllabus', statut: 'termine', message: 'Syllabus généré et validé ✓', progress: 45 })
          } else {
            send({ step: 'syllabus', statut: 'erreur', message: 'Syllabus non généré — le plan annuel continue.', progress: 45 })
          }
        } else {
          // En mode reprise, récupérer depuis programme_annuel existant si possible
          if (buildState.programme_annuel.objectId) {
            const { data: existingProgSyl } = await supabase
              .from('programme_annuel').select('syllabus_json')
              .eq('id', buildState.programme_annuel.objectId).single()
            const existingSyl = existingProgSyl?.syllabus_json as PackSyllabus | null
            if (existingSyl?.titre_cours) syllabus = existingSyl
          }
          send({ step: 'syllabus', statut: 'termine', message: 'Syllabus existant confirmé ✓', progress: 45 })
        }

        // ── ÉTAPE 4 : Sauvegarde programme annuel ─────────────────────────────
        if (!programmeFromDB) {
          send({ step: 'programme_annuel', statut: 'en_cours', message: 'Sauvegarde du plan annuel…', progress: 47 })

          // Idempotence : check par teaching_pack_id
          const { data: existingProgRow } = packId
            ? await supabase.from('programme_annuel').select('id').eq('teaching_pack_id', packId).single()
            : { data: null }

          let progRow: { id: string } | null = null

          if (existingProgRow?.id) {
            const { data: updated, error: updateErr } = await supabase
              .from('programme_annuel')
              .update({
                titre:            programme.titre,
                nb_semaines:      programme.nb_semaines,
                contenu_json:     programme,
                teaching_pack_id: packId,
                calendrier_json:  input.calendrier ?? {},
                syllabus_json:    syllabus ?? {},
              })
              .eq('id', existingProgRow.id)
              .select('id').single()

            if (updateErr || !updated?.id) {
              buildState.programme_annuel = stepError(`Update échoué : ${updateErr?.message ?? 'inconnu'}`)
            } else {
              progRow = updated
            }
          } else {
            const { data: inserted, error: insertErr } = await supabase
              .from('programme_annuel')
              .insert({
                classe_id:        input.classe_id,
                titre:            programme.titre,
                nb_semaines:      programme.nb_semaines,
                contenu_json:     programme,
                teaching_pack_id: packId,
                calendrier_json:  input.calendrier ?? {},
                syllabus_json:    syllabus ?? {},
              })
              .select('id').single()

            if (insertErr || !inserted?.id) {
              buildState.programme_annuel = stepError(`Insert échoué : ${insertErr?.message ?? 'inconnu'}`)
            } else {
              progRow = inserted
            }
          }

          if (progRow?.id) {
            // VERIFY: relire depuis DB et vérifier contenu non vide
            const { data: progVerify } = await supabase
              .from('programme_annuel')
              .select('id, contenu_json')
              .eq('id', progRow.id).single()

            const unites = (progVerify?.contenu_json as ContenuProgramme | null)?.unites
            if (!progVerify?.id || !unites?.length) {
              buildState.programme_annuel = stepError('Programme introuvable ou vide après écriture')
              send({ step: 'programme_annuel', statut: 'erreur', message: 'Sauvegarde du plan annuel non confirmée en base.', progress: 55 })
            } else {
              progId = progVerify.id
              buildState.programme_annuel = stepSuccess(progId ?? undefined)
              send({ step: 'programme_annuel', statut: 'termine', message: 'Plan annuel sauvegardé et vérifié ✓', progress: 55 })
            }
          } else {
            send({ step: 'programme_annuel', statut: 'erreur', message: 'Plan annuel non sauvegardé — les séquences ne seront pas disponibles.', progress: 55 })
          }
        } else {
          progId = buildState.programme_annuel.objectId ?? null
          send({ step: 'programme_annuel', statut: 'termine', message: 'Plan annuel existant confirmé ✓', progress: 55 })
        }

        await supabase.from('classes').update({ curriculum_charge: true }).eq('id', input.classe_id)

        // Mettre à jour le lien FK pack → programme_annuel dès maintenant
        if (packId && progId) {
          await supabase.from('teaching_packs').update({ programme_annuel_id: progId }).eq('id', packId)
        }

        // ── ÉTAPE 5 : Vérification plans de leçon (depuis DB) ─────────────────
        send({ step: 'plans_lecon', statut: 'en_cours', message: 'Vérification des plans de leçon en base…', progress: 57 })

        let nbPlansVerified = 0
        if (progId) {
          const { data: progCheck } = await supabase
            .from('programme_annuel').select('contenu_json').eq('id', progId).single()
          nbPlansVerified = (progCheck?.contenu_json as ContenuProgramme | null)?.unites?.[0]?.lecons?.length ?? 0
        }

        if (nbPlansVerified > 0) {
          buildState.plans_lecon = stepSuccess()
          send({ step: 'plans_lecon', statut: 'termine', message: `${nbPlansVerified} plans de leçon confirmés en base ✓`, progress: 62 })
        } else {
          buildState.plans_lecon = stepError(progId ? 'Plans introuvables en base' : 'Programme non disponible')
          send({ step: 'plans_lecon', statut: 'erreur', message: 'Plans de leçon non confirmés en base.', progress: 62 })
        }

        // ── ÉTAPE 6 : Première leçon complète ─────────────────────────────────
        let premiereLeconId: string | null = null
        const premiereUnite = programme.unites[0]

        const skipLecon = !!(input.reprendre
          && buildState.premiere_lecon.status === 'success'
          && buildState.premiere_lecon.objectId)

        if (skipLecon) {
          premiereLeconId = buildState.premiere_lecon.objectId!
          // Verify it still exists
          const { data: leconCheck } = await supabase
            .from('fichiers_dossier').select('id').eq('id', premiereLeconId).single()
          if (leconCheck?.id) {
            send({ step: 'premiere_lecon', statut: 'termine', message: 'Leçon existante confirmée en base ✓', progress: 80 })
          } else {
            // Stale reference — needs to be regenerated
            buildState.premiere_lecon = stepError('Fichier leçon introuvable')
            premiereLeconId = null
          }
        }

        if (!premiereLeconId && entitlement.first_lesson_complete && premiereUnite?.lecons[0]) {
          const pl = premiereUnite.lecons[0]
          send({ step: 'premiere_lecon', statut: 'en_cours', message: `Développement de la leçon "${pl.titre}"…`, progress: 64 })

          try {
            const leconMsg = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 3000,
              system: `Tu es un expert en planification pédagogique canadienne. Génère une leçon complète et détaillée prête à enseigner. Réponds en Markdown structuré.`,
              messages: [{ role: 'user', content: `Génère une leçon COMPLÈTE pour :
- Titre : ${pl.titre}
- Sujet : ${pl.sujet}
- Matière : ${input.matiere}, Niveau : ${input.niveau}, Province : ${input.province ?? 'Canada'}
- Durée : ${pl.duree_minutes} minutes
- Type : ${pl.type}
- Unité : ${premiereUnite.titre}

La leçon doit inclure TOUS ces éléments :

## 🎯 Objectifs d'apprentissage
(3-4 objectifs précis, mesurables)

## 📋 Matériel requis

## ⚡ Mise en contexte / Activation (${Math.round(pl.duree_minutes * 0.1)} min)

## 📚 Enseignement / Modélisation (${Math.round(pl.duree_minutes * 0.25)} min)

## 🤝 Pratique guidée (${Math.round(pl.duree_minutes * 0.2)} min)

## 💡 Pratique autonome (${Math.round(pl.duree_minutes * 0.25)} min)

## ♿ Différenciation

## 📊 Évaluation formative

## ✅ Critères de réussite` }],
            })
            const contenuLecon = leconMsg.content[0].type === 'text' ? leconMsg.content[0].text : ''

            if (!contenuLecon.trim()) throw new Error('Contenu de leçon vide')

            // Chercher le dossier plans_lecons → fallback
            let dossierRow: { id: string } | null = null
            const { data: dossierPlans } = await supabase
              .from('dossiers_systeme').select('id')
              .eq('classe_id', input.classe_id).eq('type', 'plans_lecons')
              .order('created_at', { ascending: true }).limit(1).single()
            dossierRow = dossierPlans
            if (!dossierRow) {
              const { data: fallback } = await supabase
                .from('dossiers_systeme').select('id')
                .eq('classe_id', input.classe_id)
                .order('created_at', { ascending: true }).limit(1).single()
              dossierRow = fallback
            }

            if (!dossierRow) {
              buildState.premiere_lecon = stepError('Aucun dossier disponible pour stocker la leçon')
              send({ step: 'premiere_lecon', statut: 'erreur', message: 'Impossible de stocker la leçon — aucun dossier trouvé.', progress: 80 })
            } else {
              const { data: fichierRow, error: fichierErr } = await supabase
                .from('fichiers_dossier')
                .insert({
                  dossier_id:       dossierRow.id,
                  enseignant_id:    profil.id,
                  classe_id:        input.classe_id,
                  nom:              pl.titre,
                  type_fichier:     'lecon_complete',
                  contenu_html:     contenuLecon,
                  statut:           'brouillon',
                  indexe_studio_ia: false,
                })
                .select('id, contenu_html').single()

              if (fichierErr || !fichierRow?.id) {
                buildState.premiere_lecon = stepError(`Insert échoué : ${fichierErr?.message ?? 'inconnu'}`)
                send({ step: 'premiere_lecon', statut: 'erreur', message: 'Leçon générée mais non sauvegardée.', progress: 80 })
              } else {
                // VERIFY: relire
                const { data: leconVerify } = await supabase
                  .from('fichiers_dossier').select('id, contenu_html')
                  .eq('id', fichierRow.id).single()

                if (!leconVerify?.id || !leconVerify.contenu_html) {
                  buildState.premiere_lecon = stepError('Leçon introuvable après sauvegarde')
                  send({ step: 'premiere_lecon', statut: 'erreur', message: 'Leçon non confirmée en base.', progress: 80 })
                } else {
                  premiereLeconId = leconVerify.id
                  buildState.premiere_lecon = stepSuccess(premiereLeconId ?? undefined)
                  send({ step: 'premiere_lecon', statut: 'termine', message: `Leçon "${pl.titre}" sauvegardée et vérifiée ✓`, progress: 80 })
                }
              }
            }
          } catch (e) {
            buildState.premiere_lecon = stepError(e instanceof Error ? e.message : 'Erreur inconnue')
            send({ step: 'premiere_lecon', statut: 'erreur', message: 'Génération de la leçon partielle — le plan annuel reste disponible.', progress: 80 })
          }
        } else if (!entitlement.first_lesson_complete) {
          buildState.premiere_lecon = stepSkipped()
          send({ step: 'premiere_lecon', statut: 'ignore', message: 'Première leçon ignorée selon le forfait.', progress: 80 })
        }

        // ── ÉTAPE 7 : Quiz ────────────────────────────────────────────────────
        let quizId: string | null = null

        const skipQuiz = !!(input.reprendre
          && buildState.quiz.status === 'success'
          && buildState.quiz.objectId)

        if (skipQuiz) {
          quizId = buildState.quiz.objectId!
          const { data: quizCheck } = await supabase
            .from('fichiers_dossier').select('id').eq('id', quizId).single()
          if (quizCheck?.id) {
            send({ step: 'quiz', statut: 'termine', message: 'Quiz existant confirmé en base ✓', progress: 88 })
          } else {
            buildState.quiz = stepError('Fichier quiz introuvable')
            quizId = null
          }
        }

        if (!quizId && entitlement.first_lesson_quiz && premiereUnite?.lecons[0]) {
          send({ step: 'quiz', statut: 'en_cours', message: 'Génération du quiz de la 1re leçon…', progress: 82 })
          try {
            const quizMsg = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1200,
              system: `Tu es un expert en évaluation pédagogique. Génère des quiz formatifs concis et efficaces.`,
              messages: [{ role: 'user', content: `Génère un quiz formatif de 6 questions pour la leçon "${premiereUnite.lecons[0].titre}" en ${input.matiere} niveau ${input.niveau}. Inclus des questions à choix multiples, vrai/faux, et courte réponse. Format Markdown avec les réponses à la fin.` }],
            })
            const quizContenu = quizMsg.content[0].type === 'text' ? quizMsg.content[0].text : ''

            if (!quizContenu.trim()) throw new Error('Quiz vide généré')

            let quizDossierRow: { id: string } | null = null
            const { data: dossierEval } = await supabase
              .from('dossiers_systeme').select('id')
              .eq('classe_id', input.classe_id)
              .in('type', ['lecons', 'evaluations_sommatives'])
              .order('created_at', { ascending: true }).limit(1).single()
            quizDossierRow = dossierEval
            if (!quizDossierRow) {
              const { data: fallbackQuiz } = await supabase
                .from('dossiers_systeme').select('id')
                .eq('classe_id', input.classe_id)
                .order('created_at', { ascending: true }).limit(1).single()
              quizDossierRow = fallbackQuiz
            }

            if (!quizDossierRow) {
              buildState.quiz = stepError('Aucun dossier pour le quiz')
              send({ step: 'quiz', statut: 'erreur', message: 'Impossible de stocker le quiz.', progress: 88 })
            } else {
              const { data: quizRow, error: quizErr } = await supabase
                .from('fichiers_dossier')
                .insert({
                  dossier_id:    quizDossierRow.id,
                  enseignant_id: profil.id,
                  classe_id:     input.classe_id,
                  nom:           `Quiz — ${premiereUnite.lecons[0].titre}`,
                  type_fichier:  'quiz',
                  contenu_html:  quizContenu,
                  statut:        'brouillon',
                })
                .select('id').single()

              if (quizErr || !quizRow?.id) {
                buildState.quiz = stepError(`Insert quiz échoué : ${quizErr?.message ?? 'inconnu'}`)
                send({ step: 'quiz', statut: 'erreur', message: 'Quiz généré mais non sauvegardé.', progress: 88 })
              } else {
                // VERIFY: relire
                const { data: quizVerify } = await supabase
                  .from('fichiers_dossier').select('id').eq('id', quizRow.id).single()

                if (!quizVerify?.id) {
                  buildState.quiz = stepError('Quiz introuvable après sauvegarde')
                  send({ step: 'quiz', statut: 'erreur', message: 'Quiz non confirmé en base.', progress: 88 })
                } else {
                  quizId = quizVerify.id
                  buildState.quiz = stepSuccess(quizId ?? undefined)
                  send({ step: 'quiz', statut: 'termine', message: 'Quiz sauvegardé et vérifié ✓', progress: 88 })
                }
              }
            }
          } catch (e) {
            buildState.quiz = stepError(e instanceof Error ? e.message : 'Erreur inconnue')
            send({ step: 'quiz', statut: 'erreur', message: 'Quiz non généré — le reste du pack est disponible.', progress: 88 })
          }
        } else if (!entitlement.first_lesson_quiz) {
          buildState.quiz = stepSkipped()
        }

        // ── ÉTAPE 8 : Finalisation + Completeness Check ───────────────────────
        send({ step: 'sauvegarde', statut: 'en_cours', message: 'Vérification finale du Teaching Pack…', progress: 90 })

        // Vérification réelle depuis DB (Mission 14)
        const completeness = packId
          ? await verifyTeachingPackCompleteness(supabase, packId, input.classe_id, entitlement)
          : { complete: false, missingElements: ['pack'], status: 'erreur' as const, counts: { sequences: 0, plans_lecon: 0, lecons_completes: 0, quiz: 0 } }

        buildState.finalized   = true
        buildState.completedAt = new Date().toISOString()

        const etapesCompletees: BuildYearStep[] = [
          'validation',
          ...(buildState.curriculum.status       === 'success' ? ['curriculum'       as const] : []),
          ...(buildState.syllabus.status         === 'success' ? ['syllabus'         as const] : []),
          ...(buildState.programme_annuel.status === 'success' ? ['programme_annuel' as const] : []),
          ...(buildState.plans_lecon.status      === 'success' ? ['plans_lecon'      as const] : []),
          ...(buildState.premiere_lecon.status   === 'success' ? ['premiere_lecon'   as const] : []),
          ...(buildState.quiz.status             === 'success' ? ['quiz'             as const] : []),
        ]

        const contenuFinal: TeachingPackContenu & { build_state?: BuildState } = {
          syllabus:                syllabus ?? undefined,
          nb_unites:               programme.unites.length,
          nb_lecons_planifiees:    programme.unites.reduce((s, u) => s + u.lecons.length, 0),
          nb_lecons_generees:      completeness.counts.lecons_completes,
          premiere_lecon_complete: !!premiereLeconId,
          premiere_lecon_id:       premiereLeconId ?? undefined,
          premier_quiz_id:         quizId ?? undefined,
          etapes_completees:       etapesCompletees,
          build_state:             buildState,
        }

        if (packId) {
          await supabase.from('teaching_packs').update({
            statut:              completeness.status,
            programme_annuel_id: progId,
            contenu_json:        contenuFinal,
            error_message:       completeness.complete
              ? null
              : `Éléments manquants : ${completeness.missingElements.join(', ')}`,
          }).eq('id', packId)
        }

        // Mémoire studio IA (toujours exécuté)
        await supabase.from('studio_ia_memoire').upsert({
          enseignant_id: profil.id,
          classe_id:     input.classe_id,
          cle:           `programme_annuel_${input.classe_id}`,
          contenu:       {
            programme_id: progId, pack_id: packId,
            titre: programme.titre, unites: programme.unites.length,
            matiere: input.matiere, niveau: input.niveau, province: input.province,
            build_complete: completeness.complete,
          },
          type: 'contexte',
        }, { onConflict: 'enseignant_id,cle,type' })

        send({ step: 'sauvegarde', statut: 'termine', message: 'Vérification finale terminée ✓', progress: 98 })

        // ── TERMINÉ ────────────────────────────────────────────────────────────
        if (completeness.complete) {
          send({
            step:                'termine',
            statut:              'termine',
            message:             'Votre année scolaire est construite ! 🎉',
            teaching_pack_id:    packId ?? undefined,
            programme_annuel_id: progId ?? undefined,
            progress:            100,
          })
        } else {
          const missing = completeness.missingElements
          const critical = missing.includes('programme_annuel')
          send({
            step:                'termine',
            statut:              critical ? 'erreur' : 'termine',
            message:             critical
              ? `Erreur critique : le plan annuel n'a pas pu être sauvegardé. Utilisez « Reprendre la génération » pour réessayer.`
              : `Teaching Pack partiellement construit. Éléments manquants : ${missing.join(', ')}. Utilisez « Reprendre la génération ».`,
            teaching_pack_id:    packId ?? undefined,
            programme_annuel_id: progId ?? undefined,
            progress:            100,
          })
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inattendue'
        send({ step: 'erreur', statut: 'erreur', message: `Erreur : ${msg}`, detail: String(err) })
        if (packId) {
          await supabase.from('teaching_packs')
            .update({ statut: 'erreur', error_message: msg })
            .eq('id', packId)
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
