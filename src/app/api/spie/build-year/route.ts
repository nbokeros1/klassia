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
import { bindProgrammeToClassFolder } from '@/lib/spie/class-folder-binding'
import { buildAperçuCalendrier } from '@/lib/spie/syllabus-v3'
import { validatePedagogicalProgramme, summariseViolations } from '@/lib/spie/validate-pedagogical-programme'
import { extractOutcomesFromText, formatOutcomesForPrompt } from '@/lib/spie/curriculum/extraction/curriculum-bridge'
import type { NormalizedOutcome } from '@/lib/spie/curriculum/extraction/types'
import { buildAydtePlanningBridge } from '@/lib/spie/curriculum/planning/aydte-planning-bridge'
import { reconstructFromScaffold, validateV3Structure } from '@/lib/spie/validate-v3-structure'
import { shadowWriteCanonicalPedagogicalStructure } from '@/lib/spie/canonical-shadow-write'

export const maxDuration = 300

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sse(ctrl: ReadableStreamDefaultController, event: BuildYearEvent) {
  ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
}

// ─── Curriculum context ───────────────────────────────────────────────────────

const CURRICULA_OFFICIEL: Record<string, string> = {
  alberta:     'Alberta Program of Studies (Alberta Education). Learning outcomes, key concepts, essential questions, competencies.',
  ontario:     "The Ontario Curriculum (Ministère de l'Éducation de l'Ontario). Expectations: overall and specific.",
  quebec:      "Programme de formation de l'école québécoise (PFEQ/MEES). Compétences, domaines, progression.",
  bc:          'BC Curriculum. Big ideas, curricular competencies, content learning standards.',
  common_core: 'Common Core State Standards (CCSS, USA).',
  ib:          'International Baccalaureate (IB) Programme.',
  france:      "Programmes de l'Éducation nationale française (BOEN).",
}

function buildCurriculumContext(input: BuildYearWizardInput): string {
  if (input.curriculum_source === 'officiel' && input.curriculum_officiel) {
    return `Programme officiel : ${CURRICULA_OFFICIEL[input.curriculum_officiel] ?? input.curriculum_officiel}`
  }
  if (input.curriculum_fichier_contenu) {
    // Raw text fallback — 8,000 chars (increased from 2,000; SPIE-02 handles up to 12,000 when available)
    return `Curriculum fourni par l'enseignant (${input.curriculum_fichier_nom ?? 'fichier'}):\n${input.curriculum_fichier_contenu.substring(0, 8000)}`
  }
  return `Programme général adapté — ${input.province ?? 'Canada'}`
}

// Attempts SPIE-02 structured extraction when teacher has uploaded a curriculum file.
// Falls back to expanded raw text (8,000 chars) on failure — never throws.
async function buildStructuredCurriculumContext(
  input: BuildYearWizardInput,
  packId: string | null,
): Promise<{ contextBlock: string; outcomesExtracted: boolean; outcomeCount: number; outcomes: NormalizedOutcome[] }> {
  if (input.curriculum_fichier_contenu && input.curriculum_fichier_contenu.length >= 100) {
    try {
      const bridgeResult = await extractOutcomesFromText(
        input.curriculum_fichier_contenu, // bridge handles its own 12,000 char limit
        {
          province: input.province,
          matiere:  input.matiere,
          niveaux:  [input.niveau],
          langue:   input.langue === 'en' ? 'en' : 'fr',
        },
        input.curriculum_fichier_nom ?? 'curriculum_upload',
      )

      if (bridgeResult.success && bridgeResult.outcomes.length > 0) {
        console.info('[SPIE_CURRICULUM_EXTRACTION_OK]', {
          packId,
          classeId:     input.classe_id,
          outcomeCount: bridgeResult.outcomeCount,
          tokensUsed:   bridgeResult.tokensUsed,
          warnings:     bridgeResult.warnings.slice(0, 3),
        })
        const outcomesJson = formatOutcomesForPrompt(bridgeResult.outcomes, 60)
        return {
          contextBlock: `RÉSULTATS D'APPRENTISSAGE NORMALISÉS (extraits du document curriculaire) :\n${outcomesJson}\n\nAperçu document :\n${input.curriculum_fichier_contenu.substring(0, 2000)}`,
          outcomesExtracted: true,
          outcomeCount: bridgeResult.outcomeCount,
          outcomes: bridgeResult.outcomes,
        }
      }

      // SPIE-02 returned 0 outcomes
      console.warn('[SPIE_CURRICULUM_EXTRACTION_FAILED]', {
        packId,
        classeId: input.classe_id,
        error:    bridgeResult.error,
        warnings: bridgeResult.warnings.slice(0, 3),
        fallback: 'raw_text_8000',
      })
    } catch (e) {
      console.error('[SPIE_CURRICULUM_EXTRACTION_FAILED]', {
        packId,
        classeId: input.classe_id,
        error:    e instanceof Error ? e.message : String(e),
        fallback: 'raw_text_8000',
      })
    }
    // Graceful fallback: raw text at expanded budget
    return {
      contextBlock: `Curriculum fourni par l'enseignant (${input.curriculum_fichier_nom ?? 'fichier'}) :\n${input.curriculum_fichier_contenu.substring(0, 8000)}`,
      outcomesExtracted: false,
      outcomeCount: 0,
      outcomes: [],
    }
  }
  // No uploaded file — use official key or generic string
  return { contextBlock: buildCurriculumContext(input), outcomesExtracted: false, outcomeCount: 0, outcomes: [] }
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
    .from('utilisateurs').select('id, forfait, is_admin, role')
    .eq('user_id', user.id).single()

  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const entitlement = getBetaEntitlement(profil.forfait ?? 'gratuit', profil.role, profil.is_admin)
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

        // Guard: uploaded curriculum must have extracted text before generation
        if (!skipCurriculum
          && input.curriculum_source === 'televerse'
          && (!input.curriculum_fichier_contenu || input.curriculum_fichier_contenu.trim().length < 50)) {
          console.error('[SPIE_CURRICULUM_UPLOAD_NOT_EXTRACTED]', {
            packId,
            classeId:      input.classe_id,
            source:        input.curriculum_source,
            contentLength: input.curriculum_fichier_contenu?.length ?? 0,
          })
          if (packId) {
            await supabase.from('teaching_packs').update({
              statut:        'erreur',
              error_message: 'Curriculum téléversé non extrait — relancez après avoir retéléversé le fichier',
            }).eq('id', packId)
          }
          send({ step: 'curriculum', statut: 'erreur', message: 'Le texte du curriculum n\'a pas été extrait. Retournez à l\'étape Curriculum et téléversez à nouveau votre document.', progress: 15 })
          send({ step: 'erreur', statut: 'erreur', message: 'CURRICULUM_UPLOAD_NOT_EXTRACTED — Retournez à l\'étape Curriculum et téléversez votre document.', teaching_pack_id: packId ?? undefined, progress: 100 })
          controller.close(); return
        }

        // Log when uploaded curriculum text is present and ready for SPIE-02
        if (input.curriculum_source === 'televerse' && input.curriculum_fichier_contenu && input.curriculum_fichier_contenu.trim().length >= 50) {
          console.info('[SPIE_CURRICULUM_SOURCE_READY]', {
            classeId:         input.classe_id,
            packId,
            sourceType:       'televerse',
            textLength:       input.curriculum_fichier_contenu.length,
            extractionStatus: 'ready',
          })
        }

        const nbSemaines = input.calendrier
          ? Math.max(24, Math.round(
              (new Date(input.calendrier.date_fin).getTime() - new Date(input.calendrier.date_debut).getTime())
              / (7 * 24 * 3600 * 1000),
            ) - (input.calendrier.semaines_tampon ?? 2))
          : 36

        const isFr = input.langue !== 'en'

        // Build structured curriculum context — tries SPIE-02 extraction first
        send({ step: 'curriculum', statut: 'en_cours', message: 'Analyse du curriculum…', progress: 12 })
        const structuredCtx = await buildStructuredCurriculumContext(input, packId)
        const curriculumCtx = buildCurriculumContext(input) // kept for syllabus prompt (600 char slice)

        // AYDTE — Academic Year Digital Twin Engine (V7.5)
        // Runs when SPIE-02 extracted outcomes; produces SequenceBlock[] with week allocation.
        // Never blocks generation — errors are logged and production falls back to V2 flow.
        const minutesParSemaine = input.calendrier
          ? (input.calendrier.periodes_par_semaine ?? 4) * (input.calendrier.duree_periode_minutes ?? 50)
          : 200
        let aydteBridgeResult = null as Awaited<ReturnType<typeof buildAydtePlanningBridge>> | null
        if (structuredCtx.outcomesExtracted && structuredCtx.outcomes.length > 0) {
          try {
            aydteBridgeResult = buildAydtePlanningBridge({
              outcomes:         structuredCtx.outcomes,
              totalSemaines:    nbSemaines,
              minutesParSemaine,
              packId:           packId ?? undefined,
              classeId:         input.classe_id,
              province:         input.province,
              matiere:          input.matiere,
              niveau:           input.niveau,
              langue:           input.langue === 'en' ? 'en' : 'fr',
              anneesScolaire:   input.annee_scolaire,
            })
            if (aydteBridgeResult.success) {
              console.info('[AYDTE_COMPLETE]', {
                packId,
                classeId:        input.classe_id,
                units:           aydteBridgeResult.units.length,
                sequences:       aydteBridgeResult.sequences.length,
                coveragePercent: aydteBridgeResult.coveragePercent,
                pacingScore:     aydteBridgeResult.pacingScore,
                durationMs:      aydteBridgeResult.durationMs,
              })
            } else {
              console.warn('[AYDTE_FAILED]', { packId, error: aydteBridgeResult.error })
              aydteBridgeResult = null
            }
          } catch (e) {
            console.warn('[AYDTE_FAILED]', { packId, error: e instanceof Error ? e.message : String(e) })
            aydteBridgeResult = null
          }
        }

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
            max_tokens: 5000,
            system: `RETURN ONLY VALID JSON. No markdown. No \`\`\`json. Start with {. Every opened object and array MUST be closed. Strings must be concise (max 2 sentences). Tu es un expert en planification pédagogique canadienne.`,
            messages: [{ role: 'user', content: `Génère un programme annuel pédagogique en JSON pour :
- Matière : ${input.matiere}
- Niveau : ${input.niveau}
- Province : ${input.province ?? 'Canada'}
- Durée : ${nbSemaines} semaines
- Curriculum : ${input.curriculum_officiel ?? 'personnalisé'}
${structuredCtx.outcomesExtracted ? `- Résultats d'apprentissage normalisés : ${structuredCtx.outcomeCount} outcomes extraits (voir ci-dessous)` : ''}
${aydteBridgeResult?.success ? `- Structure AYDTE : ${aydteBridgeResult.units.length} unités, ${aydteBridgeResult.sequences.length} séquences (couverture ${aydteBridgeResult.coveragePercent}%)` : ''}

${structuredCtx.contextBlock}
${aydteBridgeResult?.success ? `\n${aydteBridgeResult.scaffoldPrompt}` : ''}

RÈGLES IMPÉRATIVES :
1. Titres réels pour unités et leçons (JAMAIS "Unité 1", "Leçon 1", "Contenu à définir")
2. objectif_apprentissage de chaque leçon commence par "L'élève peut..."
3. justification_pedagogique de chaque unité : 2 phrases max${aydteBridgeResult?.success ? `
4. COPIE EXACTEMENT les unit_id et sequence_id du scaffold AYDTE dans ton JSON
5. "units" contient les unités macro (une par domaine AYDTE) avec leurs sequence_ids[]
6. "unites" contient les séquences détaillées (une par sequence_id) avec unit_id ET sequence_id exacts` : `
4. Nombre d'unités et leçons déterminé par le curriculum (cible 4 à 8 unités, 2 à 6 leçons par unité), distribué sur ${nbSemaines} semaines`}
${aydteBridgeResult?.success ? '7.' : '5.'} 4 à 8 curriculum_outcomes au niveau racine — utilise les codes réels du curriculum si disponibles${structuredCtx.outcomesExtracted ? ', sinon codes descriptifs' : ''}
${aydteBridgeResult?.success ? '8.' : '6.'} Ne fabrique AUCUN champ absent du curriculum source (question_directrice, CCHP, etc.) — laisse vide plutôt qu'inventer

Format JSON EXACT :
{
  "titre": "Programme de ${input.matiere} — ${input.niveau}",
  "nb_semaines": ${nbSemaines},
  "source_curriculum": "${input.curriculum_officiel ?? 'personnalisé'}",
  "curriculum_outcomes": [
    {"id": "RA-1.1", "code": "1.1", "titre": "Titre RA court", "description": "Description concise du résultat.", "type": "resultat_apprentissage"}
  ]${aydteBridgeResult?.success ? `,
  "units": [
    {
      "id": "<unit_id exact du scaffold>",
      "numero": 1,
      "titre": "Titre thématique réel de l'unité macro",
      "outcome_ids": ["code1", "code2"],
      "sequence_ids": ["<sequence_id exact du scaffold>"]
    }
  ]` : ''},
  "unites": [
    {
      "numero": 1,${aydteBridgeResult?.success ? `
      "sequence_id": "<sequence_id exact du scaffold>",
      "unit_id": "<unit_id exact du scaffold>",` : ''}
      "titre": "Titre réel et descriptif de la séquence",
      "theme": "Thème central",
      "justification_pedagogique": "Pourquoi cette séquence à ce moment et ses liens avec le curriculum.",
      "semaine_debut": 1,
      "semaine_fin": 6,
      "curriculum_outcome_ids": ["RA-1.1"],
      "grandes_idees": ["Grande idée centrale de la séquence"],
      "objectifs": ["Objectif mesurable 1", "Objectif mesurable 2"],
      "concepts_cles": ["concept 1", "concept 2"],
      "activite_culminante": "Activité intégratrice de fin de séquence",
      "evaluation_prevue": "Type et format d'évaluation",
      "lecons": [
        {
          "numero": 1,
          "titre": "Titre réel et descriptif de la leçon",
          "sujet": "Description pédagogique courte",
          "duree_minutes": 60,
          "type": "introduction",
          "progression_role": "introduction",
          "objectif_apprentissage": "L'élève peut [action observable et mesurable].",
          "curriculum_outcome_ids": ["RA-1.1"],
          "activite_principale": "Description courte de l'activité principale",
          "preuve_apprentissage": "Ce que l'élève produit pour démontrer sa compréhension",
          "justification": "Raison de positionner cette leçon ici dans la séquence."
        }
      ]
    }
  ]
}` }],
          })

          const rawProg = progMsg.content[0].type === 'text' ? progMsg.content[0].text : ''
          const cleanProg = rawProg.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const stProg = cleanProg.indexOf('{'), enProg = cleanProg.lastIndexOf('}')
          const jsonStrProg = stProg >= 0 && enProg > stProg ? cleanProg.slice(stProg, enProg + 1) : cleanProg

          let parsedProg: ContenuProgramme | null = null
          try {
            parsedProg = JSON.parse(jsonStrProg)
          } catch {
            try { parsedProg = JSON.parse(jsonStrProg.replace(/,\s*([}\]])/g, '$1')) } catch { /* null */ }
          }

          if (!parsedProg?.unites?.length) {
            buildState.curriculum = stepError('Plan annuel invalide — aucune unité générée par l\'IA')
            console.error('[SPIE_BUILD_FAILED]', { packId, classeId: input.classe_id, step: 'curriculum', stopReason: progMsg.stop_reason })
            const blockMsg = 'Bloqué — plan annuel non généré'
            send({ step: 'curriculum', statut: 'erreur', message: 'La génération du plan annuel a échoué. Réessayez.', progress: 30 })
            send({ step: 'syllabus', statut: 'bloque', message: blockMsg, progress: 45 })
            send({ step: 'programme_annuel', statut: 'bloque', message: blockMsg, progress: 55 })
            send({ step: 'plans_lecon', statut: 'bloque', message: blockMsg, progress: 62 })
            send({ step: 'premiere_lecon', statut: 'bloque', message: blockMsg, progress: 80 })
            send({ step: 'quiz', statut: 'ignore', message: 'Non requis.', progress: 88 })
            if (packId) {
              await supabase.from('teaching_packs').update({
                statut: 'erreur',
                contenu_json: { build_state: buildState },
                error_message: 'Plan annuel non généré',
              }).eq('id', packId)
            }
            send({ step: 'erreur', statut: 'erreur', message: 'La génération du plan annuel a échoué. Réessayez dans quelques instants.', teaching_pack_id: packId ?? undefined, progress: 100 })
            controller.close(); return
          }

          // Block placeholder data before any DB write — second line of defence
          const progValidation = validatePedagogicalProgramme(parsedProg)
          if (!progValidation.valid) {
            buildState.curriculum = stepError('Programme contient des données génériques — rejet avant persistance')
            console.error('[SPIE_PLACEHOLDER_BLOCKED]', {
              packId,
              classeId: input.classe_id,
              step:     'curriculum',
              summary:  summariseViolations(progValidation.violations),
            })
            const blockMsg = 'Bloqué — données génériques détectées'
            send({ step: 'curriculum', statut: 'erreur', message: 'Le plan généré contient des titres génériques. Réessayez.', progress: 30 })
            send({ step: 'syllabus',          statut: 'bloque', message: blockMsg, progress: 45 })
            send({ step: 'programme_annuel',  statut: 'bloque', message: blockMsg, progress: 55 })
            send({ step: 'plans_lecon',       statut: 'bloque', message: blockMsg, progress: 62 })
            send({ step: 'premiere_lecon',    statut: 'bloque', message: blockMsg, progress: 80 })
            send({ step: 'quiz',              statut: 'ignore', message: 'Non requis.',   progress: 88 })
            if (packId) {
              await supabase.from('teaching_packs').update({
                statut:        'erreur',
                contenu_json:  { build_state: buildState },
                error_message: 'Programme généré invalide — données génériques',
              }).eq('id', packId)
            }
            send({ step: 'erreur', statut: 'erreur', message: 'La génération a produit un programme invalide. Réessayez dans quelques instants.', teaching_pack_id: packId ?? undefined, progress: 100 })
            controller.close(); return
          }

          // V7.5.1 — canonical stamping: ID-based match then positional fallback (NO POSITIONAL-ONLY)
          if (aydteBridgeResult?.success && aydteBridgeResult.sequences.length > 0) {
            const scaffold = {
              units:       aydteBridgeResult.units,
              sequenceIds: aydteBridgeResult.sequences.map(s => s.id),
            }

            // Reconstruct canonical IDs (uses ID-based match + positional fallback)
            const reconstructed = reconstructFromScaffold(parsedProg, scaffold.units, aydteBridgeResult.sequences)

            // Validate structural cardinality
            const structureCheck = validateV3Structure(reconstructed, scaffold)
            if (!structureCheck.valid) {
              console.warn('[V3_STRUCTURE_WARNINGS]', {
                packId,
                classeId: input.classe_id,
                errors:   structureCheck.errors.map(e => e.code),
                warnings: structureCheck.warnings.slice(0, 3),
              })
            }

            programme = {
              ...reconstructed,
              schema_version: 'v3' as const,
            }
            console.info('[PEDAGOGICAL_STRUCTURE_CREATED]', {
              packId,
              classeId:        input.classe_id,
              schema_version:  'v3',
              units:           structureCheck.unitCount,
              sequences:       structureCheck.sequenceCount,
              lessons:         structureCheck.lessonCount,
              structureValid:  structureCheck.valid,
              missingIds:      structureCheck.missingScaffoldIds.length,
            })
          } else {
            programme = { ...parsedProg, schema_version: 'v2' as const }
          }
          buildState.curriculum = stepSuccess()
          console.info('[SPIE_PROGRAMME_VALIDATION_OK]', {
            packId,
            classeId:           input.classe_id,
            unites:             parsedProg.unites.length,
            outcomesExtracted:  structuredCtx.outcomesExtracted,
            outcomeCount:       structuredCtx.outcomeCount,
            schemaVersion:      programme.schema_version,
          })
        }

        const nbLeconsTotales = programme.unites.reduce((s, u) => s + u.lecons.length, 0)
        console.info('[SPIE]', { packId, classeId: input.classe_id, step: 'curriculum', phase: 'complete', unites: programme.unites.length, lecons: nbLeconsTotales })
        send({ step: 'curriculum', statut: 'termine', message: `Curriculum analysé — ${programme.unites.length} unités structurées ✓`, progress: 30 })

        // ── ÉTAPE 3 : Syllabus ────────────────────────────────────────────────
        const skipSyllabus = !!(input.reprendre && buildState.syllabus.status === 'success')

        send({
          step: 'syllabus', statut: 'en_cours',
          message: skipSyllabus ? 'Syllabus existant confirmé…' : 'Génération du syllabus…',
          progress: 32,
        })

        let syllabus: PackSyllabus | null = null

        if (!skipSyllabus) {
          const sylStart = Date.now()
          let rawSylCapture = ''
          let sylParseError: string | null = null
          let sylValidationError: string | null = null

          // Extraction + parse JSON avec réparation trailing commas
          const sylExtract = (raw: string): { data: PackSyllabus | null; error: string | null } => {
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            const st    = clean.indexOf('{')
            const en    = clean.lastIndexOf('}')
            const str   = st >= 0 && en > st ? clean.slice(st, en + 1) : clean
            try { return { data: JSON.parse(str) as PackSyllabus, error: null } } catch (e1) {
              try { return { data: JSON.parse(str.replace(/,\s*([}\]])/g, '$1')) as PackSyllabus, error: null } }
              catch (e2) { return { data: null, error: e2 instanceof Error ? e2.message : String(e2) } }
            }
          }

          try {
            // ── TENTATIVE 1 : prompt V3 (phase pédagogique) ───────────────────
            const t1Start = Date.now()
            const sylMsg1 = await anthropic.messages.create({
              model:      'claude-sonnet-4-6',
              max_tokens: 2500,
              system: `RETURN ONLY VALID JSON. No markdown. No \`\`\`json. No introduction. No commentary. Start with {. Every opened object and array MUST be closed.`,
              messages: [{
                role: 'user',
                content: `Génère un syllabus pédagogique professionnel en JSON pour :
Matière : ${input.matiere} | Niveau : ${input.niveau} | Province : ${input.province ?? 'Canada'} | Durée : ${nbSemaines} semaines
Contexte curriculaire : ${curriculumCtx.substring(0, 600)}

Retourne UNIQUEMENT ce JSON (concis, factuel, ancré dans le curriculum fourni) :
{
  "titre_cours": "${input.matiere} — ${input.niveau}",
  "niveau": "${input.niveau}",
  "matiere": "${input.matiere}",
  "description_cours": "Description du cours en 2-3 phrases — portée, contexte, public cible.",
  "mission_cours": "Pourquoi ce cours est essentiel à la formation de l'élève (1-2 phrases).",
  "objectifs_generaux": ["Objectif 1", "Objectif 2", "Objectif 3"],
  "grandes_idees": ["Grande idée 1", "Grande idée 2", "Grande idée 3"],
  "resultats_apprentissage": ["L'élève peut...", "L'élève peut...", "L'élève peut...", "L'élève peut...", "L'élève peut..."],
  "methodes_pedagogiques": ["Méthode 1", "Méthode 2", "Méthode 3"],
  "methodes_evaluation": ["Évaluation formative", "Évaluation sommative", "Méthode 3"],
  "competences_developpees": ["Compétence transversale 1", "Compétence transversale 2"],
  "attentes_classe": ["Attente 1", "Attente 2", "Attente 3", "Attente 4"],
  "version": "3.0"
}`,
              }],
            })

            const raw1    = sylMsg1.content[0].type === 'text' ? sylMsg1.content[0].text : ''
            const stop1   = sylMsg1.stop_reason ?? 'unknown'
            const iToks1  = sylMsg1.usage?.input_tokens  ?? 0
            const oToks1  = sylMsg1.usage?.output_tokens ?? 0

            console.info('[SPIE_SYLLABUS_AI_RESULT]', {
              attempt: 1, model: 'claude-sonnet-4-6', maxTokens: 2000,
              stopReason: stop1, inputTokens: iToks1, outputTokens: oToks1,
              rawLength: raw1.length, rawStart: raw1.slice(0, 300), rawEnd: raw1.slice(-500),
              durationMs: Date.now() - t1Start,
            })

            rawSylCapture = raw1
            const res1    = sylExtract(raw1)
            let parsed: PackSyllabus | undefined

            if (res1.data) {
              parsed = res1.data
            } else if (res1.error?.includes('Unexpected end') || stop1 === 'max_tokens') {
              // ── TRONCATURE DÉTECTÉE → TENTATIVE 2 ultra-compacte ────────────
              sylParseError = `Troncature tentative 1 : ${res1.error}`
              console.info('[SPIE]', { packId, classeId: input.classe_id, step: 'syllabus', phase: 'retry', stopReason: stop1 })

              const t2Start = Date.now()
              const sylMsg2 = await anthropic.messages.create({
                model:      'claude-sonnet-4-6',
                max_tokens: 1200,
                system: `RETURN ONLY VALID JSON. Start with {. Close every bracket. Concise values only.`,
                messages: [{
                  role: 'user',
                  content: `Syllabus JSON for ${input.matiere} level ${input.niveau} in ${input.province ?? 'Canada'}. Return ONLY this JSON:
{
  "titre_cours": "${input.matiere} — ${input.niveau}",
  "niveau": "${input.niveau}",
  "matiere": "${input.matiere}",
  "description_cours": "Description du cours.",
  "mission_cours": "Mission du cours.",
  "objectifs_generaux": ["Objectif 1", "Objectif 2"],
  "grandes_idees": ["Idée clé"],
  "resultats_apprentissage": ["L'élève peut...", "L'élève peut..."],
  "methodes_pedagogiques": ["Direct", "Coopératif"],
  "methodes_evaluation": ["Formative", "Sommative"],
  "attentes_classe": ["Respecter les délais", "Participer activement"],
  "version": "3.0"
}`,
                }],
              })

              const raw2   = sylMsg2.content[0].type === 'text' ? sylMsg2.content[0].text : ''
              const stop2  = sylMsg2.stop_reason ?? 'unknown'
              const iToks2 = sylMsg2.usage?.input_tokens  ?? 0
              const oToks2 = sylMsg2.usage?.output_tokens ?? 0

              console.info('[SPIE_SYLLABUS_AI_RESULT]', {
                attempt: 2, model: 'claude-sonnet-4-6', maxTokens: 800,
                stopReason: stop2, inputTokens: iToks2, outputTokens: oToks2,
                rawLength: raw2.length, rawStart: raw2.slice(0, 300), rawEnd: raw2.slice(-500),
                durationMs: Date.now() - t2Start,
              })

              rawSylCapture = raw2
              const res2   = sylExtract(raw2)

              if (res2.data) {
                parsed = res2.data
                sylParseError += ' | Récupération tentative 2 OK'
              } else {
                sylParseError += ` | Tentative 2 invalide : ${res2.error}`
                throw new Error(`JSON invalide après 2 tentatives (original: ${res1.error})`)
              }
            } else {
              sylParseError = res1.error ?? 'erreur inconnue'
              throw new Error(`JSON invalide (original: ${sylParseError})`)
            }

            // ── Normalisation et validation sémantique ────────────────────────
            if (parsed) {
              const rawP = parsed as Record<string, unknown>
              const titreCours: string =
                parsed.titre_cours ||
                rawP['titre'] as string ||
                rawP['title'] as string ||
                ''

              if (!titreCours) {
                sylValidationError = `titre_cours absent — raw[0:200]: ${rawSylCapture.substring(0, 200)}`
                console.error('[build-year][syllabus] FAIL validation', { packId, detail: sylValidationError })
                buildState.syllabus = stepError('Syllabus incomplet — titre_cours absent')
              } else {
                if (!parsed.titre_cours) {
                  sylParseError = (sylParseError ? sylParseError + ' | ' : '') + 'titre_cours dérivé de champ alternatif'
                }
                // ── Phase 1 result : contenu pédagogique IA ───────────────────
                const phase1: PackSyllabus = {
                  ...parsed,
                  titre_cours:             titreCours,
                  description_cours:       parsed.description_cours ?? parsed.description,
                  resultats_apprentissage: parsed.resultats_apprentissage?.length > 0
                    ? parsed.resultats_apprentissage
                    : [`Résultats d'apprentissage — ${input.matiere} ${input.niveau}`],
                  created_at: new Date().toISOString(),
                }
                // ── Phase 2 déterministe : politiques + calendrier ────────────
                syllabus = {
                  ...phase1,
                  politique_presence:       'À compléter par l\'enseignant selon les règles de l\'établissement.',
                  politique_retards:        'À compléter par l\'enseignant.',
                  politique_remise_travaux: 'À compléter par l\'enseignant.',
                  politique_travaux_retard: 'À compléter par l\'enseignant.',
                  integrite_academique:     phase1.integrite_academique ??
                    'Toute forme de plagiat ou de tricherie est strictement interdite et sera traitée conformément aux politiques de l\'établissement.',
                  communication:   phase1.communication ?? { courriel: '', disponibilites: 'À préciser', plateforme: 'À préciser' },
                  apercu_calendrier: programme ? buildAperçuCalendrier(programme) : [],
                  genere_par_ia:   true,
                  generated_at:    new Date().toISOString(),
                  edited_sections: [],
                  version:         '3.0',
                }
                buildState.syllabus = stepSuccess()
              }
            }
          } catch (e) {
            sylParseError = e instanceof Error ? e.message : 'erreur inconnue'
            console.error('[build-year][syllabus] FAIL parse/call', { packId, error: sylParseError, raw: rawSylCapture.substring(0, 500) })
            buildState.syllabus = stepError(`Parse échoué : ${sylParseError}`)
          }

          if (buildState.syllabus.status !== 'success') {
            console.error('[SPIE_SYLLABUS_FAILED]', {
              packId,
              classeId:        input.classe_id,
              model:           'claude-sonnet-4-6',
              rawLength:       rawSylCapture?.length ?? 0,
              rawPreview:      rawSylCapture?.slice(0, 500),
              parseError:      sylParseError,
              validationError: sylValidationError,
              syllabusOk:      false,
              totalDurationMs: Date.now() - sylStart,
            })
          }

          // SSE reflète l'état réel — MISSION 6, 15
          if (syllabus) {
            console.info('[SPIE]', { packId, classeId: input.classe_id, step: 'syllabus', phase: 'complete', durationMs: Date.now() - sylStart })
            send({ step: 'syllabus', statut: 'termine', message: 'Syllabus généré et validé ✓', progress: 45 })
          } else {
            console.error('[SPIE_BUILD_FAILED]', { packId, classeId: input.classe_id, step: 'syllabus', phase: 'validate', error: buildState.syllabus.error })
            send({ step: 'syllabus', statut: 'erreur', message: 'Le syllabus n\'a pas pu être généré.', progress: 45 })
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

        // ── FAIL-FAST : MISSION 5 + 6 — Syllabus requis pour toutes les étapes aval ──
        const syllabusOk = buildState.syllabus.status === 'success' || buildState.syllabus.status === 'skipped'
        if (!syllabusOk) {
          const blockMsg = 'Bloqué — syllabus requis pour garantir la cohérence pédagogique.'
          send({ step: 'programme_annuel', statut: 'bloque', message: blockMsg, progress: 47 })
          send({ step: 'plans_lecon',      statut: 'bloque', message: blockMsg, progress: 62 })
          send({ step: 'premiere_lecon',   statut: 'bloque', message: blockMsg, progress: 80 })
          send({ step: 'quiz',             statut: 'bloque', message: blockMsg, progress: 88 })
          if (packId) {
            await supabase.from('teaching_packs').update({
              statut: 'erreur',
              contenu_json: { build_state: buildState },
              error_message: 'Syllabus non généré — construction interrompue',
            }).eq('id', packId)
          }
          send({
            step: 'erreur', statut: 'erreur',
            message: 'La construction est arrêtée pour protéger la cohérence de votre année.',
            teaching_pack_id: packId ?? undefined,
            progress: 100,
          })
          controller.close(); return
        }

        // ── ÉTAPE 4 : Sauvegarde programme annuel ─────────────────────────────
        if (!programmeFromDB) {
          send({ step: 'programme_annuel', statut: 'en_cours', message: 'Sauvegarde du plan annuel…', progress: 47 })

          // Idempotence : check par teaching_pack_id — maybeSingle pour 0 lignes (nouvelle classe)
          console.info('[SPIE]', { packId, classeId: input.classe_id, step: 'programme_annuel', phase: 'persist' })
          const { data: existingProgRow } = packId
            ? await supabase.from('programme_annuel').select('id').eq('teaching_pack_id', packId).maybeSingle()
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
                nb_unites:        programme.unites.length,
                nb_lecons_total:  nbLeconsTotales,
                semaines_total:   programme.nb_semaines,
                genere_par_ia:    true,
                modifie_par:      'ia',
              })
              .eq('id', existingProgRow.id)
              .select('id').single()

            if (updateErr || !updated?.id) {
              console.error('[SPIE_BUILD_FAILED]', { packId, classeId: input.classe_id, step: 'programme_annuel', phase: 'update', error: updateErr?.message, code: (updateErr as { code?: string } | null)?.code })
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
                nb_unites:        programme.unites.length,
                nb_lecons_total:  nbLeconsTotales,
                semaines_total:   programme.nb_semaines,
                genere_par_ia:    true,
                valide_par_prof:  false,
                modifie_par:      'ia',
              })
              .select('id').single()

            if (insertErr || !inserted?.id) {
              console.error('[SPIE_BUILD_FAILED]', { packId, classeId: input.classe_id, step: 'programme_annuel', phase: 'insert', error: insertErr?.message, code: (insertErr as { code?: string } | null)?.code })
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
              console.info('[SPIE]', { packId, classeId: input.classe_id, step: 'programme_annuel', phase: 'verified', progId })
              send({ step: 'programme_annuel', statut: 'termine', message: `Plan annuel sauvegardé — ${programme.unites.length} unités, ${nbLeconsTotales} leçons ✓`, progress: 55 })
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

        // ── FAIL-FAST : MISSION 5 — Programme annuel requis pour les étapes aval ─
        if (!progId) {
          const blockMsg = 'Bloqué — plan annuel requis.'
          send({ step: 'plans_lecon',    statut: 'bloque', message: blockMsg, progress: 62 })
          send({ step: 'premiere_lecon', statut: 'bloque', message: blockMsg, progress: 80 })
          send({ step: 'quiz',           statut: 'bloque', message: blockMsg, progress: 88 })
          if (packId) {
            await supabase.from('teaching_packs').update({
              statut: 'erreur',
              contenu_json: { build_state: buildState },
              error_message: 'Plan annuel non persisté — construction partielle',
            }).eq('id', packId)
          }
          send({
            step: 'erreur', statut: 'erreur',
            message: 'Le plan annuel n\'a pas pu être sauvegardé. Réessayez pour continuer.',
            teaching_pack_id: packId ?? undefined,
            progress: 100,
          })
          controller.close(); return
        }

        // ── SHADOW-WRITE V7.5.3 : JSON legacy + tables canoniques ───────────
        // Non-bloquant tant que les lectures restent sur programme_annuel.contenu_json.
        if (packId && progId) {
          const canonicalResult = await shadowWriteCanonicalPedagogicalStructure({
            supabase,
            programme,
            programmeAnnuelId: progId,
            teachingPackId:    packId,
            enseignantId:      profil.id,
            classeId:          input.classe_id,
          })

          if (!canonicalResult.ok) {
            console.warn('[SPIE_CANONICAL_SHADOW_WRITE_WARN]', {
              packId,
              progId,
              classeId: input.classe_id,
              expected: canonicalResult.expected,
              actual:   canonicalResult.actual,
              errors:   canonicalResult.errors,
            })
          }
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

        if (!premiereLeconId && entitlement.first_lesson_complete && premiereUnite?.lecons[0]
            && buildState.plans_lecon.status === 'success') {
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

            // Chercher le dossier lecons (arborescence officielle) → fallback
            let dossierRow: { id: string } | null = null
            const { data: dossierLecons } = await supabase
              .from('dossiers_systeme').select('id')
              .eq('classe_id', input.classe_id).eq('type', 'lecons')
              .order('created_at', { ascending: true }).limit(1).single()
            dossierRow = dossierLecons
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
            console.error('[SPIE_BUILD_FAILED]', { packId, classeId: input.classe_id, step: 'premiere_lecon', phase: 'generate', error: e instanceof Error ? e.message : 'unknown' })
            send({ step: 'premiere_lecon', statut: 'erreur', message: 'La première leçon n\'a pas pu être générée.', progress: 80 })
          }
        } else if (!entitlement.first_lesson_complete) {
          buildState.premiere_lecon = stepSkipped()
          send({ step: 'premiere_lecon', statut: 'ignore', message: 'Première leçon ignorée selon le forfait.', progress: 80 })
        }

        // ── ÉTAPE 7 : Quiz ────────────────────────────────────────────────────
        // V2 : Quiz facultatif — généré depuis la leçon ou depuis Évaluations
        const quizId: string | null = null
        buildState.quiz = stepSkipped()
        send({ step: 'quiz', statut: 'ignore', message: 'Quiz généré séparément depuis la leçon.', progress: 88 })

        // ── ÉTAPE 7.5 : Liaison arborescence dossier de classe ───────────────
        // Non-bloquant — les erreurs sont journalisées mais ne stoppent pas le build
        if (packId && progId) {
          const bindResult = await bindProgrammeToClassFolder({
            supabase,
            classeId:               input.classe_id,
            enseignantId:           profil.id,
            packId,
            progId,
            programme,
            premiereLeconFichierId: premiereLeconId,
          })
          if (bindResult.errors.length) {
            console.warn('[SPIE_BINDING_WARN]', { packId, classeId: input.classe_id, errors: bindResult.errors })
          } else {
            console.info('[SPIE_BINDING]', { packId, classeId: input.classe_id, inserted: bindResult.inserted, updated: bindResult.updated, skipped: bindResult.skipped })
          }
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
