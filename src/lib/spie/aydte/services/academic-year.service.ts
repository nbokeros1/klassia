// SPIE-04 — Academic Year Twin Service
// Orchestrates twin creation, loading, and coordination between sub-engines.

import type { AcademicYearTwin, AcademicYearTwinSummary, SequenceBlock } from '../types/twin'
import type { AnnualPlanningInput, AnnualPlanningOutput } from '../types/planning'
import type { CalendarStats } from '../types/calendar'
import type { AnnualPacingModel } from '../types/pacing'
import type { ImpactAnalysis } from '../types/impact'
import type { TwinVersion } from '../types/versioning'
import { calendarEngine } from '../calendar/calendar-engine'
import { pacingEngine } from '../pacing/pacing-engine'
import { annualPlanningEngine } from '../planning/annual-planning-engine'
import { versionHistoryManager } from '../versioning/version-history'
import { impactEngine } from '../impact/impact-engine'

let twinIdCounter = 0

export class AcademicYearService {
  // Create a new AcademicYearTwin from planning output
  createTwin(
    planningInput: AnnualPlanningInput,
    planningOutput: AnnualPlanningOutput,
  ): AcademicYearTwin {
    const now = new Date().toISOString()
    const id = `twin_${Date.now()}_${++twinIdCounter}`

    const twin: AcademicYearTwin = {
      id,
      enseignantId: planningInput.enseignantId,
      classeId: planningInput.classeId,
      matiereId: planningInput.matiere,
      province: planningInput.province,
      niveaux: planningInput.niveaux,
      academicYear: planningInput.academicYear,
      langue: planningInput.langue,
      curriculumId: planningInput.curriculumId,
      outcomesTotal: planningInput.outcomes.length,
      pacingModel: planningInput.pacingModel,
      totalSemaines: planningInput.totalSemaines,
      totalMinutesDisponibles: planningInput.totalSemaines * planningInput.minutesParSemaine,
      minutesParSemaine: planningInput.minutesParSemaine,
      sequences: planningOutput.sequences,
      nodes: planningOutput.nodes,
      statut: 'en_planification',
      coveragePercent: planningOutput.stats.coveragePercent,
      pacingScore: planningOutput.stats.pacingScore,
      currentVersion: 1,
      lastModifiedAt: now,
      createdAt: now,
      contextSnapshot: planningInput.pedagogicalContext
        ? {
            contextId: planningInput.pedagogicalContext.contextId,
            builtAt: now,
            scoreGlobal: planningInput.pedagogicalContext.progressPercent,
          }
        : undefined,
    }

    return twin
  }

  // Build a full annual plan in one shot
  buildAnnualPlan(input: AnnualPlanningInput): {
    twin: AcademicYearTwin
    output: AnnualPlanningOutput
    version: TwinVersion
  } {
    const planningOutput = annualPlanningEngine.plan(input)
    const twin = this.createTwin(input, planningOutput)
    const version = versionHistoryManager.createInitialVersion(twin, input.enseignantId)
    return { twin, output: planningOutput, version }
  }

  // Add a sequence to an existing twin
  addSequence(
    twin: AcademicYearTwin,
    sequence: Omit<SequenceBlock, 'id' | 'ordre' | 'leconIds' | 'quizIds' | 'needsRecalculation'>,
    auteur: string,
  ): { twin: AcademicYearTwin; version: TwinVersion; impact: ImpactAnalysis } {
    const newSeq: SequenceBlock = {
      ...sequence,
      id: `seq_${Date.now()}`,
      ordre: twin.sequences.length,
      leconIds: [],
      quizIds: [],
      needsRecalculation: false,
    }

    const updatedTwin: AcademicYearTwin = {
      ...twin,
      sequences: [...twin.sequences, newSeq],
      currentVersion: twin.currentVersion + 1,
      lastModifiedAt: new Date().toISOString(),
    }

    const version = versionHistoryManager.recordChange(
      twin,
      'sequence_ajoutee',
      auteur,
      `Ajout de la séquence "${newSeq.titre}"`,
      { sequencesAjoutees: [newSeq.id], champsModifies: ['sequences'], resume: `+1 séquence` },
    )

    const impact = impactEngine.analyzeSequenceChange(
      twin.id,
      [newSeq.id],
      updatedTwin.sequences,
      `Séquence ajoutée: ${newSeq.titre}`,
    )

    return { twin: updatedTwin, version, impact }
  }

  // Mark a sequence as started/completed
  updateSequenceStatus(
    twin: AcademicYearTwin,
    sequenceId: string,
    newStatus: SequenceBlock['statut'],
    auteur: string,
    dureeReelleHeures?: number,
  ): { twin: AcademicYearTwin; version: TwinVersion } {
    const updatedSequences = twin.sequences.map(s => {
      if (s.id !== sequenceId) return s
      return { ...s, statut: newStatus, dureeReelleHeures: dureeReelleHeures ?? s.dureeReelleHeures }
    })

    const outcomesTermines = updatedSequences
      .filter(s => s.statut === 'terminee')
      .reduce((sum, s) => sum + s.outcomeIds.length, 0)

    const coveragePercent = twin.outcomesTotal > 0
      ? Math.round((outcomesTermines / twin.outcomesTotal) * 100)
      : 0

    const updatedTwin: AcademicYearTwin = {
      ...twin,
      sequences: updatedSequences,
      coveragePercent,
      currentVersion: twin.currentVersion + 1,
      lastModifiedAt: new Date().toISOString(),
      statut: coveragePercent >= 100 ? 'termine' : twin.statut,
    }

    const version = versionHistoryManager.recordChange(
      twin,
      'statut_sequence_change',
      auteur,
      `Séquence "${sequenceId}" → ${newStatus}`,
      { sequencesModifiees: [sequenceId], champsModifies: ['sequences', 'coveragePercent'], resume: `Statut: ${newStatus}` },
    )

    return { twin: updatedTwin, version }
  }

  // Produce a summary for list views
  summarize(twin: AcademicYearTwin, classeNom?: string): AcademicYearTwinSummary {
    return {
      id: twin.id,
      classeId: twin.classeId,
      classeNom,
      matiereId: twin.matiereId,
      academicYear: twin.academicYear,
      statut: twin.statut,
      coveragePercent: twin.coveragePercent,
      nbSequences: twin.sequences.length,
      nbLecons: twin.sequences.reduce((sum, s) => sum + s.leconIds.length, 0),
      currentVersion: twin.currentVersion,
      lastModifiedAt: twin.lastModifiedAt,
    }
  }

  // Recalculate derived fields after external change
  recalculate(twin: AcademicYearTwin): AcademicYearTwin {
    const outcomesTermines = twin.sequences
      .filter(s => s.statut === 'terminee')
      .reduce((sum, s) => sum + s.outcomeIds.length, 0)

    const coveragePercent = twin.outcomesTotal > 0
      ? Math.round((outcomesTermines / twin.outcomesTotal) * 100)
      : 0

    return {
      ...twin,
      coveragePercent,
      lastModifiedAt: new Date().toISOString(),
    }
  }
}

export const academicYearService = new AcademicYearService()
