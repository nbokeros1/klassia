import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { classe_id, contenu_curriculum, nom_fichier } = await request.json()

    // 1. Générer le programme avec Claude
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `Tu es un expert en planification pédagogique.
Tu analyses des curricula et génères des programmes annuels structurés.
Réponds UNIQUEMENT en JSON valide, sans aucun markdown ni backtick.`,
      messages: [{
        role: 'user',
        content: `Analyse ce curriculum et génère un programme annuel complet en JSON.

CURRICULUM:
${contenu_curriculum}

Génère exactement ce JSON:
{
  "titre": "Programme de [matière] [niveau]",
  "nb_semaines": 36,
  "unites": [
    {
      "numero": 1,
      "titre": "Titre de l'unité",
      "semaine_debut": 1,
      "semaine_fin": 8,
      "objectifs": ["objectif 1", "objectif 2", "objectif 3"],
      "lecons": [
        {
          "numero": 1,
          "titre": "Titre de la leçon",
          "sujet": "Description courte de la leçon",
          "duree_minutes": 75
        }
      ]
    }
  ]
}

Génère entre 4 et 6 unités avec 4 à 8 leçons chacune.`
      }]
    })

    const texte = message.content[0].type === 'text' ? message.content[0].text : ''

    let programme
    try {
      const clean = texte.replace(/```json|```/g, '').trim()
      programme = JSON.parse(clean)
    } catch {
      programme = {
        titre: 'Programme généré',
        nb_semaines: 36,
        unites: [
          {
            numero: 1,
            titre: 'Unité 1 — Introduction',
            semaine_debut: 1,
            semaine_fin: 8,
            objectifs: ['Objectif 1', 'Objectif 2'],
            lecons: [
              { numero: 1, titre: 'Leçon 1', sujet: 'Introduction', duree_minutes: 75 },
              { numero: 2, titre: 'Leçon 2', sujet: 'Développement', duree_minutes: 75 },
            ]
          }
        ]
      }
    }

    // 2. Sauvegarder le programme dans Supabase
    const { data: progData, error: progError } = await supabase
      .from('programme_annuel')
      .insert({
        classe_id,
        titre: programme.titre,
        nb_semaines: programme.nb_semaines,
        contenu_json: programme,
        genere_par_ia: true,
      })
      .select()
      .single()

    if (progError) {
      console.error('Erreur sauvegarde programme:', progError)
      return NextResponse.json({ success: true, programme, saved: false })
    }

    // 3. Sauvegarder les unités et leçons
    for (const unite of programme.unites || []) {
      const { data: uniteData, error: uniteError } = await supabase
        .from('unites')
        .insert({
          programme_id: progData.id,
          classe_id,
          numero: unite.numero,
          titre: unite.titre,
          semaine_debut: unite.semaine_debut,
          semaine_fin: unite.semaine_fin,
          objectifs: unite.objectifs || [],
          statut: 'a_venir',
        })
        .select()
        .single()

      if (!uniteError && uniteData) {
        for (const lecon of unite.lecons || []) {
          await supabase.from('lecons').insert({
            unite_id: uniteData.id,
            classe_id,
            numero: lecon.numero,
            titre: lecon.titre,
            sujet: lecon.sujet,
            duree_minutes: lecon.duree_minutes || 75,
            statut: 'a_venir',
          })
        }
      }
    }

    return NextResponse.json({ success: true, programme, saved: true })

  } catch (error: any) {
    console.error('Erreur API curriculum:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}