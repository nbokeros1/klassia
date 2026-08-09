// SPIE-06 — Time Impact Service

import type { TimeImpact } from '../types/impact'
import type { TimeEvent } from '../types/calendar-event'
import { timeImpactEngine } from '../impact/time-impact-engine'

export class TimeImpactService {
  measureEvent(event: TimeEvent, minutesParSemaine: number, cumulActuel = 0, outcomesTotal = 0): TimeImpact {
    return timeImpactEngine.measureEvent(event, minutesParSemaine, cumulActuel, outcomesTotal)
  }

  measureBatch(events: TimeEvent[], minutesParSemaine: number, outcomesTotal = 0): TimeImpact {
    return timeImpactEngine.measureBatch(events, minutesParSemaine, outcomesTotal)
  }

  measureLeconProlongee(extraMinutes: number, minutesParSemaine: number, sequenceId: string, cumulActuel = 0): TimeImpact {
    return timeImpactEngine.measureLeconProlongee(extraMinutes, minutesParSemaine, sequenceId, cumulActuel)
  }

  isCritical(impact: TimeImpact): boolean {
    return impact.severity === 'critique' || impact.severity === 'severe'
  }

  totalMinutesPerdus(impacts: TimeImpact[]): number {
    return impacts.reduce((sum, i) => sum + i.minutesPerdues, 0)
  }
}

export const timeImpactService = new TimeImpactService()
