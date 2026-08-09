// ── GET /api/predictions — Predictive Engine V1 (ME-18) ──────────────────────
//
// Retourne les prédictions pédagogiques de l'enseignant authentifié.
// Lazy-generation : lit le cache DB en premier, puis génère depuis le calendrier + insights.
// Pas de LLM — logique déterministe uniquement.

import { NextRequest, NextResponse }          from 'next/server'
import { createClient }                        from '@/lib/supabase/server'
import { PredictiveEngine }                    from '@/lib/predictive-engine/predictive-engine'
import { PREDICTION_TYPES }                    from '@/lib/predictive-engine/prediction-types'
import type { PredictionType, CalendarContext } from '@/lib/predictive-engine/prediction-types'
import type { Insight, InsightType }           from '@/lib/insight-engine/insight-types'
import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '@/lib/pedagogy/calendar/types'

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

// ── Row mappers ───────────────────────────────────────────────────────────────

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

function rowToCalendarEvent(row: Record<string, unknown>): CalendarEventSnapshot {
  return {
    id:         row['id']          as string,
    titre:      row['titre']       as string,
    dateDebut:  new Date(row['date_debut'] as string),
    dateFin:    row['date_fin']    ? new Date(row['date_fin'] as string) : null,
    heureDebut: row['heure_debut'] as string | null,
    heureFin:   row['heure_fin']   as string | null,
    type:       row['type']        as CalendarEventSnapshot['type'],
    scope:      (row['scope'] as CalendarEventSnapshot['scope']) ?? 'class',
    classeId:   row['classe_id']   as string | null,
    matiere:    row['matiere']     as string | null,
    couleur:    row['couleur']     as string | null,
  }
}

function rowToDeadline(row: Record<string, unknown>): CalendarDeadlineSnapshot {
  const date       = new Date(row['date_debut'] as string)
  const urgencyDays = Math.floor((date.getTime() - Date.now()) / 86_400_000)
  return {
    id:          row['id']      as string,
    titre:       row['titre']   as string,
    date,
    type:        (row['type'] === 'evaluation' ? 'evaluation'
                : row['type'] === 'devoir'     ? 'devoir'
                : 'autre') as CalendarDeadlineSnapshot['type'],
    urgencyDays,
    classeId:    row['classe_id'] as string | null,
    matiere:     row['matiere']   as string | null,
  }
}

// ── GET /api/predictions ──────────────────────────────────────────────────────

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
  const typeRaw        = searchParams.get('type')
  const minConfRaw     = searchParams.get('min_confidence')
  const limitRaw       = searchParams.get('limit')
  const forceRegen     = searchParams.get('regenerate') === 'true'

  const filterType = typeRaw && PREDICTION_TYPES.includes(typeRaw as PredictionType)
    ? typeRaw as PredictionType
    : undefined
  const minConfidence = minConfRaw ? Math.max(0, Math.min(100, parseInt(minConfRaw, 10) || 0)) : undefined
  const limit         = Math.min(parseInt(limitRaw ?? '20', 10) || 20, 100)

  const engine = new PredictiveEngine(supabase, teacherId)

  // 1. Retourner le cache si disponible
  if (!forceRegen) {
    const cached = await engine.getPredictions({ type: filterType, minConfidence, limit })
    if (cached.length > 0) {
      return NextResponse.json({ predictions: cached, count: cached.length, source: 'cache' })
    }
  }

  // 2. Charger les données calendrier
  const now      = new Date()
  const future30 = new Date(now.getTime() + 30 * 86_400_000).toISOString()

  const [calendarResult, insightResult] = await Promise.all([
    supabase
      .from('evenements_calendrier')
      .select('id, titre, date_debut, date_fin, heure_debut, heure_fin, type, scope, classe_id, matiere, couleur')
      .eq('teacher_id', teacherId)
      .gte('date_debut', now.toISOString())
      .lte('date_debut', future30)
      .order('date_debut', { ascending: true })
      .limit(100),

    supabase
      .from('teacher_insights')
      .select('id, teacher_id, type, score, confidence, title, description, evidence, period_since, period_until, generated_at, version')
      .eq('teacher_id', teacherId)
      .order('confidence', { ascending: false })
      .limit(50),
  ])

  const rawEvents   = (calendarResult.data  as unknown as Record<string, unknown>[] | null) ?? []
  const rawInsights = (insightResult.data    as unknown as Record<string, unknown>[] | null) ?? []

  const events    = rawEvents.map(rowToCalendarEvent)
  const deadlines = rawEvents
    .filter(r => r['type'] === 'evaluation' || r['type'] === 'devoir')
    .map(rowToDeadline)
    .filter(d => d.urgencyDays >= 0)

  const insights: Insight[] = rawInsights.map(rowToInsight)

  const calendar: CalendarContext = { events, deadlines, now }

  const preds = await engine.generateAndSave(calendar, insights)

  // Appliquer les filtres sur les résultats frais
  let filtered = preds
  if (filterType)     filtered = filtered.filter(p => p.type === filterType)
  if (minConfidence)  filtered = filtered.filter(p => p.confidence >= minConfidence)
  filtered = filtered.slice(0, limit)

  return NextResponse.json({
    predictions: filtered,
    count:       filtered.length,
    source:      preds.length === 0 ? 'no_signals' : 'computed',
  })
}
