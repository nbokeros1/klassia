// SPIE-06 — Academic Clock
// Tells us where the class really is at any given moment.
// Compares reality (time consumed, outcomes covered) vs. the plan.

import type { AcademicClock, ClockSnapshot, ClockStatus } from '../types/clock'
import type { AcademicTime } from '../types/academic-time'
import type { SequenceBlock } from '../../aydte/types/twin'

let clockCounter = 0

// ─── Clock status from delay ──────────────────────────────────────────────────

function clockStatus(avanceRetardSemaines: number): ClockStatus {
  if (avanceRetardSemaines > 1) return 'en_avance'
  if (avanceRetardSemaines >= -1) return 'dans_les_temps'
  if (avanceRetardSemaines >= -2) return 'leger_retard'
  if (avanceRetardSemaines >= -4) return 'retard_modere'
  return 'retard_critique'
}

// ─── Trend from snapshots ─────────────────────────────────────────────────────

function computeTrend(
  historique: ClockSnapshot[],
  current: ClockSnapshot,
): ClockSnapshot['tendancePace'] {
  if (historique.length < 2) return 'insuffisant_donnees'
  const recent = historique.slice(-3)
  const avgPrev = recent.reduce((sum, s) => sum + s.avanceRetardSemaines, 0) / recent.length
  if (current.avanceRetardSemaines > avgPrev + 0.3) return 'amelioration'
  if (current.avanceRetardSemaines < avgPrev - 0.3) return 'degradation'
  return 'stable'
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function buildMessage(snapshot: ClockSnapshot): string {
  const { statut, semainesRestantes, coveragePercent } = snapshot
  switch (statut) {
    case 'en_avance':
      return `Vous êtes en avance de ${snapshot.avanceRetardSemaines.toFixed(1)} semaine(s). Profitez-en pour approfondir les contenus clés.`
    case 'dans_les_temps':
      return `Vous êtes dans les temps. Couverture actuelle : ${coveragePercent}% — ${semainesRestantes} semaine(s) restantes.`
    case 'leger_retard':
      return `Léger retard de ${Math.abs(snapshot.avanceRetardSemaines).toFixed(1)} semaine(s). Ajustez légèrement le rythme des prochaines séquences.`
    case 'retard_modere':
      return `Retard modéré : ${Math.abs(snapshot.avanceRetardSemaines).toFixed(1)} semaine(s). Consultez les recommandations pour rattraper le calendrier.`
    case 'retard_critique':
      return `Retard critique : ${Math.abs(snapshot.avanceRetardSemaines).toFixed(1)} semaine(s). Révision urgente du plan pédagogique requise.`
    default:
      return `Couverture : ${coveragePercent}% — ${semainesRestantes} semaine(s) restantes.`
  }
}

// ─── Academic Clock builder ───────────────────────────────────────────────────

export class AcademicClockBuilder {
  // Build or refresh the academic clock
  build(params: {
    classeId: string
    matiereId: string
    enseignantId: string
    academicYear: string
    academicTime: AcademicTime
    sequences: SequenceBlock[]
    outcomesTotal: number
    historique?: ClockSnapshot[]
  }): AcademicClock {
    const {
      academicTime,
      sequences,
      outcomesTotal,
      historique = [],
    } = params

    const today = new Date().toISOString().split('T')[0]

    // Sequences in progress or completed
    const seqEnCours = sequences.find(s => s.statut === 'en_cours')
    const outcomesCouverts = sequences
      .filter(s => s.statut === 'terminee')
      .reduce((sum, s) => sum + s.outcomeIds.length, 0)
    const coveragePercent = outcomesTotal > 0
      ? Math.round((outcomesCouverts / outcomesTotal) * 100)
      : 0

    // Advance/delay in weeks
    const avanceRetardMinutes = academicTime.avanceRetardMinutes
    const avanceRetardSemaines = academicTime.minutesParSemaine > 0
      ? Math.round((avanceRetardMinutes / academicTime.minutesParSemaine) * 10) / 10
      : 0

    // Remaining time
    const currentWeek = this.computeCurrentWeek(academicTime)
    const semainesRestantes = Math.max(0, academicTime.semaines.length - currentWeek + 1)
    const minutesRestantes = academicTime.annee.restantMinutes

    const statut = clockStatus(avanceRetardSemaines)

    const snapshot: ClockSnapshot = {
      capturedAt: new Date().toISOString(),
      weekNumber: currentWeek,
      semainesRestantes,
      joursRestants: semainesRestantes * 5,
      minutesConsommees: academicTime.annee.consommeMinutes,
      minutesPerdues: academicTime.annee.perduMinutes,
      minutesRestantes,
      minutesTampon: academicTime.annee.tamponMinutes,
      sequenceEnCours: seqEnCours?.id,
      sequenceEnCoursTitre: seqEnCours?.titre,
      outcomesCouverts,
      outcomesTotal,
      coveragePercent,
      avanceRetardMinutes,
      avanceRetardSemaines,
      statut,
      tendancePace: computeTrend(historique, {
        capturedAt: '', weekNumber: 0, semainesRestantes: 0, joursRestants: 0,
        minutesConsommees: 0, minutesPerdues: 0, minutesRestantes: 0, minutesTampon: 0,
        outcomesCouverts: 0, outcomesTotal: 0, coveragePercent: 0,
        avanceRetardMinutes, avanceRetardSemaines, statut,
        tendancePace: 'insuffisant_donnees',
      }),
    }

    const alertes = this.buildAlertes(snapshot)
    const messageActuel = buildMessage(snapshot)

    return {
      id: `clock_${++clockCounter}`,
      classeId: params.classeId,
      matiereId: params.matiereId,
      enseignantId: params.enseignantId,
      academicYear: params.academicYear,
      snapshot,
      historique: [...historique, snapshot].slice(-10),  // Keep last 10
      alertes,
      messageActuel,
    }
  }

  private computeCurrentWeek(time: AcademicTime): number {
    const today = new Date().toISOString().split('T')[0]
    const found = time.semaines.find(s => s.startDate <= today && s.endDate >= today)
    return found?.weekNumber ?? time.semaines.length
  }

  private buildAlertes(snapshot: ClockSnapshot): string[] {
    const alertes: string[] = []
    if (snapshot.statut === 'retard_critique') alertes.push('⚠️ Retard critique — révision du plan urgente')
    if (snapshot.coveragePercent < 50 && snapshot.semainesRestantes < 10) alertes.push('⚠️ Moins de 50% du curriculum couvert avec moins de 10 semaines restantes')
    if (snapshot.minutesPerdues > snapshot.minutesConsommees * 0.3) alertes.push('⚠️ Plus de 30% du temps enseigné a été perdu')
    if (snapshot.semainesRestantes < 3) alertes.push('⚠️ Fin d\'année dans moins de 3 semaines')
    return alertes
  }
}

export const academicClockBuilder = new AcademicClockBuilder()
