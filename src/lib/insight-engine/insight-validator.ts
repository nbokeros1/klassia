// ── Insight Engine — Validateur (ME-16) ───────────────────────────────────────

import { INSIGHT_TYPES } from './insight-types'
import type { Insight }  from './insight-types'

export interface InsightValidationResult {
  valid:  boolean
  errors: string[]
}

export function validateInsight(insight: unknown): InsightValidationResult {
  const errors: string[] = []

  if (!insight || typeof insight !== 'object') {
    return { valid: false, errors: ['insight doit être un objet'] }
  }

  const i = insight as Record<string, unknown>

  if (typeof i['id'] !== 'string' || !i['id'].trim()) {
    errors.push('id requis')
  }

  if (typeof i['teacherId'] !== 'string' || !i['teacherId'].trim()) {
    errors.push('teacherId requis')
  }

  if (typeof i['type'] !== 'string' || !INSIGHT_TYPES.includes(i['type'] as Insight['type'])) {
    errors.push(`type invalide : ${String(i['type'])}`)
  }

  if (typeof i['confidence'] !== 'number' || i['confidence'] < 0 || i['confidence'] > 100) {
    errors.push('confidence doit être entre 0 et 100')
  }

  if (typeof i['score'] !== 'number' || i['score'] < 0 || i['score'] > 100) {
    errors.push('score doit être entre 0 et 100')
  }

  if (typeof i['title'] !== 'string' || !i['title'].trim()) {
    errors.push('title requis')
  }

  if (typeof i['description'] !== 'string' || !i['description'].trim()) {
    errors.push('description requise')
  }

  if (typeof i['generatedAt'] !== 'string' || isNaN(Date.parse(i['generatedAt'] as string))) {
    errors.push('generatedAt invalide (ISO 8601 requis)')
  }

  if (typeof i['version'] !== 'string' || !i['version'].trim()) {
    errors.push('version requise')
  }

  // Valider period
  const period = i['period']
  if (!period || typeof period !== 'object') {
    errors.push('period requis')
  } else {
    const p = period as Record<string, unknown>
    if (typeof p['since'] !== 'string' || isNaN(Date.parse(p['since'] as string))) {
      errors.push('period.since invalide')
    }
    if (typeof p['until'] !== 'string' || isNaN(Date.parse(p['until'] as string))) {
      errors.push('period.until invalide')
    }
  }

  // Valider evidence — doit contenir au moins 1 événement
  const evidence = i['evidence']
  if (!evidence || typeof evidence !== 'object') {
    errors.push('evidence requis')
  } else {
    const e = evidence as Record<string, unknown>
    if (typeof e['eventCount'] !== 'number' || e['eventCount'] < 1) {
      errors.push('evidence.eventCount doit être >= 1')
    }
    if (typeof e['periodDays'] !== 'number' || e['periodDays'] < 1) {
      errors.push('evidence.periodDays doit être >= 1')
    }
    if (typeof e['sampleSize'] !== 'number' || e['sampleSize'] < 1) {
      errors.push('evidence.sampleSize doit être >= 1')
    }
  }

  return { valid: errors.length === 0, errors }
}
