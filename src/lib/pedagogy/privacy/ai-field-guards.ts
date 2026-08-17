// ─── ScorgIA V7.1 — AI Field Guards (Mission 9) ────────────────────────────
// Guards déterministes qui empêchent l'IA d'écrire dans des champs protégés.
// Toute donnée IA doit rester source_type = 'AI_SUGGESTION'.
// L'IA ne peut jamais écraser TEACHER_CONFIRMED / OFFICIAL_SOURCE.
// ─────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type AIWriteAttempt = {
  field:          string
  proposed_value: unknown
  source_type:    DataSourceType
}

export type DataSourceType =
  | 'AI_SUGGESTION'         // Proposé par l'IA — toujours identifiable comme tel
  | 'TEACHER_CONFIRMED'     // Confirmé par l'enseignant
  | 'TEACHER_INPUT'         // Saisi directement par l'enseignant
  | 'SCHOOL_CONFIRMED'      // Validé par l'école/l'administration
  | 'OFFICIAL_SOURCE'       // Source officielle (Alberta Education, etc.)
  | 'SYSTEM_DERIVED'        // Calculé par le système

export type FieldGuardResult = {
  allowed:  boolean
  field:    string
  reason?:  string
}

// ════════════════════════════════════════════════════════════════════════════
// CHAMPS PROTÉGÉS — L'IA ne peut jamais écrire dans ces champs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Champs sur lesquels une suggestion IA est INTERDITE.
 * Ces champs ne peuvent être remplis que par des humains ou sources officielles.
 */
export const PROTECTED_FIELDS: ReadonlySet<string> = new Set([
  // Identification / diagnostic
  'designation',
  'designation_officielle',
  'code',
  'code_financement',
  'diagnostic',
  'diagnostic_medical',
  'trouble',

  // Décisions institutionnelles
  'official_accommodation',
  'accommodation_officielle',
  'modification_officielle',
  'institutional_decision',
  'decision_institutionnelle',
  'pei_status',
  'statut_pei',

  // Politiques scolaires
  'school_policy',
  'politique_ecole',
  'politique_absences',
  'politique_notation',
  'politique_discipline',
  'integrite_academique',
  'utilisation_ia',

  // Données personnelles protégées
  'parent_consent',
  'consentement_parent',
  'contact_parent',
  'coordonnees',

  // Conclusions professionnelles réservées
  'specialist_conclusion',
  'conclusion_specialiste',
  'rapport_psychologue',
  'rapport_orthophoniste',
])

/**
 * Champs sur lesquels l'IA peut SUGGÉRER mais ne peut pas CONFIRMER.
 * La confirmation doit venir de l'enseignant.
 */
export const SUGGESTION_ONLY_FIELDS: ReadonlySet<string> = new Set([
  'strategie',
  'objectif',
  'objectif_eleve',
  'criteres_reussite',
  'differentiation',
  'groupement',
  'activite',
  'ressource',
  'reformulation_objectif',
  'ajustement_prochaine',
  'reflexion_assistee',
])

// ════════════════════════════════════════════════════════════════════════════
// GUARD PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si l'IA est autorisée à écrire dans un champ donné.
 * Returns { allowed: false } avec une raison si le champ est protégé.
 */
export function canAIWriteStudentField(field: string): FieldGuardResult {
  const normalized = normalizeFieldName(field)

  if (PROTECTED_FIELDS.has(normalized)) {
    return {
      allowed: false,
      field,
      reason: `Le champ "${field}" est protégé — ScorgIA ne peut jamais générer son contenu. `
        + `Il doit être rempli par l'enseignant, l'école, ou une source officielle.`,
    }
  }

  if (SUGGESTION_ONLY_FIELDS.has(normalized)) {
    return {
      allowed: true,
      field,
      reason: `Le champ "${field}" accepte des suggestions IA, mais la confirmation de l'enseignant est requise avant enregistrement.`,
    }
  }

  return { allowed: true, field }
}

/**
 * Valide un ensemble de tentatives d'écriture IA.
 * Retourne les tentatives bloquées et les avertissements.
 */
export function validateAIWriteAttempts(attempts: AIWriteAttempt[]): {
  blocked:    AIWriteAttempt[]
  warnings:   AIWriteAttempt[]
  permitted:  AIWriteAttempt[]
} {
  const blocked:   AIWriteAttempt[] = []
  const warnings:  AIWriteAttempt[] = []
  const permitted: AIWriteAttempt[] = []

  for (const attempt of attempts) {
    // Toute donnée IA doit être marquée AI_SUGGESTION
    if (attempt.source_type !== 'AI_SUGGESTION') {
      blocked.push(attempt)
      continue
    }

    const guard = canAIWriteStudentField(attempt.field)
    if (!guard.allowed) {
      blocked.push(attempt)
    } else if (guard.reason) {
      // Champ suggestion-only — avertissement
      warnings.push(attempt)
    } else {
      permitted.push(attempt)
    }
  }

  return { blocked, warnings, permitted }
}

// ════════════════════════════════════════════════════════════════════════════
// GUARDS SUR LES SOURCES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie que les données existantes confirmées ne seront pas écrasées par l'IA.
 * Un champ TEACHER_CONFIRMED ou OFFICIAL_SOURCE ne peut jamais être rétrogradé en AI_SUGGESTION.
 */
export function canAIOverwriteExistingData(
  existing_source: DataSourceType,
  proposed_source: DataSourceType,
): FieldGuardResult {
  const AUTHORITATIVE_SOURCES: DataSourceType[] = [
    'TEACHER_CONFIRMED',
    'SCHOOL_CONFIRMED',
    'OFFICIAL_SOURCE',
  ]

  if (
    AUTHORITATIVE_SOURCES.includes(existing_source)
    && proposed_source === 'AI_SUGGESTION'
  ) {
    return {
      allowed: false,
      field:   'any',
      reason:  `Impossible d'écraser une donnée de source "${existing_source}" avec une suggestion IA. `
        + `L'enseignant doit modifier manuellement ce champ.`,
    }
  }

  return { allowed: true, field: 'any' }
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION DE PROVENANCE SUR UN OBJET ENTIER
// ════════════════════════════════════════════════════════════════════════════

export type ProvenanceViolation = {
  field:    string
  reason:   string
}

/**
 * Audite un objet JSONB pour détecter des violations de provenance.
 * Passe en revue les champs qui ne doivent jamais être AI_GENERATED.
 */
export function auditObjectProvenance(
  obj:                    Record<string, unknown>,
  never_ai_fields:        string[],
): ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = []

  for (const field of never_ai_fields) {
    const value = obj[field]
    if (value === null || value === undefined) continue

    // Vérifier si la valeur contient une provenance AI_GENERATED
    const provenance = (obj[`${field}_provenance`] as string | undefined)
      ?? (obj['provenance_champs'] as Record<string, string> | undefined)?.[field]

    if (provenance === 'AI_GENERATED') {
      violations.push({
        field,
        reason: `Le champ "${field}" est marqué AI_GENERATED mais ne peut jamais l'être selon les règles ScorgIA.`,
      })
    }

    // Vérifier si le champ lui-même est un objet avec source_type
    if (typeof value === 'object' && value !== null && 'source_type' in value) {
      const src = (value as Record<string, unknown>).source_type
      if (src === 'AI_SUGGESTION') {
        violations.push({
          field,
          reason: `Le champ "${field}" contient une valeur AI_SUGGESTION mais ce champ est protégé.`,
        })
      }
    }
  }

  return violations
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

function normalizeFieldName(field: string): string {
  return field.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}

/**
 * Retourne un label lisible pour l'enseignant sur pourquoi un champ est protégé.
 */
export function getFieldProtectionReason(field: string): string | undefined {
  const normalized = normalizeFieldName(field)

  if (PROTECTED_FIELDS.has(normalized)) {
    if (['designation', 'code', 'diagnostic'].some(k => normalized.includes(k))) {
      return 'Ce champ est réservé aux désignations officielles — ScorgIA ne peut jamais en créer.'
    }
    if (normalized.includes('politique') || normalized.includes('policy')) {
      return 'Ce champ contient une politique scolaire — ScorgIA ne l\'invente jamais.'
    }
    if (normalized.includes('consent') || normalized.includes('parent')) {
      return 'Ce champ contient des informations personnelles protégées.'
    }
    return 'Ce champ est protégé — ScorgIA ne peut pas en générer le contenu.'
  }

  return undefined
}
