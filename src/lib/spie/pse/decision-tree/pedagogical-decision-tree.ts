// SPIE-07 — PedagogicalDecisionTreeBuilder
// Converts the decision log from StrategyBuilder into a full, traceable tree.

import type { PedagogicalDecisionTree, StrategyDecisionNode, StrategyDecisionTrace } from '../types/decision-tree'
import type { PedagogicalStrategy } from '../types/strategy'

export interface DecisionTreeInput {
  strategy: PedagogicalStrategy
  decisions: StrategyDecisionNode[]
}

// ─── PedagogicalDecisionTreeBuilder ──────────────────────────────────────────

export class PedagogicalDecisionTreeBuilder {
  build(input: DecisionTreeInput): PedagogicalDecisionTree {
    const { strategy, decisions } = input
    const trace = this.buildTrace(strategy, decisions)

    return {
      id: `tree-${Date.now()}`,
      strategyId: strategy.id,
      classeId: strategy.classeId,
      enseignantId: strategy.enseignantId,
      trace,
      resumeDecisions: this.buildSummary(decisions),
      createdAt: new Date().toISOString(),
    }
  }

  // ─── Decision trace ────────────────────────────────────────────────────────

  private buildTrace(strategy: PedagogicalStrategy, decisions: StrategyDecisionNode[]): StrategyDecisionTrace {
    const factorsGlobaux = this.extractGlobalFactors(decisions)
    const conclusion = this.buildConclusion(strategy, decisions)

    return {
      strategyId: strategy.id,
      decisions,
      conclusion,
      factorsGlobaux,
    }
  }

  // ─── Global factors ────────────────────────────────────────────────────────

  private extractGlobalFactors(decisions: StrategyDecisionNode[]): string[] {
    const allFactors = decisions.flatMap(d => d.facteursConsideres)
    // Deduplicate and keep the most frequently occurring factors
    const freq = new Map<string, number>()
    for (const f of allFactors) {
      freq.set(f, (freq.get(f) ?? 0) + 1)
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([factor]) => factor)
  }

  // ─── Conclusion ────────────────────────────────────────────────────────────

  private buildConclusion(strategy: PedagogicalStrategy, decisions: StrategyDecisionNode[]): string {
    const avgScore = decisions.length > 0
      ? Math.round(decisions.reduce((s, d) => s + d.score, 0) / decisions.length)
      : 0
    const decisionCount = decisions.length

    return (
      `${decisionCount} décision(s) tracée(s) avec un indice de confiance moyen de ${avgScore}/100. ` +
      `Stratégie retenue : approche ${strategy.approche.replace(/_/g, ' ')}, ` +
      `niveau ${strategy.niveauDifficulte}, ${strategy.nbSequences} séquence(s), ` +
      `${strategy.heuresTotalesPrevues}h planifiées.`
    )
  }

  // ─── Human-readable summary ────────────────────────────────────────────────

  private buildSummary(decisions: StrategyDecisionNode[]): string[] {
    return decisions.map(d => {
      const label = this.decisionTypeLabel(d.type)
      return `${label} : "${d.reponse}" (confiance ${d.score}%)`
    })
  }

  private decisionTypeLabel(type: StrategyDecisionNode['type']): string {
    const labels: Record<StrategyDecisionNode['type'], string> = {
      choix_approche: 'Approche pédagogique',
      niveau_difficulte: 'Niveau de difficulté',
      ordre_sequences: 'Ordre des séquences',
      planification_evals: 'Évaluations',
      differentiation: 'Différenciation',
      gestion_temps: 'Gestion du temps',
      gestion_risques: 'Gestion des risques',
    }
    return labels[type] ?? type
  }
}

export const pedagogicalDecisionTreeBuilder = new PedagogicalDecisionTreeBuilder()
