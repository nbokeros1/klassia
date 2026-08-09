// SPIE-06 — Academic Time Builder tests

import { academicTimeBuilder } from '../time/academic-time-builder'
import type { TimeSlot } from '../types/academic-time'

function makeSlot(id: string, date: string, planifie: number, statut: TimeSlot['statut'], reelle?: number): TimeSlot {
  return {
    id,
    date,
    dureeMinutesPlanifiees: planifie,
    dureeMinutesReelles: reelle,
    statut,
    minutesPerdues: statut === 'annule' ? planifie : 0,
    minutesGagnees: statut === 'prolonge' && reelle ? Math.max(0, reelle - planifie) : 0,
  }
}

describe('AcademicTimeBuilder', () => {
  const baseInput = {
    classeId: 'cls_1',
    matiereId: 'mat_math',
    enseignantId: 'ens_1',
    academicYear: '2025-2026',
    minutesParSemaine: 200,
    totalSemaines: 36,
  }

  test('budget annuel correct — sans événements', () => {
    const time = academicTimeBuilder.build(baseInput)
    expect(time.annee.totalMinutes).toBe(200 * 36)  // 7200
    expect(time.annee.consommeMinutes).toBe(0)
    expect(time.annee.perduMinutes).toBe(0)
    expect(time.annee.restantMinutes).toBe(200 * 36)
  })

  test('temps consommé calculé depuis les slots', () => {
    const slots: TimeSlot[] = [
      makeSlot('s1', '2025-09-08', 60, 'realise', 60),
      makeSlot('s2', '2025-09-09', 60, 'realise', 75),  // prolongé → 75 real
      makeSlot('s3', '2025-09-10', 60, 'annule'),
    ]
    const time = academicTimeBuilder.build({ ...baseInput, slots })
    expect(time.annee.consommeMinutes).toBe(60 + 75)   // 135
    expect(time.annee.perduMinutes).toBe(60)             // annulé
  })

  test('temps perdu des événements ajouté', () => {
    const time = academicTimeBuilder.build({ ...baseInput, eventMinutesPerdus: 90 })
    expect(time.annee.perduMinutes).toBe(90)
  })

  test('taux de consommation calculé', () => {
    const slots: TimeSlot[] = [
      makeSlot('s1', '2025-09-08', 60, 'realise', 60),
    ]
    const time = academicTimeBuilder.build({ ...baseInput, slots })
    const taux = Math.round((60 / (200 * 36)) * 100)
    expect(time.annee.tauxConsommation).toBe(taux)
  })

  test('semaines générées correctement', () => {
    const time = academicTimeBuilder.build(baseInput)
    expect(time.semaines.length).toBe(36)
    expect(time.semaines[0].weekNumber).toBe(1)
  })

  test('summarize produit un résumé correct', () => {
    const time = academicTimeBuilder.build(baseInput)
    const summary = academicTimeBuilder.summarize(time)
    expect(summary.classeId).toBe('cls_1')
    expect(summary.totalMinutesBudget).toBe(7200)
    expect(summary.avanceRetardSemaines).toBeDefined()
  })
})
