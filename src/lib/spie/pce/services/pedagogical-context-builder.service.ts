// SPIE-03 — PedagogicalContextBuilder Service
// High-level service for building a PedagogicalContext from application data.
// This is what API routes and server actions should call.

import type { PedagogicalContext, PedagogicalContextInput, ContextBuildResult } from '../types/context'
import type { ContextSourcesMap } from '../types/sources'
import { pedagogicalContextBuilder } from '../builder/pedagogical-context-builder'

export class PedagogicalContextBuilderService {
  // Build context from a fully assembled sources map
  build(
    input: PedagogicalContextInput,
    sources: ContextSourcesMap,
  ): ContextBuildResult {
    return pedagogicalContextBuilder.build(input, sources)
  }

  // Build a minimal context (curriculum only — for quick generation)
  buildMinimal(
    curriculumId: string,
    province: string,
    matiere: string,
    niveaux: string[],
  ): ContextBuildResult {
    return pedagogicalContextBuilder.buildMinimal(curriculumId, province, matiere, niveaux)
  }

  // Validate that a context is ready for generation
  validateForGeneration(context: PedagogicalContext): {
    ready: boolean
    raisons: string[]
    warnings: string[]
  } {
    const raisons: string[] = []
    const warnings: string[] = []

    if (!context.score.readyForGeneration) {
      raisons.push('Score de contexte insuffisant pour la génération')
    }

    if (!context.sources.curriculum) {
      raisons.push('Curriculum manquant — impossible de générer sans curriculum')
    }

    if (context.score.sourcesMandatairesMissing.length > 0) {
      raisons.push(`Sources obligatoires manquantes : ${context.score.sourcesMandatairesMissing.join(', ')}`)
    }

    // Warnings (non-blocking)
    if (!context.sources.calendar) {
      warnings.push('Calendrier manquant — les durées seront estimées')
    }
    if (!context.sources.progression) {
      warnings.push('Progression manquante — la continuité pédagogique ne peut pas être vérifiée')
    }
    if (context.score.global < 50) {
      warnings.push(`Score de contexte faible (${context.score.global}/100) — qualité de génération réduite`)
    }

    return {
      ready: raisons.length === 0,
      raisons,
      warnings,
    }
  }

  // Extract a compact prompt injection block from a context
  getPromptBlock(context: PedagogicalContext, compact = false): string {
    return compact
      ? (context.promptSummary?.blocCourt ?? '')
      : (context.promptSummary?.bloc ?? '')
  }
}

export const pedagogicalContextBuilderService = new PedagogicalContextBuilderService()
