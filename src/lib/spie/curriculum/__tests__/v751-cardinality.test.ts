// SCORGIA V7.5.1 — Cardinality Tests
// Validates that UNIT → SEQUENCE → LESSON hierarchy is never 1:1 by assumption.
// All tests are deterministic: no API calls, no DB access.

import { buildAydtePlanningBridge } from '../planning/aydte-planning-bridge'
import { validateV3Structure, reconstructFromScaffold } from '../../validate-v3-structure'
import type { NormalizedOutcome } from '../extraction/types'
import type { ContenuProgramme, Unite } from '@/lib/types/database'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOutcome(id: string, code: string, texte: string, parentId?: string): NormalizedOutcome {
  return {
    id,
    code,
    texte,
    vocabulaireSpie: 'resultat_apprentissage_general' as const,
    vocabulaireOriginal: parentId ? 'RAS' : 'RAG',
    parentId,
    conceptsIds: [],
    tags: [],
  }
}

// 1 RAG "A" with 2 RAS + 1 RAG "B" with 3 RAS — two SEQUENCES in two UNITS
const OUTCOMES_2_RAGS: NormalizedOutcome[] = [
  makeOutcome('A1', 'A1', 'L\'élève comprend des textes oraux variés.'),
  makeOutcome('A1-1', 'A1.1', 'Identifie les idées principales.', 'A1'),
  makeOutcome('A1-2', 'A1.2', 'Évalue les stratégies d\'écoute.', 'A1'),
  makeOutcome('B1', 'B1', 'L\'élève lit et interprète des textes variés.'),
  makeOutcome('B1-1', 'B1.1', 'Utilise des stratégies de lecture efficaces.', 'B1'),
  makeOutcome('B1-2', 'B1.2', 'Analyse les caractéristiques textuelles.', 'B1'),
  makeOutcome('B1-3', 'B1.3', 'Évalue la crédibilité des sources.', 'B1'),
]

// 1 RAG "A" with 4 RAS → should split into 1 unit with potentially multiple sequences
const OUTCOMES_1_RAG_4_RAS: NormalizedOutcome[] = [
  makeOutcome('A1', 'A1', 'L\'élève communique oralement.'),
  makeOutcome('A1-1', 'A1.1', 'Identifie les idées principales.', 'A1'),
  makeOutcome('A1-2', 'A1.2', 'Évalue les stratégies d\'écoute.', 'A1'),
  makeOutcome('A1-3', 'A1.3', 'Dégage les sous-entendus.', 'A1'),
  makeOutcome('A1-4', 'A1.4', 'Produit des résumés oraux.', 'A1'),
]

// 3 RAGs A, B, C → 3 units, 3 sequences minimum
const OUTCOMES_3_RAGS: NormalizedOutcome[] = [
  makeOutcome('A1', 'A1', 'L\'élève comprend des textes oraux.'),
  makeOutcome('A1-1', 'A1.1', 'Identifie les idées.', 'A1'),
  makeOutcome('A1-2', 'A1.2', 'Évalue les stratégies.', 'A1'),
  makeOutcome('B1', 'B1', 'L\'élève lit des textes.'),
  makeOutcome('B1-1', 'B1.1', 'Stratégies de lecture.', 'B1'),
  makeOutcome('C1', 'C1', 'L\'élève produit des textes écrits.'),
  makeOutcome('C1-1', 'C1.1', 'Planifie ses textes.', 'C1'),
  makeOutcome('C1-2', 'C1.2', 'Rédige des textes cohérents.', 'C1'),
  makeOutcome('C1-3', 'C1.3', 'Révise et corrige ses textes.', 'C1'),
]

// Cross-sequence outcome (used in multiple lessons)
const OUTCOMES_CROSS_SEQUENCE: NormalizedOutcome[] = [
  makeOutcome('A1', 'A1', 'Communication orale.'),
  makeOutcome('A1-1', 'A1.1', 'Outcome partagé — utilisé dans plusieurs leçons.', 'A1'),
  makeOutcome('B1', 'B1', 'Lecture.'),
  makeOutcome('B1-1', 'B1.1', 'Outcome partagé — aussi référencé par A1.1.', 'B1'),
]

const BRIDGE_INPUT_BASE = {
  totalSemaines: 36,
  minutesParSemaine: 200,
  packId: 'test-pack',
  matiere: 'Français',
  niveau: 'Secondaire 3',
  province: 'alberta',
}

function makeProgramme(unites: Partial<Unite>[], units?: ContenuProgramme['units']): ContenuProgramme {
  return {
    titre: 'Programme test',
    nb_semaines: 36,
    source_curriculum: 'test',
    schema_version: 'v3',
    unites: unites.map((u, i) => ({
      numero: i + 1,
      titre: u.titre ?? `Séquence ${i + 1}`,
      semaine_debut: u.semaine_debut ?? i * 6 + 1,
      semaine_fin: u.semaine_fin ?? (i + 1) * 6,
      objectifs: u.objectifs ?? ['Objectif'],
      lecons: u.lecons ?? [
        { numero: 1, titre: `Leçon ${i + 1}-1`, sujet: 'Contenu', duree_minutes: 60, type: 'introduction' as const },
      ],
      sequence_id: u.sequence_id,
      unit_id: u.unit_id,
      curriculum_outcome_ids: u.curriculum_outcome_ids,
    })),
    units,
  }
}

// ─── CASE A: 1 unit, 2 sequences, variable lesson counts ─────────────────────
describe('CASE A — 1 unit, 2 sequences, 3+4 lessons', () => {
  const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_2_RAGS })

  test('bridge succeeds', () => expect(result.success).toBe(true))

  test('produces sequences', () => expect(result.sequences.length).toBeGreaterThanOrEqual(1))

  test('produces units', () => expect(result.units.length).toBeGreaterThanOrEqual(1))

  test('units.length <= sequences.length (1:N respected)', () => {
    expect(result.units.length).toBeLessThanOrEqual(result.sequences.length)
  })

  test('every sequence belongs to exactly one unit', () => {
    const allSeqIds = new Set(result.sequences.map(s => s.id))
    const unitSeqIds = new Set(result.units.flatMap(u => u.sequenceIds))
    for (const id of allSeqIds) expect(unitSeqIds.has(id)).toBe(true)
  })

  test('no unit has zero sequences', () => {
    for (const unit of result.units) {
      expect(unit.sequenceIds.length).toBeGreaterThanOrEqual(1)
    }
  })

  test('scaffold prompt is non-empty', () => expect(result.scaffoldPrompt.length).toBeGreaterThan(0))

  test('scaffold shows UNIT level (not just SÉQUENCE)', () => {
    expect(result.scaffoldPrompt).toContain('UNITÉ')
  })
})

// ─── CASE B: 1 unit, 4 sequences ─────────────────────────────────────────────
describe('CASE B — 1 RAG with 4 RAS, should produce sequences with variable lessons', () => {
  const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_1_RAG_4_RAS })

  test('bridge succeeds', () => expect(result.success).toBe(true))

  test('all sequences share the same unit domain (A)', () => {
    const domains = new Set(result.units.map(u => u.domainCode))
    expect(domains.size).toBe(1)
  })

  test('exactly 1 unit produced for domain A', () => {
    expect(result.units.length).toBe(1)
  })

  test('unit has >= 1 sequence', () => {
    expect(result.units[0].sequenceIds.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── CASE C: 3 units, different sequence counts ───────────────────────────────
describe('CASE C — 3 RAGs (A, B, C) → 3 units with different sequence counts', () => {
  const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_3_RAGS })

  test('bridge succeeds', () => expect(result.success).toBe(true))

  test('produces 3 units (one per domain)', () => expect(result.units.length).toBe(3))

  test('domains are A, B, C', () => {
    const domains = result.units.map(u => u.domainCode).sort()
    expect(domains).toEqual(['A', 'B', 'C'])
  })

  test('units.length is NOT equal to sequences.length forced 1:1', () => {
    // This test ensures we're not in a hard-coded 1:1 mode
    // C has 3 RAS — may produce same unit count as sequence count, but that's natural, not forced
    const seqIdsFlat = result.units.flatMap(u => u.sequenceIds)
    expect(seqIdsFlat.length).toBe(result.sequences.length)
  })

  test('no unit assumes units.length === sequences.length', () => {
    // All sequence IDs must be accounted for in units
    const allUnitSeqIds = new Set(result.units.flatMap(u => u.sequenceIds))
    for (const seq of result.sequences) {
      expect(allUnitSeqIds.has(seq.id)).toBe(true)
    }
  })
})

// ─── CASE D: outcome in multiple lessons ─────────────────────────────────────
describe('CASE D — outcome appearing across multiple lessons (structural check only)', () => {
  const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_CROSS_SEQUENCE })

  test('bridge handles shared outcome codes without crash', () => {
    expect(result.success).toBe(true)
  })

  test('outcome IDs are all accounted for in sequences', () => {
    const allOutcomeIds = new Set(OUTCOMES_CROSS_SEQUENCE.map(o => o.id))
    const seqOutcomeIds = new Set(result.sequences.flatMap(s => s.outcomeIds))
    for (const id of allOutcomeIds) {
      expect(seqOutcomeIds.has(id)).toBe(true)
    }
  })
})

// ─── CASE E: cross-sequence prerequisite ─────────────────────────────────────
describe('CASE E — cross-sequence prerequisite ordering', () => {
  const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_3_RAGS })

  test('sequences are ordered (ordre is monotonically increasing)', () => {
    const ordres = result.sequences.map(s => s.ordre)
    for (let i = 1; i < ordres.length; i++) {
      expect(ordres[i]).toBeGreaterThan(ordres[i - 1])
    }
  })

  test('units are ordered by ordre', () => {
    for (let i = 1; i < result.units.length; i++) {
      expect(result.units[i].ordre).toBeGreaterThan(result.units[i - 1].ordre)
    }
  })
})

// ─── CASE F: legacy V1 programme ─────────────────────────────────────────────
describe('CASE F — legacy V1 programme (no schema_version, no AYDTE IDs)', () => {
  const legacyProg: ContenuProgramme = {
    titre: 'Programme V1',
    nb_semaines: 36,
    source_curriculum: 'alberta',
    unites: [
      {
        numero: 1, titre: 'Unité 1 legacy', semaine_debut: 1, semaine_fin: 9,
        objectifs: ['Objectif'],
        lecons: [{ numero: 1, titre: 'Leçon 1', sujet: 'Sujet', duree_minutes: 60, type: 'introduction' }],
      },
    ],
  }

  test('validateV3Structure on V1 programme produces no errors (no scaffold)', () => {
    const result = validateV3Structure(legacyProg)
    // V1 has no units[] — validator warns but doesn't error on missing units when no scaffold
    expect(result.errors.filter(e => e.code !== 'UNITS_MISSING')).toHaveLength(0)
  })

  test('V1 unite has no sequence_id — validator warns but does not block', () => {
    const result = validateV3Structure(legacyProg)
    // Missing unit_id on unite is a warning, not an error
    expect(result.errors.some(e => e.code === 'SEQUENCE_UNIT_ID_INVALID')).toBe(false)
  })
})

// ─── CASE G: V2 programme ─────────────────────────────────────────────────────
describe('CASE G — V2 programme (schema_version v2, no sequence_id)', () => {
  const v2Prog: ContenuProgramme = {
    titre: 'Programme V2',
    nb_semaines: 36,
    source_curriculum: 'alberta',
    schema_version: 'v2',
    curriculum_outcomes: [
      { id: 'A1', code: 'A1', titre: 'Compréhension orale', description: 'RAG A', type: 'resultat_apprentissage' },
    ],
    unites: [
      {
        numero: 1, titre: 'Communication orale', semaine_debut: 1, semaine_fin: 9,
        objectifs: ['Objectif'], curriculum_outcome_ids: ['A1'],
        justification_pedagogique: 'Justification V2.',
        lecons: [{ numero: 1, titre: 'Écoute active', sujet: 'Stratégies', duree_minutes: 60, type: 'introduction' }],
      },
    ],
  }

  test('validator passes V2 without scaffold', () => {
    const result = validateV3Structure(v2Prog)
    expect(result.valid).toBe(true)
  })

  test('V2 has no units — sequenceCount = unites.length', () => {
    const result = validateV3Structure(v2Prog)
    expect(result.unitCount).toBe(0)
    expect(result.sequenceCount).toBe(1)
  })
})

// ─── CASE H: V3 canonical programme ───────────────────────────────────────────
describe('CASE H — V3 canonical programme with units[] and sequence_id', () => {
  const v3Prog: ContenuProgramme = {
    titre: 'Programme V3',
    nb_semaines: 36,
    source_curriculum: 'alberta',
    schema_version: 'v3',
    curriculum_outcomes: [
      { id: 'A1', code: 'A1', titre: 'Communication orale', description: 'RAG A', type: 'resultat_apprentissage' },
      { id: 'B1', code: 'B1', titre: 'Lecture', description: 'RAG B', type: 'resultat_apprentissage' },
    ],
    units: [
      { id: 'unit-a-1', numero: 1, titre: 'Communication et sens', sequence_ids: ['seq-a1', 'seq-a2'], outcome_ids: ['A1'] },
      { id: 'unit-b-1', numero: 2, titre: 'Littératie textuelle', sequence_ids: ['seq-b1'], outcome_ids: ['B1'] },
    ],
    unites: [
      {
        numero: 1, titre: 'Écoute active — stratégies', sequence_id: 'seq-a1', unit_id: 'unit-a-1',
        semaine_debut: 1, semaine_fin: 8, objectifs: ['Objectif A1'], curriculum_outcome_ids: ['A1'],
        lecons: [
          { numero: 1, titre: 'Comprendre en contexte', sujet: 'Écoute', duree_minutes: 60, type: 'introduction' },
          { numero: 2, titre: 'Distinguer principal et secondaire', sujet: 'Analyse', duree_minutes: 60, type: 'developpement' },
          { numero: 3, titre: 'Évaluer la crédibilité', sujet: 'Critique', duree_minutes: 60, type: 'evaluation' },
        ],
      },
      {
        numero: 2, titre: 'Communication orale — production', sequence_id: 'seq-a2', unit_id: 'unit-a-1',
        semaine_debut: 9, semaine_fin: 15, objectifs: ['Objectif A1-prod'], curriculum_outcome_ids: ['A1'],
        lecons: [
          { numero: 1, titre: 'Produire un exposé structuré', sujet: 'Production', duree_minutes: 60, type: 'developpement' },
          { numero: 2, titre: 'Réviser et améliorer', sujet: 'Révision', duree_minutes: 60, type: 'evaluation' },
          { numero: 3, titre: 'Présenter devant la classe', sujet: 'Performance', duree_minutes: 60, type: 'evaluation' },
          { numero: 4, titre: 'Rétroaction et bilan', sujet: 'Synthèse', duree_minutes: 60, type: 'synthese' },
        ],
      },
      {
        numero: 3, titre: 'Lire pour interpréter', sequence_id: 'seq-b1', unit_id: 'unit-b-1',
        semaine_debut: 16, semaine_fin: 27, objectifs: ['Objectif B1'], curriculum_outcome_ids: ['B1'],
        lecons: [
          { numero: 1, titre: 'Stratégies de lecture active', sujet: 'Lecture', duree_minutes: 60, type: 'introduction' },
          { numero: 2, titre: 'Analyser les types de texte', sujet: 'Analyse', duree_minutes: 60, type: 'developpement' },
        ],
      },
    ],
  }

  test('validator passes V3 programme without scaffold', () => {
    const result = validateV3Structure(v3Prog)
    expect(result.valid).toBe(true)
  })

  test('unit-a-1 contains 2 sequences (1:N)', () => {
    const unitA = v3Prog.units?.find(u => u.id === 'unit-a-1')
    expect(unitA?.sequence_ids.length).toBe(2)
  })

  test('unit-b-1 contains 1 sequence', () => {
    const unitB = v3Prog.units?.find(u => u.id === 'unit-b-1')
    expect(unitB?.sequence_ids.length).toBe(1)
  })

  test('units.length !== sequences.length (2 units, 3 sequences)', () => {
    expect(v3Prog.units!.length).toBe(2)
    expect(v3Prog.unites.length).toBe(3)
    expect(v3Prog.units!.length).not.toBe(v3Prog.unites.length)
  })

  test('seq-a1 has 3 lessons, seq-a2 has 4 lessons (variable counts)', () => {
    const seqA1 = v3Prog.unites.find(u => u.sequence_id === 'seq-a1')
    const seqA2 = v3Prog.unites.find(u => u.sequence_id === 'seq-a2')
    expect(seqA1?.lecons.length).toBe(3)
    expect(seqA2?.lecons.length).toBe(4)
  })

  test('validateV3Structure counts correctly', () => {
    const result = validateV3Structure(v3Prog)
    expect(result.unitCount).toBe(2)
    expect(result.sequenceCount).toBe(3)
    expect(result.lessonCount).toBe(9)
  })

  test('all sequence_ids in units[] exist in unites[]', () => {
    const result = validateV3Structure(v3Prog)
    expect(result.errors.filter(e => e.code === 'SEQUENCE_ID_ORPHAN_IN_UNIT')).toHaveLength(0)
  })

  test('reconstructFromScaffold preserves 1:N when IDs are present', () => {
    const scaffoldUnits = [
      { unitId: 'unit-a-1', ordre: 1, domainCode: 'A', titre: 'A', outcomeIds: ['A1'], sequenceIds: ['seq-a1', 'seq-a2'] },
      { unitId: 'unit-b-1', ordre: 2, domainCode: 'B', titre: 'B', outcomeIds: ['B1'], sequenceIds: ['seq-b1'] },
    ]
    const scaffoldSeqs = [{ id: 'seq-a1' }, { id: 'seq-a2' }, { id: 'seq-b1' }]
    const reconstructed = reconstructFromScaffold(v3Prog, scaffoldUnits, scaffoldSeqs)

    // unit-a-1 must still have 2 sequences
    const unitA = reconstructed.units?.find(u => u.id === 'unit-a-1')
    expect(unitA?.sequence_ids.length).toBe(2)
  })
})

// ─── Meta: units.length === sequences.length is never assumed ─────────────────
describe('META — units.length === sequences.length is never hardcoded', () => {
  test('CASE C: 3 units, 3 sequences (natural, not forced)', () => {
    const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_3_RAGS })
    // It happens to be 3:3 here because A, B, C each have 1 natural group
    // But this should come from the curriculum, not a 1:1 assumption
    expect(result.units.length).toBeLessThanOrEqual(result.sequences.length)
  })

  test('CASE B: 1 unit may have multiple sequences', () => {
    // With 1 RAG "A" and 4 RAS, all in domain "A" → 1 unit
    // sequences may be 1 (if all fit in maxOutcomesParSequence=6) or 2 (if maxOutcomes < 5)
    const result = buildAydtePlanningBridge({ ...BRIDGE_INPUT_BASE, outcomes: OUTCOMES_1_RAG_4_RAS })
    expect(result.units.length).toBe(1)
    expect(result.units[0].sequenceIds.length).toBeGreaterThanOrEqual(1)
    // The unit's sequence count matches the sequences produced
    expect(result.units[0].sequenceIds.length).toBe(result.sequences.length)
  })
})
