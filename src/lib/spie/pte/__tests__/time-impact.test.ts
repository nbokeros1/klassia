// SPIE-06 — Time Impact Engine tests

import { timeImpactEngine } from '../impact/time-impact-engine'
import { pteCalendarEngine } from '../calendar/pte-calendar-engine'

describe('TimeImpactEngine', () => {
  const minutesParSemaine = 200

  test('absence 60 min → impact faible', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'absence_enseignant', date: '2025-10-15' })
    const impact = timeImpactEngine.measureEvent(event, minutesParSemaine)
    expect(impact.minutesPerdues).toBe(60)
    expect(impact.severity).toBe('faible')
    expect(impact.type).toBe('absence_enseignant')
    expect(impact.messageEnseignant).toBeTruthy()
  })

  test('retard cumulé 400 min → sévère', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01', dureeMinutesPerdues: 60 })
    const impact = timeImpactEngine.measureEvent(event, minutesParSemaine, 340)  // cumul = 400
    expect(impact.severity).toBe('severe')
  })

  test('measureBatch cumule les pertes', () => {
    const events = [
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01' }),
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'absence_enseignant', date: '2025-10-08' }),
    ]
    const impact = timeImpactEngine.measureBatch(events, minutesParSemaine)
    expect(impact.minutesPerdues).toBe(120)
    expect(impact.semainesDecalageCumul).toBeCloseTo(120 / minutesParSemaine, 1)
  })

  test('lecon prolongée 30 min → faible', () => {
    const impact = timeImpactEngine.measureLeconProlongee(30, minutesParSemaine, 'seq_1')
    expect(impact.type).toBe('lecon_prolongee')
    expect(impact.minutesPerdues).toBe(30)
    expect(impact.severity).toBe('faible')
  })

  test('critique si > 360 minutes cumulées', () => {
    const event = pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01', dureeMinutesPerdues: 60 })
    const impact = timeImpactEngine.measureEvent(event, minutesParSemaine, 310)  // cumul = 370
    expect(impact.severity).toBe('critique')
  })
})
