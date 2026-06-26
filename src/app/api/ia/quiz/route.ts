import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'
import { getMaxTokens } from '@/lib/ia/get-max-tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionIA {
  ordre: number
  type: 'qcm' | 'vrai_faux' | 'reponse_courte'
  enonce: string
  image_url: string | null
  options: string[]
  bonne_reponse: string
  explication: string
  ras_lie: string
  points: number
  duree_secondes: number
}

// ── Questions de démonstration (si pas de clé API) ────────────────────────────

function mockQuestions(nb: number, langue: string): QuestionIA[] {
  const isFr = langue !== 'en'
  const base: QuestionIA[] = isFr
    ? [
        { ordre: 1, type: 'qcm', enonce: "Quelle est la principale fonction de la mitochondrie ?", image_url: null, options: ["Synthèse des protéines","Production d'énergie (ATP)","Division cellulaire","Stockage de l'ADN"], bonne_reponse: "Production d'énergie (ATP)", explication: "La mitochondrie est souvent appelée la 'centrale énergétique' de la cellule.", ras_lie: '', points: 1000, duree_secondes: 20 },
        { ordre: 2, type: 'vrai_faux', enonce: "La photosynthèse se produit dans les chloroplastes.", image_url: null, options: ["Vrai","Faux"], bonne_reponse: "Vrai", explication: "Les chloroplastes contiennent la chlorophylle nécessaire à la photosynthèse.", ras_lie: '', points: 1000, duree_secondes: 15 },
        { ordre: 3, type: 'reponse_courte', enonce: "Nommez les trois états de la matière.", image_url: null, options: [], bonne_reponse: "Solide, liquide, gazeux", explication: "La matière peut exister sous trois états selon la température et la pression.", ras_lie: '', points: 1000, duree_secondes: 30 },
      ]
    : [
        { ordre: 1, type: 'qcm', enonce: "What is the primary function of the mitochondria?", image_url: null, options: ["Protein synthesis","Energy production (ATP)","Cell division","DNA storage"], bonne_reponse: "Energy production (ATP)", explication: "The mitochondria is often called the 'powerhouse' of the cell.", ras_lie: '', points: 1000, duree_secondes: 20 },
        { ordre: 2, type: 'vrai_faux', enonce: "Photosynthesis occurs in the chloroplasts.", image_url: null, options: ["True","False"], bonne_reponse: "True", explication: "Chloroplasts contain chlorophyll needed for photosynthesis.", ras_lie: '', points: 1000, duree_secondes: 15 },
        { ordre: 3, type: 'reponse_courte', enonce: "Name the three states of matter.", image_url: null, options: [], bonne_reponse: "Solid, liquid, gas", explication: "Matter can exist in three states depending on temperature and pressure.", ras_lie: '', points: 1000, duree_secondes: 30 },
      ]
  return base.slice(0, Math.max(1, nb))
}

// ── Extraction JSON depuis la réponse Claude ──────────────────────────────────

function extractJSON(text: string): { questions: QuestionIA[] } | null {
  const attempts: string[] = []

  // 1. Bloc ```json ... ```
  const codeBlock = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/```\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlock) attempts.push(codeBlock[1].trim())

  // 2. Premier { jusqu'au dernier }
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end > start) attempts.push(text.slice(start, end + 1))

  // 3. Texte brut nettoyé
  attempts.push(text.trim())

  for (const raw of attempts) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
        return parsed
      }
    } catch { /* essai suivant */ }
  }
  return null
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY

  const body = await request.json()
  const {
    source = 'manuel',
    lecon_id,
    contenu_lecon = '',
    ras = '',
    rag = '',
    matiere = '',
    niveau = '',
    nb_questions = 10,
    types = ['qcm', 'vrai_faux', 'reponse_courte'],
    langue = 'fr',
    difficulte = 'moyen',
    mode_revision = false,
  } = body

  // ── Pas de clé API → questions de démo ──────────────────────────────────────
  if (!apiKey) {
    return NextResponse.json({
      questions: mockQuestions(nb_questions, langue),
      source_utilisee: 'demo',
      avertissement: '⚠️ Clé API Anthropic non configurée. Questions de démonstration retournées.',
    })
  }

  const isFr = langue !== 'en'

  // ── System prompt ────────────────────────────────────────────────────────────
  const systemPrompt = isFr
    ? `Tu es un enseignant expert qui crée des questions de quiz pédagogiques.
RÈGLE ABSOLUE : ta réponse doit commencer par { et finir par }. Aucun texte avant ni après. Aucune explication. Aucun markdown. JSON pur uniquement.
Génère exactement ${nb_questions} questions variées.
Types : ${types.join(', ')}. Difficulté : ${difficulte}.
${ras ? `RAS ciblés : ${ras}` : ''}
${rag ? `RAG de référence : ${rag}` : ''}
${mode_revision ? 'Inclure des explications pédagogiques détaillées.' : ''}`
    : `You are an expert teacher creating quiz questions.
ABSOLUTE RULE: your response must start with { and end with }. No text before or after. No explanations. No markdown. Pure JSON only.
Generate exactly ${nb_questions} varied questions.
Types: ${types.join(', ')}. Difficulty: ${difficulte}.
${ras ? `Target learning outcomes: ${ras}` : ''}
${rag ? `General outcomes for reference: ${rag}` : ''}
${mode_revision ? 'Include detailed pedagogical explanations.' : ''}`

  // ── User prompt ──────────────────────────────────────────────────────────────
  const typeFormats = isFr
    ? `- qcm : 4 options, une seule bonne réponse
- vrai_faux : options = ["Vrai","Faux"]
- reponse_courte : options = [] (réponse courte attendue)`
    : `- qcm: 4 options, one correct answer
- vrai_faux: options = ["True","False"]
- reponse_courte: options = [] (short answer expected)`

  const contenuSource = source === 'ia_lecon' && contenu_lecon
    ? (isFr ? `\n\nContenu de la leçon :\n${contenu_lecon.slice(0, 4000)}` : `\n\nLesson content:\n${contenu_lecon.slice(0, 4000)}`)
    : ''

  const userPrompt = isFr
    ? `Génère ${nb_questions} questions de quiz pour :
- Matière : ${matiere || 'non spécifiée'}
- Niveau : ${niveau || 'non spécifié'}
- Difficulté : ${difficulte}
${contenuSource}

Format JSON exact attendu :
{
  "questions": [
    {
      "ordre": 1,
      "type": "qcm",
      "enonce": "Question ici ?",
      "image_url": null,
      "options": ["Option A","Option B","Option C","Option D"],
      "bonne_reponse": "Option B",
      "explication": "Explication pédagogique courte",
      "ras_lie": "RAS correspondant si applicable, sinon chaîne vide",
      "points": 1000,
      "duree_secondes": 20
    }
  ]
}

Formats par type :
${typeFormats}

Points suggérés : facile = 500, moyen = 1000, difficile = 2000
Durée suggérée : vrai_faux = 10-15s, qcm = 20-30s, reponse_courte = 30-45s`
    : `Generate ${nb_questions} quiz questions for:
- Subject: ${matiere || 'unspecified'}
- Level: ${niveau || 'unspecified'}
- Difficulty: ${difficulte}
${contenuSource}

Expected JSON format:
{
  "questions": [
    {
      "ordre": 1,
      "type": "qcm",
      "enonce": "Question here?",
      "image_url": null,
      "options": ["Option A","Option B","Option C","Option D"],
      "bonne_reponse": "Option B",
      "explication": "Short pedagogical explanation",
      "ras_lie": "Corresponding learning outcome if applicable, otherwise empty string",
      "points": 1000,
      "duree_secondes": 20
    }
  ]
}

Formats by type:
${typeFormats}

Suggested points: easy = 500, medium = 1000, hard = 2000
Suggested duration: true_false = 10-15s, mcq = 20-30s, short_answer = 30-45s`

  // ── Appel Claude avec retry ───────────────────────────────────────────────────
  const client = new Anthropic({ apiKey })

  let parsed: { questions: QuestionIA[] } | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: getMaxTokens('quiz'),
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      parsed = extractJSON(text)
      if (parsed) break
    } catch (error: any) {
      if (attempt === 1) {
        const msg = error?.status === 401
          ? 'Clé API invalide.'
          : error?.status === 429
          ? 'Limite de taux atteinte. Réessayez dans un instant.'
          : error?.message || 'Erreur serveur'
        return NextResponse.json({ error: `⚠️ ${msg}` }, { status: 500 })
      }
    }
  }

  if (!parsed) {
    return NextResponse.json(
      { error: 'Impossible de générer un JSON valide après 2 tentatives.' },
      { status: 500 }
    )
  }

  // ── Sauvegarde dans generations_ia ────────────────────────────────────────────
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profil } = await supabase
        .from('utilisateurs')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (profil) {
        await supabase.from('generations_ia').insert({
          enseignant_id: profil.id,
          classe_id: body.classe_id || null,
          type_contenu: 'quiz',
          contenu_genere: JSON.stringify(parsed),
          langue,
          sauvegarde: false,
        })
      }
    }
  } catch {
    // Sauvegarde non bloquante
  }

  return NextResponse.json({ questions: parsed.questions })
}
