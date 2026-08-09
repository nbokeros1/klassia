// SPIE-06 — Time Recommendation Engine tests

import { timeRecommendationEngine } from '../recommendations/time-recommendation-engine'
import { timeImpactEngine } from '../impact/time-impact-engine'
import { pteCalendarEngine } from '../calendar/pte-calendar-engine'
import type { SequenceBlock } from '../../aydte/types/twin'

function makeSeq(id: string, h: number, nb: number): SequenceBlock {
  return {
    id, titre: `Séq ${id}`, outcomeIds: Array.from({ length: nb }, (_, i) => `o${i}`),
    dureeEstimeeHeures: h, statut: 'planifiee', ordre: 0,
    leconIds: [], quizIds: [], needsRecalculation: false,
  }
}

describe('TimeRecommendationEngine', () => {
  const minutesParSemaine = 200

  test('toutes les recommandations ont autoApplicable=false', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01', dureeMinutesPerdues: 300 })
    const impact = timeImpactEngine.measureBatch([event], minutesParSemaine)
    const recs = timeRecommendationEngine.generate(impact, [makeSeq('s1', 8, 5), makeSeq('s2', 3, 2)], minutesParSemaine)
    for (const r of recs) {
      expect(r.autoApplicable).toBe(false)
    }
  })

  test('impact sévère génère recommandation supprimer en priorité critique', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01', dureeMinutesPerdues: 400 })
    const impact = timeImpactEngine.measureBatch([event], minutesParSemaine)
    const recs = timeRecommendationEngine.generate(impact, [makeSeq('s1', 10, 5), makeSeq('s2', 8, 3)], minutesParSemaine)
    const topRec = recs[0]
    expect(['supprimer', 'recuperer', 'reduire']).toContain(topRec.type)
    expect(topRec.explication).toBeTruthy()
    expect(topRec.commentApplique).toBeTruthy()
  })

  test('impact faible génère recommandation étaler', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'retard_debut', date: '2025-10-01', dureeMinutesPerdues: 10 })
    const impact = timeImpactEngine.measureEvent(event, minutesParSemaine)
    const recs = timeRecommendationEngine.generate(impact, [makeSeq('s1', 5, 3)], minutesParSemaine)
    const hasEtaler = recs.some(r => r.type === 'etaler')
    expect(hasEtaler).toBe(true)
  })

  test('deux séquences courtes → recommandation fusionner', () => {
    const seqs = [makeSeq('s1', 3, 2), makeSeq('s2', 2, 1)]
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01' })
    const impact = timeImpactEngine.measureEvent(event, minutesParSemaine)
    const recs = timeRecommendationEngine.generate(impact, seqs, minutesParSemaine)
    const hasFusionner = recs.some(r => r.type === 'fusionner')
    expect(hasFusionner).toBe(true)
  })

  test('perte >= 60 min → recommandation récupérer', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'absence_enseignant', date: '2025-10-01' })
    const impact = timeImpactEngine.measureEvent(event, minutesParSemaine)
    const recs = timeRecommendationEngine.generate(impact, [makeSeq('s1', 5, 3)], minutesParSemaine)
    const hasRecuperer = recs.some(r => r.type === 'recuperer')
    expect(hasRecuperer).toBe(true)
  })
})
