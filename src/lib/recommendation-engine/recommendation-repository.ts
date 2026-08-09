// ── Recommendation Engine — Repository (ME-17) ────────────────────────────────

import type { SupabaseClient }               from '@supabase/supabase-js'
import type { Recommendation, RecommendationType, RecommendationPriority, RecommendationFilters } from './recommendation-types'
import { RECOMMENDATION_ENGINE_VERSION }     from './recommendation-types'

// ── Row mapping ───────────────────────────────────────────────────────────────

function rowToRecommendation(row: Record<string, unknown>): Recommendation {
  return {
    id:              row['id']                  as string,
    teacherId:       row['teacher_id']          as string,
    type:            row['type']                as RecommendationType,
    priority:        row['priority']            as RecommendationPriority,
    title:           row['title']               as string,
    description:     row['description']         as string,
    reason:          row['reason']              as string,
    confidence:      row['confidence']          as number,
    basedOnInsights: (row['based_on_insights']  as string[]) ?? [],
    createdAt:       row['created_at']          as string,
    expiresAt:       row['expires_at']          as string,
    version:         row['version']             as string,
  }
}

function recommendationToRow(rec: Recommendation): Record<string, unknown> {
  return {
    id:                rec.id,
    teacher_id:        rec.teacherId,
    type:              rec.type,
    priority:          rec.priority,
    title:             rec.title,
    description:       rec.description,
    reason:            rec.reason,
    confidence:        rec.confidence,
    based_on_insights: rec.basedOnInsights,
    created_at:        rec.createdAt,
    expires_at:        rec.expiresAt,
    version:           RECOMMENDATION_ENGINE_VERSION,
  }
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface RecommendationRepository {
  save(recs: Recommendation[]): Promise<void>
  getByTeacher(teacherId: string, filters?: RecommendationFilters): Promise<Recommendation[]>
  deleteExpired(teacherId: string): Promise<void>
  deleteAll(teacherId: string): Promise<void>
}

// ── Supabase implementation ───────────────────────────────────────────────────

export class SupabaseRecommendationRepository implements RecommendationRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(recs: Recommendation[]): Promise<void> {
    if (recs.length === 0) return
    const { error } = await this.supabase
      .from('teacher_recommendations')
      .insert(recs.map(recommendationToRow))
    if (error) {
      console.error('[KLASSIA][REC_REPO][SAVE_ERROR]', { error: error.message })
    }
  }

  async getByTeacher(teacherId: string, filters: RecommendationFilters = {}): Promise<Recommendation[]> {
    const limit = Math.min(filters.limit ?? 20, 50)

    let query = this.supabase
      .from('teacher_recommendations')
      .select('id, teacher_id, type, priority, title, description, reason, confidence, based_on_insights, created_at, expires_at, version')
      .eq('teacher_id', teacherId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('confidence', { ascending: false })
      .limit(limit)

    if (filters.type)     query = query.eq('type', filters.type)
    if (filters.priority) query = query.eq('priority', filters.priority)

    const { data, error } = await query
    if (error || !data) return []
    return (data as unknown as Record<string, unknown>[]).map(rowToRecommendation)
  }

  async deleteExpired(teacherId: string): Promise<void> {
    await this.supabase
      .from('teacher_recommendations')
      .delete()
      .eq('teacher_id', teacherId)
      .lt('expires_at', new Date().toISOString())
  }

  async deleteAll(teacherId: string): Promise<void> {
    await this.supabase
      .from('teacher_recommendations')
      .delete()
      .eq('teacher_id', teacherId)
  }
}
