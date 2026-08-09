// ── Insight Engine — Orchestrateur (ME-16) ────────────────────────────────────
//
// Transforme des ActivityEvents en Insights.
// Ne crée aucune mission. Ne modifie aucun workflow. Ne décide jamais.
// Produit uniquement des observations calculées.

import type { SupabaseClient }               from '@supabase/supabase-js'
import type { ActivityEvent }                from '@/lib/activity-engine/event-types'
import type { Insight, InsightPeriod, InsightFilters } from './insight-types'
import { InsightRegistry }                   from './insight-registry'
import { SupabaseInsightRepository }         from './insight-repository'
import type { InsightRepository }            from './insight-repository'
import { validateInsight }                   from './insight-validator'
import { CadencePattern }                    from './patterns/cadence-pattern'
import { PlanningPattern }                   from './patterns/planning-pattern'
import { PreparationPattern, EvaluationPattern } from './patterns/preparation-pattern'
import { CompletionPattern, ProductivityPattern } from './patterns/completion-pattern'
import { ConsistencyPattern }                from './patterns/consistency-pattern'
import { InterruptionPattern }               from './patterns/interruption-pattern'

// ── Helpers ───────────────────────────────────────────────────────────────────

function derivePeriod(events: ActivityEvent[]): InsightPeriod {
  if (events.length === 0) {
    const now = new Date()
    const since = new Date(now)
    since.setDate(since.getDate() - 30)
    return { since: since.toISOString(), until: now.toISOString() }
  }
  const dates = events.map(e => new Date(e.occurredAt).getTime())
  return {
    since: new Date(Math.min(...dates)).toISOString(),
    until: new Date(Math.max(...dates)).toISOString(),
  }
}

// ── InsightEngine ─────────────────────────────────────────────────────────────

export class InsightEngine {
  private registry:   InsightRegistry
  private repository: InsightRepository

  constructor(
    supabase:              SupabaseClient,
    private teacherId:     string,
    registryOverride?:     InsightRegistry,
    repositoryOverride?:   InsightRepository,
  ) {
    this.repository = repositoryOverride ?? new SupabaseInsightRepository(supabase)
    this.registry   = registryOverride   ?? new InsightRegistry()

    if (!registryOverride) {
      this.registry.register(new CadencePattern())
      this.registry.register(new PlanningPattern())
      this.registry.register(new PreparationPattern())
      this.registry.register(new EvaluationPattern())
      this.registry.register(new CompletionPattern())
      this.registry.register(new ProductivityPattern())
      this.registry.register(new ConsistencyPattern())
      this.registry.register(new InterruptionPattern())
    }
  }

  // Analyze events → produce validated insights (not persisted)
  analyze(events: ActivityEvent[], period?: InsightPeriod): Insight[] {
    const resolvedPeriod = period ?? derivePeriod(events)
    const candidates     = this.registry.analyze(events, this.teacherId, resolvedPeriod)

    return candidates.filter(insight => {
      const validation = validateInsight(insight)
      if (!validation.valid) {
        console.error('[KLASSIA][INSIGHT_ENGINE][VALIDATION_ERROR]', {
          type:   insight.type,
          errors: validation.errors,
        })
      }
      return validation.valid
    })
  }

  // Analyze, save to DB with 24h expiry, and return insights
  async generateAndSave(events: ActivityEvent[], period?: InsightPeriod): Promise<Insight[]> {
    const insights  = this.analyze(events, period)
    if (insights.length === 0) return []

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await this.repository.deleteAll(this.teacherId)
    await this.repository.save(insights, expiresAt)
    return insights
  }

  // Read persisted insights from DB
  async getInsights(filters?: InsightFilters): Promise<Insight[]> {
    return this.repository.getByTeacher(this.teacherId, filters)
  }

  // Cleanup expired rows
  async cleanExpired(): Promise<void> {
    return this.repository.deleteExpired(this.teacherId)
  }
}

export function createInsightEngine(supabase: SupabaseClient, teacherId: string): InsightEngine {
  return new InsightEngine(supabase, teacherId)
}
