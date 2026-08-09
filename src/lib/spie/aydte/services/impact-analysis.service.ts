// SPIE-04 — Impact Analysis Service
// Wraps the ImpactEngine for use in twin mutation workflows.

import type { ImpactAnalysis } from '../types/impact'
import type { AcademicYearTwin } from '../types/twin'
import { impactEngine } from '../impact/impact-engine'

export class ImpactAnalysisService {
  onSequenceModified(
    twin: AcademicYearTwin,
    sequenceIds: string[],
    description: string,
  ): ImpactAnalysis {
    return impactEngine.analyzeSequenceChange(twin.id, sequenceIds, twin.sequences, description)
  }

  onCalendarModified(
    twin: AcademicYearTwin,
    changedWeeks: number[],
    affectedSequenceIds: string[],
  ): ImpactAnalysis {
    return impactEngine.analyzeCalendarChange(twin.id, changedWeeks, affectedSequenceIds, twin.sequences)
  }

  isCritical(impact: ImpactAnalysis): boolean {
    return impact.severite === 'critique' || impact.severite === 'majeure'
  }

  summarize(impact: ImpactAnalysis): string {
    const parts = []
    if (impact.nbLeconsTouchees > 0) parts.push(`${impact.nbLeconsTouchees} leçon(s)`)
    if (impact.nbQuizTouches > 0) parts.push(`${impact.nbQuizTouches} quiz`)
    if (impact.nbEvaluationsTouchees > 0) parts.push(`${impact.nbEvaluationsTouchees} évaluation(s)`)
    return parts.length > 0 ? `Impact sur : ${parts.join(', ')}` : 'Impact minimal'
  }
}

export const impactAnalysisService = new ImpactAnalysisService()
