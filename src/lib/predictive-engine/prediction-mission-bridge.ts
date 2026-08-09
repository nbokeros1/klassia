// ── Predictive Engine — Mission Bridge (ME-18) ───────────────────────────────
//
// Convertit les Predictions en Missions pour le Mission Engine.
// Le Mission Engine décide quelles prédictions deviennent des missions.
// Aucune action automatique — propositions uniquement.

import type { Prediction, PredictionType } from './prediction-types'
import type { Mission, MissionType }       from '@/lib/mission-engine/types'

// ── Mapping prédiction → type mission ────────────────────────────────────────

const PREDICTION_TO_MISSION_TYPE: Record<PredictionType, MissionType> = {
  'evaluation_preparation': 'evaluation',
  'lesson_preparation':     'next_lesson',
  'grading_period':         'work',
  'holiday_preparation':    'deadline',
  'semester_transition':    'deadline',
  'exam_period':            'evaluation',
  'administrative_deadline': 'deadline',
}

function confidenceToMissionPriority(confidence: number): number {
  if (confidence >= 85) return 80
  if (confidence >= 70) return 65
  if (confidence >= 50) return 50
  if (confidence >= 35) return 35
  return 20
}

// ── Conversion ────────────────────────────────────────────────────────────────

export function predictionToMission(pred: Prediction): Mission {
  const missionType = PREDICTION_TO_MISSION_TYPE[pred.type] ?? 'work'

  return {
    id:          crypto.randomUUID(),
    type:        missionType,
    title:       pred.suggestedAction,
    description: pred.reason,
    priority:    confidenceToMissionPriority(pred.confidence),
    status:      'proposed',
    reason: {
      code:        `prediction:${pred.type}`,
      label:       'Prédiction pédagogique',
      description: pred.reason,
    },
    createdAt: new Date(),
    metadata: {
      predictionId:   pred.id,
      predictionType: pred.type,
      predictedDate:  pred.predictedDate,
      confidence:     pred.confidence,
    },
    evidence: [{
      source:  'system',
      label:   `Prédiction : ${pred.type}`,
      valeur:  `Confiance ${pred.confidence}%`,
    }],
  }
}

export function predictionsToMissions(predictions: Prediction[]): Mission[] {
  return predictions.map(predictionToMission)
}

// ── PredictionProvider ────────────────────────────────────────────────────────
//
// Interface que le Mission Engine peut appeler pour injecter des missions
// issues des prédictions dans son flux de traitement.

export interface PredictionProvider {
  getMissions(): Promise<Mission[]>
}

export function createPredictionProvider(predictions: Prediction[]): PredictionProvider {
  return {
    async getMissions(): Promise<Mission[]> {
      return predictionsToMissions(predictions)
    },
  }
}
