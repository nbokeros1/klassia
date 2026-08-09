// ── Insight Engine — Repository (ME-16) ───────────────────────────────────────

import type { SupabaseClient }                from '@supabase/supabase-js'
import type { Insight, InsightType, InsightFilters } from './insight-types'
import { INSIGHT_ENGINE_VERSION }             from './insight-types'

// ── Row mapping ───────────────────────────────────────────────────────────────

function rowToInsight(row: Record<string, unknown>): Insight {
  return {
    id:          row['id']           as string,
    teacherId:   row['teacher_id']   as string,
    type:        row['type']         as InsightType,
    confidence:  row['confidence']   as number,
    score:       row['score']        as number,
    title:       row['title']        as string,
    description: row['description']  as string,
    generatedAt: row['generated_at'] as string,
    period: {
      since: row['period_since'] as string,
      until: row['period_until'] as string,
    },
    evidence:    row['evidence']     as Insight['evidence'],
    version:     row['version']      as string,
  }
}

function insightToRow(insight: Insight, expiresAt?: Date): Record<string, unknown> {
  return {
    id:           insight.id,
    teacher_id:   insight.teacherId,
    type:         insight.type,
    score:        insight.score,
    confidence:   insight.confidence,
    title:        insight.title,
    description:  insight.description,
    evidence:     insight.evidence,
    period_since: insight.period.since,
    period_until: insight.period.until,
    generated_at: insight.generatedAt,
    expires_at:   expiresAt?.toISOString() ?? null,
    version:      INSIGHT_ENGINE_VERSION,
  }
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface InsightRepository {
  save(insights: Insight[], expiresAt?: Date): Promise<void>
  getByTeacher(teacherId: string, filters?: InsightFilters): Promise<Insight[]>
  deleteExpired(teacherId: string): Promise<void>
  deleteAll(teacherId: string): Promise<void>
}

// ── Supabase implementation ───────────────────────────────────────────────────

export class SupabaseInsightRepository implements InsightRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(insights: Insight[], expiresAt?: Date): Promise<void> {
    if (insights.length === 0) return
    const rows = insights.map(i => insightToRow(i, expiresAt))
    const { error } = await this.supabase.from('teacher_insights').insert(rows)
    if (error) {
      console.error('[KLASSIA][INSIGHT_REPO][SAVE_ERROR]', { error: error.message })
    }
  }

  async getByTeacher(teacherId: string, filters: InsightFilters = {}): Promise<Insight[]> {
    const limit = Math.min(filters.limit ?? 20, 100)

    let query = this.supabase
      .from('teacher_insights')
      .select('id, teacher_id, type, score, confidence, title, description, evidence, period_since, period_until, generated_at, version')
      .eq('teacher_id', teacherId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('confidence', { ascending: false })
      .limit(limit)

    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    if (filters.minConfidence !== undefined) {
      query = query.gte('confidence', filters.minConfidence)
    }

    const { data, error } = await query
    if (error || !data) return []
    return (data as unknown as Record<string, unknown>[]).map(rowToInsight)
  }

  async deleteExpired(teacherId: string): Promise<void> {
    await this.supabase
      .from('teacher_insights')
      .delete()
      .eq('teacher_id', teacherId)
      .lt('expires_at', new Date().toISOString())
  }

  async deleteAll(teacherId: string): Promise<void> {
    await this.supabase
      .from('teacher_insights')
      .delete()
      .eq('teacher_id', teacherId)
  }
}
