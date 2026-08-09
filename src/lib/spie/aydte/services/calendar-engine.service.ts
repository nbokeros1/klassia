// SPIE-04 — Calendar Engine Service
// Wraps CalendarEngine with business logic: school year params, province defaults.

import type { SchoolCalendar, CalendarStats } from '../types/calendar'
import { calendarEngine } from '../calendar/calendar-engine'

// Approximate school-year dates by province
const PROVINCE_YEAR_DEFAULTS: Record<string, { startMonth: number; startDay: number; endMonth: number; endDay: number }> = {
  ON: { startMonth: 9, startDay: 5, endMonth: 6, endDay: 26 },
  QC: { startMonth: 8, startDay: 28, endMonth: 6, endDay: 20 },
  AB: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
  BC: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
  SK: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
  MB: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
  NB: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
  NS: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
}

export interface CreateCalendarParams {
  classeId?: string
  province?: string
  academicYear: string             // '2025-2026'
  minutesParSemaine: number
  joursConge?: string[]
  // Override dates (ISO format)
  startDate?: string
  endDate?: string
}

export class CalendarEngineService {
  create(params: CreateCalendarParams): SchoolCalendar {
    const yearStart = parseInt(params.academicYear.split('-')[0])
    const yearEnd = yearStart + 1

    let startDate: string
    let endDate: string

    if (params.startDate && params.endDate) {
      startDate = params.startDate
      endDate = params.endDate
    } else {
      const defaults = params.province ? PROVINCE_YEAR_DEFAULTS[params.province] : null
      if (defaults) {
        const sm = String(defaults.startMonth).padStart(2, '0')
        const sd = String(defaults.startDay).padStart(2, '0')
        const em = String(defaults.endMonth).padStart(2, '0')
        const ed = String(defaults.endDay).padStart(2, '0')
        startDate = `${yearStart}-${sm}-${sd}`
        endDate = `${yearEnd}-${em}-${ed}`
      } else {
        // Generic fallback: September to June
        startDate = `${yearStart}-09-01`
        endDate = `${yearEnd}-06-30`
      }
    }

    return calendarEngine.buildFromParams({
      classeId: params.classeId,
      province: params.province,
      academicYear: params.academicYear,
      startDate,
      endDate,
      minutesPerWeek: params.minutesParSemaine,
      joursConge: params.joursConge ?? [],
    })
  }

  getStats(calendar: SchoolCalendar): CalendarStats {
    return calendarEngine.calculateStats(calendar)
  }

  getAvailableMinutes(calendar: SchoolCalendar, fromWeek: number, toWeek: number): number {
    return calendarEngine.getMinutesForRange(calendar, fromWeek, toWeek)
  }

  allocateSequence(calendar: SchoolCalendar, sequenceId: string, fromWeek: number, toWeek: number): SchoolCalendar {
    return calendarEngine.allocateSequence(calendar, sequenceId, fromWeek, toWeek)
  }
}

export const calendarEngineService = new CalendarEngineService()
