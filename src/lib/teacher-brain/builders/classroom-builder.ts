// ── Teacher Brain — ClassroomBuilder (ME-08) ─────────────────────────────────
//
// Construit TeacherClassroom à partir des documents de la classe.
// Déterministe — aucun appel IA, aucun réseau.

import type { TeacherClassroom } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'

export class ClassroomBuilder {
  build(
    dernieresLecons:      DocumentSnapshot[],
    dernieresEvaluations: DocumentSnapshot[],
    travaux:              DocumentSnapshot[],
    leconsParStatut:      Record<string, number> = {},
  ): TeacherClassroom {
    const allDocs = [...dernieresLecons, ...dernieresEvaluations, ...travaux]

    // Date du document le plus récent (toutes catégories confondues)
    const recentActivity: Date | null = allDocs.length > 0
      ? allDocs.reduce(
          (latest, d) => (d.createdAt > latest ? d.createdAt : latest),
          allDocs[0].createdAt,
        )
      : null

    return {
      lessonsCount:     dernieresLecons.length,
      evaluationsCount: dernieresEvaluations.length,
      assignmentsCount: travaux.length,
      recentActivity,
      leconsParStatut,
    }
  }
}
