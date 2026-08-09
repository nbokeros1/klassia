// ── Predictive Engine — Orchestrateur (ME-18) ────────────────────────────────
//
// Transforme les signaux calendrier + insights en prédictions pédagogiques.
// Ne crée pas de missions. Ne déclenche aucune action automatique.
// Ne fait appel à aucun LLM.

import type { SupabaseClient }    from '@supabase/supabase-js'
import type { Insight }           from '@/lib/insight-engine/insight-types'
import type { Recommendation }    from '@/lib/recommendation-engine/recommendation-types'
import type { Prediction, CalendarContext, PredictionFilters } from './prediction-types'
import { PredictionRegistry }     from './prediction-registry'
import { SupabasePredictionRepository } from './prediction-repository'
import type { PredictionRepository }    from './prediction-repository'
import { validatePrediction }     from './prediction-validator'
import { EvaluationPredictionStrategy }  from './strategies/evaluation-prediction'
import { LessonPredictionStrategy }      from './strategies/lesson-prediction'
import { DeadlinePredictionStrategy }    from './strategies/deadline-prediction'
import { HolidayPredictionStrategy }     from './strategies/holiday-prediction'
import { ExamPeriodPredictionStrategy }  from './strategies/exam-period-prediction'
import { SemesterEndPredictionStrategy, GradingPeriodPredictionStrategy } from './strategies/semester-end-prediction'

// ── PredictiveEngine ──────────────────────────────────────────────────────────

export class PredictiveEngine {
  private registry:   PredictionRegistry
  private repository: PredictionRepository

  constructor(
    supabase:            SupabaseClient,
    private teacherId:   string,
    registryOverride?:   PredictionRegistry,
    repositoryOverride?: PredictionRepository,
  ) {
    this.repository = repositoryOverride ?? new SupabasePredictionRepository(supabase)
    this.registry   = registryOverride   ?? new PredictionRegistry()

    if (!registryOverride) {
      this.registry.register(new EvaluationPredictionStrategy())
      this.registry.register(new LessonPredictionStrategy())
      this.registry.register(new DeadlinePredictionStrategy())
      this.registry.register(new HolidayPredictionStrategy())
      this.registry.register(new ExamPeriodPredictionStrategy())
      this.registry.register(new SemesterEndPredictionStrategy())
      this.registry.register(new GradingPeriodPredictionStrategy())
    }
  }

  // Génère des prédictions validées (non persistées)
  generate(
    calendar:        CalendarContext,
    insights:        Insight[]        = [],
    recommendations: Recommendation[] = [],
  ): Prediction[] {
    const candidates = this.registry.generate(this.teacherId, calendar, insights, recommendations)

    return candidates.filter(pred => {
      const result = validatePrediction(pred)
      if (!result.valid) {
        console.error('[KLASSIA][PRED_ENGINE][VALIDATION_ERROR]', {
          type:   pred.type,
          errors: result.errors,
        })
      }
      return result.valid
    })
  }

  // Génère, sauvegarde (replace) et retourne les prédictions
  async generateAndSave(
    calendar:        CalendarContext,
    insights:        Insight[]        = [],
    recommendations: Recommendation[] = [],
  ): Promise<Prediction[]> {
    const preds = this.generate(calendar, insights, recommendations)
    await this.repository.deleteAll(this.teacherId)
    if (preds.length > 0) await this.repository.save(preds)
    return preds
  }

  // Lit les prédictions persistées
  async getPredictions(filters?: PredictionFilters): Promise<Prediction[]> {
    return this.repository.getByTeacher(this.teacherId, filters)
  }

  // Supprime les prédictions dont la date est passée
  async cleanExpired(): Promise<void> {
    return this.repository.deleteExpired(this.teacherId)
  }
}

export function createPredictiveEngine(supabase: SupabaseClient, teacherId: string): PredictiveEngine {
  return new PredictiveEngine(supabase, teacherId)
}
