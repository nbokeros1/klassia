import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import { getBetaEntitlement } from '@/lib/entitlements'
import type { BuildYearWizardInput, BuildYearEvent, TeachingPackContenu, PackSyllabus } from '@/lib/types/teaching-pack'
import type { ContenuProgramme } from '@/lib/types/database'

export const maxDuration = 300

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sse(controller: ReadableStreamDefaultController, event: BuildYearEvent) {
  const enc = new TextEncoder()
  controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`))
}

function buildCurriculumContext(input: BuildYearWizardInput): string {
  const CURRICULA_CONTEXT: Record<string, string> = {
    alberta:     'Alberta Program of Studies (Alberta Education). Learning outcomes, key concepts, essential questions, competencies.',
    ontario:     'The Ontario Curriculum (Ministère de l\'Éducation de l\'Ontario). Expectations: overall and specific.',
    quebec:      'Programme de formation de l\'école québécoise (PFEQ/MEES). Compétences, domaines, progression.',
    bc:          'BC Curriculum. Big ideas, curricular competencies, content learning standards.',
    common_core: 'Common Core State Standards (CCSS, USA).',
    ib:          'International Baccalaureate (IB) Programme.',
    france:      'Programmes de l\'Éducation nationale française (BOEN).',
  }
  if (input.curriculum_source === 'officiel' && input.curriculum_officiel) {
    return `Programme officiel : ${CURRICULA_CONTEXT[input.curriculum_officiel] ?? input.curriculum_officiel}`
  }
  if (input.curriculum_fichier_contenu) {
    return `Curriculum fourni par l'enseignant (${input.curriculum_fichier_nom ?? 'fichier'}):\n${input.curriculum_fichier_contenu.substring(0, 6000)}`
  }
  return `Programme général adapté — ${input.province ?? 'Canada'}`
}

// ─── Route principale ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  let input: BuildYearWizardInput
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const anthropic = new Anthropic({ apiKey })

  // ── Charger le profil enseignant ────────────────────────────────────────────
  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id, forfait, is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const entitlement = getBetaEntitlement(profil.forfait ?? 'gratuit')
  if (!entitlement.build_year_access) {
    return NextResponse.json({ error: 'Accès non autorisé pour ce forfait' }, { status: 403 })
  }

  // ── Pipeline SSE ─────────────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BuildYearEvent) => sse(controller, event)

      let packId: string | null = null
      let progId: string | null = null

      try {
        // ── ÉTAPE 1 : validation ──────────────────────────────────────────────
        send({ step: 'validation', statut: 'en_cours', message: 'Validation de la configuration…', progress: 2 })

        if (!input.classe_id || !input.niveau || !input.matiere) {
          send({ step: 'erreur', statut: 'erreur', message: 'Configuration incomplète : classe, niveau et matière sont requis.' })
          controller.close()
          return
        }

        // Vérifier que la classe appartient à l'enseignant
        const { data: classeRow } = await supabase
          .from('classes')
          .select('id, nom, niveau, matiere')
          .eq('id', input.classe_id)
          .eq('enseignant_id', profil.id)
          .single()

        if (!classeRow) {
          send({ step: 'erreur', statut: 'erreur', message: 'Classe introuvable ou accès non autorisé.' })
          controller.close()
          return
        }

        const nomPack = `${input.matiere} ${input.niveau} — ${input.province ?? 'Canada'} — ${input.annee_scolaire ?? '2026-2027'}`

        // Upsert teaching pack (un seul par classe)
        const { data: packRow } = await supabase
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
          .select()
          .single()

        packId = packRow?.id ?? null
        send({ step: 'validation', statut: 'termine', message: 'Configuration validée ✓', progress: 5 })

        // ── ÉTAPE 2 : curriculum & programme annuel ───────────────────────────
        send({ step: 'curriculum', statut: 'en_cours', message: 'Analyse du curriculum et génération du plan annuel…', progress: 10 })

        const nbSemaines = input.calendrier
          ? Math.max(24, Math.round(
              (new Date(input.calendrier.date_fin).getTime() - new Date(input.calendrier.date_debut).getTime())
              / (7 * 24 * 3600 * 1000)
            ) - (input.calendrier.semaines_tampon ?? 2))
          : 36

        const curriculumCtx = buildCurriculumContext(input)
        const isFr = input.langue !== 'en'

        const progSystemPrompt = isFr
          ? `Tu es un expert en planification pédagogique canadienne. Génère un programme annuel complet, structuré, aligné sur le curriculum. Réponds UNIQUEMENT en JSON valide sans markdown.`
          : `You are a Canadian curriculum planning expert. Generate a complete annual programme. Reply ONLY in valid JSON, no markdown.`

        const progUserPrompt = isFr
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
        {
          "numero": 1,
          "titre": "Titre de la leçon",
          "sujet": "Description pédagogique en 1-2 phrases",
          "duree_minutes": 60,
          "type": "introduction"
        }
      ]
    }
  ]
}

Génère 5 à 7 unités avec 4 à 7 leçons chacune. Distribue les semaines sur ${nbSemaines} semaines.`
          : `Generate a complete annual programme in JSON for ${input.matiere} grade ${input.niveau}. Same structure but in English.`

        const progMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: progSystemPrompt,
          messages: [{ role: 'user', content: progUserPrompt }],
        })

        let programme: ContenuProgramme
        try {
          const raw = progMsg.content[0].type === 'text' ? progMsg.content[0].text : '{}'
          const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          programme = JSON.parse(clean)
        } catch {
          programme = {
            titre: `Programme de ${input.matiere} — ${input.niveau}`,
            nb_semaines: nbSemaines,
            source_curriculum: input.curriculum_officiel ?? 'personnalisé',
            unites: Array.from({ length: 6 }, (_, i) => ({
              numero: i + 1,
              titre: `Unité ${i + 1}`,
              semaine_debut: i * Math.floor(nbSemaines / 6) + 1,
              semaine_fin: (i + 1) * Math.floor(nbSemaines / 6),
              objectifs: ['Objectif principal'],
              lecons: Array.from({ length: 5 }, (_, j) => ({
                numero: i * 5 + j + 1,
                titre: `Leçon ${i * 5 + j + 1}`,
                sujet: 'Contenu à définir',
                duree_minutes: 60,
                type: 'developpement' as const,
              })),
            })),
          }
        }

        const nbLeconsTotales = programme.unites.reduce((s, u) => s + u.lecons.length, 0)
        send({ step: 'curriculum', statut: 'termine', message: `Plan annuel généré — ${programme.unites.length} unités, ${nbLeconsTotales} leçons planifiées ✓`, progress: 30 })

        // ── ÉTAPE 3 : syllabus ────────────────────────────────────────────────
        send({ step: 'syllabus', statut: 'en_cours', message: 'Génération du syllabus…', progress: 32 })

        const syllabusSysPrompt = `Tu es un expert en conception pédagogique. Génère un syllabus de cours complet et professionnel. Réponds UNIQUEMENT en JSON valide sans markdown.`
        const syllabusUserPrompt = `Génère un syllabus de cours en JSON pour :
- Matière : ${input.matiere}
- Niveau : ${input.niveau}
- Province : ${input.province ?? 'Canada'}
- Durée : ${nbSemaines} semaines
- ${curriculumCtx.substring(0, 800)}

Format JSON exact :
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
}`

        let syllabus: PackSyllabus | null = null
        try {
          const sylMsg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: syllabusSysPrompt,
            messages: [{ role: 'user', content: syllabusUserPrompt }],
          })
          const rawSyl = sylMsg.content[0].type === 'text' ? sylMsg.content[0].text : '{}'
          const cleanSyl = rawSyl.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          syllabus = { ...JSON.parse(cleanSyl), created_at: new Date().toISOString() }
        } catch {
          syllabus = null
        }

        send({ step: 'syllabus', statut: 'termine', message: 'Syllabus généré ✓', progress: 45 })

        // ── ÉTAPE 4 : sauvegarder le programme annuel ─────────────────────────
        send({ step: 'programme_annuel', statut: 'en_cours', message: 'Sauvegarde du plan annuel…', progress: 47 })

        // Idempotence : si un programme_annuel existe déjà pour ce pack, le mettre à jour
        const { data: existingProg } = packId
          ? await supabase.from('programme_annuel').select('id').eq('teaching_pack_id', packId).single()
          : { data: null }

        let progRow: { id: string } | null = null
        if (existingProg?.id) {
          const { data: updated } = await supabase
            .from('programme_annuel')
            .update({
              titre:           programme.titre,
              nb_semaines:     programme.nb_semaines,
              contenu_json:    programme,
              genere_par_ia:   true,
              calendrier_json: input.calendrier ?? {},
              syllabus_json:   syllabus ?? {},
            })
            .eq('id', existingProg.id)
            .select('id')
            .single()
          progRow = updated
        } else {
          const { data: inserted } = await supabase
            .from('programme_annuel')
            .insert({
              classe_id:       input.classe_id,
              titre:           programme.titre,
              nb_semaines:     programme.nb_semaines,
              contenu_json:    programme,
              genere_par_ia:   true,
              teaching_pack_id: packId,
              calendrier_json: input.calendrier ?? {},
              syllabus_json:   syllabus ?? {},
            })
            .select('id')
            .single()
          progRow = inserted
        }

        progId = progRow?.id ?? null

        // Marquer le curriculum comme chargé dans la classe
        await supabase
          .from('classes')
          .update({ curriculum_charge: true })
          .eq('id', input.classe_id)

        send({ step: 'programme_annuel', statut: 'termine', message: `Plan annuel sauvegardé ✓`, progress: 55 })

        // ── ÉTAPE 5 : plans de leçon 1re séquence ────────────────────────────
        send({ step: 'plans_lecon', statut: 'en_cours', message: 'Structuration des plans de leçon de la 1re séquence…', progress: 57 })
        // Les plans sont déjà dans programme.unites[0].lecons — pas besoin d'un appel IA supplémentaire
        const premiereUnite = programme.unites[0]
        const nbPlansLecon = premiereUnite?.lecons.length ?? 0
        send({ step: 'plans_lecon', statut: 'termine', message: `${nbPlansLecon} plans de leçon structurés ✓`, progress: 62 })

        // ── ÉTAPE 6 : première leçon complète ────────────────────────────────
        let premiereLeconId: string | null = null
        let premiereLeconTitre: string | null = null

        if (entitlement.first_lesson_complete && premiereUnite?.lecons[0]) {
          const pl = premiereUnite.lecons[0]
          premiereLeconTitre = pl.titre
          send({ step: 'premiere_lecon', statut: 'en_cours', message: `Développement de la leçon "${pl.titre}"…`, progress: 64 })

          const leconSysPrompt = `Tu es un expert en planification pédagogique canadienne. Génère une leçon complète et détaillée prête à enseigner. Réponds en Markdown structuré.`
          const leconUserPrompt = `Génère une leçon COMPLÈTE pour :
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
(liste complète)

## ⚡ Mise en contexte / Activation (${Math.round(pl.duree_minutes * 0.1)} min)
(accroche, question provocatrice, lien avec les connaissances antérieures)

## 📚 Enseignement / Modélisation (${Math.round(pl.duree_minutes * 0.25)} min)
(explication claire avec exemples concrets, stratégies visuelles)

## 🤝 Pratique guidée (${Math.round(pl.duree_minutes * 0.2)} min)
(activités guidées avec instructions étape par étape)

## 💡 Pratique autonome (${Math.round(pl.duree_minutes * 0.25)} min)
(exercices, tâches, questions de pratique)

## ♿ Différenciation
- Pour les élèves en difficulté : (adaptations concrètes)
- Pour les élèves avancés : (enrichissement)
- Pour les élèves allophones : (supports)

## 📊 Évaluation formative
(critères de réussite, indicateurs observables, questions de vérification)

## 🏠 Prolongement / Devoir (optionnel)
(si applicable)

## ✅ Critères de réussite
(liste des indicateurs que l'élève maîtrise l'objectif)`

          try {
            const leconMsg = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 3000,
              system: leconSysPrompt,
              messages: [{ role: 'user', content: leconUserPrompt }],
            })
            const contenuLecon = leconMsg.content[0].type === 'text' ? leconMsg.content[0].text : ''

            // Chercher le dossier plans_lecons de la classe — fallback sur n'importe quel dossier
            let dossierRow: { id: string } | null = null
            const { data: dossierPlans } = await supabase
              .from('dossiers_systeme')
              .select('id')
              .eq('classe_id', input.classe_id)
              .eq('type', 'plans_lecons')
              .order('created_at', { ascending: true })
              .limit(1)
              .single()
            dossierRow = dossierPlans
            if (!dossierRow) {
              const { data: fallback } = await supabase
                .from('dossiers_systeme')
                .select('id')
                .eq('classe_id', input.classe_id)
                .order('created_at', { ascending: true })
                .limit(1)
                .single()
              dossierRow = fallback
            }

            if (dossierRow) {
              const { data: fichierRow } = await supabase
                .from('fichiers_dossier')
                .insert({
                  dossier_id:     dossierRow.id,
                  enseignant_id:  profil.id,
                  classe_id:      input.classe_id,
                  nom:            pl.titre,
                  type_fichier:   'lecon_complete',
                  contenu_html:   contenuLecon,
                  statut:         'prete',
                  indexe_studio_ia: false,
                })
                .select()
                .single()
              premiereLeconId = fichierRow?.id ?? null
            }

            send({ step: 'premiere_lecon', statut: 'termine', message: `Leçon "${pl.titre}" prête ✓`, progress: 80 })
          } catch {
            send({ step: 'premiere_lecon', statut: 'erreur', message: 'Génération de la leçon partielle — le plan annuel reste disponible.', progress: 80 })
          }
        } else {
          send({ step: 'premiere_lecon', statut: 'ignore', message: 'Première leçon ignorée selon le forfait.', progress: 80 })
        }

        // ── ÉTAPE 7 : quiz ────────────────────────────────────────────────────
        if (entitlement.first_lesson_quiz && premiereUnite?.lecons[0]) {
          send({ step: 'quiz', statut: 'en_cours', message: 'Génération du quiz de la 1re leçon…', progress: 82 })
          // Le quiz est simplifié — on génère et on le sauvegarde comme fichier
          try {
            const quizPrompt = `Génère un quiz formatif de 6 questions pour la leçon "${premiereUnite.lecons[0].titre}" en ${input.matiere} niveau ${input.niveau}. Inclus des questions à choix multiples, vrai/faux, et courte réponse. Format Markdown avec les réponses à la fin.`
            const quizMsg = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1200,
              system: `Tu es un expert en évaluation pédagogique. Génère des quiz formatifs concis et efficaces.`,
              messages: [{ role: 'user', content: quizPrompt }],
            })
            const quizContenu = quizMsg.content[0].type === 'text' ? quizMsg.content[0].text : ''

            // Chercher le dossier pour le quiz — fallback sur n'importe quel dossier
            let quizDossierRow: { id: string } | null = null
            const { data: dossierEval } = await supabase
              .from('dossiers_systeme')
              .select('id')
              .eq('classe_id', input.classe_id)
              .in('type', ['lecons', 'evaluations_sommatives'])
              .order('created_at', { ascending: true })
              .limit(1)
              .single()
            quizDossierRow = dossierEval
            if (!quizDossierRow) {
              const { data: fallbackQuiz } = await supabase
                .from('dossiers_systeme')
                .select('id')
                .eq('classe_id', input.classe_id)
                .order('created_at', { ascending: true })
                .limit(1)
                .single()
              quizDossierRow = fallbackQuiz
            }

            if (quizDossierRow) {
              await supabase.from('fichiers_dossier').insert({
                dossier_id:    quizDossierRow.id,
                enseignant_id: profil.id,
                classe_id:     input.classe_id,
                nom:           `Quiz — ${premiereUnite.lecons[0].titre}`,
                type_fichier:  'quiz',
                contenu_html:  quizContenu,
                statut:        'prete',
              })
            }
            send({ step: 'quiz', statut: 'termine', message: 'Quiz généré ✓', progress: 88 })
          } catch {
            send({ step: 'quiz', statut: 'erreur', message: 'Quiz non généré — le reste du pack est disponible.', progress: 88 })
          }
        }

        // ── ÉTAPE 8 : sauvegarde finale du Teaching Pack ──────────────────────
        send({ step: 'sauvegarde', statut: 'en_cours', message: 'Finalisation du Teaching Pack…', progress: 90 })

        const contenuFinal: TeachingPackContenu = {
          syllabus:                syllabus ?? undefined,
          nb_unites:               programme.unites.length,
          nb_lecons_planifiees:    nbLeconsTotales,
          nb_lecons_generees:      premiereLeconId ? 1 : 0,
          premiere_lecon_complete: !!premiereLeconId,
          premiere_lecon_id:       premiereLeconId ?? undefined,
          premiere_lecon_titre:    premiereLeconTitre ?? undefined,
          etapes_completees:       ['validation', 'curriculum', 'syllabus', 'programme_annuel', 'plans_lecon', ...(premiereLeconId ? ['premiere_lecon' as const] : [])],
        }

        const statutFinal = premiereLeconId ? 'pret' : 'partiellement_genere'

        if (packId) {
          await supabase
            .from('teaching_packs')
            .update({
              statut:              statutFinal,
              programme_annuel_id: progId,
              contenu_json:        contenuFinal,
              error_message:       null,
            })
            .eq('id', packId)
        }

        // Indexation mémoire studio IA (pour le contexte PCE)
        // Toujours exécuté — même si programme_annuel a échoué, le contexte pack est utile
        await supabase
          .from('studio_ia_memoire')
          .upsert({
            enseignant_id: profil.id,
            classe_id:     input.classe_id,
            cle:           `programme_annuel_${input.classe_id}`,
            contenu:       {
              programme_id: progId,
              pack_id:      packId,
              titre:        programme.titre,
              unites:       programme.unites.length,
              matiere:      input.matiere,
              niveau:       input.niveau,
              province:     input.province,
            },
            type:          'contexte',
          }, { onConflict: 'enseignant_id,cle,type' })

        send({ step: 'sauvegarde', statut: 'termine', message: 'Pack sauvegardé ✓', progress: 98 })

        // ── TERMINÉ ────────────────────────────────────────────────────────────
        send({
          step:              'termine',
          statut:            'termine',
          message:           'Votre année scolaire est construite ! 🎉',
          teaching_pack_id:  packId ?? undefined,
          programme_annuel_id: progId ?? undefined,
          progress:          100,
        })

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inattendue'
        send({ step: 'erreur', statut: 'erreur', message: `Erreur : ${msg}`, detail: String(err) })

        // Marquer le pack en erreur si créé
        if (packId) {
          await supabase
            .from('teaching_packs')
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
