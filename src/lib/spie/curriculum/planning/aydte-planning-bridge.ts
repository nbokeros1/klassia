// SPIE-V7.5.1 — AYDTE Planning Bridge (cardinality fix)
// Bridges SPIE-02 NormalizedOutcome[] → AnnualPlanningEngine → UnitScaffold[] + SequenceBlock[]
//
// Canonical hierarchy produced:
//   UnitScaffold (macro theme, groups sequences by domain code)
//     └── SequenceBlock[] (coherent instructional progressions per RAG group)
//
// 1 Unit → N Sequences (N >= 1). Never 1:1 by assumption.
// No DB I/O — pure deterministic transformation. Never throws.

import type { NormalizedOutcome } from '../extraction/types'
import type { CurriculumPacingModel, OutcomePacing, ConstraintSet } from '../constraints/types'
import type { SequenceBlock } from '../../aydte/types/twin'
import type { AnnualPlanningInput } from '../../aydte/types/planning'
import { annualPlanningEngine } from '../../aydte/planning/annual-planning-engine'

// ─── Output types ──────────────────────────────────────────────────────────────

// Macro pedagogical grouping — one theme or curricular domain.
// A unit contains one or more sequences; sequences share curricular domain.
export interface UnitScaffold {
  unitId: string           // stable ID — authoritative, must appear in generated JSON
  ordre: number            // 1-based sort order
  domainCode: string       // "A", "B", "C" extracted from RAG codes; fallback "G1", "G2"
  titre: string            // placeholder — Claude replaces with thematic title
  outcomeIds: string[]     // all outcome IDs (all sequences in this unit)
  sequenceIds: string[]    // stable sequence IDs belonging to this unit (1..N)
}

export interface AydteBridgeInput {
  outcomes: NormalizedOutcome[]
  totalSemaines: number
  minutesParSemaine: number
  packId?: string
  classeId?: string
  enseignantId?: string
  province?: string
  matiere?: string
  niveau?: string
  langue?: 'fr' | 'en'
  anneesScolaire?: string
  maxSequencesPerUnit?: number   // default 3 — max before a new unit is opened
}

export interface AydteBridgeResult {
  success: boolean
  units: UnitScaffold[]        // canonical macro units (1+ per result)
  sequences: SequenceBlock[]   // canonical sequences (1+ per unit)
  scaffoldPrompt: string       // 2-level hierarchy text for Claude prompt
  coveragePercent: number
  pacingScore: number
  durationMs: number
  error?: string
  avertissements: string[]
}

// ─── Pacing model synthesis ────────────────────────────────────────────────────

function synthesizePacingModel(
  outcomes: NormalizedOutcome[],
  totalSemaines: number,
  minutesParSemaine: number,
  curriculumId: string,
  province?: string,
  matiere?: string,
  niveau?: string,
): CurriculumPacingModel {
  const totalMinutes = totalSemaines * minutesParSemaine * 0.85
  const totalHeuresEstimees = Math.round(totalMinutes / 60 * 10) / 10
  const minutesParOutcome = outcomes.length > 0
    ? Math.round(totalMinutes / outcomes.length)
    : 45

  const outcomePacings: OutcomePacing[] = outcomes.map(o => ({
    outcomeId:           o.id,
    outcomeCode:         o.code,
    outcomeTitre:        o.texte.substring(0, 80),
    tempsEstimeMinutes:  minutesParOutcome,
    prealablesIds:       o.parentId ? [o.parentId] : [],
    priorite:            'normale' as const,
  }))

  const contraintes: ConstraintSet = {
    id:          `cs-${curriculumId.substring(0, 8)}-${Date.now()}`,
    curriculumId,
    province,
    matiere,
    niveaux:     niveau ? [niveau] : [],
    constraints: [],
    createdAt:   new Date().toISOString(),
  }

  return {
    curriculumId,
    province,
    matiere,
    niveaux:               niveau ? [niveau] : [],
    totalHeuresEstimees,
    totalSemainesRequises: totalSemaines,
    outcomes:              outcomePacings,
    contraintes,
  }
}

// ─── Domain code extraction ────────────────────────────────────────────────────
// Extracts a short alphabetic/numeric domain prefix from a sequence's primary RAG.
// "A1" → "A", "B2" → "B", "1.1" → "1", "RA-A" → "A".
// Returns a positional fallback "G<n>" when no clear prefix exists.

function extractDomainCode(seq: SequenceBlock, outcomes: NormalizedOutcome[], seqIndex: number, maxPerUnit: number): string {
  const outcomeById = new Map(outcomes.map(o => [o.id, o]))

  // Find the parent-level (RAG) outcome in this sequence
  const parentOutcome = seq.outcomeIds
    .map(id => outcomeById.get(id))
    .find(o => !!o && !o.parentId)

  if (parentOutcome?.code) {
    const code = parentOutcome.code.replace(/^[Rr][Aa][Gg][-_]?/, '').trim()

    // Letter prefix: "A1" → "A", "B2" → "B"
    const letterMatch = code.match(/^([A-Za-z]+)/)
    if (letterMatch) return letterMatch[1].toUpperCase()

    // Numeric prefix: "1.2" → "1"
    const numMatch = code.match(/^(\d+)/)
    if (numMatch) return numMatch[1]
  }

  // Fallback: group by position (every maxPerUnit sequences share a group)
  return `G${Math.ceil((seqIndex + 1) / Math.max(1, maxPerUnit))}`
}

// ─── Unit grouping ─────────────────────────────────────────────────────────────
// Groups sequences into macro units by domain code.
// Sequences sharing the same domain code (e.g. "A") → same unit.
// This is NOT 1:1 — "A1" + "A2" → one unit with 2 sequences.

function groupSequencesIntoUnits(
  sequences: SequenceBlock[],
  outcomes: NormalizedOutcome[],
  maxSequencesPerUnit: number,
): UnitScaffold[] {
  const outcomeById = new Map(outcomes.map(o => [o.id, o]))

  // Map each sequence to a domain code
  const seqDomains: Array<{ seq: SequenceBlock; domain: string }> = sequences.map((seq, i) => ({
    seq,
    domain: extractDomainCode(seq, outcomes, i, maxSequencesPerUnit),
  }))

  // Group sequences by domain (preserve insertion order = curriculum order)
  const domainOrder: string[] = []
  const domainMap = new Map<string, SequenceBlock[]>()
  for (const { seq, domain } of seqDomains) {
    if (!domainMap.has(domain)) {
      domainOrder.push(domain)
      domainMap.set(domain, [])
    }
    domainMap.get(domain)!.push(seq)
  }

  const ts = Date.now()
  return domainOrder.map((domain, unitIdx) => {
    const domainSeqs = domainMap.get(domain)!
    const allOutcomeIds = [...new Set(domainSeqs.flatMap(s => s.outcomeIds))]

    // Find representative title from parent outcomes
    const parentOutcomes = allOutcomeIds
      .map(id => outcomeById.get(id))
      .filter((o): o is NormalizedOutcome => !!o && !o.parentId)

    const titre = parentOutcomes.length > 0
      ? parentOutcomes.map(o => o.code ?? domain).join(', ')
      : `Domaine ${domain}`

    return {
      unitId:      `unit-${domain.toLowerCase()}-${ts}-${unitIdx + 1}`,
      ordre:       unitIdx + 1,
      domainCode:  domain,
      titre,
      outcomeIds:  allOutcomeIds,
      sequenceIds: domainSeqs.map(s => s.id),
    }
  })
}

// ─── Scaffold formatter ────────────────────────────────────────────────────────
// Produces a 2-level (UNIT → SEQUENCE) text block for Claude prompt injection.
// Claude enriches titles but MUST preserve exact unit_id and sequence_id values.

function formatTwoLevelScaffold(
  units: UnitScaffold[],
  sequences: SequenceBlock[],
  outcomes: NormalizedOutcome[],
): string {
  if (units.length === 0) return ''

  const outcomeById = new Map(outcomes.map(o => [o.id, o]))
  const seqById = new Map(sequences.map(s => [s.id, s]))
  const lines: string[] = []

  lines.push('STRUCTURE PÉDAGOGIQUE CALCULÉE PAR AYDTE (V7.5.1) :')
  lines.push('RÈGLE ABSOLUE : utilise EXACTEMENT les unit_id et sequence_id ci-dessous dans ton JSON.')
  lines.push('Enrichis les titres mais ne modifie JAMAIS les identifiants fournis.')
  lines.push('')

  for (const unit of units) {
    const unitParents = unit.outcomeIds
      .map(id => outcomeById.get(id))
      .filter((o): o is NormalizedOutcome => !!o && !o.parentId)

    lines.push(`UNITÉ ${unit.ordre} [unit_id: "${unit.unitId}"]`)
    lines.push(`  Codes outcomes : ${unitParents.map(o => o.code ?? unit.domainCode).join(', ')}`)
    lines.push(`  Nombre de séquences : ${unit.sequenceIds.length}`)

    for (const seqId of unit.sequenceIds) {
      const seq = seqById.get(seqId)
      if (!seq) continue

      const seqOutcomes = seq.outcomeIds
        .map(id => outcomeById.get(id))
        .filter((o): o is NormalizedOutcome => !!o)
      const parentO = seqOutcomes.find(o => !o.parentId)
      const childOs = seqOutcomes.filter(o => !!o.parentId)

      lines.push(`    SÉQUENCE [sequence_id: "${seq.id}"]`)
      if (seq.semaineDébut !== undefined && seq.semainesFin !== undefined) {
        const dur = seq.semainesFin - seq.semaineDébut + 1
        lines.push(`      Semaines : S${seq.semaineDébut}→S${seq.semainesFin} (${dur} sem.)`)
      }
      lines.push(`      Durée : ${seq.dureeEstimeeHeures}h`)
      if (parentO) {
        lines.push(`      Outcome principal : [${parentO.code ?? '?'}] ${parentO.texte.substring(0, 70)}`)
      }
      if (childOs.length > 0) {
        lines.push(`      Outcomes spécifiques : ${childOs.map(o => `[${o.code ?? '?'}]`).join(' ')}`)
      }
    }
    lines.push('')
  }

  lines.push('FORMAT JSON ATTENDU — chaque "unite" doit avoir sequence_id ET unit_id exacts.')
  lines.push('"units" liste les unités macro avec leurs sequence_ids. "unites" liste les séquences détaillées.')

  return lines.join('\n')
}

// ─── Main bridge function ──────────────────────────────────────────────────────

export function buildAydtePlanningBridge(input: AydteBridgeInput): AydteBridgeResult {
  const t0 = Date.now()
  const maxSequencesPerUnit = input.maxSequencesPerUnit ?? 3

  if (input.outcomes.length === 0) {
    return {
      success: false,
      units: [],
      sequences: [],
      scaffoldPrompt: '',
      coveragePercent: 0,
      pacingScore: 0,
      durationMs: Date.now() - t0,
      error: 'Aucun outcome normalisé — AYDTE bridge ignoré',
      avertissements: [],
    }
  }

  try {
    const curriculumId = input.packId ?? `bridge-${Date.now()}`
    const pacingModel = synthesizePacingModel(
      input.outcomes,
      input.totalSemaines,
      input.minutesParSemaine,
      curriculumId,
      input.province,
      input.matiere,
      input.niveau,
    )

    const planningInput: AnnualPlanningInput = {
      curriculumId,
      province:          input.province,
      matiere:           input.matiere ?? 'Matière',
      niveaux:           input.niveau ? [input.niveau] : [],
      classeId:          input.classeId ?? 'unknown',
      enseignantId:      input.enseignantId ?? 'unknown',
      academicYear:      input.anneesScolaire ?? '2026-2027',
      langue:            input.langue ?? 'fr',
      totalSemaines:     input.totalSemaines,
      minutesParSemaine: input.minutesParSemaine,
      outcomes:          input.outcomes,
      pacingModel,
      maxOutcomesParSequence: 6,
      bufferPercent:     15,
    }

    const result = annualPlanningEngine.plan(planningInput)

    if (!result.success) {
      return {
        success: false,
        units: [],
        sequences: [],
        scaffoldPrompt: '',
        coveragePercent: 0,
        pacingScore: 0,
        durationMs: Date.now() - t0,
        error: result.error ?? 'AYDTE planning a échoué',
        avertissements: result.avertissements ?? [],
      }
    }

    // Group sequences into macro units (1 unit → N sequences)
    const units = groupSequencesIntoUnits(result.sequences, input.outcomes, maxSequencesPerUnit)
    const scaffoldPrompt = formatTwoLevelScaffold(units, result.sequences, input.outcomes)

    return {
      success: true,
      units,
      sequences: result.sequences,
      scaffoldPrompt,
      coveragePercent: result.stats.coveragePercent,
      pacingScore: result.stats.pacingScore,
      durationMs: Date.now() - t0,
      avertissements: result.avertissements,
    }
  } catch (e) {
    return {
      success: false,
      units: [],
      sequences: [],
      scaffoldPrompt: '',
      coveragePercent: 0,
      pacingScore: 0,
      durationMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
      avertissements: [],
    }
  }
}
