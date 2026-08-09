// SPIE-06 — Recalculation Engine tests

import { recalculationEngine } from '../recalculation/recalculation-engine'
import type { SequenceBlock } from '../../aydte/types/twin'

function makeSeq(id: string, titre: string, outcomeIds: string[], dureeH: number, debut: number, fin: number, statut: SequenceBlock['statut'] = 'planifiee'): SequenceBlock {
  return {
    id,
    titre,
    outcomeIds,
    dureeEstimeeHeures: dureeH,
    statut,
    ordre: parseInt(id.replace('seq', '')) - 1,
    semaineDébut: debut,
    semainesFin: fin,
    leconIds: [],
    quizIds: [],
    needsRecalculation: false,
  }
}

describe('RecalculationEngine', () => {
  const sequences: SequenceBlock[] = [
    makeSeq('seq1', 'Séquence 1', ['o1', 'o2', 'o3'], 8, 1, 4, 'en_cours'),
    makeSeq('seq2', 'Séquence 2', ['o4', 'o5'], 6, 5, 7, 'planifiee'),
    makeSeq('seq3', 'Séquence 3', ['o6', 'o7', 'o8'], 10, 8, 12, 'planifiee'),
  ]

  test('pas de cascade si impact < 30 minutes', () => {
    const result = recalculationEngine.recalculate(
      { type: 'lecon_prolongee', minutesImpactees: 15, date: '2025-10-01', cascadeToAnnualPlan: false },
      sequences, 36, 200, 8, 80,
    )
    expect(result.sequencesDecalees).toHaveLength(0)
    expect(result.nouveauCoveragePercent).toBe(80)
  })

  test('décale les séquences en cascade', () => {
    const result = recalculationEngine.recalculate(
      { type: 'lecon_prolongee', elementId: 'seq1', minutesImpactees: 200, date: '2025-10-01', cascadeToAnnualPlan: true },
      sequences, 36, 200, 8, 80,
    )
    expect(result.sequencesDecalees.length).toBeGreaterThan(0)
    const decalage = result.sequencesDecalees[0]
    expect(decalage.decalageSemaines).toBeGreaterThan(0)
    expect(decalage.nouvelleSemaineDebut).toBeGreaterThan(decalage.ancienneSemaineDebut!)
  })

  test('détecte les séquences hors calendrier', () => {
    const tightSeqs: SequenceBlock[] = [
      makeSeq('seq1', 'Séq 1', ['o1'], 5, 33, 34, 'en_cours'),
      makeSeq('seq2', 'Séq 2', ['o2', 'o3'], 6, 35, 36, 'planifiee'),
    ]
    const result = recalculationEngine.recalculate(
      { type: 'cours_annule', minutesImpactees: 400, date: '2025-11-01', cascadeToAnnualPlan: true },
      tightSeqs, 36, 200, 2, 0,
    )
    expect(result.nbSequencesHorsCalendrier).toBeGreaterThan(0)
    expect(result.nouveauCoveragePercent).toBeLessThan(100)
  })

  test('requiresCascade détecte correctement', () => {
    expect(recalculationEngine.requiresCascade({ type: 'cours_annule', minutesImpactees: 60, date: '', cascadeToAnnualPlan: true })).toBe(true)
    expect(recalculationEngine.requiresCascade({ type: 'cours_annule', minutesImpactees: 10, date: '', cascadeToAnnualPlan: true })).toBe(false)
  })
})
