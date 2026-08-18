// Anti-placeholder validator for annual programmes.
// Must run before any INSERT/UPDATE to programme_annuel.
// Returns structured violations — never silently accepts generic fallback data.

import type { ContenuProgramme } from '@/lib/types/database'

export interface ProgrammeViolation {
  field: string
  value: string
  rule: string
}

export interface ProgrammeValidationResult {
  valid: boolean
  violations: ProgrammeViolation[]
}

// Semantic placeholder patterns.
// Matches generics that an AI fallback or lazy default would produce,
// WITHOUT false-positiving on real curriculum content that happens to contain numbers.
const PLACEHOLDER_RULES: Array<{ pattern: RegExp; rule: string }> = [
  // "Unité N" or "Unité N — ..." — explicit generic unit title
  { pattern: /^Unité\s+\d+(\s*[-—:].{0,30})?$/i,          rule: 'generic-unit-title' },
  // "Séquence N" — old alias for unit
  { pattern: /^Séquence\s+\d+(\s*[-—:].{0,30})?$/i,        rule: 'generic-unit-title' },
  // "Leçon N" or "Lesson N"
  { pattern: /^Le[çc]on\s+\d+(\s*[-—:].{0,30})?$/i,        rule: 'generic-lesson-title' },
  // Known fallback strings (exact match, case-insensitive)
  { pattern: /^Objectif principal$/i,                        rule: 'placeholder-objective' },
  { pattern: /^Objectif secondaire$/i,                       rule: 'placeholder-objective' },
  { pattern: /^Contenu à définir$/i,                         rule: 'placeholder-content' },
  { pattern: /^Titre à définir$/i,                           rule: 'placeholder-title' },
  { pattern: /^Objectif à définir$/i,                        rule: 'placeholder-objective' },
  { pattern: /^À définir$/i,                                 rule: 'placeholder-content' },
  { pattern: /^Non spécifié$/i,                              rule: 'placeholder-content' },
  { pattern: /^Description à compléter$/i,                   rule: 'placeholder-content' },
]

function firstViolation(value: string): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  for (const { pattern, rule } of PLACEHOLDER_RULES) {
    if (pattern.test(trimmed)) return rule
  }
  return null
}

export function validatePedagogicalProgramme(contenu: ContenuProgramme): ProgrammeValidationResult {
  const violations: ProgrammeViolation[] = []

  if (!Array.isArray(contenu?.unites) || contenu.unites.length === 0) {
    violations.push({ field: 'unites', value: '(vide)', rule: 'empty-programme' })
    return { valid: false, violations }
  }

  for (const unite of contenu.unites) {
    const n = unite.numero ?? '?'

    // Unit title
    const unitRule = firstViolation(unite.titre)
    if (unitRule) violations.push({ field: `unites[${n}].titre`, value: unite.titre, rule: unitRule })

    // Unit objectives
    for (const obj of (unite.objectifs ?? [])) {
      const r = firstViolation(obj)
      if (r) violations.push({ field: `unites[${n}].objectifs[]`, value: obj, rule: r })
    }

    // Lessons
    for (const lecon of (unite.lecons ?? [])) {
      const l = lecon.numero ?? '?'
      const titleRule = firstViolation(lecon.titre)
      if (titleRule) violations.push({ field: `unites[${n}].lecons[${l}].titre`, value: lecon.titre, rule: titleRule })

      const sujetRule = firstViolation(lecon.sujet)
      if (sujetRule) violations.push({ field: `unites[${n}].lecons[${l}].sujet`, value: lecon.sujet, rule: sujetRule })
    }
  }

  return { valid: violations.length === 0, violations }
}

// Summarise violations for a structured log line (no sensitive curriculum payload).
export function summariseViolations(violations: ProgrammeViolation[]): string {
  return violations.slice(0, 5).map(v => `${v.rule}@${v.field}`).join(' | ')
    + (violations.length > 5 ? ` … +${violations.length - 5} more` : '')
}
