// SPIE-07 — StrategyBuilderService
// Builds a PedagogicalStrategy from cross-SPIE inputs.

import { strategyBuilder, type StrategyBuilderInput, type StrategyBuilderOutput } from '../builder/strategy-builder'
import type { PedagogicalStrategy } from '../types/strategy'

export class StrategyBuilderService {
  /** Build a complete strategy from curriculum, context, time, and simulation data. */
  build(input: StrategyBuilderInput): StrategyBuilderOutput {
    return strategyBuilder.build(input)
  }

  /** Build and return only the strategy (drops the decision log). */
  buildStrategy(input: StrategyBuilderInput): PedagogicalStrategy {
    return strategyBuilder.build(input).strategy
  }

  /** Generate a display name from strategy inputs. */
  generateName(matiereId: string, academicYear: string, approche: string): string {
    return `Stratégie ${approche.replace(/_/g, ' ')} — ${matiereId} ${academicYear}`
  }

  /** Summarize a strategy in one sentence (for list views). */
  summarize(strategy: PedagogicalStrategy): string {
    return (
      `${strategy.approche.replace(/_/g, ' ')}, ` +
      `niveau ${strategy.niveauDifficulte}, ` +
      `${strategy.nbSequences} séquences, ` +
      `${strategy.heuresTotalesPrevues}h — ` +
      `qualité ${strategy.scoreQualite ?? '?'}/100`
    )
  }
}

export const strategyBuilderService = new StrategyBuilderService()
