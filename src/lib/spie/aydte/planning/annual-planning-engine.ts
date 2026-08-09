// SPIE-04 — Annual Planning Engine
// Takes curriculum + context + calendar constraints and produces a structured annual plan.
// Does NOT generate lesson content — produces a framework (sequences + timeline).

import type { AnnualPlanningInput, AnnualPlanningOutput } from '../types/planning'
import type { SequenceBlock, AnnualPlanNode } from '../types/twin'
import type { NormalizedOutcome } from '../../curriculum/extraction/types'

let seqIndex = 0
function makeSeqId(): string { return `seq_${Date.now()}_${++seqIndex}` }
function makeNodeId(): string { return `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }

// ─── Grouping strategies ──────────────────────────────────────────────────────

function groupByPrerequisFirst(outcomes: NormalizedOutcome[], maxPerGroup: number): NormalizedOutcome[][] {
  // Simple grouping: general outcomes first, then their specifics
  const generals = outcomes.filter(o => !o.parentId)
  const byParent = new Map<string | undefined, NormalizedOutcome[]>()

  for (const o of outcomes) {
    const key = o.parentId
    const arr = byParent.get(key) ?? []
    arr.push(o)
    byParent.set(key, arr)
  }

  const groups: NormalizedOutcome[][] = []
  for (const general of generals) {
    const children = byParent.get(general.id) ?? []
    const all = [general, ...children]
    // Split into chunks of maxPerGroup
    for (let i = 0; i < all.length; i += maxPerGroup) {
      groups.push(all.slice(i, i + maxPerGroup))
    }
  }

  // Orphan specifics (no parent found)
  const orphans = outcomes.filter(o => o.parentId && !outcomes.find(g => g.id === o.parentId))
  if (orphans.length > 0) {
    for (let i = 0; i < orphans.length; i += maxPerGroup) {
      groups.push(orphans.slice(i, i + maxPerGroup))
    }
  }

  return groups.filter(g => g.length > 0)
}

// ─── Sequence builder ─────────────────────────────────────────────────────────

function buildSequence(
  outcomeGroup: NormalizedOutcome[],
  ordre: number,
  minutesPerOutcomeDefault: number,
): SequenceBlock {
  const generalOutcome = outcomeGroup.find(o => !o.parentId)
  const titre = generalOutcome?.code
    ? `Séquence ${generalOutcome.code} — ${generalOutcome.texte.substring(0, 50)}`
    : `Séquence ${ordre + 1}`

  const estimatedMinutes = outcomeGroup.reduce((sum, o) => {
    return sum + minutesPerOutcomeDefault
  }, 0)

  return {
    id: makeSeqId(),
    titre,
    description: outcomeGroup.map(o => o.code ?? o.texte.substring(0, 30)).join(', '),
    outcomeIds: outcomeGroup.map(o => o.id),
    dureeEstimeeHeures: Math.round(estimatedMinutes / 60 * 10) / 10,
    statut: 'planifiee',
    ordre,
    leconIds: [],
    quizIds: [],
    needsRecalculation: false,
  }
}

// ─── Calendar allocation ───────────────────────────────────────────────────────

function allocateToCalendar(
  sequences: SequenceBlock[],
  totalSemaines: number,
  minutesParSemaine: number,
  bufferPercent: number,
): AnnualPlanNode[] {
  const nodes: AnnualPlanNode[] = []
  let currentWeek = 1
  const effectiveMinutesParSemaine = minutesParSemaine * (1 - bufferPercent / 100)

  for (const seq of sequences) {
    const semainesNecessaires = Math.ceil((seq.dureeEstimeeHeures * 60) / effectiveMinutesParSemaine)
    const minutesThisWeek = Math.min(
      minutesParSemaine,
      seq.dureeEstimeeHeures * 60,
    )

    if (currentWeek > totalSemaines) {
      // Can't fit this sequence — mark as unallocated
      continue
    }

    nodes.push({
      id: makeNodeId(),
      sequenceId: seq.id,
      semaine: currentWeek,
      dureeMinutes: minutesThisWeek,
      confirme: false,
    })

    // Update the sequence dates
    seq.semaineDébut = currentWeek
    seq.semainesFin = Math.min(currentWeek + semainesNecessaires - 1, totalSemaines)
    currentWeek += semainesNecessaires
  }

  return nodes
}

// ─── Annual Planning Engine ───────────────────────────────────────────────────

export class AnnualPlanningEngine {
  plan(input: AnnualPlanningInput): AnnualPlanningOutput {
    const startMs = Date.now()
    const avertissements: string[] = []

    const {
      outcomes,
      pacingModel,
      totalSemaines,
      minutesParSemaine,
      maxOutcomesParSequence = 6,
      bufferPercent = 10,
    } = input

    if (outcomes.length === 0) {
      return {
        success: false,
        error: 'Aucun outcome dans le curriculum — impossible de planifier.',
        sequences: [],
        nodes: [],
        stats: { nbSequences: 0, nbOutcomesCouvers: 0, nbOutcomesTotal: 0, coveragePercent: 0, totalHeuresPlanifiees: 0, totalSemaines: 0, heuresDisponibles: 0, heuresBuffer: 0, pacingScore: 0 },
        avertissements: ['Curriculum vide'],
        sequencesNonPlanifiees: [],
        durationMs: Date.now() - startMs,
      }
    }

    // Exclude already-taught outcomes
    const outcomesDejaEnseignes = new Set(input.pedagogicalContext?.outcomesDejaEnseignes ?? [])
    const outcomesAPlanifier = outcomes.filter(o => !outcomesDejaEnseignes.has(o.id))

    if (outcomesDejaEnseignes.size > 0) {
      avertissements.push(`${outcomesDejaEnseignes.size} outcomes déjà enseignés exclus de la planification.`)
    }

    // Group outcomes into sequences
    const minutesPerOutcome = pacingModel
      ? pacingModel.totalHeuresEstimees * 60 / outcomes.length
      : minutesParSemaine * 2  // Default: 2 weeks per sequence

    const groups = groupByPrerequisFirst(outcomesAPlanifier, maxOutcomesParSequence)
    const sequences: SequenceBlock[] = groups.map((group, i) =>
      buildSequence(group, i, minutesPerOutcome / maxOutcomesParSequence)
    )

    // Allocate sequences to calendar weeks
    const nodes = allocateToCalendar(sequences, totalSemaines, minutesParSemaine, bufferPercent)

    // Stats
    const totalHeuresPlanifiees = sequences.reduce((sum, s) => sum + s.dureeEstimeeHeures, 0)
    const heuresDisponibles = (totalSemaines * minutesParSemaine) / 60
    const heuresBuffer = heuresDisponibles - totalHeuresPlanifiees
    const nbOutcomesCouvers = sequences.reduce((sum, s) => sum + s.outcomeIds.length, 0)
    const coveragePercent = outcomes.length > 0
      ? Math.round(((nbOutcomesCouvers + outcomesDejaEnseignes.size) / outcomes.length) * 100)
      : 0

    // Pacing score: how well does the planned time fit the available time?
    const pacingRatio = heuresDisponibles > 0 ? totalHeuresPlanifiees / heuresDisponibles : 1
    const pacingScore = Math.round(Math.max(0, 100 - Math.abs(pacingRatio - 0.85) * 200))

    if (heuresBuffer < 0) {
      avertissements.push(`Le plan nécessite ${Math.round(-heuresBuffer)}h de plus que le temps disponible.`)
    }
    if (coveragePercent < 100) {
      avertissements.push(`Couverture curriculaire : ${coveragePercent}%. Certains outcomes ne sont pas planifiés.`)
    }

    const sequencesNonPlanifiees = sequences
      .filter(s => s.semaineDébut === undefined)
      .map(s => s.id)

    return {
      success: true,
      sequences,
      nodes,
      stats: {
        nbSequences: sequences.length,
        nbOutcomesCouvers,
        nbOutcomesTotal: outcomes.length,
        coveragePercent,
        totalHeuresPlanifiees,
        totalSemaines,
        heuresDisponibles,
        heuresBuffer: Math.max(0, heuresBuffer),
        pacingScore,
      },
      avertissements,
      sequencesNonPlanifiees,
      durationMs: Date.now() - startMs,
    }
  }
}

export const annualPlanningEngine = new AnnualPlanningEngine()
