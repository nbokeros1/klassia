// ── Predictive Engine — Validateur (ME-18) ────────────────────────────────────

import { PREDICTION_TYPES } from './prediction-types'
import type { Prediction }  from './prediction-types'

export interface PredictionValidationResult {
  valid:  boolean
  errors: string[]
}

export function validatePrediction(pred: unknown): PredictionValidationResult {
  const errors: string[] = []

  if (!pred || typeof pred !== 'object') {
    return { valid: false, errors: ['prediction doit être un objet'] }
  }

  const p = pred as Record<string, unknown>

  if (typeof p['id'] !== 'string' || !p['id'].trim()) {
    errors.push('id requis')
  }

  if (typeof p['teacherId'] !== 'string' || !p['teacherId'].trim()) {
    errors.push('teacherId requis')
  }

  if (typeof p['type'] !== 'string' || !PREDICTION_TYPES.includes(p['type'] as Prediction['type'])) {
    errors.push(`type invalide : ${String(p['type'])}`)
  }

  if (typeof p['confidence'] !== 'number' || p['confidence'] < 0 || p['confidence'] > 100) {
    errors.push('confidence doit être entre 0 et 100')
  }

  if (typeof p['predictedDate'] !== 'string' || isNaN(Date.parse(p['predictedDate'] as string))) {
    errors.push('predictedDate invalide (ISO 8601 requis)')
  }

  if (typeof p['suggestedAction'] !== 'string' || !p['suggestedAction'].trim()) {
    errors.push('suggestedAction requise')
  }

  if (typeof p['reason'] !== 'string' || !p['reason'].trim()) {
    errors.push('reason requise')
  }

  if (!Array.isArray(p['sourceInsights'])) {
    errors.push('sourceInsights doit être un tableau')
  }

  if (!Array.isArray(p['sourceCalendar'])) {
    errors.push('sourceCalendar doit être un tableau')
  }

  if (typeof p['version'] !== 'string' || !p['version'].trim()) {
    errors.push('version requise')
  }

  return { valid: errors.length === 0, errors }
}
