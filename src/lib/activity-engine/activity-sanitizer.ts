// ── Activity Engine — Sanitiseur (ME-15) ──────────────────────────────────────

const BLOCKED_KEYS = new Set([
  'storage_path', 'storagePath',
  'signed_url', 'signedUrl',
  'texteExtrait', 'texte_extrait',
  'token', 'access_token', 'refresh_token', 'id_token',
  'student_name', 'nom_eleve', 'studentName',
  'individual_grade', 'note_individuelle', 'individualGrade',
  'password', 'secret', 'private_key', 'privateKey',
  'priority_student_ids', 'priorityStudentIds',
])

// ── sanitizeMetadata ──────────────────────────────────────────────────────────
//
// Retire récursivement les clés sensibles. Ne modifie pas l'objet source.

export function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (BLOCKED_KEYS.has(key)) continue

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeMetadata(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }

  return result
}

// ── buildEventId ──────────────────────────────────────────────────────────────

export function buildEventId(): string {
  return crypto.randomUUID()
}
