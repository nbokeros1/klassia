// PAE — Pedagogical Analytics Engine types

export interface PAEInsightRequest {
  enseignantId: string
  classeIds?: string[]
  periode?: {
    debut: string
    fin: string
  }
}

export type InsightType =
  | 'pacing'            // Teaching pace vs. plan
  | 'completion'        // Lesson completion rate
  | 'preparation'       // Preparation quality trends
  | 'evaluation'        // Assessment patterns
  | 'differentiation'   // Differentiation usage
  | 'reflection'        // Reflection regularity
  | 'curriculum'        // Curriculum coverage
  | 'engagement'        // Student engagement signals
  | 'workload'          // Teacher workload

export interface PAEInsight {
  id: string
  enseignantId: string
  type: InsightType
  titre: string
  description: string
  valeur?: number           // Numeric value if applicable
  unite?: string            // "%" | "leçons" | "jours"
  tendance?: 'hausse' | 'baisse' | 'stable'
  priorite: 'haute' | 'normale' | 'info'
  actionsuggeree?: string
  createdAt: string
}

export interface PAERecommendation {
  id: string
  enseignantId: string
  type: string
  titre: string
  description: string
  rationale: string
  actionsConcretes: string[]
  priorite: 'haute' | 'normale' | 'basse'
  echeance?: string
  createdAt: string
}
