// SPIE-07 — StrategyValidatorService
// Validates a strategy and attaches the quality score.

import { strategyValidator, type StrategyValidatorInput } from '../validation/strategy-validator'
import type { PedagogicalStrategy } from '../types/strategy'
import type { StrategyValidationReport, ValidationStatut } from '../types/validation'

export class StrategyValidatorService {
  /** Validate and return the full report. */
  validate(input: StrategyValidatorInput): StrategyValidationReport {
    return strategyValidator.validate(input)
  }

  /** Validate and annotate the strategy with its quality score. */
  validateAndAnnotate(
    strategy: PedagogicalStrategy,
    totalOutcomes: number,
    heuresDisponibles: number,
  ): { strategy: PedagogicalStrategy; report: StrategyValidationReport } {
    const report = strategyValidator.validate({ strategy, totalOutcomes, heuresDisponibles })
    return { strategy: { ...strategy, scoreQualite: report.scoreGlobal }, report }
  }

  /** Returns true if the strategy can proceed to generation. */
  canGenerate(report: StrategyValidationReport): boolean {
    return report.validePourGeneration
  }

  /** Human-readable status label. */
  statusLabel(report: StrategyValidationReport): string {
    if (report.scoreGlobal >= 80) return 'Excellente'
    if (report.scoreGlobal >= 60) return 'Acceptable'
    if (report.scoreGlobal >= 40) return 'À améliorer'
    return 'Insuffisante'
  }

  /** Dominant statut across dimensions. */
  dominantStatut(report: StrategyValidationReport): ValidationStatut {
    const counts: Record<ValidationStatut, number> = { ok: 0, attention: 0, probleme: 0 }
    for (const d of report.dimensions) counts[d.statut]++
    if (counts.probleme > 0) return 'probleme'
    if (counts.attention > 0) return 'attention'
    return 'ok'
  }
}

export const strategyValidatorService = new StrategyValidatorService()
