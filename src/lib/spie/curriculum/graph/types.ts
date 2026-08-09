// SPIE-02 — Curriculum Knowledge Graph types
// Strongly-typed graph representation of a parsed curriculum.
// Nodes and edges correspond to the SPIE Knowledge_Graph.md specification.

import type { BloomLevel, OutcomeVocabulary } from '../../types'

// ─── Node types ───────────────────────────────────────────────────────────────

export type GraphNodeType =
  | 'province'
  | 'programme'
  | 'niveau'
  | 'matiere'
  | 'unite'
  | 'outcome_general'
  | 'outcome_specifique'
  | 'competency'
  | 'big_idea'
  | 'concept'
  | 'vocabulary'
  | 'evaluation'
  | 'resource'
  | 'professional_standard'

export interface GraphNodeBase {
  id: string
  type: GraphNodeType
  label: string
  description?: string
  // Province-specific code (A1, B2.1, MA-20-1)
  code?: string
  province?: string
  matiere?: string
  niveaux?: string[]
  tags: string[]
  metadata: Record<string, unknown>
}

export interface OutcomeNode extends GraphNodeBase {
  type: 'outcome_general' | 'outcome_specifique'
  vocabulaireSpie: OutcomeVocabulary
  vocabulaireOriginal: string
  niveauBloom?: BloomLevel
}

export interface ConceptNode extends GraphNodeBase {
  type: 'concept'
  definition?: string
  synonymes: string[]
}

export interface VocabularyNode extends GraphNodeBase {
  type: 'vocabulary'
  definition?: string
  niveauDifficulte?: 'basique' | 'intermediaire' | 'avance'
}

export type GraphNode = GraphNodeBase | OutcomeNode | ConceptNode | VocabularyNode

// ─── Edge types ───────────────────────────────────────────────────────────────

export type GraphEdgeType =
  | 'CONTAINS'           // Programme → Niveau, Niveau → Matière
  | 'BELONGS_TO'         // OutcomeSpecifique → OutcomeGeneral
  | 'REQUIRES'           // Outcome → Concept (outcome uses this concept)
  | 'INVOLVES'           // Activity → Outcome
  | 'USES'               // Leçon → Resource
  | 'EXPRESSES'          // Outcome → Competency (outcome expresses this competency)
  | 'COVERS'             // Séquence → Outcome
  | 'PRECEDES'           // OutcomeA → OutcomeB (temporal order)
  | 'GROUPED_IN'         // Outcome → Unité thématique
  | 'TARGETS'            // Évaluation → Outcome
  | 'ASSESSES'           // Quiz → Outcome
  | 'PREREQUISITE'       // OutcomeA requires OutcomeB first
  | 'ALIGNED_WITH'       // Outcome ↔ Professional Standard

export interface GraphEdge {
  id: string
  type: GraphEdgeType
  fromId: string
  toId: string
  weight?: number         // Optional relevance weight 0–1
  metadata?: Record<string, unknown>
}

// ─── Full graph ───────────────────────────────────────────────────────────────

export interface CurriculumGraph {
  id: string
  curriculumDocumentId?: string
  province?: string
  matiere?: string
  niveaux?: string[]
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
  // Quick lookup index: nodeId → outgoing edges
  edgeIndex: Map<string, GraphEdge[]>
  createdAt: string
  version: string
}

// Serializable form for storage/transfer (Maps → Records)
export interface CurriculumGraphSerialized {
  id: string
  curriculumDocumentId?: string
  province?: string
  matiere?: string
  niveaux?: string[]
  nodes: Record<string, GraphNode>
  edges: GraphEdge[]
  createdAt: string
  version: string
}

// ─── Build result ─────────────────────────────────────────────────────────────

export interface GraphBuildResult {
  graph: CurriculumGraph
  nodesCreated: number
  edgesCreated: number
  warnings: string[]
  durationMs: number
}

// ─── Query interface ─────────────────────────────────────────────────────────
// Named CurriculumGraphQuery to avoid collision with SPIE-01 GraphQuery in types/outcomes.ts

export interface CurriculumGraphQuery {
  fromNodeId?: string
  toNodeId?: string
  edgeType?: GraphEdgeType | GraphEdgeType[]
  nodeType?: GraphNodeType | GraphNodeType[]
  province?: string
  matiere?: string
  niveaux?: string[]
  // Max hops for traversal queries (default 3)
  maxDepth?: number
}

export interface CurriculumGraphQueryResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  paths?: GraphNode[][]
}
