// SPIE-03 — Context Memory
// Builds and manages the ContextMemory from progression + historique sources.

import type { ContextMemory, MemoryEntry, MemoryEntryStatus, ContextMemoryStats } from '../types/memory'
import type { ProgressionContextSource, HistoriqueContextSource } from '../types/sources'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'

// ─── Memory builder ───────────────────────────────────────────────────────────

export function buildContextMemory(
  classeId: string,
  matiereId: string | undefined,
  academicYear: string,
  outcomes: NormalizedOutcome[],
  progression: ProgressionContextSource | undefined,
  historique: HistoriqueContextSource | undefined,
): ContextMemory {
  const entries: MemoryEntry[] = []

  // Create entries for all curriculum outcomes
  for (const outcome of outcomes) {
    let status: MemoryEntryStatus = 'non_planifie'

    if (progression) {
      if (progression.outcomesEnseignes.includes(outcome.id)) {
        status = 'enseigne'
      } else if (progression.outcomesIgnores.includes(outcome.id)) {
        status = 'saute'
      } else if (progression.outcomesARenforcer.includes(outcome.id)) {
        status = 'a_renforcer'
      } else if (progression.outcomesRestants.includes(outcome.id)) {
        status = 'planifie'
      }
    }

    // Enrich with historique data
    let leconId: string | undefined
    let leconTitre: string | undefined
    let dateEnseignement: string | undefined
    let tauxEngagement: number | undefined

    if (historique) {
      const leconAvecOutcome = historique.dernieresLecons.find(l =>
        l.outcomesCouverts.includes(outcome.id)
      )
      if (leconAvecOutcome) {
        leconId = leconAvecOutcome.leconId
        leconTitre = leconAvecOutcome.titre
        dateEnseignement = leconAvecOutcome.date
        tauxEngagement = leconAvecOutcome.niveauEngagement === 'eleve' ? 85
          : leconAvecOutcome.niveauEngagement === 'moyen' ? 60
          : leconAvecOutcome.niveauEngagement === 'faible' ? 30
          : undefined
      }
    }

    entries.push({
      id: `mem_${outcome.id}`,
      outcomeId: outcome.id,
      outcomeCode: outcome.code,
      outcomeTitre: outcome.texte.substring(0, 100),
      status,
      dateStatut: new Date().toISOString(),
      dateEnseignement,
      leconId,
      leconTitre,
      tauxEngagement,
    })
  }

  const enseignes = entries.filter(e => e.status === 'enseigne').map(e => e.outcomeId)
  const aRenforcer = entries.filter(e => e.status === 'a_renforcer').map(e => e.outcomeId)
  const enRetard = entries.filter(e => e.status === 'en_retard').map(e => e.outcomeId)
  const sautes = entries.filter(e => e.status === 'saute').map(e => e.outcomeId)
  const restants = entries
    .filter(e => e.status === 'non_planifie' || e.status === 'planifie')
    .map(e => e.outcomeId)

  const total = entries.length
  const progressPercent = total > 0 ? Math.round((enseignes.length / total) * 100) : 0
  const avanceRetardSemaines = progression?.avanceRetardSemaines ?? 0
  const onTrack = avanceRetardSemaines >= -1  // Less than 1 week behind

  const stats: ContextMemoryStats = {
    total,
    enseigne: enseignes.length,
    enseignePartiel: entries.filter(e => e.status === 'enseigne_partiel').length,
    aRenforcer: aRenforcer.length,
    saute: sautes.length,
    enRetard: enRetard.length,
    planifie: entries.filter(e => e.status === 'planifie').length,
    nonPlanifie: entries.filter(e => e.status === 'non_planifie').length,
    progressPercent,
    onTrack,
    avanceRetardSemaines,
  }

  return {
    classeId,
    matiereId,
    academicYear,
    entries,
    enseignes,
    aRenforcer,
    enRetard,
    sautes,
    restants,
    stats,
    updatedAt: new Date().toISOString(),
  }
}

// ─── Memory query helpers ─────────────────────────────────────────────────────

export function getNextRecommendedOutcomes(
  memory: ContextMemory,
  outcomes: NormalizedOutcome[],
  maxCount = 3,
): NormalizedOutcome[] {
  // Priority: à_renforcer first, then non-planned in curriculum order
  const aRenforcerIds = new Set(memory.aRenforcer)
  const restantsIds = new Set(memory.restants)

  return outcomes
    .filter(o => aRenforcerIds.has(o.id) || restantsIds.has(o.id))
    .sort((a, b) => {
      // à_renforcer first
      const aIsRenforcer = aRenforcerIds.has(a.id)
      const bIsRenforcer = aRenforcerIds.has(b.id)
      if (aIsRenforcer && !bIsRenforcer) return -1
      if (!aIsRenforcer && bIsRenforcer) return 1
      return 0
    })
    .slice(0, maxCount)
}
