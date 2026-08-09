// SPIE — Learning Outcomes, Competencies, and Knowledge Graph nodes
// These types form the heart of the Curriculum Knowledge Graph (CKG).

// ─── Bloom's Taxonomy ──────────────────────────────────────────────────────────

export type BloomLevel =
  | 'connaissance'      // Remember / Mémoriser
  | 'comprehension'     // Understand / Comprendre
  | 'application'       // Apply / Appliquer
  | 'analyse'           // Analyze / Analyser
  | 'evaluation'        // Evaluate / Évaluer
  | 'creation'          // Create / Créer

// ─── Learning Outcome General ─────────────────────────────────────────────────
// RAG (Alberta/SK) / Overall Expectation (Ontario) / Compétence disciplinaire (QC)
// / Big Outcome (BC) / Standard (USA)

export interface LearningOutcomeGeneral {
  id: string
  curriculumId: string
  extractionId?: string
  // Official code in the curriculum (e.g. "A", "1.A", "B1", "MA-1")
  code: string
  niveau: string                      // Grade level: "4", "10", "Secondaire 1"
  matiere: string                     // Subject area
  domaine?: string                    // Domain/strand: "Nombre", "Géométrie", etc.
  libelle: string                     // In the curriculum's primary language
  libelleFr?: string                  // French translation
  libelleEn?: string                  // English translation
  description?: string                // Extended description
  ordreAffichage: number              // Display order within the curriculum
  // References to specific outcomes (IDs)
  outcomesSpecifiquesIds: string[]
  // Optional: which Big Ideas this outcome connects to
  bigIdeesIds?: string[]
  metadonnees?: Record<string, unknown>
}

// ─── Learning Outcome Specific ─────────────────────────────────────────────────
// RAS (Alberta/SK) / Specific Expectation (Ontario) / Indicateur (QC)
// / Curricular Competency (BC)

export interface LearningOutcomeSpecific {
  id: string
  curriculumId: string
  outcomeGeneralId: string
  extractionId?: string
  // Official code (e.g. "A1", "B2.1", "RAS3", "MA-1-a")
  code: string
  niveau: string
  matiere: string
  libelle: string
  libelleFr?: string
  libelleEn?: string
  description?: string
  // Cognitive level in Bloom's taxonomy
  niveauBloom?: BloomLevel
  // Verb used in the outcome (indicates Bloom level)
  verbeAction?: string
  ordreAffichage: number
  // Knowledge graph relations
  competencesIds: string[]
  conceptsIds: string[]
  vocabulaireIds: string[]
  bigIdeesIds?: string[]
  // Prerequisite outcomes (must be taught before this one)
  prerequisitesIds: string[]
  // Outcomes that follow this one
  successorsIds: string[]
  // Performance indicators (e.g. Saskatchewan "indicateurs de rendement")
  indicateurs?: string[]
  metadonnees?: Record<string, unknown>
}

// ─── Competency ────────────────────────────────────────────────────────────────
// Disciplinary or cross-curricular competency

export type CompetencyType =
  | 'disciplinaire'     // Subject-specific competency
  | 'transversale'      // Cross-curricular (e.g. PFEQ transversales)
  | 'curriculaire'      // Curricular competency (BC)
  | 'essentielle'       // Essential competency
  | 'base'              // Core competency (communication, thinking, social)

export interface Competency {
  id: string
  curriculumId?: string
  code?: string
  nom: string
  nomAnglais?: string
  description?: string
  type: CompetencyType
  domaine?: string
  // Performance indicators for this competency
  indicateurs?: string[]
  // Which outcomes reference this competency
  outcomesIds?: string[]
  metadonnees?: Record<string, unknown>
}

// ─── Big Idea ──────────────────────────────────────────────────────────────────
// BC Curriculum "Big Ideas" / IB "Central Ideas" / Quebec "concepts organisateurs"

export interface BigIdea {
  id: string
  curriculumId: string
  niveau: string
  matiere: string
  libelle: string
  libelleFr?: string
  libelleEn?: string
  description?: string
  // Essential questions this big idea prompts
  questionsEssentielles?: string[]
  ordreAffichage: number
  metadonnees?: Record<string, unknown>
}

// ─── Essential Knowledge ───────────────────────────────────────────────────────
// Content knowledge that must be mastered (distinct from competencies)

export interface EssentialKnowledge {
  id: string
  curriculumId?: string
  outcomesSpecifiquesIds: string[]
  libelle: string
  description?: string
  type: 'conceptuel' | 'procedurale' | 'metacognitive' | 'factuel'
  niveau: string
  matiere: string
}

// ─── Concept ───────────────────────────────────────────────────────────────────
// A disciplinary concept used in the knowledge graph

export interface Concept {
  id: string
  curriculumId?: string
  nom: string
  nomAnglais?: string
  definition?: string
  domaine?: string
  niveau?: string
  matiere?: string
  // Related vocabulary terms
  vocabulaireIds: string[]
  // Related concepts (bidirectional)
  conceptsLiesIds?: string[]
  metadonnees?: Record<string, unknown>
}

// ─── Vocabulary ────────────────────────────────────────────────────────────────
// Disciplinary vocabulary term

export interface Vocabulary {
  id: string
  curriculumId?: string
  terme: string
  termeAnglais?: string
  definition: string
  definitionSimplifiee?: string   // For younger students
  exemple?: string
  domaine?: string
  matiere?: string
  niveaux?: string[]              // Which grades this term is introduced in
  conceptId?: string              // The concept this term belongs to
}

// ─── Knowledge Graph ───────────────────────────────────────────────────────────
// The assembled graph after CKG processes a CurriculumExtraction

export interface CurriculumKnowledgeGraph {
  curriculumId: string
  extractionId: string
  matiere: string
  niveau: string
  outcomesGeneraux: LearningOutcomeGeneral[]
  outcomesSpecifiques: LearningOutcomeSpecific[]
  competences: Competency[]
  bigIdees: BigIdea[]
  essentialKnowledge: EssentialKnowledge[]
  concepts: Concept[]
  vocabulaire: Vocabulary[]
  createdAt: string
  updatedAt: string
}

// ─── Graph Query ───────────────────────────────────────────────────────────────
// Parameters for querying the knowledge graph

export interface GraphQuery {
  curriculumId?: string
  matiere?: string
  niveau?: string
  outcomesGenerauxIds?: string[]
  bloomLevels?: BloomLevel[]
  includePrerequisites?: boolean
  includeSuccessors?: boolean
}
