// SPIE-07 — StrategyComparisonService
// Builds and queries strategy comparisons (A/B/C).

import { strategyComparisonEngine, type ComparisonEngineInput } from '../comparison/strategy-comparison-engine'
import type { StrategyComparison, StrategyComparisonLabel, StrategySnapshot } from '../types/comparison'
import type { PedagogicalStrategy } from '../types/strategy'
import type { PedagogicalSimulation } from '../../pps/types/simulation'

export class StrategyComparisonService {
  /** Build a full A/B/C comparison. */
  compare(
    strategyA: PedagogicalStrategy,
    simulation?: PedagogicalSimulation,
    totalSemaines?: number,
  ): StrategyComparison {
    const input: ComparisonEngineInput = { strategyA, simulation, totalSemaines }
    return strategyComparisonEngine.buildComparison(input)
  }

  /** Return the recommended strategy label. */
  getRecommended(comparison: StrategyComparison): StrategyComparisonLabel {
    return comparison.strategyRecommandee
  }

  /** Return a specific snapshot by label. */
  getSnapshot(comparison: StrategyComparison, label: StrategyComparisonLabel): StrategySnapshot | undefined {
    return comparison.snapshots.find(s => s.label === label)
  }

  /** Return the narrative analysis. */
  getNarrative(comparison: StrategyComparison): string {
    return comparison.analyseNarrative
  }

  /** Find the snapshot with the highest quality score. */
  bestByQuality(comparison: StrategyComparison): StrategySnapshot {
    return comparison.snapshots.reduce((best, curr) => curr.scoreQualite > best.scoreQualite ? curr : best)
  }
}

export const strategyComparisonService = new StrategyComparisonService()
