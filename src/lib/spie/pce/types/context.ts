// SPIE-03 — PedagogicalContext
// The main output of the PCE. All AI generation functions MUST accept this.
// No plan, no sequence, no lesson without a PedagogicalContext.

import type { ContextSourcesMap } from './sources'
import type { ContextScore } from './score'
import type { ContextMemory } from './memory'

// ─── PedagogicalContext ───────────────────────────────────────────────────────
// This is the SPIE-03 main output and the mandatory entry point for all generation.

export interface PedagogicalContext {
  // Unique context ID (for caching and auditing)
  id: string

  // ── Core identifiers ──────────────────────────────────────────────────────
  enseignantId?: string
  classeId?: string
  matiereId?: string
  province?: string
  niveaux?: string[]
  langue: 'fr' | 'en'
  academicYear: string             // '2025-2026'

  // ── Assembled sources ─────────────────────────────────────────────────────
  sources: ContextSourcesMap

  // ── Context quality ───────────────────────────────────────────────────────
  score: ContextScore

  // ── Pedagogical memory ────────────────────────────────────────────────────
  memory?: ContextMemory

  // ── Derived summary (for prompt injection) ────────────────────────────────
  // Pre-computed text for injection into AI prompts (avoids rebuilding each call)
  promptSummary?: ContextPromptSummary

  // ── Metadata ─────────────────────────────────────────────────────────────
  builtAt: string
  builderVersion: string
}

// ─── Prompt summary ───────────────────────────────────────────────────────────
// Compact text representation for AI prompt injection.
// Respects token budgets.

export interface ContextPromptSummary {
  // Full context block (for planification)
  bloc: string
  // Short context block (for lesson generation, tight token budget)
  blocCourt: string
  // Estimated token count
  tokensEstimes: number
}

// ─── Builder input ────────────────────────────────────────────────────────────

export interface PedagogicalContextInput {
  enseignantId?: string
  classeId?: string
  matiereId?: string
  province?: string
  niveaux?: string[]
  langue?: 'fr' | 'en'
  academicYear?: string
  // Which sources to include (defaults to all available)
  sourcesToLoad?: Array<keyof ContextSourcesMap>
  // Force rebuild even if cached
  forceRebuild?: boolean
}

// ─── Builder result ───────────────────────────────────────────────────────────

export interface ContextBuildResult {
  success: boolean
  context?: PedagogicalContext
  error?: string
  // Partial build: context was built but some sources failed to load
  partial: boolean
  failedSources: Array<keyof ContextSourcesMap>
  durationMs: number
}
