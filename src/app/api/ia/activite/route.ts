import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeActivite = 'formative' | 'sommative' | 'groupe' | 'nuage_mots' | 'devoir'

interface EleveProfil {
  prenom?: string
  profil_type: string
  besoins?: string[]
  notes_enseignant?: string
}

interface ActiviteOptions {
  duree?: number
  nb_questions?: number
  nb_groupes?: number
  nb_mots?: number
  criteres?: string[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEPARATOR = '=== VERSION DIFFÉRENCIÉE ==='

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error, session } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: '⚠️ Clé API Anthropic non configurée.' },
      { status: 200 }
    )
  }

  try {
    const body = await request.json()
    const {
      type,
      lecon_id,
      contenu_lecon,
      classe,
      options = {} as ActiviteOptions,
      profils_eleves = [] as EleveProfil[],
      langue = 'fr',
    } = body

    const isFr = langue !== 'en'
    const client = new Anthropic({ apiKey })

    // ── Contexte classe ──────────────────────────────────────────────────────
    const classeCtx = classe
      ? `Classe : ${classe.nom || '—'} | Niveau : ${classe.niveau || '—'} | Matière : ${classe.matiere || '—'} | ${classe.nombre_eleves || '—'} élèves`
      : 'Classe non spécifiée'

    const contenuCtx = contenu_lecon
      ? `\n\nContenu de la leçon (extrait) :\n${contenu_lecon.replace(/<[^>]+>/g, ' ').substring(0, 1500)}`
      : ''

    // ── System prompt selon type ─────────────────────────────────────────────
    const typePrompts: Record<TypeActivite, string> = {
      formative: isFr
        ? `Tu es un expert en évaluation pédagogique. Génère une évaluation formative courte (5-10 min) avec :
- 3 à 5 questions ciblées sur les objectifs de la leçon
- Critères d'observation clairs pour l'enseignant
- Barème simple (0-1-2 points par question)
- Suggestions de rétroaction
Format HTML propre avec h3 pour les sections.`
        : `You are a pedagogical assessment expert. Generate a short formative assessment (5-10 min).`,

      sommative: isFr
        ? `Tu es un expert en évaluation sommative. Génère une évaluation complète avec :
- Questions variées (QCM, réponse courte, développement)
- Grille de correction détaillée
- Critères alignés sur les attentes provinciales
- Barème clair (total 20 ou 100 points)
Format HTML structuré.`
        : `Generate a complete summative assessment with marking scheme.`,

      groupe: isFr
        ? `Tu es un expert en apprentissage coopératif. Génère une activité de groupe avec :
- ${options.nb_groupes || 4} groupes de travail
- Rôles définis pour chaque membre (animateur, secrétaire, porte-parole, observateur)
- Consignes claires étape par étape
- Grille d'observation pour l'enseignant
- Critères de succès mesurables
Format HTML avec tableaux.`
        : `Generate a cooperative learning activity with defined roles.`,

      nuage_mots: isFr
        ? `Tu es un expert en vocabulaire pédagogique. Génère une liste de ${options.nb_mots || 20} mots-clés de cette leçon.
Format de réponse OBLIGATOIRE — liste JSON uniquement :
{"mots": ["mot1", "mot2", ...], "definitions": {"mot1": "définition courte", ...}}
Du plus important au moins important. Inclure les termes disciplinaires essentiels.`
        : `Generate a list of ${options.nb_mots || 20} key vocabulary words for this lesson as JSON.`,

      devoir: isFr
        ? `Tu es un expert en évaluation. Génère un devoir structuré avec :
- Consignes claires et précises
- Tâches variées (recherche, création, exercice)
- Barème et critères d'évaluation
- Date de remise suggérée (${options.duree || 7} jours)
- Ressources suggérées pour les élèves
Format HTML propre.`
        : `Generate a structured homework assignment with rubric.`,
    }

    // ── Profils élèves (différenciation) ────────────────────────────────────
    const elevesABesoins = profils_eleves.filter((e: EleveProfil) => e.profil_type !== 'standard')
    const differenciationPrompt = elevesABesoins.length > 0 && isFr
      ? `\n\nÉlèves à besoins particuliers dans cette classe :\n${
          elevesABesoins.map((e: EleveProfil) =>
            `- Type : ${e.profil_type}${e.besoins?.length ? ` — ${e.besoins.join(', ')}` : ''}${e.notes_enseignant ? ` — ${e.notes_enseignant}` : ''}`
          ).join('\n')
        }\n\nGénère DEUX versions séparées par le marqueur exact :\n${SEPARATOR}`
      : ''

    const systemPrompt = (typePrompts[type as TypeActivite] || typePrompts.formative) + differenciationPrompt

    // ── User prompt ──────────────────────────────────────────────────────────
    const typeLabel: Record<TypeActivite, string> = {
      formative:  'une évaluation formative',
      sommative:  'une évaluation sommative',
      groupe:     'une activité de groupe',
      nuage_mots: 'un nuage de mots',
      devoir:     'un devoir',
    }

    const userPrompt = isFr
      ? `Génère ${typeLabel[type as TypeActivite] || 'une activité'} pour cette leçon.\n\n${classeCtx}${contenuCtx}${options.nb_questions ? `\nNombre de questions : ${options.nb_questions}` : ''}${options.criteres?.length ? `\nCritères : ${options.criteres.join(', ')}` : ''}\n\nGénère un contenu complet et directement utilisable.`
      : `Generate ${typeLabel[type as TypeActivite] || 'an activity'} for this lesson.\n\n${classeCtx}${contenuCtx}`

    // ── Appel Claude ─────────────────────────────────────────────────────────
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // ── Parser différenciation ───────────────────────────────────────────────
    let version_normale = raw
    let version_differenciee: string | null = null
    if (raw.includes(SEPARATOR)) {
      const parts = raw.split(SEPARATOR)
      version_normale = parts[0].trim()
      version_differenciee = parts[1]?.trim() || null
    }

    // ── Titre auto-généré ────────────────────────────────────────────────────
    const titreBase: Record<TypeActivite, string> = {
      formative:  'Évaluation formative',
      sommative:  'Évaluation sommative',
      groupe:     'Activité de groupe',
      nuage_mots: 'Nuage de mots',
      devoir:     'Devoir',
    }
    const titre = `${titreBase[type as TypeActivite] || 'Activité'} — ${classe?.matiere || 'Leçon'}`

    // ── Métadonnées extraites ────────────────────────────────────────────────
    const metadata: Record<string, unknown> = {}
    if (options.duree) metadata.duree_estimee = options.duree
    if (options.nb_questions) metadata.nb_questions = options.nb_questions
    if (options.criteres) metadata.criteres = options.criteres

    return NextResponse.json({
      titre,
      type,
      version_normale,
      version_differenciee,
      metadata,
    })

  } catch (error: any) {
    console.error('Erreur /api/ia/activite:', error)
    const msg = error?.status === 401
      ? 'Clé API invalide.'
      : error?.status === 429
      ? 'Limite atteinte. Réessayez dans un instant.'
      : error?.message || 'Erreur serveur'
    return NextResponse.json({ error: `⚠️ ${msg}` }, { status: 200 })
  }
}
