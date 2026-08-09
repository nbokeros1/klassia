// ── GET /api/activity — Résumé + événements filtrés (ME-15) ──────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { ActivityEngine }            from '@/lib/activity-engine/activity-engine'
import type { ActivityType }         from '@/lib/activity-engine/event-types'
import { ACTIVITY_TYPES }            from '@/lib/activity-engine/event-types'

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

// ── GET /api/activity ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase   = await createClient()
  const teacherId  = await resolveTeacher(supabase)

  if (!teacherId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié.' } }, { status: 401 })
  }

  const { searchParams } = req.nextUrl

  const period  = searchParams.get('period')   // today | week | month
  const classId = searchParams.get('class')
  const subject = searchParams.get('subject')
  const type    = searchParams.get('type')
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100)

  const engine = new ActivityEngine(supabase, teacherId)

  // Si period=today|week|month → résumé
  if (period === 'today' || period === 'week' || period === 'month') {
    const summary = await engine.getSummary()
    return NextResponse.json({ summary: summary[period] })
  }

  // Sinon → timeline filtrée
  const validType = type && ACTIVITY_TYPES.includes(type as ActivityType)
    ? type as ActivityType
    : undefined

  const timeline = await engine.getTimeline({
    limit,
    classId: classId ?? undefined,
    subject: subject ?? undefined,
    type:    validType,
  })

  return NextResponse.json({ events: timeline, count: timeline.length })
}
