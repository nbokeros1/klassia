// SPIE-03 — Context Validator Service
// Validates a PedagogicalContext before allowing generation to proceed.

import type { PedagogicalContext } from '../types/context'
import type { ContextSourcesMap, ContextSourceType } from '../types/sources'

export interface ContextValidationResult {
  valid: boolean
  erreurs: string[]
  avertissements: string[]
  sourcesMissing: ContextSourceType[]
  sourcesStale: ContextSourceType[]
}

export class ContextValidatorService {
  validate(context: PedagogicalContext): ContextValidationResult {
    const erreurs: string[] = []
    const avertissements: string[] = []
    const sourcesMissing: ContextSourceType[] = []
    const sourcesStale: ContextSourceType[] = []

    // Check mandatory sources
    if (!context.sources.curriculum) {
      erreurs.push('Curriculum manquant — non négociable pour la génération pédagogique')
      sourcesMissing.push('curriculum')
    }

    // Check context score
    if (context.score.global < 30) {
      erreurs.push(`Score de contexte trop faible (${context.score.global}/100) — minimum requis : 30`)
    }

    // Check for stale sources
    for (const [type, score] of Object.entries(context.score.sources)) {
      if (score.stale) {
        avertissements.push(`Source "${type}" obsolète — veuillez rafraîchir`)
        sourcesStale.push(type as ContextSourceType)
      }
      if (score.level === 'absent' && type !== 'standards') {
        sourcesMissing.push(type as ContextSourceType)
        if (['calendar', 'progression'].includes(type)) {
          avertissements.push(`Source "${type}" absente — qualité de génération réduite`)
        }
      }
    }

    // Check academic year
    if (!context.academicYear || context.academicYear.trim() === '') {
      avertissements.push('Année scolaire non spécifiée')
    }

    return {
      valid: erreurs.length === 0,
      erreurs,
      avertissements,
      sourcesMissing,
      sourcesStale,
    }
  }
}

export const contextValidatorService = new ContextValidatorService()
