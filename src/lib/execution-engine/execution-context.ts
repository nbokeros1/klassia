// ── Execution Engine — Context (ME-13) ───────────────────────────────────────

import type { Mission }       from '../mission-engine/types'
import type { MissionBundle } from '../decision-engine/types'

// ── Route Registry ────────────────────────────────────────────────────────────

/**
 * Registre des routes réelles auditées dans le projet.
 * Toutes les valeurs proviennent de l'audit ME-13 de src/app/dashboard.
 *
 * RÈGLE : Ne jamais inventer une route.
 * Si une route spécialisée n'existe pas, utiliser une route plus générale.
 */
export interface ExecutionRouteRegistry {
  prepare:      string | null   // /dashboard/gerer/preparer
  classes:      string | null   // /dashboard/classes
  classDetails: string | null   // /dashboard/classes (base — append /{id} dans les templates)
  students:     string | null   // null — pas de page élèves dédiée
  followUp:     string | null   // /dashboard/suivre
  calendar:     string | null   // /dashboard/calendrier
  library:      string | null   // /dashboard/bibliotheque
  dashboard:    string          // /dashboard
}

/** Crée le registre à partir des routes réelles du projet. */
export function createExecutionRouteRegistry(): ExecutionRouteRegistry {
  return {
    prepare:      '/dashboard/gerer/preparer',
    classes:      '/dashboard/classes',
    classDetails: '/dashboard/classes',
    students:     null,                          // aucune page dédiée — utiliser followUp
    followUp:     '/dashboard/suivre',
    calendar:     '/dashboard/calendrier',
    library:      '/dashboard/bibliotheque',
    dashboard:    '/dashboard',
  }
}

// ── Execution Context ─────────────────────────────────────────────────────────

/**
 * Contexte minimal transmis à chaque template.
 *
 * SÉCURITÉ — Ne jamais inclure :
 *   - texteExtrait / contenu complet d'un document
 *   - conversation IA complète
 *   - noms d'élèves, notes, absences individuelles
 *   - storage_path, URL signée, token
 *   - priority_student_ids
 */
export interface ExecutionContext {
  mission: Mission | null
  bundle:  MissionBundle | null

  classeId:  string | null
  classeNom: string | null
  matiere:   string | null

  references: {
    programmeAnnuelId:   string | null
    curriculumId:        string | null
    latestLessonId:      string | null
    latestEvaluationId:  string | null
    deadlineId:          string | null
  }

  routes: ExecutionRouteRegistry
}

// ── Helpers internes ──────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function safeStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/** Extrait le classeId depuis l'ID déterministe d'une mission (position 2 dans ':'-split). */
function extractClasseIdFromMissionId(id: string): string | null {
  const parts = id.split(':')
  const candidate = parts[2]
  return candidate && UUID_RE.test(candidate) ? candidate : null
}

/** Mission la plus prioritaire dans un bundle. */
function leadMission(bundle: MissionBundle): Mission {
  return bundle.missions.reduce((best, m) => (m.priority > best.priority ? m : best))
}

// ── buildExecutionContext ─────────────────────────────────────────────────────

export function buildExecutionContext(opts: {
  mission:       Mission | null
  bundle:        MissionBundle | null
  routeRegistry: ExecutionRouteRegistry
}): ExecutionContext {
  const { mission, bundle, routeRegistry } = opts

  // Source pour l'extraction de métadonnées
  const source = mission ?? (bundle ? leadMission(bundle) : null)
  const meta   = source?.metadata ?? {}

  // classeId : metadata['classe_id'] en priorité, puis parsing de l'ID de mission
  const classeId =
    safeStr(meta['classe_id']) ??
    (source ? extractClasseIdFromMissionId(source.id) : null)

  // Références documentaires (extraites des evidences, plus fiables que la metadata)
  const evidence = source?.evidence ?? []
  const progAnnuelId = evidence.find(e => e.source === 'programme_annuel')?.documentId
    ?? safeStr(meta['programme_annuel_id'])
    ?? null
  const latestLessonId = evidence.find(e => e.source === 'derniere_lecon')?.documentId ?? null
  const latestEvalId   = evidence.find(e => e.source === 'evaluation')?.documentId ?? null
  const deadlineId     = safeStr(meta['deadline_id'])
    ?? evidence.find(e => e.source === 'deadline')?.documentId
    ?? null

  return {
    mission,
    bundle,
    classeId,
    classeNom: safeStr(meta['classe_nom']),
    matiere:   safeStr(meta['matiere']),
    references: {
      programmeAnnuelId:  progAnnuelId,
      curriculumId:       null,
      latestLessonId,
      latestEvaluationId: latestEvalId,
      deadlineId,
    },
    routes: routeRegistry,
  }
}
