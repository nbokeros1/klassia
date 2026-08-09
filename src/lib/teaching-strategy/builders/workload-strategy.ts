// ── Teaching Strategy — WorkloadStrategyBuilder (ME-10) ──────────────────────
//
// Analyse TeacherWorkload et retourne le mode stratégique approprié.
// Déterministe — aucun appel IA, aucun réseau.

import type { TeacherWorkload } from '../../teacher-brain/types'
import type { StrategySignal } from '../types'

// Nombre de travaux en attente pour déclencher REDUCE_BACKLOG
const PENDING_BACKLOG_THRESHOLD = 3

export class WorkloadStrategyBuilder {
  analyze(workload: TeacherWorkload): StrategySignal | null {
    // REDUCE_BACKLOG : travaux en retard (priorité max)
    if (workload.overdueWork > 0) {
      return {
        mode: 'REDUCE_BACKLOG',
        reason: {
          code:        'overdue_assignments',
          description: `${workload.overdueWork} travail/travaux en retard nécessitent une correction prioritaire.`,
          source:      'workload',
        },
      }
    }

    // REDUCE_BACKLOG : accumulation de travaux en attente
    if (workload.pendingWork >= PENDING_BACKLOG_THRESHOLD) {
      return {
        mode: 'REDUCE_BACKLOG',
        reason: {
          code:        'high_pending_workload',
          description: `${workload.pendingWork} travaux en attente de correction (seuil : ${PENDING_BACKLOG_THRESHOLD}).`,
          source:      'workload',
        },
      }
    }

    return null
  }
}
