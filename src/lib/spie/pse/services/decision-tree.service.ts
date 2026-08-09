// SPIE-07 — DecisionTreeService
// Builds and queries the pedagogical decision tree.

import { pedagogicalDecisionTreeBuilder, type DecisionTreeInput } from '../decision-tree/pedagogical-decision-tree'
import type { PedagogicalDecisionTree, StrategyDecisionNode, StrategyDecisionType } from '../types/decision-tree'
import type { PedagogicalStrategy } from '../types/strategy'

export class DecisionTreeService {
  /** Build a decision tree from a strategy and its decision log. */
  build(strategy: PedagogicalStrategy, decisions: StrategyDecisionNode[]): PedagogicalDecisionTree {
    const input: DecisionTreeInput = { strategy, decisions }
    return pedagogicalDecisionTreeBuilder.build(input)
  }

  /** Get a specific decision by type. */
  getDecision(tree: PedagogicalDecisionTree, type: StrategyDecisionType): StrategyDecisionNode | undefined {
    return tree.trace.decisions.find(d => d.type === type)
  }

  /** Get all decisions ordered by confidence score (descending). */
  rankByConfidence(tree: PedagogicalDecisionTree): StrategyDecisionNode[] {
    return [...tree.trace.decisions].sort((a, b) => b.score - a.score)
  }

  /** Average confidence score across all decisions. */
  averageConfidence(tree: PedagogicalDecisionTree): number {
    const decs = tree.trace.decisions
    if (decs.length === 0) return 0
    return Math.round(decs.reduce((sum, d) => sum + d.score, 0) / decs.length)
  }

  /** Return the decision summary as a formatted text block. */
  formatSummary(tree: PedagogicalDecisionTree): string {
    return [
      `Stratégie : ${tree.strategyId}`,
      `Décisions : ${tree.trace.decisions.length}`,
      '',
      ...tree.resumeDecisions,
      '',
      `Conclusion : ${tree.trace.conclusion}`,
    ].join('\n')
  }
}

export const decisionTreeService = new DecisionTreeService()
