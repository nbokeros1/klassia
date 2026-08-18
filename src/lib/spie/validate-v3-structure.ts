// SPIE-V7.5.1 — V3 Structural Validator
// Validates canonical UNIT → SEQUENCE → LESSON cardinality after generation.
// Pure function — no I/O, no mutations. Complements placeholder validator.

import type { ContenuProgramme } from '@/lib/types/database'
import type { UnitScaffold } from './curriculum/planning/aydte-planning-bridge'

export interface V3StructureError {
  code: string
  message: string
  entityId?: string
}

export interface V3StructureResult {
  valid: boolean
  errors: V3StructureError[]
  warnings: string[]
  // Coverage metrics
  unitCount: number
  sequenceCount: number
  lessonCount: number
  orphanSequences: string[]   // sequence_ids with no matching unit
  missingScaffoldIds: string[] // scaffold IDs not found in generated JSON
}

// ─── Validator ────────────────────────────────────────────────────────────────

export function validateV3Structure(
  programme: ContenuProgramme,
  scaffold?: { units: UnitScaffold[]; sequenceIds: string[] },
): V3StructureResult {
  const errors: V3StructureError[] = []
  const warnings: string[] = []
  const orphanSequences: string[] = []
  const missingScaffoldIds: string[] = []

  const units = programme.units ?? []
  const unites = programme.unites ?? []

  // Collect all generated sequence_ids and unit_ids
  const generatedSeqIds = new Set(unites.map(u => u.sequence_id).filter(Boolean) as string[])
  const generatedUnitIds = new Set(units.map(u => u.id).filter(Boolean))

  // ── Unit-level checks ──────────────────────────────────────────────────────

  if (units.length === 0 && scaffold && scaffold.units.length > 0) {
    errors.push({ code: 'UNITS_MISSING', message: 'Le JSON généré ne contient pas de tableau "units" alors que le scaffold AYDTE en définit.' })
  }

  for (const unit of units) {
    if (!unit.id) {
      errors.push({ code: 'UNIT_NO_ID', message: `Unité "${unit.titre}" manque d'identifiant "id".` })
    }

    if (!Array.isArray(unit.sequence_ids) || unit.sequence_ids.length === 0) {
      errors.push({
        code: 'UNIT_NO_SEQUENCES',
        message: `Unité "${unit.titre}" (id: ${unit.id ?? '?'}) ne contient aucune séquence dans sequence_ids[].`,
        entityId: unit.id,
      })
    }

    // Each sequence_id in units[] must correspond to a unite in unites[]
    for (const seqId of (unit.sequence_ids ?? [])) {
      if (!generatedSeqIds.has(seqId)) {
        errors.push({
          code: 'SEQUENCE_ID_ORPHAN_IN_UNIT',
          message: `Unité ${unit.id} référence sequence_id "${seqId}" absent de unites[].sequence_id.`,
          entityId: seqId,
        })
      }
    }
  }

  // ── Sequence-level checks ──────────────────────────────────────────────────

  for (const unite of unites) {
    // Must have unit_id
    if (!unite.unit_id) {
      warnings.push(`Séquence "${unite.titre}" (seq ${unite.numero}) manque de unit_id.`)
    } else if (!generatedUnitIds.has(unite.unit_id)) {
      errors.push({
        code: 'SEQUENCE_UNIT_ID_INVALID',
        message: `Séquence "${unite.titre}" référence unit_id "${unite.unit_id}" inconnu dans units[].`,
        entityId: unite.unit_id,
      })
      orphanSequences.push(unite.sequence_id ?? `seq-${unite.numero}`)
    }

    // Must have >= 1 lesson
    if (!Array.isArray(unite.lecons) || unite.lecons.length === 0) {
      errors.push({
        code: 'SEQUENCE_NO_LESSONS',
        message: `Séquence "${unite.titre}" (seq ${unite.numero}) ne contient aucune leçon.`,
        entityId: unite.sequence_id,
      })
    }
  }

  // ── Lesson-level checks ────────────────────────────────────────────────────

  let totalLessons = 0
  for (const unite of unites) {
    for (const lecon of (unite.lecons ?? [])) {
      totalLessons++
      if (!lecon.titre || lecon.titre.trim().length === 0) {
        errors.push({ code: 'LESSON_NO_TITLE', message: `Leçon ${lecon.numero} dans séquence "${unite.titre}" manque de titre.` })
      }
    }
  }

  // ── Scaffold integrity checks ──────────────────────────────────────────────

  if (scaffold) {
    // All scaffold sequence_ids must be present in generated unites
    for (const scaffoldSeqId of scaffold.sequenceIds) {
      if (!generatedSeqIds.has(scaffoldSeqId)) {
        missingScaffoldIds.push(scaffoldSeqId)
      }
    }

    // All scaffold unit_ids must be present in generated units
    for (const scaffoldUnit of scaffold.units) {
      if (!generatedUnitIds.has(scaffoldUnit.unitId)) {
        missingScaffoldIds.push(scaffoldUnit.unitId)
        warnings.push(`Scaffold unit_id "${scaffoldUnit.unitId}" absent du JSON généré — ID reconstruit depuis scaffold.`)
      }
    }

    if (missingScaffoldIds.length > 0) {
      warnings.push(`${missingScaffoldIds.length} IDs scaffold manquants dans JSON généré — reconstruction depuis scaffold.`)
    }
  }

  // ── Duplicate ID detection ─────────────────────────────────────────────────

  const seqIdCounts = new Map<string, number>()
  for (const u of unites) {
    if (u.sequence_id) seqIdCounts.set(u.sequence_id, (seqIdCounts.get(u.sequence_id) ?? 0) + 1)
  }
  for (const [id, count] of seqIdCounts) {
    if (count > 1) {
      errors.push({ code: 'DUPLICATE_SEQUENCE_ID', message: `sequence_id "${id}" apparaît ${count} fois dans unites[].`, entityId: id })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    unitCount:           units.length,
    sequenceCount:       unites.length,
    lessonCount:         totalLessons,
    orphanSequences,
    missingScaffoldIds,
  }
}

// ─── Scaffold reconstruction ────────────────────────────────────────────────────
// When Claude drops/changes IDs, reconstructs canonical structure from scaffold.
// Never throws — uses best-effort positional fallback.

export function reconstructFromScaffold(
  parsedProg: ContenuProgramme,
  scaffoldUnits: UnitScaffold[],
  scaffoldSequences: { id: string }[],
): ContenuProgramme {
  // Build authoritative units[] from scaffold (override any Claude-generated units)
  const canonicalUnits = scaffoldUnits.map(su => ({
    id:           su.unitId,
    numero:       su.ordre,
    titre:        findGeneratedUnitTitle(parsedProg.units, su.unitId) ?? su.titre,
    sequence_ids: su.sequenceIds,
    outcome_ids:  su.outcomeIds,
  }))

  // Build unite → sequence_id mapping: try ID match, fall back to positional
  const scaffoldSeqSet = new Set(scaffoldSequences.map(s => s.id))
  const scaffoldSeqById = new Map(scaffoldSequences.map((s, i) => [s.id, i]))
  const seqUnitMap = new Map<string, string>()  // sequenceId → unitId
  for (const su of scaffoldUnits) {
    for (const sid of su.sequenceIds) seqUnitMap.set(sid, su.unitId)
  }

  const stampedUnites = parsedProg.unites.map((u, i) => {
    // Case 1: Claude preserved the correct sequence_id
    if (u.sequence_id && scaffoldSeqSet.has(u.sequence_id)) {
      return { ...u, unit_id: seqUnitMap.get(u.sequence_id) ?? u.unit_id }
    }

    // Case 2: positional fallback
    const seq = scaffoldSequences[i]
    if (seq) {
      return { ...u, sequence_id: seq.id, unit_id: seqUnitMap.get(seq.id) }
    }

    // Case 3: no match — leave as-is
    return u
  })

  return {
    ...parsedProg,
    units:  canonicalUnits,
    unites: stampedUnites,
  }
}

function findGeneratedUnitTitle(
  generatedUnits: ContenuProgramme['units'],
  unitId: string,
): string | undefined {
  return generatedUnits?.find(u => u.id === unitId)?.titre
}
