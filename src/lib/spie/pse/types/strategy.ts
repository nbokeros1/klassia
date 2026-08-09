// SPIE-07 — Pedagogical Strategy
// PedagogicalStrategy decides HOW to teach — not what to generate.
// It is the synthesis of curriculum, context, time, and simulation data.

// ─── Approach ─────────────────────────────────────────────────────────────────

export type StrategyApproach =
  | 'enseignement_direct'    // Teacher-led, structured — most time-efficient
  | 'apprentissage_actif'    // Inquiry-based, student exploration
  | 'collaboration'          // Cooperative learning groups
  | 'differentie'            // Differentiated instruction (varied tasks by level)
  | 'spirale'                // Spiral curriculum — revisit concepts progressively
  | 'par_projet'             // Project-based learning
  | 'mixte'                  // Combination — default

// ─── Difficulty level ─────────────────────────────────────────────────────────

export type DifficultyLevel =
  | 'accessible'      // Below grade level — scaffolded, supportive
  | 'moyen'           // At grade level — standard expectations
  | 'exigeant'        // Above grade level — enrichment and extension
  | 'tres_exigeant'   // Advanced — for high-performance classes

// ─── Bloom progression ────────────────────────────────────────────────────────

export type ProgressionType =
  | 'lineaire'     // Sequential, step by step
  | 'spirale'      // Revisit with increasing depth
  | 'escalier'     // Progressive difficulty steps
  | 'differentie'  // Different progressions per student group

// ─── Differentiation strategy ─────────────────────────────────────────────────

export type DifferentiationStrategy =
  | 'contenu'           // Differentiate what students learn
  | 'processus'         // Differentiate how they learn it
  | 'production'        // Differentiate how they show mastery
  | 'environnement'     // Differentiate the learning environment

// ─── Evaluation timing ────────────────────────────────────────────────────────

export type EvaluationTiming = 'debut' | 'milieu' | 'fin' | 'distribue'

// ─── Pedagogical Strategy (main model) ───────────────────────────────────────

export interface PedagogicalStrategy {
  id: string
  nom: string
  description: string

  // ── Identity ─────────────────────────────────────────────────────────────────
  enseignantId: string
  classeId: string
  matiereId: string
  academicYear: string
  langue: 'fr' | 'en'

  // ── Objectifs ────────────────────────────────────────────────────────────────
  objectifsGeneraux: string[]     // Learning goals for the year
  outcomesCouverts: string[]      // Outcome IDs from the curriculum

  // ── Approche pédagogique ─────────────────────────────────────────────────────
  approche: StrategyApproach
  justificationApproche: string   // Why this approach was chosen

  // ── Ordre recommandé ─────────────────────────────────────────────────────────
  ordreSequences: string[]        // Sequence IDs, recommended order
  rationaleOrdre: string          // Why this order

  // ── Niveau de difficulté ─────────────────────────────────────────────────────
  niveauDifficulte: DifficultyLevel
  progressionDifficulte: ProgressionType

  // ── Progression ──────────────────────────────────────────────────────────────
  nbSequences: number
  sequencesParTrimestre: [number, number, number]  // Distribution T1/T2/T3

  // ── Évaluations ──────────────────────────────────────────────────────────────
  nbEvaluationsFormatives: number
  nbEvaluationsSommatives: number
  momentEvaluations: EvaluationTiming
  rationaleEvaluations: string

  // ── Différenciation ──────────────────────────────────────────────────────────
  differenciationPrevue: boolean
  strategiesDifferentiation: DifferentiationStrategy[]
  rationaleDifferentiation: string

  // ── Gestion du temps ─────────────────────────────────────────────────────────
  minutesParSemaine: number
  heuresTotalesPrevues: number
  reserveTamponPercent: number    // 0.05–0.20
  rationaleTemps: string

  // ── Gestion des risques ──────────────────────────────────────────────────────
  risquesPrincipaux: string[]
  strategiesAttenuation: string[]

  // ── Qualité (rempli par StrategyValidator) ────────────────────────────────────
  scoreQualite?: number           // 0–100

  createdAt: string
}

// ─── Strategy summary (for display) ──────────────────────────────────────────

export interface PedagogicalStrategySummary {
  id: string
  nom: string
  approche: StrategyApproach
  niveauDifficulte: DifficultyLevel
  scoreQualite?: number
  nbSequences: number
  nbOutcomes: number
  heuresTotalesPrevues: number
  createdAt: string
}
