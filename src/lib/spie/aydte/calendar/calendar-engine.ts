// SPIE-04 — Calendar Engine
// Manages the school calendar: weeks, sessions, breaks.
// Province-agnostic architecture — provincial calendars are data, not code.

import type {
  SchoolCalendar,
  CalendarWeek,
  CalendarDay,
  TeachingSession,
  CalendarStats,
} from '../types/calendar'

// ─── Calendar builder ──────────────────────────────────────────────────────────

export class CalendarEngine {
  // Build a minimal school calendar from basic parameters
  buildFromParams(params: {
    classeId?: string
    province?: string
    academicYear: string
    startDate: string           // YYYY-MM-DD
    endDate: string
    minutesPerWeek: number      // For this subject
    joursConge?: string[]       // ISO dates to skip
  }): SchoolCalendar {
    const { startDate, endDate, minutesPerWeek, joursConge = [] } = params
    const congeSet = new Set(joursConge)

    const semaines: CalendarWeek[] = []
    let weekNumber = 1

    let current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      // Find Monday of this week
      const monday = new Date(current)
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

      const friday = new Date(monday)
      friday.setDate(friday.getDate() + 4)

      const days: CalendarDay[] = []
      let weeklyMinutes = 0

      for (let d = 0; d < 5; d++) {
        const day = new Date(monday)
        day.setDate(monday.getDate() + d)
        const dateStr = day.toISOString().split('T')[0]

        if (day < new Date(startDate) || day > end || congeSet.has(dateStr)) {
          continue
        }

        const dayType = congeSet.has(dateStr) ? 'conge' : 'cours'
        const sessionMinutes = dayType === 'cours' ? Math.round(minutesPerWeek / 5) : 0

        const sessions: TeachingSession[] = dayType === 'cours' ? [{
          id: `session_${dateStr}`,
          date: dateStr,
          dureeMinutes: sessionMinutes,
          confirme: false,
        }] : []

        weeklyMinutes += sessionMinutes

        days.push({
          date: dateStr,
          type: dayType,
          sessions,
        })
      }

      if (days.length > 0) {
        semaines.push({
          weekNumber,
          startDate: monday.toISOString().split('T')[0],
          endDate: friday.toISOString().split('T')[0],
          days,
          minutesDisponibles: weeklyMinutes,
          actif: weeklyMinutes > 0,
        })
        weekNumber++
      }

      // Move to next week
      current = new Date(monday)
      current.setDate(current.getDate() + 7)
    }

    return {
      id: `cal_${Date.now()}`,
      classeId: params.classeId,
      province: params.province,
      academicYear: params.academicYear,
      startDate: params.startDate,
      endDate: params.endDate,
      termes: [],
      semaines,
      joursConge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  // Calculate stats for a calendar (optionally from a specific week)
  calculateStats(calendar: SchoolCalendar, fromWeek = 1): CalendarStats {
    const today = new Date().toISOString().split('T')[0]

    const activeSemaines = calendar.semaines.filter(s => s.actif)
    const restantes = activeSemaines.filter(s => s.startDate >= today)

    const totalMinutes = activeSemaines.reduce((sum, s) => sum + s.minutesDisponibles, 0)
    const minutesRestantes = restantes.reduce((sum, s) => sum + s.minutesDisponibles, 0)

    const allSessions = activeSemaines.flatMap(s => s.days.flatMap(d => d.sessions))

    const prochaineWeek = restantes[0]?.weekNumber

    return {
      totalSemaines: activeSemaines.length,
      semainesActives: activeSemaines.length,
      totalMinutesDisponibles: totalMinutes,
      minutesParSemaineEnMoyenne: activeSemaines.length > 0
        ? Math.round(totalMinutes / activeSemaines.length)
        : 0,
      sessionsTotales: allSessions.length,
      prochaineSemaine: prochaineWeek,
      semainesRestantes: restantes.length,
      minutesRestantes,
    }
  }

  // Get available minutes for a specific week range
  getMinutesForRange(calendar: SchoolCalendar, fromWeek: number, toWeek: number): number {
    return calendar.semaines
      .filter(s => s.weekNumber >= fromWeek && s.weekNumber <= toWeek && s.actif)
      .reduce((sum, s) => sum + s.minutesDisponibles, 0)
  }

  // Allocate a sequence to a week range
  allocateSequence(
    calendar: SchoolCalendar,
    sequenceId: string,
    fromWeek: number,
    toWeek: number,
  ): SchoolCalendar {
    const updatedSemaines = calendar.semaines.map(semaine => {
      if (semaine.weekNumber < fromWeek || semaine.weekNumber > toWeek) return semaine
      const updatedDays = semaine.days.map(day => ({
        ...day,
        sessions: day.sessions.map(session =>
          session.sequenceId ? session : { ...session, sequenceId }
        ),
      }))
      return { ...semaine, days: updatedDays }
    })
    return { ...calendar, semaines: updatedSemaines, updatedAt: new Date().toISOString() }
  }
}

export const calendarEngine = new CalendarEngine()
