// SPIE-06 — Academic Time Builder
// Constructs the AcademicTime model from a school calendar and usage data.

import type {
  AcademicTime,
  AcademicTimeSummary,
  TimeBudget,
  WeekTime,
  MonthTime,
  TrimesterTime,
  TimeSlot,
} from '../types/academic-time'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBudget(
  totalMinutes: number,
  consommeMinutes: number,
  perduMinutes: number,
  tamponPercent = 0.10,
): TimeBudget {
  const tamponMinutes = Math.round(totalMinutes * tamponPercent)
  const restantMinutes = Math.max(0, totalMinutes - consommeMinutes - perduMinutes)
  return {
    totalMinutes,
    consommeMinutes,
    perduMinutes,
    restantMinutes,
    tamponMinutes,
    tauxConsommation: totalMinutes > 0 ? Math.round((consommeMinutes / totalMinutes) * 100) : 0,
    tauxPerte: totalMinutes > 0 ? Math.round((perduMinutes / totalMinutes) * 100) : 0,
  }
}

function getMonthLabel(mois: number, annee: number): string {
  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  return `${MOIS[mois - 1]} ${annee}`
}

// ─── Academic Time Builder ────────────────────────────────────────────────────

export interface AcademicTimeInput {
  classeId: string
  matiereId: string
  enseignantId: string
  academicYear: string
  minutesParSemaine: number
  totalSemaines: number
  tamponPercent?: number            // Default: 10%
  slots?: TimeSlot[]               // Actual teaching periods recorded
  eventMinutesPerdus?: number       // Minutes lost to events (absences, cancellations)
}

export class AcademicTimeBuilder {
  build(input: AcademicTimeInput): AcademicTime {
    const {
      minutesParSemaine,
      totalSemaines,
      tamponPercent = 0.10,
      slots = [],
      eventMinutesPerdus = 0,
    } = input

    const totalMinutes = minutesParSemaine * totalSemaines
    const consommeMinutes = slots
      .filter(s => s.statut === 'realise' || s.statut === 'prolonge')
      .reduce((sum, s) => sum + (s.dureeMinutesReelles ?? s.dureeMinutesPlanifiees), 0)
    const perduMinutes = eventMinutesPerdus + slots
      .filter(s => s.statut === 'annule')
      .reduce((sum, s) => sum + s.dureeMinutesPlanifiees, 0)

    const annueBudget = buildBudget(totalMinutes, consommeMinutes, perduMinutes, tamponPercent)

    // Planned pace: how many minutes should have been consumed by now?
    const today = new Date().toISOString().split('T')[0]
    const startYear = parseInt(input.academicYear.split('-')[0])
    const startDate = new Date(`${startYear}-09-01`)
    const daysPassed = Math.max(0, Math.floor((new Date(today).getTime() - startDate.getTime()) / 86400000))
    const weeksPassed = Math.floor(daysPassed / 7)
    const plannedConsomme = Math.min(totalMinutes, weeksPassed * minutesParSemaine)

    const avanceRetardMinutes = consommeMinutes - plannedConsomme
    const pacingRatio = plannedConsomme > 0 ? consommeMinutes / plannedConsomme : 1.0

    // Build trimestres (approximate thirds)
    const semainesParTrimestre = Math.ceil(totalSemaines / 3)
    const trimestres: TrimesterTime[] = [1, 2, 3].map(t => {
      const mins = minutesParSemaine * Math.min(semainesParTrimestre, totalSemaines - (t - 1) * semainesParTrimestre)
      return {
        trimestre: t,
        startDate: `${startYear}-${t === 1 ? '09' : t === 2 ? '11' : '03'}-01`,
        endDate: `${t === 3 ? startYear + 1 : startYear}-${t === 1 ? '10' : t === 2 ? '02' : '06'}-30`,
        label: `Trimestre ${t}`,
        budget: buildBudget(Math.max(0, mins), Math.round(consommeMinutes / 3), Math.round(perduMinutes / 3), tamponPercent),
      }
    })

    // Build months (September–June)
    const mois: MonthTime[] = []
    const monthSequence = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
    for (const m of monthSequence) {
      const annee = m >= 9 ? startYear : startYear + 1
      const weeksInMonth = m === 12 ? 1 : m === 7 || m === 8 ? 0 : 4
      const minsForMonth = minutesParSemaine * weeksInMonth
      mois.push({
        mois: m,
        annee,
        label: getMonthLabel(m, annee),
        budget: buildBudget(minsForMonth, 0, 0, tamponPercent),
      })
    }

    // Build weeks from slots
    const semaines: WeekTime[] = this.buildWeeks(slots, totalSemaines, minutesParSemaine, tamponPercent, startDate)

    // Find current period
    const todaySlots = slots.filter(s => s.date === today && s.statut === 'planifie')
    const periodeActuelle = todaySlots[0]

    return {
      id: `time_${Date.now()}`,
      classeId: input.classeId,
      matiereId: input.matiereId,
      enseignantId: input.enseignantId,
      academicYear: input.academicYear,
      minutesParSemaine,
      annee: annueBudget,
      trimestres,
      mois,
      semaines,
      periodeActuelle,
      avanceRetardMinutes,
      pacingRatio: Math.round(pacingRatio * 100) / 100,
      updatedAt: new Date().toISOString(),
    }
  }

  private buildWeeks(
    slots: TimeSlot[],
    totalSemaines: number,
    minutesParSemaine: number,
    tamponPercent: number,
    startDate: Date,
  ): WeekTime[] {
    const weeks: WeekTime[] = []

    for (let w = 1; w <= totalSemaines; w++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + (w - 1) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 4)

      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]

      const weekSlots = slots.filter(s => s.date >= startStr && s.date <= endStr)
      const consomme = weekSlots
        .filter(s => s.statut === 'realise' || s.statut === 'prolonge')
        .reduce((sum, s) => sum + (s.dureeMinutesReelles ?? s.dureeMinutesPlanifiees), 0)
      const perdu = weekSlots
        .filter(s => s.statut === 'annule')
        .reduce((sum, s) => sum + s.dureeMinutesPlanifiees, 0)

      weeks.push({
        weekNumber: w,
        startDate: startStr,
        endDate: endStr,
        budget: buildBudget(minutesParSemaine, consomme, perdu, tamponPercent),
        slots: weekSlots,
      })
    }

    return weeks
  }

  summarize(time: AcademicTime): AcademicTimeSummary {
    const minutesParSemaine = time.minutesParSemaine
    const avanceRetardSemaines = minutesParSemaine > 0
      ? Math.round((time.avanceRetardMinutes / minutesParSemaine) * 10) / 10
      : 0

    return {
      classeId: time.classeId,
      matiereId: time.matiereId,
      academicYear: time.academicYear,
      totalMinutesBudget: time.annee.totalMinutes,
      minutesConsommees: time.annee.consommeMinutes,
      minutesPerdues: time.annee.perduMinutes,
      minutesRestantes: time.annee.restantMinutes,
      minutesTampon: time.annee.tamponMinutes,
      tauxConsommation: time.annee.tauxConsommation,
      tauxPerte: time.annee.tauxPerte,
      avanceRetardMinutes: time.avanceRetardMinutes,
      avanceRetardSemaines,
    }
  }
}

export const academicTimeBuilder = new AcademicTimeBuilder()
