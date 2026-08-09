// SPIE-04 — Version History
// Tracks every change to an AcademicYearTwin.
// Every modification creates a new version — enabling rollback and audit.

import type { TwinVersion, TwinVersionHistory, VersionDiff, TwinSnapshot, ChangeType } from '../types/versioning'
import type { AcademicYearTwin } from '../types/twin'

let versionCounter = 0

function makeVersionId(): string {
  return `ver_${Date.now()}_${++versionCounter}`
}

function snapshotTwin(twin: AcademicYearTwin): TwinSnapshot {
  return {
    statut: twin.statut,
    nbSequences: twin.sequences.length,
    nbLecons: twin.sequences.reduce((sum, s) => sum + s.leconIds.length, 0),
    coveragePercent: twin.coveragePercent,
    pacingScore: twin.pacingScore,
    totalHeuresPlanifiees: twin.sequences.reduce((sum, s) => sum + s.dureeEstimeeHeures, 0),
  }
}

export class VersionHistoryManager {
  // Create the first version when a twin is created
  createInitialVersion(twin: AcademicYearTwin, auteur: string): TwinVersion {
    return {
      id: makeVersionId(),
      twinId: twin.id,
      version: 1,
      changeType: 'creation',
      auteur,
      date: new Date().toISOString(),
      motif: 'Création du jumeau numérique de l\'année scolaire',
      diff: {
        champsModifies: ['all'],
        resume: 'Création initiale',
      },
      snapshot: snapshotTwin(twin),
    }
  }

  // Record a change to the twin
  recordChange(
    twin: AcademicYearTwin,
    changeType: ChangeType,
    auteur: string,
    motif: string,
    diff: Partial<VersionDiff>,
  ): TwinVersion {
    return {
      id: makeVersionId(),
      twinId: twin.id,
      version: twin.currentVersion + 1,
      changeType,
      auteur,
      date: new Date().toISOString(),
      motif,
      diff: {
        champsModifies: diff.champsModifies ?? [],
        sequencesAjoutees: diff.sequencesAjoutees,
        sequencesModifiees: diff.sequencesModifiees,
        sequencesSupprimees: diff.sequencesSupprimees,
        resume: diff.resume ?? `Modification: ${changeType}`,
      },
      snapshot: snapshotTwin(twin),
    }
  }

  // Build a version history object
  buildHistory(twinId: string, versions: TwinVersion[]): TwinVersionHistory {
    const sorted = [...versions].sort((a, b) => a.version - b.version)
    return {
      twinId,
      currentVersion: sorted[sorted.length - 1]?.version ?? 0,
      versions: sorted,
      firstVersion: sorted[0],
      lastVersion: sorted[sorted.length - 1],
    }
  }

  // Find what changed between two versions
  diffVersions(v1: TwinVersion, v2: TwinVersion): string {
    const added = v2.diff.sequencesAjoutees?.length ?? 0
    const modified = v2.diff.sequencesModifiees?.length ?? 0
    const removed = v2.diff.sequencesSupprimees?.length ?? 0
    const parts = []
    if (added > 0) parts.push(`+${added} séquence(s)`)
    if (modified > 0) parts.push(`~${modified} modifiée(s)`)
    if (removed > 0) parts.push(`-${removed} supprimée(s)`)
    return parts.length > 0 ? parts.join(', ') : 'Modification mineure'
  }
}

export const versionHistoryManager = new VersionHistoryManager()
