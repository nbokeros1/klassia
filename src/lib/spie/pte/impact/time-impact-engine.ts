// SPIE-06 — Time Impact Engine
// Measures the pedagogical impact of time deviations.
// Input: a TimeEvent or delta → Output: a TimeImpact with severity + message.

import type { TimeImpact, TimeImpactType, TimeImpactSeverity } from '../types/impact'
import type { TimeEvent } from '../types/calendar-event'

let impactCounter = 0
function makeImpactId(): string { return `timp_${++impactCounter}` }

// ─── Severity thresholds (in minutes) ─────────────────────────────────────────

const SEVERITY_THRESHOLDS: Array<{ max: number; severity: TimeImpactSeverity }> = [
  { max: 15, severity: 'negligeable' },
  { max: 60, severity: 'faible' },
  { max: 180, severity: 'modere' },
  { max: 360, severity: 'severe' },
  { max: Infinity, severity: 'critique' },
]

function computeSeverity(minutesCumul: number): TimeImpactSeverity {
  for (const t of SEVERITY_THRESHOLDS) {
    if (minutesCumul <= t.max) return t.severity
  }
  return 'critique'
}

// ─── Message builders ─────────────────────────────────────────────────────────

function buildMessage(type: TimeImpactType, minutesPerdues: number, semainesDecalage: number): string {
  const mins = Math.round(minutesPerdues)
  const sem = Math.abs(Math.round(semainesDecalage * 10) / 10)
  switch (type) {
    case 'absence_enseignant':
      return `Votre absence a entraîné la perte de ${mins} minutes d'enseignement. Le plan pédagogique accuse un retard de ${sem} semaine(s).`
    case 'cours_annule':
      return `Le cours annulé représente ${mins} minutes perdues. Envisagez d'ajuster les séquences suivantes.`
    case 'lecon_prolongee':
      return `La leçon a utilisé ${mins} minutes de plus que prévu. Le recalcul indique un décalage de ${sem} semaine(s) dans le plan.`
    case 'activite_supplementaire':
      return `La nouvelle activité consomme ${mins} minutes supplémentaires. Vérifiez l'impact sur les séquences suivantes.`
    case 'evaluation_supplementaire':
      return `L'évaluation supplémentaire nécessite ${mins} minutes. Cela décale le plan de ${sem} semaine(s).`
    case 'retard_global':
      return `Retard cumulé de ${mins} minutes (${sem} semaine(s)). Une révision du plan annuel est recommandée.`
    default:
      return `Impact de ${mins} minutes détecté — vérifier le plan pédagogique.`
  }
}

// ─── Time Impact Engine ───────────────────────────────────────────────────────

export class TimeImpactEngine {
  // Measure impact from a single TimeEvent
  measureEvent(
    event: TimeEvent,
    minutesParSemaine: number,
    minutesDecalageCumulActuel = 0,
    outcomesTotal = 0,
  ): TimeImpact {
    const minutesPerdues = event.dureeMinutesPerdues
    const type: TimeImpactType = this.eventToImpactType(event.type)
    const newCumul = minutesDecalageCumulActuel + minutesPerdues
    const semainesDecalage = minutesParSemaine > 0 ? newCumul / minutesParSemaine : 0

    return {
      id: makeImpactId(),
      type,
      severity: computeSeverity(newCumul),
      minutesPerdues,
      minutesDecalageCumul: newCumul,
      semainesDecalageCumul: Math.round(semainesDecalage * 100) / 100,
      sequencesDecalees: event.sequencesAffectees ?? [],
      evaluationsDecalees: [],
      coverageRiskPercent: outcomesTotal > 0 ? Math.min(100, Math.round((semainesDecalage / 4) * 20)) : 0,
      titre: event.titre,
      messageEnseignant: buildMessage(type, minutesPerdues, semainesDecalage),
      calculatedAt: new Date().toISOString(),
    }
  }

  // Measure impact from a batch of events (cumulative)
  measureBatch(
    events: TimeEvent[],
    minutesParSemaine: number,
    outcomesTotal = 0,
  ): TimeImpact {
    const totalPerdues = events.reduce((sum, e) => sum + e.dureeMinutesPerdues, 0)
    const semainesDecalage = minutesParSemaine > 0 ? totalPerdues / minutesParSemaine : 0
    const allAffected = [...new Set(events.flatMap(e => e.sequencesAffectees ?? []))]

    return {
      id: makeImpactId(),
      type: 'retard_global',
      severity: computeSeverity(totalPerdues),
      minutesPerdues: totalPerdues,
      minutesDecalageCumul: totalPerdues,
      semainesDecalageCumul: Math.round(semainesDecalage * 100) / 100,
      sequencesDecalees: allAffected,
      evaluationsDecalees: [],
      coverageRiskPercent: outcomesTotal > 0 ? Math.min(100, Math.round((semainesDecalage / 4) * 20)) : 0,
      titre: `Impact cumulé — ${events.length} événement(s)`,
      messageEnseignant: buildMessage('retard_global', totalPerdues, semainesDecalage),
      calculatedAt: new Date().toISOString(),
    }
  }

  // Measure impact of adding a lesson that ran long
  measureLeconProlongee(
    extraMinutes: number,
    minutesParSemaine: number,
    sequenceId: string,
    minutesDecalageCumulActuel = 0,
  ): TimeImpact {
    const newCumul = minutesDecalageCumulActuel + extraMinutes
    const semainesDecalage = minutesParSemaine > 0 ? newCumul / minutesParSemaine : 0

    return {
      id: makeImpactId(),
      type: 'lecon_prolongee',
      severity: computeSeverity(extraMinutes),
      minutesPerdues: extraMinutes,
      minutesDecalageCumul: newCumul,
      semainesDecalageCumul: Math.round(semainesDecalage * 100) / 100,
      sequencesDecalees: [sequenceId],
      evaluationsDecalees: [],
      coverageRiskPercent: 0,
      titre: 'Leçon prolongée',
      messageEnseignant: buildMessage('lecon_prolongee', extraMinutes, semainesDecalage),
      calculatedAt: new Date().toISOString(),
    }
  }

  private eventToImpactType(type: string): TimeImpactType {
    const map: Record<string, TimeImpactType> = {
      absence_enseignant: 'absence_enseignant',
      cours_annule: 'cours_annule',
      cours_prolonge: 'lecon_prolongee',
      journee_pedagogique: 'cours_annule',
      jour_ferie: 'cours_annule',
      vacances: 'cours_annule',
      examen: 'cours_annule',
      activite_speciale: 'activite_supplementaire',
      retard_debut: 'cours_annule',
      fin_anticipee: 'cours_annule',
    }
    return map[type] ?? 'retard_global'
  }
}

export const timeImpactEngine = new TimeImpactEngine()
