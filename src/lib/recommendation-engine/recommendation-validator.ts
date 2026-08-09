// ── Recommendation Engine — Validateur (ME-17) ────────────────────────────────

import { RECOMMENDATION_TYPES, RECOMMENDATION_PRIORITIES } from './recommendation-types'
import type { Recommendation, RecommendationPriority }     from './recommendation-types'

export interface RecommendationValidationResult {
  valid:  boolean
  errors: string[]
}

export function validateRecommendation(rec: unknown): RecommendationValidationResult {
  const errors: string[] = []

  if (!rec || typeof rec !== 'object') {
    return { valid: false, errors: ['recommendation doit être un objet'] }
  }

  const r = rec as Record<string, unknown>

  if (typeof r['id'] !== 'string' || !r['id'].trim()) {
    errors.push('id requis')
  }

  if (typeof r['teacherId'] !== 'string' || !r['teacherId'].trim()) {
    errors.push('teacherId requis')
  }

  if (typeof r['type'] !== 'string' || !RECOMMENDATION_TYPES.includes(r['type'] as Recommendation['type'])) {
    errors.push(`type invalide : ${String(r['type'])}`)
  }

  if (typeof r['priority'] !== 'string' || !RECOMMENDATION_PRIORITIES.includes(r['priority'] as RecommendationPriority)) {
    errors.push(`priority invalide : ${String(r['priority'])}`)
  }

  if (typeof r['title'] !== 'string' || !r['title'].trim()) {
    errors.push('title requis')
  }

  if (typeof r['description'] !== 'string' || !r['description'].trim()) {
    errors.push('description requise')
  }

  if (typeof r['reason'] !== 'string' || !r['reason'].trim()) {
    errors.push('reason requise')
  }

  if (typeof r['confidence'] !== 'number' || r['confidence'] < 0 || r['confidence'] > 100) {
    errors.push('confidence doit être entre 0 et 100')
  }

  // basedOnInsights — au moins un insight requis
  if (!Array.isArray(r['basedOnInsights']) || r['basedOnInsights'].length === 0) {
    errors.push('basedOnInsights doit contenir au moins un ID d\'insight')
  }

  if (typeof r['createdAt'] !== 'string' || isNaN(Date.parse(r['createdAt'] as string))) {
    errors.push('createdAt invalide (ISO 8601 requis)')
  }

  if (typeof r['expiresAt'] !== 'string' || isNaN(Date.parse(r['expiresAt'] as string))) {
    errors.push('expiresAt invalide (ISO 8601 requis)')
  }

  if (typeof r['version'] !== 'string' || !r['version'].trim()) {
    errors.push('version requise')
  }

  return { valid: errors.length === 0, errors }
}
