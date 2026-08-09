// ── Mission Engine — Détecteur : Évaluation (ME-06, refactorisé ME-08) ───────
//
// 5 cas métier :
//   Cas 1 : pas de programme annuel             → []
//   Cas 2 : aucune leçon                        → []
//   Cas 3 : leçons présentes, aucune évaluation → Créer première évaluation (p=85)
//   Cas 4 : progression importante, éval. ancienne → Préparer évaluation (p=80)
//   Cas 5 : unité terminée non évaluée          → Évaluer unité terminée (p=82)
//
// ME-08 : reçoit TeacherSituation — plus d'appels directs au PIL.

import type { Mission, MissionEvidence } from '../types'
import type { TeacherSituation } from '../../teacher-brain/types'
import { normaliser } from '../../pedagogy/shared/text-utils'

const LESSONS_WITHOUT_EVAL_THRESHOLD = 3

function buildMissionId(
  type:         string,
  enseignantId: string,
  classeId:     string,
  matiere:      string,
  suffix?:      string,
): string {
  const matiereNorm = normaliser(matiere).replace(/ /g, '_')
  return suffix
    ? `${type}:${enseignantId}:${classeId}:${matiereNorm}:${suffix}`
    : `${type}:${enseignantId}:${classeId}:${matiereNorm}`
}

export async function detectEvaluation(situation: TeacherSituation): Promise<Mission[]> {
  const { classe, matiere, enseignant, today } = situation
  const { progress, classroom } = situation

  // ── Cas 1 : contexte insuffisant ─────────────────────────────────────────
  if (!classe || !matiere) return []
  if (!progress.hasProgramme)  return []

  // ── Cas 2 : aucune leçon ──────────────────────────────────────────────────
  if (classroom.lessonsCount === 0) return []

  const enseignantId = enseignant?.id ?? classe.id
  const classeId     = classe.id

  const { references } = situation

  // ── Cas 3 : aucune évaluation (priorité 85) ───────────────────────────────
  if (progress.totalEvaluations === 0) {
    const id = buildMissionId('evaluation_needed', enseignantId, classeId, matiere)

    const evidence: MissionEvidence[] = [
      {
        source:     'programme_annuel',
        documentId: references.programmeAnnuelId ?? undefined,
        label:      'Programme annuel disponible',
      },
      {
        source:     'derniere_lecon',
        documentId: references.latestLessonId ?? undefined,
        label:      `${classroom.lessonsCount} leçon(s) préparée(s) sans aucune évaluation`,
        valeur:     String(classroom.lessonsCount),
      },
    ]

    if (progress.progressPercent !== null) {
      evidence.push({
        source: 'programme_annuel',
        label:  `Progression estimée : ${progress.progressPercent} %`,
        valeur: String(progress.progressPercent),
      })
    }

    return [{
      id,
      type:        'evaluation',
      title:       `Créer une première évaluation — ${matiere}`,
      description: `${classroom.lessonsCount} leçon(s) ont été préparées pour ${classe.nom} mais aucune évaluation n'a encore été créée.`,
      priority:    85,
      status:      'proposed',
      reason: {
        code:        'no_evaluation',
        label:       'Aucune évaluation créée',
        description: `ScorgIA recommande de créer une première évaluation pour ${matiere} afin de mesurer la progression des élèves de ${classe.nom}.`,
      },
      createdAt: today,
      metadata: {
        action:           'create_first_evaluation',
        matiere,
        classe_id:        classeId,
        progress_percent: progress.progressPercent,
        last_evaluation:  null,
        suggested_unit:   progress.currentLesson,
      },
      evidence,
    }]
  }

  // ── Cas 5 : unité terminée mais non évaluée (priorité 82) ────────────────
  if (progress.unevaluatedUnits.length > 0) {
    // Premier élément = ordre curriculum (calculé dans ProgressBuilder)
    const unitTitle  = progress.unevaluatedUnits[0]
    const unitSuffix = normaliser(unitTitle).replace(/ /g, '_').slice(0, 50)
    const id = buildMissionId('evaluation_unit', enseignantId, classeId, matiere, unitSuffix)

    const evidence: MissionEvidence[] = [
      {
        source:     'programme_annuel',
        documentId: references.programmeAnnuelId ?? undefined,
        label:      `Unité "${unitTitle}" couverte dans le programme`,
      },
      {
        source:     'derniere_lecon',
        documentId: references.latestLessonId ?? undefined,
        label:      'Leçons créées pour cette unité',
      },
    ]

    if (progress.progressPercent !== null) {
      evidence.push({
        source: 'programme_annuel',
        label:  `Progression : ${progress.progressPercent} %`,
        valeur: String(progress.progressPercent),
      })
    }

    return [{
      id,
      type:        'evaluation',
      title:       `Évaluer l'unité : ${unitTitle}`,
      description: `L'unité « ${unitTitle} » a été couverte pour ${classe.nom} mais n'a pas encore été évaluée.`,
      priority:    82,
      status:      'proposed',
      reason: {
        code:        'unit_completed',
        label:       'Unité terminée à évaluer',
        description: `L'unité « ${unitTitle} » semble terminée. Créez une évaluation pour mesurer la compréhension des élèves de ${classe.nom}.`,
      },
      createdAt: today,
      metadata: {
        action:           'evaluate_completed_unit',
        matiere,
        classe_id:        classeId,
        suggested_unit:   unitTitle,
        progress_percent: progress.progressPercent,
        last_evaluation:  progress.lastEvaluationDate?.toISOString() ?? null,
      },
      evidence,
    }]
  }

  // ── Cas 4 : progression importante, évaluation ancienne (priorité 80) ────
  if (progress.lessonsAfterLastEval >= LESSONS_WITHOUT_EVAL_THRESHOLD) {
    const id = buildMissionId('evaluation_overdue', enseignantId, classeId, matiere)

    const evidence: MissionEvidence[] = [
      {
        source:     'programme_annuel',
        documentId: references.programmeAnnuelId ?? undefined,
        label:      'Programme annuel disponible',
      },
      {
        source:     'derniere_lecon',
        documentId: references.latestLessonId ?? undefined,
        label:      `${progress.lessonsAfterLastEval} leçon(s) depuis la dernière évaluation`,
        valeur:     String(progress.lessonsAfterLastEval),
      },
    ]

    return [{
      id,
      type:        'evaluation',
      title:       `Préparer une évaluation — ${matiere}`,
      description: `${progress.lessonsAfterLastEval} leçons ont été préparées depuis la dernière évaluation de ${matiere} dans ${classe.nom}.`,
      priority:    80,
      status:      'proposed',
      reason: {
        code:        'evaluation_overdue',
        label:       'Évaluation suggérée',
        description: `${progress.lessonsAfterLastEval} leçons ont été préparées depuis la dernière évaluation. ScorgIA recommande de vérifier la progression des élèves.`,
      },
      createdAt: today,
      metadata: {
        action:           'create_evaluation',
        matiere,
        classe_id:        classeId,
        progress_percent: progress.progressPercent,
        last_evaluation:  progress.lastEvaluationDate?.toISOString() ?? null,
        suggested_unit:   progress.nextLesson,
      },
      evidence,
    }]
  }

  return []
}
