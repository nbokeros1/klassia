// SPIE-04 — Version History Service
// Provides version management operations on a twin.

import type { TwinVersion, TwinVersionHistory, ChangeType, VersionDiff } from '../types/versioning'
import type { AcademicYearTwin } from '../types/twin'
import { versionHistoryManager } from '../versioning/version-history'

export class VersionHistoryService {
  buildHistory(twinId: string, versions: TwinVersion[]): TwinVersionHistory {
    return versionHistoryManager.buildHistory(twinId, versions)
  }

  record(
    twin: AcademicYearTwin,
    changeType: ChangeType,
    auteur: string,
    motif: string,
    diff: Partial<VersionDiff>,
  ): TwinVersion {
    return versionHistoryManager.recordChange(twin, changeType, auteur, motif, diff)
  }

  describeChange(v1: TwinVersion, v2: TwinVersion): string {
    return versionHistoryManager.diffVersions(v1, v2)
  }

  // Find the last version of a given type
  getLastOfType(history: TwinVersionHistory, changeType: ChangeType): TwinVersion | undefined {
    return [...history.versions]
      .reverse()
      .find(v => v.changeType === changeType)
  }
}

export const versionHistoryService = new VersionHistoryService()
