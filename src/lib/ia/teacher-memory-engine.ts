// ── Teacher Memory Engine (SC-02H) ────────────────────────────────────────────
//
// A) Extraction — après génération : produit des MemoryDelta à upserter.
// B) Injection  — avant génération : construit un bloc XML à injecter dans le
//                 system prompt pour personnaliser la sortie IA.

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryType =
  | 'preference'
  | 'methode'
  | 'progression'
  | 'ressource'
  | 'contrainte'
  | 'style'
  | 'observation'

export interface MemoryEntry {
  id?:                 string
  type_memoire:        MemoryType
  cle:                 string
  valeur:              Record<string, unknown>
  confiance:           number
  source:              string
  actif:               boolean
  compte_observations: number
  classe_id?:          string | null
  matiere?:            string | null
  niveau?:             string | null
}

export interface MemoryDelta {
  type_memoire: MemoryType
  cle:          string
  valeur:       Record<string, unknown>
  source:       'generation'
  classe_id?:   string | null
  matiere?:     string | null
  niveau?:      string | null
}

// ── A) Extraction ─────────────────────────────────────────────────────────────

/**
 * Produit jusqu'à 4 MemoryDelta structurés à partir des métadonnées d'une
 * génération. Les deltas seront upsertés via POST /api/ia/memory.
 */
export function extractMemoriesFromGeneration(
  typeContenu:  string,
  methode:      string | null | undefined,
  duree:        number | null | undefined,
  classeId:     string | null | undefined,
  matiere:      string | null | undefined,
  niveau:       string | null | undefined,
): MemoryDelta[] {
  const deltas: MemoryDelta[] = []
  const base = {
    source:    'generation' as const,
    classe_id: classeId  ?? null,
    matiere:   matiere   ?? null,
    niveau:    niveau    ?? null,
  }

  // 1. Fréquence du type de contenu généré
  if (typeContenu) {
    deltas.push({
      ...base,
      type_memoire: 'preference',
      cle:          'type_contenu_frequent',
      valeur:       { type: typeContenu },
    })
  }

  // 2. Méthode pédagogique utilisée
  if (methode) {
    deltas.push({
      ...base,
      type_memoire: 'methode',
      cle:          `methode_${methode.toLowerCase().replace(/\s+/g, '_').substring(0, 40)}`,
      valeur:       { methode },
    })
  }

  // 3. Durée habituelle
  if (typeof duree === 'number' && duree > 0) {
    deltas.push({
      ...base,
      type_memoire: 'preference',
      cle:          'duree_lecon_minutes',
      valeur:       { duree_minutes: duree },
    })
  }

  // 4. Type d'évaluation associé au contenu
  const typeEval = deriveTypeEvaluation(typeContenu)
  if (typeEval) {
    deltas.push({
      ...base,
      type_memoire: 'observation',
      cle:          `type_evaluation_${typeEval}`,
      valeur:       { type_evaluation: typeEval, type_contenu: typeContenu },
    })
  }

  return deltas.slice(0, 4)
}

function deriveTypeEvaluation(typeContenu: string): string | null {
  const map: Record<string, string> = {
    quiz:                 'formative_quiz',
    evaluation:           'sommative',
    corrige:              'sommative',
    plan_lecon:           'formative_billet_sortie',
    lecon_complete:       'formative_observation',
    fiche_lecon:          'formative_observation',
    activite:             'formative_participation',
    plan_sequence:        'summative_sequence',
  }
  return map[typeContenu] ?? null
}

// ── B) Injection ──────────────────────────────────────────────────────────────

/**
 * Construit le bloc XML de contexte mémoriel à injecter dans le system prompt.
 * Filtre : actif = true ET confiance >= 2.
 * Retourne '' si aucune entrée ne satisfait les critères.
 */
export function buildMemoryContext(
  memories: MemoryEntry[],
  ctx?: { classeId?: string | null; matiere?: string | null },
): string {
  const pertinentes = memories.filter(
    m => m.actif && m.confiance >= 2 && m.compte_observations >= 2,
  )

  if (pertinentes.length === 0) return ''

  // Trier : entrées liées à la classe/matière active en premier
  const sorted = [...pertinentes].sort((a, b) => {
    const aScore = scoreRelevance(a, ctx)
    const bScore = scoreRelevance(b, ctx)
    return bScore - aScore
  })

  const lignes = sorted.map(m => formatMemoryLine(m))

  return [
    '<MÉMOIRE_PÉDAGOGIQUE_ENSEIGNANT>',
    '[Informations apprises des sessions précédentes — utilise pour personnaliser]',
    ...lignes,
    '</MÉMOIRE_PÉDAGOGIQUE_ENSEIGNANT>',
  ].join('\n')
}

function scoreRelevance(
  m: MemoryEntry,
  ctx?: { classeId?: string | null; matiere?: string | null },
): number {
  let score = m.confiance
  if (ctx?.classeId && m.classe_id === ctx.classeId) score += 3
  if (ctx?.matiere  && m.matiere  === ctx.matiere)   score += 2
  return score
}

function formatMemoryLine(m: MemoryEntry): string {
  const label = typeLabel(m.type_memoire)
  const valStr = formatValeur(m.valeur)
  const scope = [m.matiere, m.niveau].filter(Boolean).join(', ')
  return `• [${label}] ${m.cle}${scope ? ` (${scope})` : ''} : ${valStr} (confiance ${m.confiance}/5)`
}

function typeLabel(t: MemoryType): string {
  const labels: Record<MemoryType, string> = {
    preference:   'Préférence',
    methode:      'Méthode',
    progression:  'Progression',
    ressource:    'Ressource',
    contrainte:   'Contrainte',
    style:        'Style',
    observation:  'Observation',
  }
  return labels[t] ?? t
}

function formatValeur(valeur: Record<string, unknown>): string {
  const entries = Object.entries(valeur)
  if (entries.length === 0) return '—'
  if (entries.length === 1) return String(entries[0][1])
  return entries.map(([k, v]) => `${k}=${v}`).join(', ')
}
