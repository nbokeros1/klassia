// SPIE-02 — Curriculum data quality types

export type DataQualitySeverity = 'erreur' | 'avertissement' | 'info'

export type DataQualityDimension =
  | 'completude'         // All required fields are present
  | 'coherence'          // Internal consistency (codes match, parents exist)
  | 'hierarchie'         // Proper general→specific structure
  | 'vocabulaire'        // Vocabulary items defined and linked
  | 'bloom'              // Bloom levels tagged appropriately
  | 'contraintes'        // Time constraints present and reasonable
  | 'multilinguisme'     // Language consistency
  | 'couverture'         // Coverage of outcomes by concepts/vocabulary

export interface DataQualityIssue {
  id: string
  dimension: DataQualityDimension
  severity: DataQualitySeverity
  message: string
  elementId?: string
  elementType?: string
  suggestion?: string
}

export interface DataQualityReport {
  // Overall score 0–100
  score: number
  // Per-dimension scores 0–100
  dimensions: Record<DataQualityDimension, number>
  issues: DataQualityIssue[]
  // Extracted stats
  stats: {
    nbOutcomesGeneraux: number
    nbOutcomesSpecifiques: number
    nbCompetences: number
    nbConcepts: number
    nbVocabulaire: number
    nbContraintes: number
    nbOutcomesAvecBloom: number
    nbOutcomesSansParent: number
    confidenceScore: number
    completenessScore: number
  }
  validPourGeneration: boolean   // true if score ≥ 60 and no erreur critique
  createdAt: string
}
