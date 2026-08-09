// ── GET /api/missions — Mission Engine avec fusion d'état (ME-04 / ME-05) ────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }           from '@/lib/supabase/server'
import { MissionDataProvider }    from '@/lib/mission-engine/providers/mission-data'
import { MissionStateProvider }   from '@/lib/mission-engine/providers/mission-state-provider'
import { MissionDataError }       from '@/lib/mission-engine/types'
import { createMissionEngine }    from '@/lib/mission-engine/engine'
import type { Mission, MissionStateSnapshot } from '@/lib/mission-engine/types'
import type {
  MissionPublic,
  MissionPublicMetadata,
  MissionsApiResponse,
} from '@/lib/mission-engine/client'
import { DecisionEngine }    from '@/lib/decision-engine'
import { ExecutionEngine }   from '@/lib/execution-engine'

// ── Validation ────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(s: string): boolean {
  return UUID_RE.test(s)
}

// ── Types internes ────────────────────────────────────────────────────────────

interface ClasseRow {
  id:           string
  nom:          string
  niveau:       string | null
  matiere:      string | null
  matieres:     string[]
  enseignant_id: string
}

// ── Sanitisation pour la réponse publique ─────────────────────────────────────

function sanitizeMission(
  mission: Mission & { __state?: MissionStateSnapshot },
  classe:  ClasseRow,
  matiere: string | null,
): MissionPublic {
  const matiereVal = (mission.metadata['matiere'] as string | undefined) ?? matiere ?? null
  const state = mission.__state

  const metadata: MissionPublicMetadata = {
    action:         String(mission.metadata['action'] ?? ''),
    classeId:       classe.id,
    classeNom:      classe.nom,
    niveau:         classe.niveau,
    matiere:        matiereVal,
    suggestedTopic: (mission.metadata['suggested_topic'] as string | null) ?? null,
    targetRoute:    '/dashboard/gerer/preparer',
  }

  return {
    id:          mission.id,
    type:        mission.type,
    title:       mission.title,
    description: mission.description,
    priority:    mission.priority,
    status:      mission.status,
    reason:      mission.reason,
    createdAt:   mission.createdAt.toISOString(),
    evidence:    (mission.evidence ?? []).map(e => ({
      source:     e.source,
      documentId: e.documentId,
      label:      e.label,
      confidence: 1,
    })),
    metadata,
    isPersisted:  !!state,
    isPersistedOnly: !!(mission.metadata['persistedOnly']),
    state: state ? {
      acceptedAt:  state.acceptedAt?.toISOString()  ?? null,
      startedAt:   state.startedAt?.toISOString()   ?? null,
      completedAt: state.completedAt?.toISOString() ?? null,
      dismissedAt: state.dismissedAt?.toISOString() ?? null,
    } : undefined,
  }
}

function buildOrphanMission(
  snap: MissionStateSnapshot,
  classe: ClasseRow,
): MissionPublic {
  const meta: MissionPublicMetadata = {
    action:         '',
    classeId:       classe.id,
    classeNom:      classe.nom,
    niveau:         classe.niveau,
    matiere:        null,
    suggestedTopic: null,
    targetRoute:    '/dashboard/gerer/preparer',
  }
  return {
    id:          snap.missionKey,
    type:        'next_lesson',
    title:       snap.missionKey,
    description: '',
    priority:    50,
    status:      snap.status,
    reason:      { code: 'persisted', label: 'Mission en cours', description: '' },
    createdAt:   snap.updatedAt.toISOString(),
    evidence:    [],
    metadata:    meta,
    isPersisted: true,
    isPersistedOnly: true,
    state: {
      acceptedAt:  snap.acceptedAt?.toISOString()  ?? null,
      startedAt:   snap.startedAt?.toISOString()   ?? null,
      completedAt: snap.completedAt?.toISOString() ?? null,
      dismissedAt: snap.dismissedAt?.toISOString() ?? null,
    },
  }
}

// ── Comptage par statut ────────────────────────────────────────────────────────

type StatusCounts = Record<string, number>

function countByStatus(missions: MissionPublic[]): StatusCounts {
  const counts: StatusCounts = {
    proposed: 0, accepted: 0, in_progress: 0, completed: 0, dismissed: 0,
  }
  for (const m of missions) {
    const s = m.status
    if (s in counts) counts[s]++
  }
  return counts
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now()

  try {
    const supabase = await createClient()

    // ── Auth ──────────────────────────────────────────────────────────────────
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
      .select('id, prenom, nom, province, langue')
      .eq('user_id', user.id)
      .single()

    if (!profil) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Profil enseignant introuvable.' } },
        { status: 403 },
      )
    }

    // ── Paramètres ────────────────────────────────────────────────────────────
    const url           = new URL(req.url)
    const classeIdParam  = url.searchParams.get('classe_id')
    const matiereParam   = url.searchParams.get('matiere')

    if (classeIdParam && !isValidUUID(classeIdParam)) {
      return NextResponse.json(
        { error: { code: 'INVALID_PARAM', message: 'classe_id invalide.' } },
        { status: 400 },
      )
    }

    // ── Classes de l'enseignant ───────────────────────────────────────────────
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, nom, niveau, matiere, matieres, enseignant_id')
      .eq('enseignant_id', profil.id as string)
      .order('created_at', { ascending: false })

    const classes = (classesData ?? []) as ClasseRow[]

    if (classes.length === 0) {
      return NextResponse.json<MissionsApiResponse>({
        missions: [],
        context:  { classe_id: null, classe_nom: null, matiere: null },
        counts:   { proposed: 0, accepted: 0, in_progress: 0, completed: 0, dismissed: 0 },
      })
    }

    // ── Classe cible ──────────────────────────────────────────────────────────
    let targetClass: ClasseRow

    if (classeIdParam) {
      const found = classes.find(c => c.id === classeIdParam)
      if (!found) {
        return NextResponse.json(
          { error: { code: 'CLASSE_NOT_FOUND', message: 'La classe demandée est introuvable.' } },
          { status: 404 },
        )
      }
      targetClass = found
    } else {
      targetClass = classes[0]
    }

    // ── Matières ──────────────────────────────────────────────────────────────
    const classMatieres: string[] = (
      Array.isArray(targetClass.matieres) && targetClass.matieres.length > 0
        ? targetClass.matieres
        : targetClass.matiere ? [targetClass.matiere] : []
    )

    if (matiereParam && !classMatieres.includes(matiereParam)) {
      return NextResponse.json(
        { error: { code: 'INVALID_MATIERE', message: 'Cette matière ne correspond pas à la classe.' } },
        { status: 400 },
      )
    }

    // ── Exécution du Mission Engine ───────────────────────────────────────────
    console.log('[KLASSIA][MISSION_ENGINE][LOAD_START]', {
      enseignantId: profil.id,
      classeId:     targetClass.id,
    })

    const dataProvider  = new MissionDataProvider({ supabase })
    const stateProvider = new MissionStateProvider({ supabase })

    let allMissions: Mission[] = []
    let matiereContexte: string | null = matiereParam

    const runForMatiere = async (mat: string | null): Promise<Mission[]> => {
      try {
        const context = await dataProvider.loadMissionContext(
          profil.id as string,
          targetClass.id,
          mat,
        )
        return createMissionEngine(context).run()
      } catch (e) {
        if (e instanceof MissionDataError) {
          console.warn('[KLASSIA][MISSION_ENGINE][DATA_ERROR]', { code: e.code, classeId: targetClass.id })
          return []
        }
        throw e
      }
    }

    if (matiereParam) {
      allMissions     = await runForMatiere(matiereParam)
      matiereContexte = matiereParam
    } else if (classMatieres.length <= 1) {
      const mat       = classMatieres[0] ?? null
      allMissions     = await runForMatiere(mat)
      matiereContexte = mat
    } else {
      const subset  = classMatieres.slice(0, 3)
      const results = await Promise.allSettled(subset.map(m => runForMatiere(m)))
      for (const r of results) {
        if (r.status === 'fulfilled') allMissions.push(...r.value)
      }
      allMissions.sort((a, b) => b.priority - a.priority)
      if (allMissions.length > 0) {
        matiereContexte = (allMissions[0].metadata['matiere'] as string | null) ?? null
      }
    }

    // ── Fusion des états persistés ─────────────────────────────────────────────
    const missionKeys = allMissions.map(m => m.id)
    const states = await stateProvider.loadStates(profil.id as string, missionKeys)
    const mergedMissions = stateProvider.mergeMissionStates(allMissions, states) as
      (Mission & { __state?: MissionStateSnapshot })[]

    // ── Missions orphelines (accepted/in_progress non générées) ───────────────
    const knownKeys = new Set(missionKeys)
    const orphanStates = await stateProvider.loadActiveOrphanStates(profil.id as string, knownKeys)

    // ── Decision Engine + Execution Engine (ME-12 / ME-13) ───────────────────
    const decisionEngine  = new DecisionEngine()
    const executionEngine = new ExecutionEngine()

    const missionPlan = decisionEngine.run(mergedMissions)
    const execution   = executionEngine.createPlans(missionPlan)

    // ── Sanitisation ───────────────────────────────────────────────────────────
    const allPublic: MissionPublic[] = [
      ...mergedMissions.map(m => sanitizeMission(m, targetClass, matiereContexte)),
      ...orphanStates.map(snap => buildOrphanMission(snap, targetClass)),
    ]

    // Compter avant filtrage (pour les counts)
    const counts = countByStatus(allPublic)

    // ── Filtrage pour la carte principale (masquer completed + dismissed) ──────
    const VISIBLE_STATUSES: MissionPublic['status'][] = ['proposed', 'accepted', 'in_progress']
    const visibleMissions = allPublic
      .filter(m => VISIBLE_STATUSES.includes(m.status as MissionPublic['status']))
      .slice(0, 5)

    const durationMs = Date.now() - t0
    console.log('[KLASSIA][MISSION_ENGINE][LOAD_SUCCESS]', {
      enseignantId:  profil.id,
      classeId:      targetClass.id,
      matiere:       matiereContexte,
      missionsCount: visibleMissions.length,
      durationMs,
    })

    return NextResponse.json<MissionsApiResponse>({
      missions: visibleMissions,
      context: {
        classe_id:  targetClass.id,
        classe_nom: targetClass.nom,
        matiere:    matiereContexte,
      },
      counts,
      execution,
    })

  } catch (error) {
    const durationMs = Date.now() - t0
    console.error('[KLASSIA][MISSION_ENGINE][LOAD_ERROR]', { durationMs, error })

    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Erreur serveur. Réessayez dans un instant.' } },
      { status: 500 },
    )
  }
}
