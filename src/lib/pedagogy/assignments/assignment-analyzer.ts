// ── PIL — AssignmentAnalyzer ─────────────────────────────────────────────────
//
// Analyse les travaux donnés aux élèves à partir de DocumentSnapshot[].
// Déterministe — aucun appel IA, aucun réseau, aucun Supabase.
// Indépendant du Dashboard.

import type { AssignmentSnapshot, AssignmentAnalysis, AssignmentStatus } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'

// Seuil par défaut : un travail sans date limite est considéré en retard
// après OVERDUE_DAYS_DEFAULT jours sans correction.
const OVERDUE_DAYS_DEFAULT = 14

// Mots-clés indiquant la présence de rétroaction dans le texte extrait
const FEEDBACK_KEYWORDS = [
  'commentaire', 'feedback', 'rétroaction', 'retroaction',
  'observation', 'remarque', 'note:', 'bravo', 'bien vu',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateFromMeta(raw: unknown): Date | null {
  if (!raw) return null
  const d = new Date(raw as string)
  return isNaN(d.getTime()) ? null : d
}

function detectFeedback(doc: DocumentSnapshot, isGraded: boolean): boolean {
  // Feedback explicite dans les metadata
  if (doc.metadata?.['hasFeedback'] === true) return true
  if (!isGraded) return false

  // Heuristique : le texte extrait contient des mots-clés de rétroaction
  const text = (doc.texteExtrait ?? doc.contenuHtml ?? '').toLowerCase()
  if (!text) return false
  return FEEDBACK_KEYWORDS.some(k => text.includes(k))
}

function computeStatus(
  isGraded:  boolean,
  dueDate:   Date | null,
  createdAt: Date,
  now:       Date,
): AssignmentStatus {
  if (isGraded) return 'graded'
  const threshold = dueDate ?? new Date(createdAt.getTime() + OVERDUE_DAYS_DEFAULT * 86_400_000)
  return threshold < now ? 'overdue' : 'pending'
}

// ── AssignmentAnalyzer ────────────────────────────────────────────────────────

export class AssignmentAnalyzer {
  /**
   * Transforme une liste de DocumentSnapshot en AssignmentSnapshot[]
   * et calcule les sous-ensembles métier.
   *
   * @param travaux  Documents issus du dossier "travaux" / "devoirs"
   * @param now      Date de référence (pour le calcul des retards)
   */
  analyze(travaux: DocumentSnapshot[], now: Date = new Date()): AssignmentAnalysis {
    const assignments: AssignmentSnapshot[] = travaux.map(doc => {
      const meta      = doc.metadata ?? {}
      const gradedAt  = parseDateFromMeta(meta['gradedAt'])
      const dueDate   = parseDateFromMeta(meta['dueDate'])
      const isGraded  =
        meta['isGraded'] === true ||
        gradedAt !== null

      const hasFeedback = detectFeedback(doc, isGraded)

      const status = computeStatus(isGraded, dueDate, doc.createdAt, now)

      return {
        id:          doc.id,
        nom:         doc.nom,
        matiere:     doc.matiere ?? null,
        createdAt:   doc.createdAt,
        dueDate,
        gradedAt,
        isGraded,
        hasFeedback,
        status,
      }
    })

    const pendingAssignments  = assignments.filter(a => a.status === 'pending')
    const overdueAssignments  = assignments.filter(a => a.status === 'overdue')
    const ungradedAssignments = assignments.filter(a => !a.isGraded)

    return {
      assignments,
      pendingAssignments,
      overdueAssignments,
      ungradedAssignments,
    }
  }
}
