// SPIE-03 — Context Memory Service

import type { ContextMemory, MemoryEntry, MemoryEntryStatus } from '../types/memory'
import type { ProgressionContextSource, HistoriqueContextSource } from '../types/sources'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'
import { buildContextMemory, getNextRecommendedOutcomes } from '../memory/context-memory'

export class ContextMemoryService {
  build(
    classeId: string,
    matiereId: string | undefined,
    academicYear: string,
    outcomes: NormalizedOutcome[],
    progression: ProgressionContextSource | undefined,
    historique: HistoriqueContextSource | undefined,
  ): ContextMemory {
    return buildContextMemory(classeId, matiereId, academicYear, outcomes, progression, historique)
  }

  getNextRecommended(
    memory: ContextMemory,
    outcomes: NormalizedOutcome[],
    maxCount = 3,
  ): NormalizedOutcome[] {
    return getNextRecommendedOutcomes(memory, outcomes, maxCount)
  }

  // Update a single outcome's status in memory
  updateEntryStatus(
    memory: ContextMemory,
    outcomeId: string,
    status: MemoryEntryStatus,
    commentaire?: string,
  ): ContextMemory {
    const updatedEntries = memory.entries.map(e =>
      e.outcomeId === outcomeId
        ? { ...e, status, commentaire, dateStatut: new Date().toISOString() }
        : e
    )

    const enseignes = updatedEntries.filter(e => e.status === 'enseigne').map(e => e.outcomeId)
    const aRenforcer = updatedEntries.filter(e => e.status === 'a_renforcer').map(e => e.outcomeId)
    const enRetard = updatedEntries.filter(e => e.status === 'en_retard').map(e => e.outcomeId)
    const sautes = updatedEntries.filter(e => e.status === 'saute').map(e => e.outcomeId)
    const restants = updatedEntries.filter(e => e.status === 'non_planifie' || e.status === 'planifie').map(e => e.outcomeId)

    const total = updatedEntries.length
    const progressPercent = total > 0 ? Math.round((enseignes.length / total) * 100) : 0

    return {
      ...memory,
      entries: updatedEntries,
      enseignes,
      aRenforcer,
      enRetard,
      sautes,
      restants,
      stats: {
        ...memory.stats,
        enseigne: enseignes.length,
        aRenforcer: aRenforcer.length,
        enRetard: enRetard.length,
        saute: sautes.length,
        progressPercent,
      },
      updatedAt: new Date().toISOString(),
    }
  }
}

export const contextMemoryService = new ContextMemoryService()
