// SPIE-02 — Curriculum Knowledge Graph builder
// Takes the normalized extraction and constructs a traversable CurriculumGraph.
// Province-agnostic.

import type {
  CurriculumGraph,
  CurriculumGraphSerialized,
  GraphNode,
  GraphEdge,
  GraphBuildResult,
  OutcomeNode,
  ConceptNode,
  VocabularyNode,
} from './types'
import type { NormalizedOutcome, NormalizedConcept, NormalizedVocabularyItem } from '../extraction/types'
import type { CurriculumExtractionRaw } from '../extraction/types'

function makeEdgeId(type: string, from: string, to: string): string {
  return `${type}_${from}_${to}`
}

// ─── Graph builder ────────────────────────────────────────────────────────────

export class CurriculumGraphBuilder {
  private nodes: Map<string, GraphNode> = new Map()
  private edges: GraphEdge[] = []
  private edgeIndex: Map<string, GraphEdge[]> = new Map()
  private warnings: string[] = []

  build(
    outcomes: NormalizedOutcome[],
    concepts: NormalizedConcept[],
    vocabulaire: NormalizedVocabularyItem[],
    raw: CurriculumExtractionRaw,
  ): GraphBuildResult {
    const startMs = Date.now()
    this.nodes.clear()
    this.edges = []
    this.edgeIndex.clear()
    this.warnings = []

    // ── 1. Add province/programme root nodes ─────────────────────────────────
    if (raw.province) {
      this.addNode({
        id: `province_${raw.province}`,
        type: 'province',
        label: raw.province,
        tags: [],
        metadata: { pays: raw.pays },
      })
    }

    if (raw.matiere) {
      const matiereId = `matiere_${raw.matiere.replace(/\s+/g, '_').toLowerCase()}`
      this.addNode({
        id: matiereId,
        type: 'matiere',
        label: raw.matiere,
        province: raw.province,
        tags: [],
        metadata: { niveaux: raw.niveaux },
      })
    }

    // ── 2. Add outcome nodes ─────────────────────────────────────────────────
    for (const outcome of outcomes) {
      const node: OutcomeNode = {
        id: outcome.id,
        type: outcome.vocabulaireSpie === 'rag_ras' || outcome.vocabulaireSpie === 'expectations' || outcome.vocabulaireSpie === 'standards'
          ? (outcome.parentId ? 'outcome_specifique' : 'outcome_general')
          : 'outcome_general',
        label: outcome.code ? `${outcome.code} — ${outcome.texte.substring(0, 60)}` : outcome.texte.substring(0, 80),
        description: outcome.texte,
        code: outcome.code,
        province: raw.province,
        matiere: raw.matiere,
        niveaux: raw.niveaux,
        vocabulaireSpie: outcome.vocabulaireSpie,
        vocabulaireOriginal: outcome.vocabulaireOriginal,
        niveauBloom: outcome.niveauBloom,
        tags: outcome.tags,
        metadata: {},
      }
      this.addNode(node)

      // BELONGS_TO edge: specific → general
      if (outcome.parentId && this.nodes.has(outcome.parentId)) {
        this.addEdge({ type: 'BELONGS_TO', fromId: outcome.id, toId: outcome.parentId })
      }
    }

    // ── 3. Add concept nodes and REQUIRES edges ──────────────────────────────
    for (const concept of concepts) {
      const node: ConceptNode = {
        id: concept.id,
        type: 'concept',
        label: concept.terme,
        description: concept.definition,
        definition: concept.definition,
        synonymes: concept.synonymes,
        tags: [],
        metadata: {},
      }
      this.addNode(node)

      // REQUIRES edges: outcomes → concept
      for (const outcomeId of concept.outcomesIds) {
        if (this.nodes.has(outcomeId)) {
          this.addEdge({ type: 'REQUIRES', fromId: outcomeId, toId: concept.id })
        }
      }
    }

    // ── 4. Add vocabulary nodes ──────────────────────────────────────────────
    for (const item of vocabulaire) {
      const node: VocabularyNode = {
        id: item.id,
        type: 'vocabulary',
        label: item.terme,
        description: item.definition,
        definition: item.definition,
        niveauDifficulte: item.niveauDifficulte,
        tags: [],
        metadata: { contexte: item.contexte },
      }
      this.addNode(node)
    }

    // ── 5. Build the graph ───────────────────────────────────────────────────
    const graph: CurriculumGraph = {
      id: `graph_${Date.now()}`,
      curriculumDocumentId: undefined,
      province: raw.province,
      matiere: raw.matiere,
      niveaux: raw.niveaux,
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      edgeIndex: new Map(this.edgeIndex),
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    }

    return {
      graph,
      nodesCreated: this.nodes.size,
      edgesCreated: this.edges.length,
      warnings: [...this.warnings],
      durationMs: Date.now() - startMs,
    }
  }

  private addNode(node: GraphNode): void {
    if (this.nodes.has(node.id)) {
      this.warnings.push(`Node dupliqué ignoré: ${node.id}`)
      return
    }
    this.nodes.set(node.id, node)
  }

  private addEdge(partial: Pick<GraphEdge, 'type' | 'fromId' | 'toId'> & Partial<GraphEdge>): void {
    const edge: GraphEdge = {
      id: makeEdgeId(partial.type, partial.fromId, partial.toId),
      ...partial,
    }
    // Prevent duplicate edges
    if (this.edges.some(e => e.id === edge.id)) return

    this.edges.push(edge)

    const existing = this.edgeIndex.get(edge.fromId) ?? []
    existing.push(edge)
    this.edgeIndex.set(edge.fromId, existing)
  }
}

// ─── Serialization helpers ────────────────────────────────────────────────────

export function serializeGraph(graph: CurriculumGraph): CurriculumGraphSerialized {
  return {
    id: graph.id,
    curriculumDocumentId: graph.curriculumDocumentId,
    province: graph.province,
    matiere: graph.matiere,
    niveaux: graph.niveaux,
    nodes: Object.fromEntries(graph.nodes),
    edges: graph.edges,
    createdAt: graph.createdAt,
    version: graph.version,
  }
}

export function deserializeGraph(serialized: CurriculumGraphSerialized): CurriculumGraph {
  const edgeIndex = new Map<string, GraphEdge[]>()
  for (const edge of serialized.edges) {
    const existing = edgeIndex.get(edge.fromId) ?? []
    existing.push(edge)
    edgeIndex.set(edge.fromId, existing)
  }
  return {
    ...serialized,
    nodes: new Map(Object.entries(serialized.nodes)),
    edgeIndex,
  }
}

export const curriculumGraphBuilder = new CurriculumGraphBuilder()
