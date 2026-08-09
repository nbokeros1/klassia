// SPIE-02 — Curriculum Graph Service
// Builds and stores the Curriculum Knowledge Graph.

import type { ExtractionOutput } from './curriculum-extractor.service'
import type { CurriculumGraph, CurriculumGraphSerialized, GraphBuildResult } from '../graph/types'
import { curriculumGraphBuilder, serializeGraph, deserializeGraph } from '../graph/graph-builder'

export interface BuildGraphInput {
  extraction: ExtractionOutput
  raw: import('../extraction/types').CurriculumExtractionRaw
}

export class CurriculumGraphService {
  build(input: BuildGraphInput): GraphBuildResult {
    if (!input.extraction.outcomes || !input.extraction.concepts) {
      throw new Error('Extraction incomplète — impossible de construire le graphe.')
    }
    return curriculumGraphBuilder.build(
      input.extraction.outcomes,
      input.extraction.concepts,
      input.extraction.vocabulaire ?? [],
      input.raw,
    )
  }

  serialize(graph: CurriculumGraph): CurriculumGraphSerialized {
    return serializeGraph(graph)
  }

  deserialize(serialized: CurriculumGraphSerialized): CurriculumGraph {
    return deserializeGraph(serialized)
  }

  // Merge multiple graphs (e.g. from different grade levels of the same curriculum)
  merge(graphs: CurriculumGraph[]): CurriculumGraph {
    if (graphs.length === 0) throw new Error('Aucun graphe à fusionner.')
    if (graphs.length === 1) return graphs[0]

    const merged: CurriculumGraph = {
      id: `graph_merged_${Date.now()}`,
      province: graphs[0].province,
      matiere: graphs[0].matiere,
      niveaux: [...new Set(graphs.flatMap(g => g.niveaux ?? []))],
      nodes: new Map(),
      edges: [],
      edgeIndex: new Map(),
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    }

    for (const graph of graphs) {
      for (const [id, node] of graph.nodes) {
        if (!merged.nodes.has(id)) merged.nodes.set(id, node)
      }
      for (const edge of graph.edges) {
        if (!merged.edges.some(e => e.id === edge.id)) {
          merged.edges.push(edge)
          const existing = merged.edgeIndex.get(edge.fromId) ?? []
          existing.push(edge)
          merged.edgeIndex.set(edge.fromId, existing)
        }
      }
    }

    return merged
  }
}

export const curriculumGraphService = new CurriculumGraphService()
