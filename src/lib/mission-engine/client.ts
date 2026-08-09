// ── Mission Engine — Client API ─────────────────────────────────────────────
//
// Types publics et utilitaires de fetch pour les composants React.
// Ne contient aucun import serveur ni Supabase — sûr à importer côté client.

// ── Types publics ────────────────────────────────────────────────────────────

export type MissionAction = 'accept' | 'start' | 'complete' | 'dismiss' | 'restore'

export interface MissionPublicEvidence {
  source:      string
  documentId?: string
  label:       string
  confidence:  number
}

export interface MissionPublicMetadata {
  action:         string
  classeId:       string
  classeNom:      string
  niveau:         string | null
  matiere:        string | null
  suggestedTopic: string | null
  targetRoute:    string
}

export interface MissionPublicState {
  acceptedAt:  string | null
  startedAt:   string | null
  completedAt: string | null
  dismissedAt: string | null
}

export interface MissionPublic {
  id:              string
  type:            string
  title:           string
  description:     string
  priority:        number
  status:          'proposed' | 'accepted' | 'in_progress' | 'completed' | 'dismissed'
  reason:          { code: string; label: string; description: string }
  createdAt:       string
  evidence:        MissionPublicEvidence[]
  metadata:        MissionPublicMetadata
  // ME-05 — état persisté
  isPersisted?:    boolean
  isPersistedOnly?: boolean
  state?:          MissionPublicState
}

export interface MissionsApiResponse {
  missions: MissionPublic[]
  context: {
    classe_id:  string | null
    classe_nom: string | null
    matiere:    string | null
  }
  counts?: Record<string, number>
  // ME-13 — plans d'exécution (optionnels, rétrocompatibles)
  execution?: {
    primary:   import('@/lib/execution-engine/types').ExecutionPlan | null
    secondary: import('@/lib/execution-engine/types').ExecutionPlan[]
  }
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

export async function fetchMissions(params?: {
  classeId?: string
  matiere?:  string
}): Promise<MissionsApiResponse> {
  const qs = new URLSearchParams()
  if (params?.classeId) qs.set('classe_id', params.classeId)
  if (params?.matiere)  qs.set('matiere',   params.matiere)

  const url = qs.size > 0 ? `/api/missions?${qs.toString()}` : '/api/missions'
  const res = await fetch(url, { cache: 'no-store' })

  if (!res.ok) {
    throw new Error(`[MISSIONS] HTTP ${res.status}`)
  }
  return res.json() as Promise<MissionsApiResponse>
}

// ── Action helper (ME-05) ────────────────────────────────────────────────────

export interface MissionActionError {
  code:    string
  message: string
}

export interface MissionActionResult {
  ok:     boolean
  data?:  MissionPublic
  error?: MissionActionError
  status: number
}

/**
 * Envoie une action sur une mission (accept, start, complete, dismiss, restore).
 * Le missionKey est encodé en toute sécurité pour l'URL.
 */
export async function updateMissionAction(
  missionKey: string,
  action:     MissionAction,
): Promise<MissionActionResult> {
  const encodedKey = encodeURIComponent(missionKey)
  const res = await fetch(`/api/missions/${encodedKey}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action }),
  })

  const body = await res.json().catch(() => ({})) as Record<string, unknown>

  if (res.ok) {
    return { ok: true, data: body as unknown as MissionPublic, status: res.status }
  }

  const errBody = (body as { error?: MissionActionError })
  return {
    ok:     false,
    error:  errBody.error ?? { code: 'UNKNOWN', message: `HTTP ${res.status}` },
    status: res.status,
  }
}

// ── Helpers de navigation ─────────────────────────────────────────────────────

/**
 * Construit l'URL vers Préparer à partir d'une mission.
 * Inclut classe_id, matiere, mission (type d'action), sujet, prompt et mission_key.
 */
export function buildMissionUrl(mission: MissionPublic, isFr: boolean = true): string {
  const { action, classeId, matiere, suggestedTopic } = mission.metadata

  const prompt = buildMissionPrompt(action, suggestedTopic, isFr)

  const params = new URLSearchParams()
  if (classeId)       params.set('classe_id',  classeId)
  if (matiere)        params.set('matiere',     matiere)
  if (action)         params.set('mission',     action)
  if (suggestedTopic) params.set('sujet',       suggestedTopic)
  if (prompt)         params.set('prompt',      prompt)
  // mission_key encodé pour permettre la terminaison depuis Préparer
  params.set('mission_key', encodeURIComponent(mission.id))

  return `/dashboard/gerer/preparer?${params.toString()}`
}

/**
 * Construit le message pré-rempli selon le type d'action et la langue.
 */
export function buildMissionPrompt(
  action:        string,
  suggestedTopic: string | null,
  isFr:          boolean = true,
): string {
  if (isFr) {
    switch (action) {
      case 'create_annual_plan':
        return 'Crée mon programme annuel pour cette classe et cette matière.'
      case 'prepare_first_lesson':
        return 'Prépare la première leçon prévue dans mon programme annuel.'
      case 'prepare_next_lesson':
        return suggestedTopic
          ? `Prépare ma prochaine leçon sur « ${suggestedTopic} » en utilisant mon programme annuel et mes dernières leçons.`
          : 'Détermine et prépare ma prochaine leçon à partir de mon programme annuel et de mes dernières leçons.'
      default:
        return ''
    }
  }

  switch (action) {
    case 'create_annual_plan':
      return 'Create my annual plan for this class and subject.'
    case 'prepare_first_lesson':
      return 'Prepare the first lesson planned in my annual program.'
    case 'prepare_next_lesson':
      return suggestedTopic
        ? `Prepare my next lesson on "${suggestedTopic}" using my annual plan and recent lessons.`
        : 'Determine and prepare my next lesson from my annual plan and recent lessons.'
    default:
      return ''
  }
}
