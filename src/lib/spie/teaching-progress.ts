// ─── SPIE — Teaching Progress Engine (V4/V5) ─────────────────────────────────
// Fonctions déterministes pour calculer le rythme d'enseignement et l'action
// prioritaire suivante. Aucune mutation — fonctions pures.

import type { PacingIndicator, PacingStatut, SequenceProgress, LessonTeachingState } from '@/lib/types/school-year-dashboard'
import { makeLessonKey } from '@/lib/spie/teaching-events'

// ─── Constantes de rythme ────────────────────────────────────────────────────

export const PACING_THRESHOLDS = {
  EN_AVANCE:        8,   // delta >= 8 → en avance
  DANS_LE_RYTHME:  -7,   // delta >= -7 (et < 8) → dans le rythme
  A_SURVEILLER:   -15,   // delta >= -15 (et < -7) → à surveiller
  // EN_RETARD : delta < -15
} as const

const PACING_CONFIG: Record<PacingStatut, { label: string; color: string }> = {
  EN_AVANCE:       { label: 'En avance',      color: '#22C55E' },
  DANS_LE_RYTHME:  { label: 'Dans le rythme', color: '#3B82F6' },
  A_SURVEILLER:    { label: 'À surveiller',   color: '#F59E0B' },
  EN_RETARD:       { label: 'En retard',      color: '#EF4444' },
}

// ─── % d'année scolaire écoulée ──────────────────────────────────────────────

/**
 * Retourne le pourcentage de l'année scolaire écoulée (0–100).
 * Suppose une année de type "YYYY-YYYY" (ex. "2025-2026").
 * Début : 1er septembre de l'année de début.
 * Fin   : 30 juin de l'année de fin.
 */
export function getSchoolYearElapsedPercent(anneeScolaire: string): number {
  const parts = anneeScolaire.split('-')
  if (parts.length < 2) return 0

  const startYear = parseInt(parts[0], 10)
  const endYear   = parseInt(parts[1], 10)
  if (isNaN(startYear) || isNaN(endYear)) return 0

  const start = new Date(startYear, 8, 1)   // 1er septembre
  const end   = new Date(endYear,   5, 30)  // 30 juin
  const now   = new Date()

  if (now <= start) return 0
  if (now >= end)   return 100

  const total   = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  return Math.round((elapsed / total) * 100)
}

// ─── Indicateur de rythme ────────────────────────────────────────────────────

/**
 * Calcule l'indicateur de rythme pédagogique.
 * delta = teachingPct - elapsedPct
 * Retourne null si les données sont insuffisantes.
 */
export function derivePacingIndicator(
  teachingPct: number | null,
  elapsedPct: number,
): PacingIndicator | null {
  if (teachingPct === null || elapsedPct === 0) return null

  const delta = teachingPct - elapsedPct
  let statut: PacingStatut

  if (delta >= PACING_THRESHOLDS.EN_AVANCE) {
    statut = 'EN_AVANCE'
  } else if (delta >= PACING_THRESHOLDS.DANS_LE_RYTHME) {
    statut = 'DANS_LE_RYTHME'
  } else if (delta >= PACING_THRESHOLDS.A_SURVEILLER) {
    statut = 'A_SURVEILLER'
  } else {
    statut = 'EN_RETARD'
  }

  const cfg = PACING_CONFIG[statut]
  return { delta, statut, label: cfg.label, color: cfg.color }
}

// ─── Prochaine action d'enseignement ─────────────────────────────────────────

export type NextTeachingAction = {
  type:        'enseigner' | 'preparer'
  sequenceNum: number
  leconNum:    number
  titre:       string
  detail:      string
}

/**
 * Retourne l'action d'enseignement la plus urgente.
 * Priorité : enseigner (leçon préparée non enseignée) > préparer (leçon sans plan).
 * V5 : utilise lessonStateMap si disponible, sinon fallback sur l.statut (V4).
 */
export function getNextTeachingAction(
  sequences: SequenceProgress[],
  lessonStateMap?: Record<string, LessonTeachingState>,
): NextTeachingAction | null {
  const currentSeq = sequences.find(s => s.statut !== 'terminee')
  if (!currentSeq) return null

  const isTaught = (leconIdx: number): boolean => {
    if (lessonStateMap) {
      return lessonStateMap[makeLessonKey(currentSeq.seqIdx, leconIdx)]?.isTaught ?? false
    }
    return currentSeq.uniteData.lecons[leconIdx]?.statut === 'enseignee'
  }

  const lecons = currentSeq.uniteData.lecons

  // Cherche d'abord une leçon préparée mais non enseignée
  for (let li = 0; li < lecons.length; li++) {
    const l = lecons[li]
    if (!!l.lecon_id && !isTaught(li)) {
      return {
        type:        'enseigner',
        sequenceNum: currentSeq.numero,
        leconNum:    l.numero,
        titre:       l.titre,
        detail:      `Séquence ${currentSeq.numero} — plan de leçon prêt`,
      }
    }
  }

  // Sinon : leçon non préparée (sans plan)
  for (let li = 0; li < lecons.length; li++) {
    const l = lecons[li]
    if (!l.lecon_id && !isTaught(li)) {
      return {
        type:        'preparer',
        sequenceNum: currentSeq.numero,
        leconNum:    l.numero,
        titre:       l.titre,
        detail:      `Séquence ${currentSeq.numero}`,
      }
    }
  }

  return null
}
