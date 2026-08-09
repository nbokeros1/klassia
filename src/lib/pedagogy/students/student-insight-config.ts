// ── PIL — Student Insight Config (ME-09) ─────────────────────────────────────

export interface StudentInsightConfig {
  /** Fenêtre de temps pour l'analyse des présences (jours). */
  attendanceWindowDays: number

  /** Nombre d'absences dans la fenêtre pour déclencher un signal. */
  repeatedAbsenceThreshold: number

  /** Nombre de retards dans la fenêtre pour déclencher un signal. */
  repeatedLatenessThreshold: number

  /** Seuil de performance faible (pourcentage, ex. 60 = 60 %). */
  lowPerformanceThreshold: number

  /** Nombre minimum de résultats pour calculer une performance faible. */
  lowPerformanceMinimumResults: number

  /** Nombre minimum de résultats pour détecter une performance en déclin. */
  decliningPerformanceMinimumResults: number

  /** Nombre de travaux manquants pour déclencher un signal. */
  missingWorkThreshold: number
}

export const DEFAULT_STUDENT_INSIGHT_CONFIG: StudentInsightConfig = {
  attendanceWindowDays:               30,
  repeatedAbsenceThreshold:           3,
  repeatedLatenessThreshold:          3,
  lowPerformanceThreshold:            60,
  lowPerformanceMinimumResults:       2,
  decliningPerformanceMinimumResults: 3,
  missingWorkThreshold:               2,
}
