// ── Predictive Engine — Repository (ME-18) ────────────────────────────────────

import type { SupabaseClient }    from '@supabase/supabase-js'
import type { Prediction, PredictionType, PredictionFilters } from './prediction-types'
import { PREDICTIVE_ENGINE_VERSION } from './prediction-types'

// ── Row mapping ───────────────────────────────────────────────────────────────

function rowToPrediction(row: Record<string, unknown>): Prediction {
  return {
    id:              row['id']               as string,
    teacherId:       row['teacher_id']       as string,
    type:            row['type']             as PredictionType,
    confidence:      row['confidence']       as number,
    predictedDate:   row['predicted_date']   as string,
    suggestedAction: row['suggested_action'] as string,
    reason:          row['reason']           as string,
    sourceInsights:  (row['source_insights'] as string[]) ?? [],
    sourceCalendar:  (row['source_calendar'] as string[]) ?? [],
    version:         row['version']          as string,
  }
}

function predictionToRow(pred: Prediction): Record<string, unknown> {
  return {
    id:               pred.id,
    teacher_id:       pred.teacherId,
    type:             pred.type,
    confidence:       pred.confidence,
    predicted_date:   pred.predictedDate,
    suggested_action: pred.suggestedAction,
    reason:           pred.reason,
    source_insights:  pred.sourceInsights,
    source_calendar:  pred.sourceCalendar,
    version:          PREDICTIVE_ENGINE_VERSION,
  }
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface PredictionRepository {
  save(preds: Prediction[]): Promise<void>
  getByTeacher(teacherId: string, filters?: PredictionFilters): Promise<Prediction[]>
  deleteAll(teacherId: string): Promise<void>
  deleteExpired(teacherId: string): Promise<void>
}

// ── Supabase implementation ───────────────────────────────────────────────────

export class SupabasePredictionRepository implements PredictionRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(preds: Prediction[]): Promise<void> {
    if (preds.length === 0) return
    const { error } = await this.supabase
      .from('teacher_predictions')
      .insert(preds.map(predictionToRow))
    if (error) {
      console.error('[KLASSIA][PRED_REPO][SAVE_ERROR]', { error: error.message })
    }
  }

  async getByTeacher(teacherId: string, filters: PredictionFilters = {}): Promise<Prediction[]> {
    const limit = Math.min(filters.limit ?? 20, 100)

    let query = this.supabase
      .from('teacher_predictions')
      .select('id, teacher_id, type, confidence, predicted_date, suggested_action, reason, source_insights, source_calendar, version')
      .eq('teacher_id', teacherId)
      .order('confidence', { ascending: false })
      .limit(limit)

    if (filters.type)          query = query.eq('type', filters.type)
    if (filters.minConfidence) query = query.gte('confidence', filters.minConfidence)
    if (filters.fromDate)      query = query.gte('predicted_date', filters.fromDate)
    if (filters.toDate)        query = query.lte('predicted_date', filters.toDate)

    const { data, error } = await query
    if (error || !data) return []
    return (data as unknown as Record<string, unknown>[]).map(rowToPrediction)
  }

  async deleteAll(teacherId: string): Promise<void> {
    await this.supabase
      .from('teacher_predictions')
      .delete()
      .eq('teacher_id', teacherId)
  }

  async deleteExpired(teacherId: string): Promise<void> {
    await this.supabase
      .from('teacher_predictions')
      .delete()
      .eq('teacher_id', teacherId)
      .lt('predicted_date', new Date().toISOString())
  }
}
