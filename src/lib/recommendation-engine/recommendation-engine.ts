// ── Recommendation Engine — Orchestrateur (ME-17) ────────────────────────────
//
// Transforme des Insights en Recommandations personnalisées.
// Ne crée aucune mission. Ne modifie aucune priorité. Ne déclenche aucune action.
// Suggère uniquement — jamais "Vous devriez", toujours "Vous pourriez" / "Essayez de".

import type { SupabaseClient }               from '@supabase/supabase-js'
import type { Insight }                      from '@/lib/insight-engine/insight-types'
import type { Recommendation, RecommendationFilters } from './recommendation-types'
import { RecommendationRegistry }            from './recommendation-registry'
import { SupabaseRecommendationRepository }  from './recommendation-repository'
import type { RecommendationRepository }     from './recommendation-repository'
import { validateRecommendation }            from './recommendation-validator'
import { PlanningRecommendationStrategy, PreparationRecommendationStrategy } from './strategies/planning-recommendation'
import { WorkflowRecommendationStrategy }    from './strategies/workflow-recommendation'
import { EvaluationRecommendationStrategy }  from './strategies/evaluation-recommendation'
import { ConsistencyRecommendationStrategy } from './strategies/consistency-recommendation'
import { ProductivityRecommendationStrategy } from './strategies/productivity-recommendation'
import { WellbeingRecommendationStrategy }   from './strategies/fatigue-recommendation'

// ── RecommendationEngine ──────────────────────────────────────────────────────

export class RecommendationEngine {
  private registry:   RecommendationRegistry
  private repository: RecommendationRepository

  constructor(
    supabase:             SupabaseClient,
    private teacherId:    string,
    registryOverride?:    RecommendationRegistry,
    repositoryOverride?:  RecommendationRepository,
  ) {
    this.repository = repositoryOverride ?? new SupabaseRecommendationRepository(supabase)
    this.registry   = registryOverride   ?? new RecommendationRegistry()

    if (!registryOverride) {
      this.registry.register(new PlanningRecommendationStrategy())
      this.registry.register(new PreparationRecommendationStrategy())
      this.registry.register(new WorkflowRecommendationStrategy())
      this.registry.register(new EvaluationRecommendationStrategy())
      this.registry.register(new ConsistencyRecommendationStrategy())
      this.registry.register(new ProductivityRecommendationStrategy())
      this.registry.register(new WellbeingRecommendationStrategy())
    }
  }

  // Génère des recommandations validées (non persistées)
  generate(insights: Insight[]): Recommendation[] {
    if (insights.length === 0) return []

    const candidates = this.registry.generate(insights, this.teacherId)

    return candidates.filter(rec => {
      const validation = validateRecommendation(rec)
      if (!validation.valid) {
        console.error('[KLASSIA][REC_ENGINE][VALIDATION_ERROR]', {
          type:   rec.type,
          errors: validation.errors,
        })
      }
      return validation.valid
    })
  }

  // Génère, sauvegarde (7 jours) et retourne les recommandations
  async generateAndSave(insights: Insight[]): Promise<Recommendation[]> {
    const recs = this.generate(insights)
    if (recs.length === 0) return []

    await this.repository.deleteAll(this.teacherId)
    await this.repository.save(recs)
    return recs
  }

  // Lit les recommandations persistées
  async getRecommendations(filters?: RecommendationFilters): Promise<Recommendation[]> {
    return this.repository.getByTeacher(this.teacherId, filters)
  }

  // Supprime les entrées expirées
  async cleanExpired(): Promise<void> {
    return this.repository.deleteExpired(this.teacherId)
  }
}

export function createRecommendationEngine(supabase: SupabaseClient, teacherId: string): RecommendationEngine {
  return new RecommendationEngine(supabase, teacherId)
}
