// ── GET /api/insights — Insight Engine V1 (ME-16) ─────────────────────────────
//
// Retourne les insights comportementaux de l'enseignant authentifié.
// Lazy-generation : recompute si aucun insight frais en base.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { InsightEngine }             from '@/lib/insight-engine/insight-engine'
import type { InsightType }          from '@/lib/insight-engine/insight-types'
import { INSIGHT_TYPES }             from '@/lib/insight-engine/insight-types'
import type { ActivityEvent }        from '@/lib/activity-engine/event-types'
import { ActivitySource }            from '@/lib/activity-engine/event-types'
import { ACTIVITY_ENGINE_VERSION }   from '@/lib/activity-engine/event-types'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveTeacher(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

// ── DB row → ActivityEvent ─────────────────────────────────────────────────────

function rowToEvent(row: Record<string, unknown>): ActivityEvent {
  return {
    id:         row['id']          as string,
    type:       row['type']        as ActivityEvent['type'],
    occurredAt: row['occurred_at'] as string,
    teacherId:  row['teacher_id']  as string,
    classId:    (row['class_id']   as string | null) ?? null,
    subject:    (row['subject']    as string | null) ?? null,
    entityId:   row['entity_id']   as string,
    entityType: row['entity_type'] as string,
    metadata:   (row['metadata']   as Record<string, unknown>) ?? {},
    source:     (row['source']     as ActivitySource) ?? ActivitySource.SYSTEM,
    version:    (row['version']    as string) ?? ACTIVITY_ENGINE_VERSION,
  }
}

// ── GET /api/insights ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase  = await createClient()
  const teacherId = await resolveTeacher(supabase)

  if (!teacherId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } },
      { status: 401 },
    )
  }

  const { searchParams } = req.nextUrl
  const typeRaw     = searchParams.get('type')
  const confRaw     = searchParams.get('confidence')
  const limitRaw    = searchParams.get('limit')
  const forceRegen  = searchParams.get('regenerate') === 'true'

  const filterType  = typeRaw && INSIGHT_TYPES.includes(typeRaw as InsightType)
    ? typeRaw as InsightType
    : undefined
  const minConf = confRaw ? Math.max(0, Math.min(100, parseInt(confRaw, 10))) : undefined
  const limit   = Math.min(parseInt(limitRaw ?? '20', 10) || 20, 50)

  const engine = new InsightEngine(supabase, teacherId)

  // 1. Try to return cached insights
  if (!forceRegen) {
    const cached = await engine.getInsights({ type: filterType, minConfidence: minConf, limit })
    if (cached.length > 0) {
      return NextResponse.json({ insights: cached, count: cached.length, source: 'cache' })
    }
  }

  // 2. Regenerate from last 30 days of activity events
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const { data: eventRows } = await supabase
    .from('activity_events')
    .select('id, type, occurred_at, teacher_id, class_id, subject, entity_id, entity_type, metadata, source, version')
    .eq('teacher_id', teacherId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: true })
    .limit(500)

  const events = (eventRows as unknown as Record<string, unknown>[] | null ?? []).map(rowToEvent)

  const insights = await engine.generateAndSave(events)

  // Apply filters to freshly generated insights
  let filtered = insights
  if (filterType) filtered = filtered.filter(i => i.type === filterType)
  if (minConf !== undefined) filtered = filtered.filter(i => i.confidence >= minConf)
  filtered = filtered.slice(0, limit)

  return NextResponse.json({ insights: filtered, count: filtered.length, source: 'computed' })
}
