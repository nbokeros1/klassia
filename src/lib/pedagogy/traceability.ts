// ─── ScorgIA — Pedagogical Traceability Engine V7.0 ─────────────────────────
// Répond aux questions :
//   "Où RA X a-t-il été planifié ?"
//   "Où a-t-il été enseigné ?"
//   "Quelle activité l'a travaillé ?"
//   "Quelle preuve d'apprentissage existe ?"
// Ne fabrique PAS les données manquantes — les note dans `missing`.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContenuProgramme, TeachingEvent } from '@/lib/types/database'
import type { TraceabilityGraph } from './types/index'

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function unitCoversOutcome(
  unite: ContenuProgramme['unites'][number],
  outcomeId: string,
): boolean {
  if (unite.curriculum_outcome_ids?.includes(outcomeId)) return true
  return unite.lecons.some(l => l.curriculum_outcome_ids?.includes(outcomeId))
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLE OUTCOME TRACEABILITY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Construit le graphe de traçabilité complet pour un RA donné.
 * Travaille exclusivement avec les données en mémoire — pas d'appel DB.
 */
export function buildTraceabilityGraph(
  outcomeId:      string,
  outcomeCode:    string | undefined,
  outcomeTitre:   string | undefined,
  contenu:        ContenuProgramme,
  teachingEvents: TeachingEvent[],
): TraceabilityGraph {
  const units:          TraceabilityGraph['units']          = []
  const sequences:      TraceabilityGraph['sequences']      = []
  const lesson_plans:   TraceabilityGraph['lesson_plans']   = []
  const lessons:        TraceabilityGraph['lessons']        = []
  const teaching_events: TraceabilityGraph['teaching_events'] = []
  const assessments:    TraceabilityGraph['assessments']    = []
  const missing:        string[]                            = []

  // ── Walk unites ────────────────────────────────────────────────────────────
  for (let si = 0; si < contenu.unites.length; si++) {
    const unite = contenu.unites[si]
    if (!unitCoversOutcome(unite, outcomeId)) continue

    const unitId = `unit:${si}`
    units.push({ unit_id: unitId, titre: unite.titre, seqIdx: si })

    // Séquence = unité dans SPIE (une séquence peut contenir plusieurs leçons)
    const seqId = `seq:${si}`
    sequences.push({ seq_id: seqId, titre: unite.titre, unit_id: unitId })

    // ── Walk leçons ────────────────────────────────────────────────────────
    for (let li = 0; li < unite.lecons.length; li++) {
      const lecon = unite.lecons[li]

      // Ne trace que les leçons qui couvrent ce RA (explicitement ou via unité)
      const leconExplicit = lecon.curriculum_outcome_ids?.includes(outcomeId)
      const leconViaUnit  = unite.curriculum_outcome_ids?.includes(outcomeId) && !lecon.curriculum_outcome_ids

      if (!leconExplicit && !leconViaUnit) continue

      if (lecon.lecon_id) {
        lesson_plans.push({
          plan_id:  lecon.lecon_id,
          titre:    lecon.titre,
          seq_id:   seqId,
        })
      } else {
        missing.push(
          `Leçon "${lecon.titre}" (Séq. ${si + 1}, L${li + 1}) — plan de leçon non encore généré`
        )
      }
    }
  }

  // ── Walk teaching events ───────────────────────────────────────────────────
  for (const ev of teachingEvents) {
    if (ev.event_type !== 'lesson_taught') continue

    const unite = contenu.unites[ev.sequence_index]
    if (!unite) continue
    if (!unitCoversOutcome(unite, outcomeId)) continue

    teaching_events.push({
      event_id:   ev.id,
      occurred_at: ev.occurred_at,
      seq_idx:    ev.sequence_index,
      lecon_idx:  ev.lecon_index,
    })
  }

  // ── Détection des lacunes ─────────────────────────────────────────────────
  if (units.length === 0) {
    missing.push(`RA "${outcomeTitre ?? outcomeId}" non planifié dans aucune unité`)
  } else if (teaching_events.length === 0) {
    missing.push(`RA "${outcomeTitre ?? outcomeId}" planifié mais aucun enseignement enregistré`)
  }

  if (assessments.length === 0 && units.length > 0) {
    missing.push(`Aucune preuve d'évaluation liée à ce RA`)
  }

  return {
    outcome_id:      outcomeId,
    outcome_code:    outcomeCode,
    outcome_titre:   outcomeTitre,
    units,
    sequences,
    lesson_plans,
    lessons,
    teaching_events,
    assessments,
    is_planified:    units.length > 0,
    is_taught:       teaching_events.length > 0,
    is_assessed:     assessments.length > 0,
    missing,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FULL MAP — tous les outcomes du programme
// ════════════════════════════════════════════════════════════════════════════

/**
 * Construit la carte de traçabilité complète pour tous les RA du programme.
 * Complexité O(outcomes × unites × lecons) — acceptable sur un programme annuel.
 */
export function buildFullTraceabilityMap(
  contenu:        ContenuProgramme,
  teachingEvents: TeachingEvent[],
): Map<string, TraceabilityGraph> {
  const map = new Map<string, TraceabilityGraph>()

  const outcomes = contenu.curriculum_outcomes ?? []
  for (const outcome of outcomes) {
    map.set(
      outcome.id,
      buildTraceabilityGraph(outcome.id, outcome.code, outcome.titre, contenu, teachingEvents),
    )
  }

  return map
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY — résumé pour affichage
// ════════════════════════════════════════════════════════════════════════════

export type TraceabilitySummary = {
  total_outcomes:    number
  planified:         number
  taught:            number
  assessed:          number
  not_planified:     number
  not_taught:        number
  not_assessed:      number
  critical_gaps:     string[]   // outcomes jamais planifiés
}

export function summarizeTraceability(
  map: Map<string, TraceabilityGraph>,
): TraceabilitySummary {
  let planified  = 0
  let taught     = 0
  let assessed   = 0
  const critical_gaps: string[] = []

  for (const [, graph] of map) {
    if (graph.is_planified) planified++
    else critical_gaps.push(graph.outcome_titre ?? graph.outcome_id)
    if (graph.is_taught)  taught++
    if (graph.is_assessed) assessed++
  }

  const total = map.size
  return {
    total_outcomes: total,
    planified,
    taught,
    assessed,
    not_planified: total - planified,
    not_taught:    total - taught,
    not_assessed:  total - assessed,
    critical_gaps,
  }
}
