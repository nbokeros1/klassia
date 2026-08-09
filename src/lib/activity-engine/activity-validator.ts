// ── Activity Engine — Validateur (ME-15) ──────────────────────────────────────

import type { ActivityEvent } from './event-types'
import { ACTIVITY_TYPES }     from './event-types'

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_METADATA_BYTES = 2048

const BLOCKED_PATTERNS = [
  'storage_path', 'storagepath',
  'signed_url', 'signedurl',
  'texteextrait', 'texte_extrait',
  'token', 'access_token',
  'student_name', 'nom_eleve',
  'individual_grade', 'note_individuelle',
  'password', 'secret', 'private_key',
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityValidationResult {
  valid:  boolean
  errors: string[]
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateActivityEvent(event: unknown): ActivityValidationResult {
  const errors: string[] = []

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['event doit être un objet'] }
  }

  const e = event as Record<string, unknown>

  if (typeof e['id'] !== 'string' || !e['id'].trim()) {
    errors.push('id requis')
  }

  if (typeof e['type'] !== 'string' || !ACTIVITY_TYPES.includes(e['type'] as ActivityEvent['type'])) {
    errors.push(`type invalide : ${String(e['type'])}`)
  }

  if (typeof e['occurredAt'] !== 'string' || isNaN(Date.parse(e['occurredAt'] as string))) {
    errors.push('occurredAt invalide (ISO 8601 requis)')
  }

  if (typeof e['teacherId'] !== 'string' || !e['teacherId'].trim()) {
    errors.push('teacherId requis')
  }

  if (typeof e['entityId'] !== 'string' || !e['entityId'].trim()) {
    errors.push('entityId requis')
  }

  if (typeof e['entityType'] !== 'string' || !e['entityType'].trim()) {
    errors.push('entityType requis')
  }

  if (!e['source']) {
    errors.push('source requis')
  }

  if (typeof e['version'] !== 'string' || !e['version'].trim()) {
    errors.push('version requis')
  }

  // Valider metadata
  const meta = e['metadata']
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    errors.push('metadata doit être un objet')
  } else {
    const serialized = JSON.stringify(meta)
    if (serialized.length > MAX_METADATA_BYTES) {
      errors.push(`metadata trop grande (${serialized.length} octets > ${MAX_METADATA_BYTES} max)`)
    }
    // Vérifier les clés sensibles
    const allKeys = collectKeys(meta as Record<string, unknown>)
    for (const key of allKeys) {
      if (BLOCKED_PATTERNS.some(p => key.toLowerCase().includes(p))) {
        errors.push(`metadata contient une clé sensible : "${key}"`)
      }
    }
    // Vérifier les valeurs (patterns stricts)
    if (/storage_path|signed_url|texteExtrait|texte_extrait/i.test(serialized)) {
      errors.push('metadata contient des données sensibles détectées par pattern')
    }
  }

  return { valid: errors.length === 0, errors }
}

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    keys.push(full)
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, full))
    }
  }
  return keys
}
