// ── Mission Engine — Deadline Detector (ME-11) ────────────────────────────────
//
// Génère une mission de type 'deadline' selon le contexte temporel calendrier.
// Pattern cascade — retourne au plus 1 mission (le cas le plus urgent).
//
// Cas 0 : aucune donnée calendrier → []
// Cas 1 : échéance urgente (≤ 3 j) → p=94, code='deadline_urgent'
// Cas 2 : échéance proche  (≤ 7 j) → p=78, code='deadline_upcoming'
// Cas 3 : congé/relâche proche     → p=72, code='deadline_break'
// Cas 4 : aucun déclencheur → []
//
// Sécurité : aucun nom d'élève dans titre/description.
// ID déterministe : deadline:{enseignantId}:{classeId}:{matiereNorm}:{deadlineId}:{action}
//                   deadline:{enseignantId}:{classeId}:{matiereNorm}:break:{eventId}

import type { Mission } from '../types'
import type { TeacherSituation } from '../../teacher-brain/types'
import type { TeachingStrategy } from '../../teaching-strategy/types'
import type { CalendarDeadlineSnapshot, CalendarEventSnapshot } from '../types'

const URGENT_DAYS   = 3
const UPCOMING_DAYS = 7
const BREAK_DAYS    = 7

function normalizeMatiere(m: string | null): string {
  return (m ?? 'general').toLowerCase().replace(/\s+/g, '_')
}

function makeDeadlineId(
  enseignantId: string,
  classeId: string,
  matiere: string | null,
  deadlineId: string,
  action: string,
): string {
  return `deadline:${enseignantId}:${classeId}:${normalizeMatiere(matiere)}:${deadlineId}:${action}`
}

function makeBreakId(
  enseignantId: string,
  classeId: string,
  matiere: string | null,
  eventId: string,
): string {
  return `deadline:${enseignantId}:${classeId}:${normalizeMatiere(matiere)}:break:${eventId}`
}

function deadlineLabel(type: 'evaluation' | 'devoir' | 'autre'): string {
  if (type === 'evaluation') return 'évaluation'
  if (type === 'devoir')     return 'remise de travail'
  return 'échéance'
}

export async function detectDeadline(
  situation: TeacherSituation,
  _strategy: TeachingStrategy,
): Promise<Mission[]> {
  const { enseignant, classe, matiere, today, calendar } = situation

  // Cas 0 : gardes
  if (!classe || !enseignant) return []
  if (!calendar.hasUsableData) return []

  const enseignantId = enseignant.id
  const classeId     = classe.id

  // ── Cas 1 : échéance urgente (≤ URGENT_DAYS) ──────────────────────────────
  const urgentDeadline: CalendarDeadlineSnapshot | undefined =
    calendar.upcomingDeadlines.find(d => d.urgencyDays <= URGENT_DAYS)

  if (urgentDeadline) {
    const label   = deadlineLabel(urgentDeadline.type)
    const daysStr = urgentDeadline.urgencyDays === 0
      ? "aujourd'hui"
      : `dans ${urgentDeadline.urgencyDays} jour(s)`

    return [{
      id:          makeDeadlineId(enseignantId, classeId, matiere, urgentDeadline.id, 'urgent'),
      type:        'deadline',
      title:       `${classe.nom} — ${label} urgente ${daysStr}`,
      description: `"${urgentDeadline.titre}" est prévue ${daysStr}. Assurez-vous que la classe est prête.`,
      priority:    94,
      status:      'proposed',
      reason: {
        code:        'deadline_urgent',
        label:       'Échéance urgente',
        description: `${label} prévue ${daysStr}.`,
      },
      createdAt: today,
      metadata: {
        deadline_id:    urgentDeadline.id,
        deadline_type:  urgentDeadline.type,
        deadline_date:  urgentDeadline.date.toISOString(),
        urgency_days:   urgentDeadline.urgencyDays,
      },
      evidence: [{
        source:     'deadline',
        documentId: urgentDeadline.id,
        label:      `${label} : ${urgentDeadline.titre}`,
        valeur:     daysStr,
      }],
    }]
  }

  // ── Cas 2 : échéance proche (≤ UPCOMING_DAYS) ─────────────────────────────
  const upcomingDeadline: CalendarDeadlineSnapshot | undefined =
    calendar.upcomingDeadlines.find(d => d.urgencyDays <= UPCOMING_DAYS)

  if (upcomingDeadline) {
    const label = deadlineLabel(upcomingDeadline.type)
    const daysStr = `dans ${upcomingDeadline.urgencyDays} jour(s)`

    return [{
      id:          makeDeadlineId(enseignantId, classeId, matiere, upcomingDeadline.id, 'upcoming'),
      type:        'deadline',
      title:       `${classe.nom} — ${label} ${daysStr}`,
      description: `"${upcomingDeadline.titre}" arrive ${daysStr}. Temps de finaliser la préparation.`,
      priority:    78,
      status:      'proposed',
      reason: {
        code:        'deadline_upcoming',
        label:       'Échéance proche',
        description: `${label} dans ${upcomingDeadline.urgencyDays} jour(s).`,
      },
      createdAt: today,
      metadata: {
        deadline_id:   upcomingDeadline.id,
        deadline_type: upcomingDeadline.type,
        deadline_date: upcomingDeadline.date.toISOString(),
        urgency_days:  upcomingDeadline.urgencyDays,
      },
      evidence: [{
        source:     'deadline',
        documentId: upcomingDeadline.id,
        label:      `${label} : ${upcomingDeadline.titre}`,
        valeur:     daysStr,
      }],
    }]
  }

  // ── Cas 3 : congé/relâche imminent (≤ BREAK_DAYS) ─────────────────────────
  const upcomingBreak: CalendarEventSnapshot | undefined =
    calendar.upcomingBreaks.find(e => {
      const days = Math.floor(
        (e.dateDebut.getTime() - today.getTime()) / 86_400_000,
      )
      return days >= 0 && days <= BREAK_DAYS
    })

  if (upcomingBreak) {
    const days    = Math.floor((upcomingBreak.dateDebut.getTime() - today.getTime()) / 86_400_000)
    const daysStr = days === 0 ? "aujourd'hui" : `dans ${days} jour(s)`

    return [{
      id:          makeBreakId(enseignantId, classeId, matiere, upcomingBreak.id),
      type:        'deadline',
      title:       `${classe.nom} — congé/relâche ${daysStr}`,
      description: `${upcomingBreak.titre} commence ${daysStr}. Pensez à terminer l'unité en cours et planifier la reprise.`,
      priority:    72,
      status:      'proposed',
      reason: {
        code:        'deadline_break',
        label:       'Congé imminent',
        description: `Congé/relâche ${daysStr}.`,
      },
      createdAt: today,
      metadata: {
        break_event_id:   upcomingBreak.id,
        break_event_type: upcomingBreak.type,
        break_date:       upcomingBreak.dateDebut.toISOString(),
        days_until_break: days,
      },
      evidence: [{
        source:     'school_schedule',
        documentId: upcomingBreak.id,
        label:      upcomingBreak.titre,
        valeur:     daysStr,
      }],
    }]
  }

  // Cas 4 : aucun déclencheur
  return []
}
