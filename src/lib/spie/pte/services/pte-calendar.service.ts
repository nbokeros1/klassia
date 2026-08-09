// SPIE-06 — PTE Calendar Service

import type { TimeEvent, PTEEventType, CalendarDelta } from '../types/calendar-event'
import { pteCalendarEngine } from '../calendar/pte-calendar-engine'

export class PTECalendarService {
  recordEvent(params: {
    classeId: string
    matiereId?: string
    type: PTEEventType
    date: string
    dureeMinutesPerdues?: number
    dureeMinutesGagnees?: number
    titre?: string
    description?: string
    source?: 'planifie' | 'runtime'
  }): TimeEvent {
    return pteCalendarEngine.createEvent(params)
  }

  computeDelta(events: TimeEvent[], from: string, to: string): CalendarDelta {
    return pteCalendarEngine.computeDelta(events, from, to)
  }

  totalMinutesPerdus(events: TimeEvent[]): number {
    return pteCalendarEngine.totalMinutesPerdus(events)
  }

  getImpactingEvents(events: TimeEvent[]): TimeEvent[] {
    return pteCalendarEngine.getImpactingEvents(events)
  }

  // Filter events by type
  filterByType(events: TimeEvent[], type: PTEEventType): TimeEvent[] {
    return events.filter(e => e.type === type)
  }

  // Upcoming planned events in the next N weeks
  upcoming(events: TimeEvent[], weeks = 4): TimeEvent[] {
    const today = new Date()
    const future = new Date(today)
    future.setDate(today.getDate() + weeks * 7)
    const todayStr = today.toISOString().split('T')[0]
    const futureStr = future.toISOString().split('T')[0]
    return events.filter(e => e.source === 'planifie' && e.date >= todayStr && e.date <= futureStr)
  }
}

export const pteCalendarService = new PTECalendarService()
