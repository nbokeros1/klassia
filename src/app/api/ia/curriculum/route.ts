import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMaxTokens } from '@/lib/ia/get-max-tokens'
import { requireAuth } from '@/lib/api-auth'

export const maxDuration = 60

const CURRICULA_CONTEXT: Record<string, string> = {
  quebec:      'Programme de formation de l\'école québécoise (PFEQ/MEES). Compétences transversales, domaines d\'apprentissage, progression des apprentissages.',
  ontario:     'The Ontario Curriculum (Ministère de l\'Éducation de l\'Ontario). Expectations: overall and specific, cross-curricular connections.',
  alberta:     'Alberta Program of Studies (Alberta Education). Learning outcomes, key concepts, essential questions, competencies.',
  bc:          'BC Curriculum (British Columbia Ministry of Education). Big ideas, curricular competencies, content learning standards.',
  common_core: 'Common Core State Standards (CCSS, USA). Standards for Mathematical Practice / English Language Arts standards.',
  ib:          'International Baccalaureate (IB) Programme. Transdisciplinary themes, approaches to learning, learner profile.',
  france:      'Programmes de l\'Éducation nationale française (BOEN). Compétences du socle commun, objectifs de cycle.',
}

export async function POST(request: Request) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Clé API Anthropic manquante' }, { status: 200 })
  }

  try {
    const body = await request.json()
    const {
      classe_id,
      contenu_curriculum,   // uploaded file content (optional)
      nom_fichier,
      curriculum_officiel,  // 'quebec' | 'ontario' | 'alberta' | ...
      matiere,
      niveau,
      nb_semaines = 36,
      langue = 'fr',
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const client = new Anthropic({ apiKey })
    const isFr = langue !== 'en'

    // Build context for the prompt
    const curriculumCtx = curriculum_officiel && CURRICULA_CONTEXT[curriculum_officiel]
      ? `Programme officiel : ${CURRICULA_CONTEXT[curriculum_officiel]}`
      : contenu_curriculum
      ? `Curriculum fourni par l'enseignant (${nom_fichier || 'fichier'}):\n${contenu_curriculum?.substring(0, 6000)}`
      : `Programme général adapté au niveau`

    const systemPrompt = isFr
      ? `Tu es un expert en planification pédagogique canadienne. Tu génères des programmes annuels complets, structurés, alignés sur les curricula officiels. Réponds UNIQUEMENT en JSON valide sans markdown ni backtick.`
      : `You are a Canadian curriculum planning expert. You generate complete annual programmes aligned with official curricula. Reply ONLY in valid JSON without markdown or backtick.`

    const userPrompt = isFr
      ? `Génère un programme annuel complet en JSON pour :
- Matière : ${matiere || 'non spécifiée'}
- Niveau : ${niveau || 'non spécifié'}
- Durée : ${nb_semaines} semaines

${curriculumCtx}

Format JSON exact (SANS markdown) :
{
  "titre": "Programme de ${matiere || 'Matière'} — ${niveau || 'Niveau'}",
  "nb_semaines": ${nb_semaines},
  "source_curriculum": "${curriculum_officiel || 'personnalisé'}",
  "unites": [
    {
      "numero": 1,
      "titre": "Titre de l'unité",
      "theme": "thème central",
      "semaine_debut": 1,
      "semaine_fin": 6,
      "objectifs": ["objectif 1", "objectif 2", "objectif 3"],
      "competences": ["compétence visée"],
      "lecons": [
        {
          "numero": 1,
          "titre": "Titre de la leçon",
          "sujet": "Description pédagogique en 1-2 phrases",
          "duree_minutes": 75,
          "type": "introduction|developpement|evaluation|synthese"
        }
      ]
    }
  ]
}

Génère 5 à 7 unités avec 4 à 7 leçons chacune. Distribue les semaines sur ${nb_semaines} semaines scolaires. Aligne sur le curriculum spécifié.`
      : `Generate a complete annual programme in JSON for:
- Subject: ${matiere}
- Level: ${niveau}
- Duration: ${nb_semaines} weeks
${curriculumCtx}
Same JSON structure but in English.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: getMaxTokens('curriculum'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const texte = message.content[0].type === 'text' ? message.content[0].text : ''
    let programme: any

    try {
      const clean = texte.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      programme = JSON.parse(clean)
    } catch {
      programme = {
        titre: `Programme de ${matiere || 'Matière'} — ${niveau || 'Niveau'}`,
        nb_semaines,
        source_curriculum: curriculum_officiel || 'personnalisé',
        unites: Array.from({ length: 6 }, (_, i) => ({
          numero: i + 1,
          titre: `Unité ${i + 1}`,
          theme: '',
          semaine_debut: i * 6 + 1,
          semaine_fin: (i + 1) * 6,
          objectifs: ['Objectif principal', 'Objectif secondaire'],
          competences: [],
          lecons: Array.from({ length: 5 }, (_, j) => ({
            numero: i * 5 + j + 1,
            titre: `Leçon ${i * 5 + j + 1}`,
            sujet: 'Contenu à définir',
            duree_minutes: 75,
            type: 'developpement',
          })),
        })),
      }
    }

    // Save to programme_annuel (no unites table dependency)
    if (classe_id) {
      const { data: savedProg } = await supabase
        .from('programme_annuel')
        .insert({
          classe_id,
          titre: programme.titre,
          nb_semaines: programme.nb_semaines || nb_semaines,
          contenu_json: programme,
          genere_par_ia: true,
        })
        .select()
        .single()

      return NextResponse.json({ success: true, programme, saved: !!savedProg, programme_id: savedProg?.id })
    }

    return NextResponse.json({ success: true, programme, saved: false })

  } catch (error: any) {
    console.error('Erreur API curriculum:', error)
    const msg = error?.status === 401
      ? 'Clé API invalide.'
      : error?.status === 429
      ? 'Limite atteinte, réessayez.'
      : error?.message || 'Erreur serveur'
    return NextResponse.json({ success: false, error: msg }, { status: 200 })
  }
}
