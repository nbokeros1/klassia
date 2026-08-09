// ── GET /api/activity/timeline — TeacherTimeline (ME-15) ─────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { ActivityEngine }            from '@/lib/activity-engine/activity-engine'
import type { ActivityType }         from '@/lib/activity-engine/event-types'
import { ACTIVITY_TYPES }            from '@/lib/activity-engine/event-types'

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

export async function GET(req: NextRequest) {
  const supabase  = await createClient()
  const teacherId = await resolveTeacher(supabase)

  if (!teacherId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)
  const classId  = searchParams.get('class_id')  ?? undefined
  const subject  = searchParams.get('subject')   ?? undefined
  const typeRaw  = searchParams.get('type')
  const sinceRaw = searchParams.get('since')
  const untilRaw = searchParams.get('until')

  const type  = typeRaw && ACTIVITY_TYPES.includes(typeRaw as ActivityType)
    ? typeRaw as ActivityType
    : undefined
  const since = sinceRaw ? new Date(sinceRaw) : undefined
  const until = untilRaw ? new Date(untilRaw) : undefined

  const engine   = new ActivityEngine(supabase, teacherId)
  const timeline = await engine.getTimeline({ limit, classId, subject, type, since, until })

  return NextResponse.json({
    timeline,
    count: timeline.length,
    meta: {
      teacherId,
      limit,
      ...(classId ? { classId } : {}),
      ...(subject ? { subject } : {}),
      ...(type    ? { type    } : {}),
    },
  })
}
