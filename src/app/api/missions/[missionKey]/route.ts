// ── PATCH /api/missions/[missionKey] — Transition d'état (ME-05) ─────────────
//
// Le client envoie une action ("accept" | "start" | "complete" | "dismiss" | "restore").
// Le serveur valide, résout enseignantId, vérifie que la mission appartient bien
// à l'enseignant ou existe dans la persistance, puis applique la transition.
//
// Idempotence : une action visant l'état actuel retourne 200.
// Transition invalide : 409 INVALID_MISSION_TRANSITION.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }          from '@/lib/supabase/server'
import { MissionDataProvider }   from '@/lib/mission-engine/providers/mission-data'
import { MissionStateProvider, isMissionTransitionError } from '@/lib/mission-engine/providers/mission-state-provider'
import { MissionDataError }      from '@/lib/mission-engine/types'
import { createMissionEngine }   from '@/lib/mission-engine/engine'
import type { MissionAction }    from '@/lib/mission-engine/types'
import type { MissionPublic }    from '@/lib/mission-engine/client'

// ── Validation ─────────────────────────────────────────────────────────────

const VALID_ACTIONS: MissionAction[] = ['accept', 'start', 'complete', 'dismiss', 'restore']
const MAX_MISSION_KEY_LENGTH = 300
const CONTROL_RE = /[\x00-\x1f\x7f]/

function validateMissionKey(raw: string): string | null {
  const decoded = decodeURIComponent(raw)
  if (!decoded || decoded.length === 0)             return null
  if (decoded.length > MAX_MISSION_KEY_LENGTH)      return null
  if (CONTROL_RE.test(decoded))                     return null
  return decoded
}

// ── Sanitisation pour la réponse ─────────────────────────────────────────────

function buildStateResponse(
  missionKey: string,
  status: string,
  snap: {
    acceptedAt:  Date | null
    startedAt:   Date | null
    completedAt: Date | null
    dismissedAt: Date | null
  },
  title?: string | null,
  metadata?: Record<string, unknown>,
): MissionPublic {
  return {
    id:          missionKey,
    type:        (metadata?.['type'] as string | undefined) ?? 'unknown',
    title:       title ?? missionKey,
    description: '',
    priority:    (metadata?.['priority'] as number | undefined) ?? 0,
    status:      status as MissionPublic['status'],
    reason:      { code: '', label: '', description: '' },
    createdAt:   new Date().toISOString(),
    evidence:    [],
    isPersisted: true,
    state: {
      acceptedAt:  snap.acceptedAt?.toISOString()  ?? null,
      startedAt:   snap.startedAt?.toISOString()   ?? null,
      completedAt: snap.completedAt?.toISOString() ?? null,
      dismissedAt: snap.dismissedAt?.toISOString() ?? null,
    },
    metadata: {
      action:         (metadata?.['action']         as string | undefined) ?? '',
      classeId:       (metadata?.['classeId']        as string | undefined) ?? '',
      classeNom:      (metadata?.['classeNom']        as string | undefined) ?? '',
      niveau:         (metadata?.['niveau']           as string | null | undefined) ?? null,
      matiere:        (metadata?.['matiere']          as string | null | undefined) ?? null,
      suggestedTopic: (metadata?.['suggestedTopic']   as string | null | undefined) ?? null,
      targetRoute:    (metadata?.['targetRoute']       as string | undefined) ?? '/dashboard/gerer/preparer',
    },
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ missionKey: string }> },
): Promise<NextResponse> {
  const t0 = Date.now()

  try {
    const { missionKey: rawKey } = await params
    const missionKey = validateMissionKey(rawKey ?? '')

    if (!missionKey) {
      return NextResponse.json(
        { error: { code: 'INVALID_PARAM', message: 'missionKey invalide ou trop long.' } },
        { status: 400 },
      )
    }

    // ── Body ────────────────────────────────────────────────────────────────
    let body: { action?: unknown }
    try { body = await req.json() } catch { body = {} }

    const action = body.action as string | undefined
    if (!action || !VALID_ACTIONS.includes(action as MissionAction)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ACTION', message: `Action invalide. Autorisées : ${VALID_ACTIONS.join(', ')}.` } },
        { status: 400 },
      )
    }

    const missionAction = action as MissionAction

    console.log('[KLASSIA][MISSION_STATE][ACTION_START]', { missionKey, action: missionAction })

    const supabase = await createClient()

    // ── Auth ─────────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } },
        { status: 401 },
      )
    }

    // ── Profil enseignant ─────────────────────────────────────────────────────
    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profil) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profil introuvable.' } },
        { status: 403 },
      )
    }

    const enseignantId = profil.id as string
    const stateProvider = new MissionStateProvider({ supabase })

    // ── restore : la ligne doit exister en dismissed ──────────────────────────
    if (missionAction === 'restore') {
      const existing = await stateProvider.loadOneState(enseignantId, missionKey)
      if (!existing) {
        return NextResponse.json(
          { error: { code: 'MISSION_NOT_FOUND', message: 'Mission non trouvée.' } },
          { status: 404 },
        )
      }
      if (existing.status !== 'dismissed') {
        // Idempotence : already proposed → 200
        if (existing.status === 'proposed') {
          console.log('[KLASSIA][MISSION_STATE][ACTION_SUCCESS]', {
            missionKey, previousStatus: 'proposed', nextStatus: 'proposed', durationMs: Date.now() - t0,
          })
          return NextResponse.json(buildStateResponse(missionKey, 'proposed', existing))
        }
        console.log('[KLASSIA][MISSION_STATE][ACTION_CONFLICT]', { missionKey, action: missionAction, currentStatus: existing.status })
        return NextResponse.json(
          { error: { code: 'INVALID_MISSION_TRANSITION', message: 'Transition invalide.' } },
          { status: 409 },
        )
      }

      const result = await stateProvider.applyAction({ enseignantId, missionKey, action: missionAction })
      if (isMissionTransitionError(result)) {
        console.log('[KLASSIA][MISSION_STATE][ACTION_CONFLICT]', { missionKey, action: missionAction, currentStatus: result.currentStatus })
        return NextResponse.json(
          { error: { code: 'INVALID_MISSION_TRANSITION', message: 'Conflit de concurrence. Rechargez.' } },
          { status: 409 },
        )
      }

      console.log('[KLASSIA][MISSION_STATE][ACTION_SUCCESS]', {
        missionKey, previousStatus: 'dismissed', nextStatus: result.status, durationMs: Date.now() - t0,
      })
      return NextResponse.json(buildStateResponse(missionKey, result.status, result))
    }

    // ── Charger classes de l'enseignant ────────────────────────────────────────
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, nom, niveau, matiere, matieres, enseignant_id')
      .eq('enseignant_id', enseignantId)
      .order('created_at', { ascending: false })

    const classes = (classesData ?? []) as Array<{
      id: string; nom: string; niveau: string | null
      matiere: string | null; matieres: string[]; enseignant_id: string
    }>

    // ── Tenter de valider la mission via le moteur ────────────────────────────
    const dataProvider = new MissionDataProvider({ supabase })
    let missionFound: import('@/lib/mission-engine/types').Mission | undefined
    let classeId: string | undefined
    let matiere: string | null = null

    // Essayer chaque classe jusqu'à trouver la mission
    for (const classe of classes.slice(0, 5)) {
      const classMatieres: string[] = (
        Array.isArray(classe.matieres) && classe.matieres.length > 0
          ? classe.matieres
          : classe.matiere ? [classe.matiere] : [null as unknown as string]
      )

      for (const mat of classMatieres) {
        try {
          const context = await dataProvider.loadMissionContext(enseignantId, classe.id, mat || null)
          const missions = await createMissionEngine(context).run()
          const found = missions.find((m: import('@/lib/mission-engine/types').Mission) => m.id === missionKey)
          if (found) {
            missionFound = found
            classeId = classe.id
            matiere  = mat || null
            break
          }
        } catch (e) {
          if (e instanceof MissionDataError) continue
          throw e
        }
      }
      if (missionFound) break
    }

    // ── Si mission non générée, vérifier qu'une ligne persistée existe ────────
    if (!missionFound) {
      const existing = await stateProvider.loadOneState(enseignantId, missionKey)
      if (!existing) {
        // 404 sécurisé — ne révèle pas si elle appartient à un autre
        return NextResponse.json(
          { error: { code: 'MISSION_NOT_FOUND', message: 'Mission non trouvée ou non autorisée.' } },
          { status: 404 },
        )
      }

      const previousStatus = existing.status
      const result = await stateProvider.applyAction({
        enseignantId, missionKey, action: missionAction,
      })

      if (isMissionTransitionError(result)) {
        console.log('[KLASSIA][MISSION_STATE][ACTION_CONFLICT]', { missionKey, action: missionAction, currentStatus: result.currentStatus })
        return NextResponse.json(
          { error: { code: 'INVALID_MISSION_TRANSITION', message: 'Transition invalide pour cet état de mission.' } },
          { status: 409 },
        )
      }

      console.log('[KLASSIA][MISSION_STATE][ACTION_SUCCESS]', {
        missionKey, previousStatus, nextStatus: result.status, durationMs: Date.now() - t0,
      })
      return NextResponse.json(buildStateResponse(missionKey, result.status, result))
    }

    // ── Mission générée — appliquer l'action ──────────────────────────────────
    const previousSnapshot = await stateProvider.loadOneState(enseignantId, missionKey)
    const previousStatus = previousSnapshot?.status ?? 'proposed'

    const result = await stateProvider.applyAction({
      enseignantId,
      missionKey,
      action: missionAction,
      mission: missionFound,
      classeId,
      matiere: matiere ?? undefined,
    })

    if (isMissionTransitionError(result)) {
      console.log('[KLASSIA][MISSION_STATE][ACTION_CONFLICT]', { missionKey, action: missionAction, currentStatus: result.currentStatus })
      return NextResponse.json(
        { error: { code: 'INVALID_MISSION_TRANSITION', message: 'Transition invalide. Rechargez pour voir l\'état actuel.' } },
        { status: 409 },
      )
    }

    console.log('[KLASSIA][MISSION_STATE][ACTION_SUCCESS]', {
      missionKey, previousStatus, nextStatus: result.status, durationMs: Date.now() - t0,
    })

    return NextResponse.json(buildStateResponse(
      missionKey,
      result.status,
      result,
      missionFound.title,
      {
        type:           missionFound.type,
        priority:       missionFound.priority,
        action:         missionFound.metadata['action'],
        matiere,
        classeId,
        targetRoute:    '/dashboard/gerer/preparer',
        suggestedTopic: missionFound.metadata['suggested_topic'] ?? null,
      },
    ))

  } catch (error) {
    console.error('[KLASSIA][MISSION_STATE][LOAD_ERROR]', { error, durationMs: Date.now() - t0 })
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Erreur serveur.' } },
      { status: 500 },
    )
  }
}
