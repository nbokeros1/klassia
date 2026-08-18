// SPIE-V7.5 — AYDTE Planning Bridge
// Bridges SPIE-02 NormalizedOutcome[] → AnnualPlanningEngine → SequenceBlock[]
// No DB I/O — pure transformation layer. Never throws; errors are returned in result.

import type { NormalizedOutcome } from '../extraction/types'
import type { CurriculumPacingModel, OutcomePacing, ConstraintSet } from '../constraints/types'
import type { SequenceBlock } from '../../aydte/types/twin'
import type { AnnualPlanningInput } from '../../aydte/types/planning'
import { annualPlanningEngine } from '../../aydte/planning/annual-planning-engine'

// ─── Bridge input/output ──────────────────────────────────────────────────────

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
}

export interface AydteBridgeResult {
  success: boolean
  sequences: SequenceBlock[]
  scaffoldPrompt: string    // formatted for Claude prompt injection
  coveragePercent: number
  pacingScore: number
  durationMs: number
  error?: string
  avertissements: string[]
}

// ─── Pacing model synthesis ────────────────────────────────────────────────────
// Synthesizes a minimal CurriculumPacingModel from NormalizedOutcome[].
// AYDTE uses totalHeuresEstimees to compute minutesPerOutcome; all other fields
// are metadata. OutcomePacing prealablesIds maps the RAG→RAS prerequisite chain.

function synthesizePacingModel(
  outcomes: NormalizedOutcome[],
  totalSemaines: number,
  minutesParSemaine: number,
  curriculumId: string,
  province?: string,
  matiere?: string,
  niveau?: string,
): CurriculumPacingModel {
  const totalMinutes = totalSemaines * minutesParSemaine * 0.85  // 15% buffer
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
    constraints: [],   // SPIE-05 (constraint extraction) not yet implemented
    createdAt:   new Date().toISOString(),
  }

  return {
    curriculumId,
    province,
    matiere,
    niveaux:             niveau ? [niveau] : [],
    totalHeuresEstimees,
    totalSemainesRequises: totalSemaines,
    outcomes:            outcomePacings,
    contraintes,
  }
}

// ─── Scaffold formatter ────────────────────────────────────────────────────────
// Converts AYDTE SequenceBlock[] into a structured text block for Claude prompt.
// Claude uses this as a pedagogical skeleton: week allocation + outcome grouping.
// Claude fills in thematic titles, descriptions, lesson details.

function formatSequenceScaffold(sequences: SequenceBlock[], outcomes: NormalizedOutcome[]): string {
  if (sequences.length === 0) return ''

  const outcomeById = new Map(outcomes.map(o => [o.id, o]))
  const lines: string[] = []

  lines.push('STRUCTURE PÉDAGOGIQUE CALCULÉE PAR AYDTE (Academic Year Digital Twin Engine) :')
  lines.push('Utilise cette ossature comme point de départ obligatoire : respecte les semaines,')
  lines.push('les groupements d\'outcomes, et les sequence_id fournis. Donne des titres thématiques réels.')
  lines.push('')

  for (const seq of sequences) {
    const seqOutcomes = seq.outcomeIds
      .map(id => outcomeById.get(id))
      .filter((o): o is NormalizedOutcome => !!o)
    const parentOutcome = seqOutcomes.find(o => !o.parentId)
    const childOutcomes = seqOutcomes.filter(o => !!o.parentId)

    lines.push(`SÉQUENCE ${seq.ordre + 1} [sequence_id: "${seq.id}"] :`)
    if (seq.semaineDébut !== undefined && seq.semainesFin !== undefined) {
      lines.push(`  Semaines : S${seq.semaineDébut} → S${seq.semainesFin} (${seq.semainesFin - seq.semaineDébut + 1} semaine${seq.semainesFin - seq.semaineDébut > 0 ? 's' : ''})`)
    }
    lines.push(`  Durée estimée : ${seq.dureeEstimeeHeures}h`)

    if (parentOutcome) {
      lines.push(`  Outcome principal : [${parentOutcome.code ?? `R${seq.ordre + 1}`}] ${parentOutcome.texte.substring(0, 80)}`)
    }
    if (childOutcomes.length > 0) {
      lines.push(`  Outcomes spécifiques (${childOutcomes.length}) :`)
      for (const child of childOutcomes) {
        lines.push(`    [${child.code ?? '—'}] ${child.texte.substring(0, 60)}`)
      }
    }

    const outcomeIds = seqOutcomes.map(o => `"${o.code ?? o.id.substring(0, 8)}"`).join(', ')
    lines.push(`  curriculum_outcome_ids : [${outcomeIds}]`)
    lines.push('')
  }

  lines.push('Note : chaque unité dans "unites" doit inclure "sequence_id" avec la valeur fournie ci-dessus.')

  return lines.join('\n')
}

// ─── Main bridge function ──────────────────────────────────────────────────────

export function buildAydtePlanningBridge(input: AydteBridgeInput): AydteBridgeResult {
  const t0 = Date.now()

  if (input.outcomes.length === 0) {
    return {
      success: false,
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
      province:         input.province,
      matiere:          input.matiere ?? 'Matière',
      niveaux:          input.niveau ? [input.niveau] : [],
      classeId:         input.classeId ?? 'unknown',
      enseignantId:     input.enseignantId ?? 'unknown',
      academicYear:     input.anneesScolaire ?? '2026-2027',
      langue:           input.langue ?? 'fr',
      totalSemaines:    input.totalSemaines,
      minutesParSemaine: input.minutesParSemaine,
      outcomes:         input.outcomes,
      pacingModel,
      maxOutcomesParSequence: 6,
      bufferPercent:    15,
    }

    const result = annualPlanningEngine.plan(planningInput)

    if (!result.success) {
      return {
        success: false,
        sequences: [],
        scaffoldPrompt: '',
        coveragePercent: 0,
        pacingScore: 0,
        durationMs: Date.now() - t0,
        error: result.error ?? 'AYDTE planning a échoué',
        avertissements: result.avertissements ?? [],
      }
    }

    const scaffoldPrompt = formatSequenceScaffold(result.sequences, input.outcomes)

    return {
      success: true,
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
