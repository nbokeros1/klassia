import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type_contenu, sujet, duree, instructions, adapter_besoins, contexte, langue } = body

    const isFr = langue !== 'en'

    const typeLabels: Record<string, string> = {
      fiche_lecon: isFr ? 'une fiche de leçon complète avec AVANT (Amorce), PENDANT (Modélisation, Pratique guidée, Pratique autonome) et APRÈS (Clôture, Billet de sortie)' : 'a complete lesson plan with Hook, During (Modelling, Guided Practice, Independent Practice) and After (Closure, Exit Ticket)',
      quiz: isFr ? 'un quiz de 10 questions avec corrigé' : 'a 10-question quiz with answer key',
      evaluation: isFr ? 'une grille d\'évaluation avec critères et niveaux' : 'an assessment rubric with criteria and levels',
      differentiation: isFr ? 'des stratégies de différenciation pédagogique' : 'pedagogical differentiation strategies',
      activite: isFr ? 'une activité inclusive pour tous les profils d\'apprenants' : 'an inclusive activity for all learner profiles',
      plan_cours: isFr ? 'un plan de cours hebdomadaire structuré' : 'a structured weekly course plan',
    }

    const systemPrompt = isFr
      ? `Tu es un assistant pédagogique expert pour enseignants francophones. Tu génères du contenu pédagogique de qualité, pratique et directement utilisable en classe. Tu ne reçois jamais de données nominatives d'élèves. Réponds toujours en français. Sois concret, structuré et professionnel.`
      : `You are an expert pedagogical assistant for English-speaking educators. You generate high-quality, practical instructional content ready to use in class. You never receive student nominative data. Always respond in English. Be concrete, structured and professional.`

    const userPrompt = isFr
      ? `Génère ${typeLabels[type_contenu] || 'du contenu pédagogique'} sur le sujet suivant : "${sujet}".

Contexte de la classe :
${contexte?.classe ? `- Matière : ${contexte.classe.matiere}\n- Niveau : ${contexte.classe.niveau}\n- Nombre d'élèves : ${contexte.classe.nombre_eleves}` : '- Classe non spécifiée'}

Durée prévue : ${duree} minutes
${adapter_besoins ? '\nInclure des adaptations pour élèves à besoins particuliers (dyslexie, TDAH, allophone).' : ''}
${instructions ? `\nInstructions supplémentaires : ${instructions}` : ''}

Génère un contenu complet, structuré et directement utilisable.`
      : `Generate ${typeLabels[type_contenu] || 'pedagogical content'} on the following topic: "${sujet}".

Class context:
${contexte?.classe ? `- Subject: ${contexte.classe.matiere}\n- Level: ${contexte.classe.niveau}\n- Number of students: ${contexte.classe.nombre_eleves}` : '- Class not specified'}

Duration: ${duree} minutes
${adapter_besoins ? '\nInclude adaptations for students with special needs (dyslexia, ADHD, ELL).' : ''}
${instructions ? `\nAdditional instructions: ${instructions}` : ''}

Generate complete, structured and ready-to-use content.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const contenu = message.content[0].type === 'text'
      ? message.content[0].text
      : 'Erreur lors de la génération'

    return NextResponse.json({ contenu })

  } catch (error: any) {
    console.error('Erreur API Anthropic:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}