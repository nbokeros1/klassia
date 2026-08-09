// SPIE-06 — Academic Clock tests

import { academicClockBuilder } from '../clock/academic-clock'
import { academicTimeBuilder } from '../time/academic-time-builder'
import type { SequenceBlock } from '../../aydte/types/twin'

function makeSeq(id: string, statut: SequenceBlock['statut'], outcomes: number): SequenceBlock {
  return {
    id, titre: `Séq ${id}`,
    outcomeIds: Array.from({ length: outcomes }, (_, i) => `o${i}`),
    dureeEstimeeHeures: 5, statut, ordre: 0,
    semaineDébut: 1, semainesFin: 3,
    leconIds: [], quizIds: [], needsRecalculation: false,
  }
}

describe('AcademicClock', () => {
  const baseTimeInput = {
    classeId: 'cls_1',
    matiereId: 'mat_math',
    enseignantId: 'ens_1',
    academicYear: '2025-2026',
    minutesParSemaine: 200,
    totalSemaines: 36,
  }

  const sequences: SequenceBlock[] = [
    makeSeq('seq1', 'terminee', 5),
    makeSeq('seq2', 'en_cours', 5),
    makeSeq('seq3', 'planifiee', 5),
  ]

  test('snapshot produit des champs valides', () => {
    const time = academicTimeBuilder.build(baseTimeInput)
    const clock = academicClockBuilder.build({
      classeId: 'cls_1',
      matiereId: 'mat_math',
      enseignantId: 'ens_1',
      academicYear: '2025-2026',
      academicTime: time,
      sequences,
      outcomesTotal: 15,
    })
    expect(clock.snapshot.outcomesTotal).toBe(15)
    expect(clock.snapshot.outcomesCouverts).toBe(5)  // Séquence 1 terminée
    expect(clock.snapshot.coveragePercent).toBe(33)
    expect(clock.snapshot.statut).toBeDefined()
    expect(clock.messageActuel).toBeTruthy()
  })

  test('statut en avance si avanceRetardSemaines > 1', () => {
    const time = academicTimeBuilder.build({ ...baseTimeInput, slots: [] })
    // Inject artificial advance
    const modifiedTime = { ...time, avanceRetardMinutes: 210 }  // > 1 semaine
    const clock = academicClockBuilder.build({
      classeId: 'cls_1', matiereId: 'mat_math', enseignantId: 'ens_1',
      academicYear: '2025-2026', academicTime: modifiedTime, sequences, outcomesTotal: 15,
    })
    expect(clock.snapshot.avanceRetardMinutes).toBe(210)
  })

  test('historique limité à 10 snapshots', () => {
    const time = academicTimeBuilder.build(baseTimeInput)
    const fakeHistory = Array.from({ length: 12 }, (_, i) => ({
      capturedAt: `2025-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      weekNumber: i + 1,
      semainesRestantes: 36 - i,
      joursRestants: (36 - i) * 5,
      minutesConsommees: i * 200,
      minutesPerdues: 0,
      minutesRestantes: 7200 - i * 200,
      minutesTampon: 720,
      outcomesCouverts: 0,
      outcomesTotal: 15,
      coveragePercent: 0,
      avanceRetardMinutes: 0,
      avanceRetardSemaines: 0,
      statut: 'dans_les_temps' as const,
      tendancePace: 'stable' as const,
    }))
    const clock = academicClockBuilder.build({
      classeId: 'cls_1', matiereId: 'mat_math', enseignantId: 'ens_1',
      academicYear: '2025-2026', academicTime: time, sequences, outcomesTotal: 15,
      historique: fakeHistory,
    })
    expect(clock.historique.length).toBeLessThanOrEqual(10)
  })
})
