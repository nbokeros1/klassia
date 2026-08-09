// ── Mission Engine — Mission State Provider (ME-05) ──────────────────────────
//
// Responsabilités :
//   - lire les états persistés depuis missions_enseignant ;
//   - appliquer les transitions de statut autorisées ;
//   - fusionner les états persistés avec les missions générées par le moteur.
//
// Les détecteurs n'appellent jamais ce provider.
// La fusion se fait après createMissionEngine(context).run().

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Mission,
  MissionStatus,
  MissionAction,
  MissionStateSnapshot,
} from '../types'
import type { ActivityEngine } from '../../activity-engine/activity-engine'

// ── Machine d'état ────────────────────────────────────────────────────────────

/** Transitions autorisées : CURRENT_STATUS → Set of valid actions. */
const ALLOWED_TRANSITIONS: Record<MissionStatus, Partial<Record<MissionAction, MissionStatus>>> = {
  proposed:    { accept: 'accepted',  start: 'in_progress', dismiss: 'dismissed' },
  accepted:    { start:  'in_progress', complete: 'completed', dismiss: 'dismissed' },
  in_progress: { complete: 'completed', dismiss: 'dismissed' },
  completed:   {},
  dismissed:   { restore: 'proposed' },
}

export type MissionTransitionError = {
  code: 'INVALID_MISSION_TRANSITION'
  currentStatus: MissionStatus
  action: MissionAction
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToSnapshot(row: Record<string, unknown>): MissionStateSnapshot {
  return {
    missionKey:  row['mission_key'] as string,
    status:      row['statut']      as MissionStatus,
    acceptedAt:  row['accepted_at']  ? new Date(row['accepted_at']  as string) : null,
    startedAt:   row['started_at']   ? new Date(row['started_at']   as string) : null,
    completedAt: row['completed_at'] ? new Date(row['completed_at'] as string) : null,
    dismissedAt: row['dismissed_at'] ? new Date(row['dismissed_at'] as string) : null,
    updatedAt:   new Date(row['updated_at'] as string),
  }
}

/**
 * Retourne les champs à mettre à jour lors d'une transition.
 * Ne réinitialise pas les horodatages précédents.
 */
function buildUpdateFields(
  action: MissionAction,
  nextStatus: MissionStatus,
): Record<string, unknown> {
  const fields: Record<string, unknown> = { statut: nextStatus }
  const now = new Date().toISOString()

  switch (action) {
    case 'accept':  fields['accepted_at']  = now; break
    case 'start':   fields['started_at']   = now; break
    case 'complete': fields['completed_at'] = now; break
    case 'dismiss': fields['dismissed_at'] = now; break
    case 'restore': fields['dismissed_at'] = null; break
  }

  return fields
}

/**
 * Construit les métadonnées minimales à persister pour une mission.
 * Ne contient aucun contenu documentaire.
 */
function buildPersistedMetadata(mission: Mission): Record<string, unknown> {
  const raw = mission.metadata
  const out: Record<string, unknown> = {}

  if (raw['action'])         out['action']         = raw['action']
  if (raw['targetRoute'])    out['targetRoute']     = raw['targetRoute']
  if (raw['suggested_topic']) out['suggestedTopic'] = raw['suggested_topic']

  return out
}

// ── Provider ─────────────────────────────────────────────────────────────────

export class MissionStateProvider {
  private supabase:       SupabaseClient
  private activityEngine?: ActivityEngine

  constructor({ supabase, activityEngine }: { supabase: SupabaseClient; activityEngine?: ActivityEngine }) {
    this.supabase       = supabase
    this.activityEngine = activityEngine
  }

  /**
   * Charge les états persistés pour une liste de missionKeys.
   * Retourne une Map<missionKey, MissionStateSnapshot>.
   * Les keys sans ligne en base sont absentes de la Map (statut = proposed implicite).
   */
  async loadStates(
    enseignantId: string,
    missionKeys: string[],
  ): Promise<Map<string, MissionStateSnapshot>> {
    if (missionKeys.length === 0) return new Map()

    const { data, error } = await this.supabase
      .from('missions_enseignant')
      .select('mission_key, statut, accepted_at, started_at, completed_at, dismissed_at, updated_at')
      .eq('enseignant_id', enseignantId)
      .in('mission_key', missionKeys)

    if (error) {
      console.error('[KLASSIA][MISSION_STATE][LOAD_ERROR]', { enseignantId, error: error.message })
      return new Map()
    }

    const map = new Map<string, MissionStateSnapshot>()
    for (const row of (data ?? [])) {
      map.set(row['mission_key'] as string, rowToSnapshot(row as Record<string, unknown>))
    }
    return map
  }

  /**
   * Charge tous les états accepted/in_progress d'un enseignant.
   * Utilisé pour récupérer les missions "orphelines" (plus générées par le moteur).
   */
  async loadActiveOrphanStates(
    enseignantId: string,
    knownKeys: Set<string>,
  ): Promise<MissionStateSnapshot[]> {
    const { data, error } = await this.supabase
      .from('missions_enseignant')
      .select('mission_key, statut, accepted_at, started_at, completed_at, dismissed_at, updated_at')
      .eq('enseignant_id', enseignantId)
      .in('statut', ['accepted', 'in_progress'])

    if (error || !data) return []

    return (data as Record<string, unknown>[])
      .filter(row => !knownKeys.has(row['mission_key'] as string))
      .map(rowToSnapshot)
  }

  /**
   * Charge la ligne complète d'une mission (pour la route PATCH).
   */
  async loadOneState(
    enseignantId: string,
    missionKey: string,
  ): Promise<MissionStateSnapshot | null> {
    const { data, error } = await this.supabase
      .from('missions_enseignant')
      .select('mission_key, statut, accepted_at, started_at, completed_at, dismissed_at, updated_at')
      .eq('enseignant_id', enseignantId)
      .eq('mission_key', missionKey)
      .maybeSingle()

    if (error || !data) return null
    return rowToSnapshot(data as Record<string, unknown>)
  }

  /**
   * Applique une action sur une mission.
   *
   * - Idempotence : action visant exactement l'état actuel → retourne l'état 200.
   * - Transition invalide → lance MissionTransitionError.
   * - Concurrence : l'UPDATE cible le statut actuel ; si 0 ligne est modifiée, recharge et 409.
   *
   * @param mission   Mission complète si disponible (premier persist) ; null pour restore.
   */
  async applyAction(input: {
    enseignantId: string
    missionKey:   string
    action:       MissionAction
    mission?:     Mission
    classeId?:    string
    matiere?:     string
  }): Promise<MissionStateSnapshot | MissionTransitionError> {
    const { enseignantId, missionKey, action, mission, classeId, matiere } = input

    // Lire l'état actuel
    const current = await this.loadOneState(enseignantId, missionKey)
    const currentStatus: MissionStatus = current?.status ?? 'proposed'

    // Machine d'état : vérifier la transition
    const nextStatus = ALLOWED_TRANSITIONS[currentStatus]?.[action]

    // Idempotence : action visant l'état actuel
    if (nextStatus === undefined) {
      const isIdempotent = (
        (action === 'accept'   && currentStatus === 'accepted')   ||
        (action === 'start'    && currentStatus === 'in_progress') ||
        (action === 'complete' && currentStatus === 'completed')  ||
        (action === 'dismiss'  && currentStatus === 'dismissed')  ||
        (action === 'restore'  && currentStatus === 'proposed')
      )

      if (isIdempotent && current) return current

      return {
        code:          'INVALID_MISSION_TRANSITION',
        currentStatus,
        action,
      }
    }

    const updateFields = buildUpdateFields(action, nextStatus)

    if (!current) {
      // Première persistance : créer la ligne
      const insertData: Record<string, unknown> = {
        enseignant_id:     enseignantId,
        mission_key:       missionKey,
        type:              mission?.type ?? 'unknown',
        classe_id:         classeId ?? mission?.metadata['classe_id'] ?? null,
        matiere:           matiere ?? (mission?.metadata['matiere'] as string | null) ?? null,
        priority_snapshot: mission?.priority ?? null,
        title_snapshot:    mission?.title ?? null,
        metadata:          mission ? buildPersistedMetadata(mission) : {},
        statut:            nextStatus,
        ...updateFields,
      }

      const { data, error } = await this.supabase
        .from('missions_enseignant')
        .insert(insertData)
        .select('mission_key, statut, accepted_at, started_at, completed_at, dismissed_at, updated_at')
        .single()

      if (error || !data) {
        // Contrainte unique violée → lire l'état réel et retourner conflit
        const reloaded = await this.loadOneState(enseignantId, missionKey)
        if (reloaded) return reloaded
        console.error('[KLASSIA][MISSION_STATE][INSERT_ERROR]', { error: error?.message })
        throw new Error(`Mission insert failed: ${error?.message}`)
      }

      return rowToSnapshot(data as Record<string, unknown>)
    }

    // Mise à jour avec condition sur le statut actuel (protection concurrence)
    const { data, error } = await this.supabase
      .from('missions_enseignant')
      .update(updateFields)
      .eq('enseignant_id', enseignantId)
      .eq('mission_key', missionKey)
      .eq('statut', currentStatus)    // condition de concurrence
      .select('mission_key, statut, accepted_at, started_at, completed_at, dismissed_at, updated_at')
      .maybeSingle()

    if (error) {
      console.error('[KLASSIA][MISSION_STATE][UPDATE_ERROR]', { error: error.message })
      throw new Error(`Mission update failed: ${error.message}`)
    }

    if (!data) {
      // Aucune ligne mise à jour : conflit de concurrence — recharger et signaler
      const reloaded = await this.loadOneState(enseignantId, missionKey)
      const actualStatus = reloaded?.status ?? currentStatus

      return {
        code:          'INVALID_MISSION_TRANSITION',
        currentStatus: actualStatus,
        action,
      }
    }

    const snapshot = rowToSnapshot(data as Record<string, unknown>)

    // Publier les événements métier après transition réussie
    if (action === 'complete') {
      this.activityEngine?.mission.onCompleted(
        missionKey,
        (classeId ?? input.mission?.metadata['classe_id'] as string | null) ?? null,
        (matiere  ?? input.mission?.metadata['matiere']   as string | null) ?? null,
        input.mission?.type,
      )
    } else if (action === 'restore') {
      this.activityEngine?.mission.onRestored(
        missionKey,
        (classeId ?? null) as string | null,
        (matiere  ?? null) as string | null,
      )
    }

    return snapshot
  }

  /**
   * Fusionne les états persistés dans les missions générées par le moteur.
   * Met à jour mission.status et ajoute un champ __state pour la sérialisation.
   */
  mergeMissionStates(
    missions: Mission[],
    states: Map<string, MissionStateSnapshot>,
  ): (Mission & { __state?: MissionStateSnapshot })[] {
    return missions.map(mission => {
      const state = states.get(mission.id)
      if (!state) return mission

      return {
        ...mission,
        status: state.status,
        __state: state,
      }
    })
  }
}

export function isMissionTransitionError(v: unknown): v is MissionTransitionError {
  return typeof v === 'object' && v !== null && 'code' in v && (v as MissionTransitionError).code === 'INVALID_MISSION_TRANSITION'
}
