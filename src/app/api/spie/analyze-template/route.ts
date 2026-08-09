import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/api-auth'

export const maxDuration = 60
import type { GabaritMappingResult, MappingLigne } from '@/lib/types/teaching-pack'

// ─── POST /api/spie/analyze-template ─────────────────────────────────────────
// Corps : FormData { file: File }
// Analyse le gabarit utilisateur et retourne un GabaritMappingResult.
// RÈGLE : Le fichier original n'est JAMAIS modifié ni stocké.
// RÈGLE : Ne pas utiliser les documents d'un utilisateur pour un autre.

const SECTIONS_SPIE = [
  'Identification', 'Références curriculaires', 'Contexte pédagogique',
  'Organisation annuelle', 'Couverture curriculum', 'Évaluation',
  'Révision', 'Séquences', 'Objectifs', 'Compétences', 'Vocabulaire',
  'Prérequis', 'Progression des leçons', 'Différenciation',
  'Évaluation formative', 'Évaluation sommative', 'Critères de réussite',
  'Durée', 'Matériel', 'Mise en situation', 'Enseignement', 'Pratique guidée',
  'Pratique autonome', 'Synthèse', 'Réflexion', 'Notes enseignant',
]

const OBJET_SPIE_MAP: Record<string, string> = {
  'Identification':           'TeachingPack.identification',
  'Références curriculaires': 'PackSyllabus.normes_reference',
  'Contexte pédagogique':     'TeachingPack.contexte',
  'Organisation annuelle':    'ContenuProgramme.unites',
  'Objectifs':                'Unite.objectifs',
  'Compétences':              'Unite.competences',
  'Séquences':                'ContenuProgramme.unites',
  'Différenciation':          'ContenuLecon.differentiation_universelle',
  'Évaluation formative':     'ContenuLecon.evaluation_formative',
  'Évaluation sommative':     'ContenuLecon.evaluation_sommative',
  'Critères de réussite':     'ContenuLecon.criteres',
  'Matériel':                 'ContenuLecon.materiel',
  'Mise en situation':        'ContenuLecon.avant_amorce',
  'Enseignement':             'ContenuLecon.pendant_modelisation',
  'Pratique guidée':          'ContenuLecon.pendant_pratique_guidee',
  'Pratique autonome':        'ContenuLecon.pendant_pratique_autonome',
  'Durée':                    'LeconProgramme.duree_minutes',
  'Vocabulaire':              'ContenuLecon.vocabulaire',
  'Prérequis':                'Unite.prerequis',
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAuth()
  if (authError) return authError

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API non configurée' }, { status: 500 })

  // Lire le contenu du fichier (texte seulement, max 8ko)
  let texte = ''
  try {
    const buf = await file.arrayBuffer()
    texte = new TextDecoder('utf-8', { fatal: false }).decode(buf).slice(0, 8000)
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le fichier' }, { status: 400 })
  }

  // Appel IA pour analyser la structure du gabarit
  let analyseBrute: { sections: string[]; avertissements: string[] } = { sections: [], avertissements: [] }
  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: 'Tu analyses des gabarits pédagogiques. Réponds UNIQUEMENT en JSON valide, sans markdown.',
      messages: [{
        role: 'user',
        content: `Identifie les sections de ce gabarit pédagogique et retourne :
{
  "sections": ["nom section 1", "nom section 2", ...],
  "avertissements": ["avertissement si applicable"]
}

Gabarit à analyser :
${texte.slice(0, 3000)}`,
      }],
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    analyseBrute = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    // Fallback : sections basiques
    analyseBrute.sections = texte.split('\n')
      .filter(l => l.trim().length > 3 && l.trim().length < 80)
      .slice(0, 20)
      .map(l => l.trim())
  }

  const sectionsGabarit = analyseBrute.sections ?? []

  // Construire le mapping
  const sectionsReconnues: MappingLigne[] = sectionsGabarit.map(section => {
    const match = SECTIONS_SPIE.find(s =>
      section.toLowerCase().includes(s.toLowerCase()) ||
      s.toLowerCase().includes(section.toLowerCase())
    )
    if (match) {
      return {
        section_gabarit_utilisateur: section,
        objet_spie_associe: OBJET_SPIE_MAP[match] ?? `SPIE.${match}`,
        statut: 'reconnu',
      }
    }
    return {
      section_gabarit_utilisateur: section,
      statut: 'supplementaire',
    }
  })

  const sectionsManquantes = SECTIONS_SPIE
    .filter(s => ['Identification', 'Objectifs', 'Durée', 'Évaluation formative'].includes(s))
    .filter(s => !sectionsReconnues.some(r => r.statut === 'reconnu' && r.objet_spie_associe?.includes(s.toLowerCase().replace(' ', '_'))))

  const nbReconnus = sectionsReconnues.filter(r => r.statut === 'reconnu').length
  const compat    = Math.min(100, Math.round((nbReconnus / Math.max(sectionsGabarit.length, 1)) * 100))

  const avertissements: string[] = [
    ...(analyseBrute.avertissements ?? []),
    ...(sectionsManquantes.length > 0 ? [`Sections recommandées manquantes : ${sectionsManquantes.slice(0, 3).join(', ')}`] : []),
  ]

  const mapping: GabaritMappingResult = {
    sections_reconnues:     sectionsReconnues,
    sections_manquantes:    sectionsManquantes,
    sections_supplementaires: sectionsReconnues.filter(r => r.statut === 'supplementaire').map(r => r.section_gabarit_utilisateur),
    compatibilite_spie:     compat,
    avertissements,
    peut_utiliser:          compat >= 30,
  }

  return NextResponse.json({ success: true, mapping })
}
