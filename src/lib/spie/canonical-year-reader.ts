// SPIE-V7.5 — Canonical Year Reader
// Compatibility adapter: canonical DB tables (V3, future) → V3 JSON → V2 JSON → V1 fallback.
// UI components call getCanonicalPedagogicalYear() and never need to understand 3 schema generations.
//
// Priority order:
//   1. canonical DB tables (pedagogical_sequences, pedagogical_lessons) — NOT YET POPULATED
//   2. schema_version = 'v3' ContenuProgramme with units[] and sequence_id on each unite
//   3. schema_version = 'v2' ContenuProgramme (full V2 fields)
//   4. V1/legacy JSON (minimum: titre + unites)

import type { ContenuProgramme, UnitV3, Unite } from '@/lib/types/database'

// ─── Output types ──────────────────────────────────────────────────────────────

export type CanonicalSchemaVersion = 'v1' | 'v2' | 'v3' | 'legacy'

export type CanonicalSequence = {
  id: string              // sequence_id (AYDTE stable) or `seq-${seqIdx}`
  ordre: number           // 0-based
  unite: Unite            // the raw unite from contenu_json
  seqIdx: number          // positional index into unites[] — kept for backward compat
}

export type CanonicalUnit = {
  id: string              // unit_id or generated
  numero: number
  titre: string
  sequences: CanonicalSequence[]
  outcome_ids: string[]
}

export type CanonicalYear = {
  schemaVersion: CanonicalSchemaVersion
  contenu: ContenuProgramme
  // V3: macro-units wrapping sequences
  // V1/V2: single virtual unit containing all sequences
  canonicalUnits: CanonicalUnit[]
  // Flat sequence list (same as contenu.unites, augmented with stable ids)
  sequences: CanonicalSequence[]
  hasCanonicalIds: boolean   // true if sequence_id present on unites
  hasUnitLevel: boolean      // true if units[] present (V3+)
}

// ─── Adapter ───────────────────────────────────────────────────────────────────

export function getCanonicalPedagogicalYear(
  contenu: ContenuProgramme | null | undefined,
): CanonicalYear {
  // Null guard
  if (!contenu || !Array.isArray(contenu.unites)) {
    const empty: ContenuProgramme = { titre: '', nb_semaines: 0, source_curriculum: '', unites: [] }
    return {
      schemaVersion: 'legacy',
      contenu: empty,
      canonicalUnits: [],
      sequences: [],
      hasCanonicalIds: false,
      hasUnitLevel: false,
    }
  }

  const schemaVersion = resolveSchemaVersion(contenu)

  // Build flat canonical sequences from unites[]
  const sequences: CanonicalSequence[] = contenu.unites.map((unite, seqIdx) => ({
    id:     unite.sequence_id ?? `seq-${seqIdx}`,
    ordre:  seqIdx,
    unite,
    seqIdx,
  }))

  const hasCanonicalIds = contenu.unites.some(u => !!u.sequence_id)
  const hasUnitLevel    = Array.isArray(contenu.units) && contenu.units.length > 0

  // Build canonical unit level
  let canonicalUnits: CanonicalUnit[]

  if (hasUnitLevel && contenu.units) {
    // V3: use the units[] from contenu_json — each unit groups sequences by sequence_id
    canonicalUnits = buildV3Units(contenu.units, sequences)
  } else if (hasCanonicalIds) {
    // V3 without units[]: wrap all sequences in a single virtual unit
    canonicalUnits = [virtualUnit(sequences, contenu)]
  } else {
    // V1/V2: single virtual unit
    canonicalUnits = [virtualUnit(sequences, contenu)]
  }

  return {
    schemaVersion,
    contenu,
    canonicalUnits,
    sequences,
    hasCanonicalIds,
    hasUnitLevel,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function resolveSchemaVersion(contenu: ContenuProgramme): CanonicalSchemaVersion {
  if (contenu.schema_version === 'v3') return 'v3'
  if (contenu.schema_version === 'v2') return 'v2'
  if (contenu.schema_version === 'v1') return 'v1'
  return 'legacy'
}

function buildV3Units(units: UnitV3[], sequences: CanonicalSequence[]): CanonicalUnit[] {
  const seqById = new Map(sequences.map(s => [s.id, s]))

  return units.map((u, i) => {
    const unitSequences = u.sequence_ids
      .map(sid => seqById.get(sid))
      .filter((s): s is CanonicalSequence => !!s)
      .sort((a, b) => a.ordre - b.ordre)

    return {
      id:         u.id,
      numero:     u.numero ?? i + 1,
      titre:      u.titre,
      sequences:  unitSequences,
      outcome_ids: u.outcome_ids ?? [],
    }
  }).sort((a, b) => a.numero - b.numero)
}

function virtualUnit(sequences: CanonicalSequence[], contenu: ContenuProgramme): CanonicalUnit {
  return {
    id:          'unit-virtual',
    numero:      1,
    titre:       contenu.titre,
    sequences,
    outcome_ids: (contenu.curriculum_outcomes ?? []).map(o => o.id),
  }
}
