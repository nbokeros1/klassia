// SPIE-02 — Graph query functions
// Traversal and lookup functions for CurriculumGraph.

import type { CurriculumGraph, GraphNode, GraphEdge, CurriculumGraphQuery, CurriculumGraphQueryResult, GraphEdgeType, GraphNodeType } from './types'

// ─── Basic lookups ────────────────────────────────────────────────────────────

export function getNode(graph: CurriculumGraph, nodeId: string): GraphNode | undefined {
  return graph.nodes.get(nodeId)
}

export function getNodesByType(graph: CurriculumGraph, type: GraphNodeType): GraphNode[] {
  return Array.from(graph.nodes.values()).filter(n => n.type === type)
}

export function getOutgoingEdges(graph: CurriculumGraph, nodeId: string, edgeType?: GraphEdgeType): GraphEdge[] {
  const edges = graph.edgeIndex.get(nodeId) ?? []
  return edgeType ? edges.filter(e => e.type === edgeType) : edges
}

export function getIncomingEdges(graph: CurriculumGraph, nodeId: string, edgeType?: GraphEdgeType): GraphEdge[] {
  return graph.edges.filter(e => e.toId === nodeId && (!edgeType || e.type === edgeType))
}

// ─── Traversal ───────────────────────────────────────────────────────────────

// Get all specific outcomes for a general outcome
export function getSpecificOutcomes(graph: CurriculumGraph, generalOutcomeId: string): GraphNode[] {
  const incoming = getIncomingEdges(graph, generalOutcomeId, 'BELONGS_TO')
  return incoming.map(e => graph.nodes.get(e.fromId)).filter((n): n is GraphNode => n !== undefined)
}

// Get all concepts required by an outcome
export function getRequiredConcepts(graph: CurriculumGraph, outcomeId: string): GraphNode[] {
  const outgoing = getOutgoingEdges(graph, outcomeId, 'REQUIRES')
  return outgoing.map(e => graph.nodes.get(e.toId)).filter((n): n is GraphNode => n !== undefined)
}

// Get all outcomes that require a concept
export function getOutcomesForConcept(graph: CurriculumGraph, conceptId: string): GraphNode[] {
  const incoming = getIncomingEdges(graph, conceptId, 'REQUIRES')
  return incoming.map(e => graph.nodes.get(e.fromId)).filter((n): n is GraphNode => n !== undefined)
}

// Get prerequisites for an outcome (outcomes that must precede it)
export function getPrerequisites(graph: CurriculumGraph, outcomeId: string, maxDepth = 3): GraphNode[] {
  const visited = new Set<string>()
  const result: GraphNode[] = []

  function traverse(id: string, depth: number): void {
    if (depth > maxDepth || visited.has(id)) return
    visited.add(id)

    const prereqEdges = getIncomingEdges(graph, id, 'PREREQUISITE')
    for (const edge of prereqEdges) {
      const node = graph.nodes.get(edge.fromId)
      if (node && !visited.has(node.id)) {
        result.push(node)
        traverse(node.id, depth + 1)
      }
    }
  }

  traverse(outcomeId, 0)
  return result
}

// Get all outcomes for a province/matière/niveau filter
export function queryOutcomes(
  graph: CurriculumGraph,
  filter: { province?: string; matiere?: string; niveaux?: string[] }
): GraphNode[] {
  return Array.from(graph.nodes.values()).filter(node => {
    if (node.type !== 'outcome_general' && node.type !== 'outcome_specifique') return false
    if (filter.province && node.province !== filter.province) return false
    if (filter.matiere && node.matiere !== filter.matiere) return false
    if (filter.niveaux?.length && node.niveaux) {
      const hasMatch = filter.niveaux.some(n => node.niveaux?.includes(n))
      if (!hasMatch) return false
    }
    return true
  })
}

// ─── General query ────────────────────────────────────────────────────────────

export function executeQuery(graph: CurriculumGraph, query: CurriculumGraphQuery): CurriculumGraphQueryResult {
  let nodes: GraphNode[] = Array.from(graph.nodes.values())
  let edges: GraphEdge[] = graph.edges

  if (query.nodeType) {
    const types = Array.isArray(query.nodeType) ? query.nodeType : [query.nodeType]
    nodes = nodes.filter(n => types.includes(n.type))
  }

  if (query.province) {
    nodes = nodes.filter(n => !n.province || n.province === query.province)
  }

  if (query.matiere) {
    nodes = nodes.filter(n => !n.matiere || n.matiere === query.matiere)
  }

  if (query.edgeType) {
    const types = Array.isArray(query.edgeType) ? query.edgeType : [query.edgeType]
    edges = edges.filter(e => types.includes(e.type))
  }

  if (query.fromNodeId) {
    edges = edges.filter(e => e.fromId === query.fromNodeId)
    const connectedIds = new Set(edges.map(e => e.toId))
    nodes = nodes.filter(n => connectedIds.has(n.id))
  }

  if (query.toNodeId) {
    edges = edges.filter(e => e.toId === query.toNodeId)
    const connectedIds = new Set(edges.map(e => e.fromId))
    nodes = nodes.filter(n => connectedIds.has(n.id))
  }

  return { nodes, edges }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface GraphSummary {
  totalNodes: number
  totalEdges: number
  byNodeType: Record<string, number>
  byEdgeType: Record<string, number>
  province?: string
  matiere?: string
  niveaux?: string[]
}

export function summarizeGraph(graph: CurriculumGraph): GraphSummary {
  const byNodeType: Record<string, number> = {}
  const byEdgeType: Record<string, number> = {}

  for (const node of graph.nodes.values()) {
    byNodeType[node.type] = (byNodeType[node.type] ?? 0) + 1
  }
  for (const edge of graph.edges) {
    byEdgeType[edge.type] = (byEdgeType[edge.type] ?? 0) + 1
  }

  return {
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.length,
    byNodeType,
    byEdgeType,
    province: graph.province,
    matiere: graph.matiere,
    niveaux: graph.niveaux,
  }
}
