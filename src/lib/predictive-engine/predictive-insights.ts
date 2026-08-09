// ── Predictive Engine — Insight Utilities (ME-18) ────────────────────────────
//
// Fonctions pures pour lire les insights et informer les prédictions.
// Pas d'accès Supabase, pas de LLM.

import type { Insight, InsightType } from '@/lib/insight-engine/insight-types'

export function getInsightsByType(insights: Insight[], type: InsightType): Insight[] {
  return insights.filter(i => i.type === type)
}

export function averageConfidence(insights: Insight[]): number {
  if (insights.length === 0) return 0
  return Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)
}

export function maxConfidence(insights: Insight[]): number {
  if (insights.length === 0) return 0
  return Math.max(...insights.map(i => i.confidence))
}

export function hasLowPlanningScore(insights: Insight[], threshold: number = 50): boolean {
  const planning = getInsightsByType(insights, 'planning_pattern')
  return planning.some(i => i.score < threshold && i.confidence >= 30)
}

export function hasHighInterruption(insights: Insight[], threshold: number = 40): boolean {
  const interruptions = getInsightsByType(insights, 'interruption_pattern')
  return interruptions.some(i => i.score > threshold && i.confidence >= 30)
}

export function hasLowConsistency(insights: Insight[], threshold: number = 50): boolean {
  const consistency = getInsightsByType(insights, 'consistency_pattern')
  return consistency.some(i => i.score < threshold && i.confidence >= 30)
}

export function insightConfidenceBoost(insights: Insight[], type: InsightType): number {
  const matching = getInsightsByType(insights, type)
  if (matching.length === 0) return 0
  const maxConf = maxConfidence(matching)
  return maxConf >= 50 ? 10 : 0
}
