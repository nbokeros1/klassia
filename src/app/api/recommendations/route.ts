// ── GET /api/recommendations — Recommendation Engine V1 (ME-17) ──────────────
//
// Retourne les recommandations personnalisées de l'enseignant authentifié.
// Lazy-generation : lit les insights sauvegardés et génère si le cache est vide.

import { NextRequest, NextResponse }        from 'next/server'
import { createClient }                     from '@/lib/supabase/server'
import { RecommendationEngine }             from '@/lib/recommendation-engine/recommendation-engine'
import { RecommendationPriority }           from '@/lib/recommendation-engine/recommendation-types'
import type { RecommendationType }          from '@/lib/recommendation-engine/recommendation-types'
import { RECOMMENDATION_TYPES }             from '@/lib/recommendation-engine/recommendation-types'
import type { Insight }                     from '@/lib/insight-engine/insight-types'
import { INSIGHT_TYPES }                    from '@/lib/insight-engine/insight-types'
import type { InsightType }                 from '@/lib/insight-engine/insight-types'

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

// ── DB row → Insight ──────────────────────────────────────────────────────────

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

// ── GET /api/recommendations ──────────────────────────────────────────────────

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
  const typeRaw      = searchParams.get('type')
  const priorityRaw  = searchParams.get('priority')
  const limitRaw     = searchParams.get('limit')
  const forceRegen   = searchParams.get('regenerate') === 'true'

  const filterType = typeRaw && RECOMMENDATION_TYPES.includes(typeRaw as RecommendationType)
    ? typeRaw as RecommendationType
    : undefined
  const filterPriority = priorityRaw && Object.values(RecommendationPriority).includes(priorityRaw as RecommendationPriority)
    ? priorityRaw as RecommendationPriority
    : undefined
  const limit = Math.min(parseInt(limitRaw ?? '20', 10) || 20, 50)

  const engine = new RecommendationEngine(supabase, teacherId)

  // 1. Retourner le cache si disponible
  if (!forceRegen) {
    const cached = await engine.getRecommendations({
      type: filterType, priority: filterPriority, limit,
    })
    if (cached.length > 0) {
      return NextResponse.json({ recommendations: cached, count: cached.length, source: 'cache' })
    }
  }

  // 2. Charger les insights existants pour génération
  const { data: insightRows } = await supabase
    .from('teacher_insights')
    .select('id, teacher_id, type, score, confidence, title, description, evidence, period_since, period_until, generated_at, version')
    .eq('teacher_id', teacherId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('confidence', { ascending: false })
    .limit(50)

  const insights = (insightRows as unknown as Record<string, unknown>[] | null ?? [])
    .map(rowToInsight)

  if (insights.length === 0) {
    return NextResponse.json({ recommendations: [], count: 0, source: 'no_insights' })
  }

  const recs = await engine.generateAndSave(insights)

  // Appliquer les filtres sur les résultats frais
  let filtered = recs
  if (filterType)     filtered = filtered.filter(r => r.type === filterType)
  if (filterPriority) filtered = filtered.filter(r => r.priority === filterPriority)
  filtered = filtered.slice(0, limit)

  return NextResponse.json({ recommendations: filtered, count: filtered.length, source: 'computed' })
}
