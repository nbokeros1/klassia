// SPIE-06 — PTE Calendar Engine tests

import { pteCalendarEngine } from '../calendar/pte-calendar-engine'

describe('PTECalendarEngine', () => {
  test('crée un événement absence avec minutes perdues correctes', () => {
    const event = pteCalendarEngine.createEvent({
      classeId: 'cls_1',
      type: 'absence_enseignant',
      date: '2025-10-15',
    })
    expect(event.id).toMatch(/pte_ev_/)
    expect(event.dureeMinutesPerdues).toBe(60)
    expect(event.dureeMinutesGagnees).toBe(0)
    expect(event.source).toBe('runtime')
    expect(event.impacteLesPrecedentes).toBe(true)
  })

  test('crée un cours prolongé — gains', () => {
    const event = pteCalendarEngine.createEvent({
      classeId: 'cls_1',
      type: 'cours_prolonge',
      date: '2025-10-16',
      dureeMinutesGagnees: 30,
    })
    expect(event.dureeMinutesPerdues).toBe(0)
    expect(event.dureeMinutesGagnees).toBe(30)
  })

  test('computeDelta totalise les pertes et gains', () => {
    const events = [
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01' }),
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-02' }),
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_prolonge', date: '2025-10-03', dureeMinutesGagnees: 30 }),
    ]
    const delta = pteCalendarEngine.computeDelta(events, '2025-10-01', '2025-10-05')
    expect(delta.minutesPerdues).toBe(120)
    expect(delta.minutesGagnees).toBe(30)
    expect(delta.netMinutes).toBe(-90)
  })

  test('totalMinutesPerdus agrège les pertes', () => {
    const events = [
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'cours_annule', date: '2025-10-01' }),
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'retard_debut', date: '2025-10-02' }),
    ]
    const total = pteCalendarEngine.totalMinutesPerdus(events)
    expect(total).toBe(60 + 15)
  })

  test('getImpactingEvents filtre les événements qui cascadent', () => {
    const events = [
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'absence_enseignant', date: '2025-10-01' }),  // >= 60 min
      pteCalendarEngine.createEvent({ classeId: 'c', type: 'retard_debut', date: '2025-10-02' }),         // 15 min
    ]
    const impacting = pteCalendarEngine.getImpactingEvents(events)
    expect(impacting.length).toBe(1)
    expect(impacting[0].type).toBe('absence_enseignant')
  })
})
