// ─── SPIE — Pedagogical Year Tree ─────────────────────────────────────────────
// View model derived from ContenuProgramme + lecons DB + lessonStateMap.
// Single canonical source for status resolution, unit stats, and outcome lookup.
//
// KNOWN DATA LIMITATIONS (document for V8):
//   - question_directrice: absent from Unite type — no guiding-question field exists
//   - CCHP: absent from Unite/LeconProgramme — perspective_autochtone only partial coverage
//   - sub-sequences: hierarchy is Programme → Unité → Leçon; no sub-sequence level within a unit
//
// No I/O — pure derivation. No mutations.

import type {
  ContenuProgramme, Unite, LeconProgramme, Lecon, CurriculumOutcome,
} from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Status ───────────────────────────────────────────────────────────────────

export type LessonStatus =
  | 'enseignee'
  | 'a_reprendre'
  | 'preparee'
  | 'en_cours'
  | 'planifiee'

export const LESSON_STATUS_CFG: Record<LessonStatus, {
  label:   string
  abbr:    string
  color:   string
  bg:      string  // CSS background for badge
}> = {
  enseignee:   { label: 'Enseignée',   abbr: 'Ens',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)'    },
  a_reprendre: { label: 'À reprendre', abbr: 'Rep',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'   },
  preparee:    { label: 'Préparée',    abbr: 'Prép', color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)'   },
  en_cours:    { label: 'En cours',    abbr: 'Crs',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'   },
  planifiee:   { label: 'Planifiée',   abbr: 'Plan', color: '#8B97AC', bg: 'rgba(139,151,172,0.08)'  },
}

// ─── Status resolution — canonical ────────────────────────────────────────────

export function resolveLessonStatus(
  lecon:    LeconProgramme,
  seqIdx:   number,
  leconIdx: number,
  map?:     Record<string, LessonTeachingState>,
): LessonStatus {
  const key = `${seqIdx}:${leconIdx}`
  if (map?.[key]?.isTaught || lecon.statut === 'enseignee') return 'enseignee'
  if (lecon.statut === 'a_revoir')                          return 'a_reprendre'
  if (lecon.statut === 'en_cours')                          return 'en_cours'
  if (lecon.lecon_id)                                       return 'preparee'
  return 'planifiee'
}

// ─── Node types ───────────────────────────────────────────────────────────────

export type LessonNode = {
  leconProg:  LeconProgramme
  leconDB:    Lecon | undefined        // undefined = no DB record (not prepared)
  seqIdx:     number                   // 0-based unite index
  leconIdx:   number                   // 0-based within unite
  lessonKey:  string                   // "seqIdx:leconIdx"
  status:     LessonStatus
  teachState: LessonTeachingState | undefined
  outcomes:   CurriculumOutcome[]      // resolved from programme curriculum_outcomes[]
}

export type UnitStats = {
  total:      number
  taught:     number
  prepared:   number
  inProgress: number
  toRevisit:  number
  pctTaught:  number  // 0-100
}

export type UnitNode = {
  unite:    Unite
  seqIdx:   number               // 0-based
  lessons:  LessonNode[]
  stats:    UnitStats
  outcomes: CurriculumOutcome[]  // resolved for this unit's curriculum_outcome_ids
  status:   'terminee' | 'en_cours' | 'a_venir'
}

export type PedagogicalYearTree = {
  contenu:     ContenuProgramme
  units:       UnitNode[]
  allOutcomes: CurriculumOutcome[]
  hasV2Data:   boolean  // false = V1 pack, no curriculum_outcomes
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildPedagogicalYearTree(
  contenu:        ContenuProgramme,
  leconDBList:    Lecon[],
  lessonStateMap: Record<string, LessonTeachingState> | undefined,
): PedagogicalYearTree {
  const allOutcomes = contenu.curriculum_outcomes ?? []
  const hasV2Data   = allOutcomes.length > 0

  const leconById: Record<string, Lecon> = {}
  for (const l of leconDBList) leconById[l.id] = l

  const outcomeById: Record<string, CurriculumOutcome> = {}
  for (const o of allOutcomes) outcomeById[o.id] = o

  function resolveOutcomes(ids: string[] | undefined): CurriculumOutcome[] {
    if (!ids || ids.length === 0) return []
    return ids.map(id => outcomeById[id]).filter((o): o is CurriculumOutcome => !!o)
  }

  const units: UnitNode[] = contenu.unites.map((unite, seqIdx) => {
    const lessons: LessonNode[] = unite.lecons.map((lp, leconIdx) => {
      const lessonKey  = `${seqIdx}:${leconIdx}`
      const status     = resolveLessonStatus(lp, seqIdx, leconIdx, lessonStateMap)
      const leconDB    = lp.lecon_id ? leconById[lp.lecon_id] : undefined
      const teachState = lessonStateMap?.[lessonKey]
      const outcomes   = resolveOutcomes(lp.curriculum_outcome_ids)
      return { leconProg: lp, leconDB, seqIdx, leconIdx, lessonKey, status, teachState, outcomes }
    })

    const stats: UnitStats = {
      total:      lessons.length,
      taught:     lessons.filter(l => l.status === 'enseignee').length,
      prepared:   lessons.filter(l => l.status === 'preparee' || l.status === 'en_cours').length,
      inProgress: lessons.filter(l => l.status === 'en_cours').length,
      toRevisit:  lessons.filter(l => l.status === 'a_reprendre').length,
      pctTaught:  lessons.length > 0
        ? Math.round((lessons.filter(l => l.status === 'enseignee').length / lessons.length) * 100)
        : 0,
    }

    const unitStatus: UnitNode['status'] =
      stats.taught === stats.total && stats.total > 0 ? 'terminee' :
      stats.taught > 0 || stats.inProgress > 0        ? 'en_cours' :
      'a_venir'

    return {
      unite,
      seqIdx,
      lessons,
      stats,
      outcomes: resolveOutcomes(unite.curriculum_outcome_ids),
      status:   unitStatus,
    }
  })

  return { contenu, units, allOutcomes, hasV2Data }
}

// ─── Pure text utilities ───────────────────────────────────────────────────────

export function htmlToText(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function firstNonEmpty(...values: (string | string[] | undefined | null)[]): string | null {
  for (const v of values) {
    if (!v) continue
    if (Array.isArray(v)) {
      const joined = v.filter(Boolean).join(' ')
      if (joined.trim()) return joined.trim()
    } else {
      const t = htmlToText(v)
      if (t) return t
    }
  }
  return null
}

// ─── Aggregate stats across all units ─────────────────────────────────────────

export function aggregateYearStats(tree: PedagogicalYearTree): UnitStats {
  return tree.units.reduce<UnitStats>(
    (acc, u) => ({
      total:      acc.total      + u.stats.total,
      taught:     acc.taught     + u.stats.taught,
      prepared:   acc.prepared   + u.stats.prepared,
      inProgress: acc.inProgress + u.stats.inProgress,
      toRevisit:  acc.toRevisit  + u.stats.toRevisit,
      pctTaught:  0,
    }),
    { total: 0, taught: 0, prepared: 0, inProgress: 0, toRevisit: 0, pctTaught: 0 },
  )
}
