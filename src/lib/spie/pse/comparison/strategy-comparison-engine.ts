// SPIE-07 — StrategyComparisonEngine
// Builds and compares three strategy variants (A/B/C).
// Strategy A = as built. B = alternative approach. C = most conservative.

import type { PedagogicalStrategy, StrategyApproach, DifficultyLevel } from '../types/strategy'
import type {
  StrategyComparison,
  StrategyComparisonLabel,
  StrategyComparisonRow,
  StrategySnapshot,
} from '../types/comparison'
import type { PedagogicalSimulation } from '../../pps/types/simulation'

export interface ComparisonEngineInput {
  strategyA: PedagogicalStrategy
  simulation?: PedagogicalSimulation
  totalSemaines?: number
}

// ─── StrategyComparisonEngine ────────────────────────────────────────────────

export class StrategyComparisonEngine {
  buildComparison(input: ComparisonEngineInput): StrategyComparison {
    const { strategyA, simulation, totalSemaines = 38 } = input

    const snapA = this.snapshotA(strategyA, simulation)
    const snapB = this.snapshotB(strategyA, simulation)
    const snapC = this.snapshotC(strategyA, simulation)

    const snapshots = [snapA, snapB, snapC]
    const tableau = this.buildTable(snapshots, totalSemaines)
    const recommandee = this.recommend(snapshots)

    return {
      snapshots,
      strategyRecommandee: recommandee,
      raisonRecommandation: this.buildReason(snapshots, recommandee),
      tableau,
      analyseNarrative: this.buildNarrative(snapshots, recommandee),
    }
  }

  // ─── Snapshot A : the strategy as built ──────────────────────────────────────

  private snapshotA(s: PedagogicalStrategy, sim?: PedagogicalSimulation): StrategySnapshot {
    return {
      label: 'A',
      nom: s.nom,
      approche: s.approche,
      niveauDifficulte: s.niveauDifficulte,
      heuresPlanifiees: s.heuresTotalesPrevues,
      coveragePercent: (s.outcomesCouverts.length / Math.max(s.outcomesCouverts.length, 1)) * 100,
      nbRisques: (sim?.nbRisquesCritiques ?? 0) + (sim?.nbRisquesMajeurs ?? 0),
      chargeHebdoMoyenne: Math.round((s.minutesParSemaine / 60) * 10) / 10,
      scoreQualite: s.scoreQualite ?? 70,
      justification: s.justificationApproche,
    }
  }

  // ─── Snapshot B : alternative approach ───────────────────────────────────────

  private snapshotB(s: PedagogicalStrategy, sim?: PedagogicalSimulation): StrategySnapshot {
    const altApproach = this.alternativeApproach(s.approche)
    const altDifficulty = this.alternativeDifficulty(s.niveauDifficulte, altApproach)
    // B compresses time slightly (less tampon) but may add risk
    const heures = Math.round(s.heuresTotalesPrevues * 1.05 * 10) / 10
    const nbRisquesB = Math.min(10, (sim?.nbRisquesCritiques ?? 0) + (sim?.nbRisquesMajeurs ?? 0) + 1)

    return {
      label: 'B',
      nom: `Stratégie ${altApproach.replace(/_/g, ' ')} — alternative`,
      approche: altApproach,
      niveauDifficulte: altDifficulty,
      heuresPlanifiees: heures,
      coveragePercent: Math.max(75, (s.outcomesCouverts.length / Math.max(s.outcomesCouverts.length, 1)) * 100 - 5),
      nbRisques: nbRisquesB,
      chargeHebdoMoyenne: Math.round((s.minutesParSemaine * 1.05 / 60) * 10) / 10,
      scoreQualite: Math.max(50, (s.scoreQualite ?? 70) - 5),
      justification: this.getAltJustification(altApproach),
    }
  }

  // ─── Snapshot C : most conservative ──────────────────────────────────────────

  private snapshotC(s: PedagogicalStrategy, sim?: PedagogicalSimulation): StrategySnapshot {
    // Conservative: direct instruction, medium difficulty, 15% tampon
    const heures = Math.round(s.heuresTotalesPrevues * 0.90 * 10) / 10
    const coverage = Math.max(70, (s.outcomesCouverts.length / Math.max(s.outcomesCouverts.length, 1)) * 100 - 10)
    const nbRisquesC = Math.max(0, ((sim?.nbRisquesCritiques ?? 0) + (sim?.nbRisquesMajeurs ?? 0)) - 1)

    return {
      label: 'C',
      nom: 'Stratégie conservatrice — enseignement direct',
      approche: 'enseignement_direct',
      niveauDifficulte: 'moyen',
      heuresPlanifiees: heures,
      coveragePercent: coverage,
      nbRisques: nbRisquesC,
      chargeHebdoMoyenne: Math.round((s.minutesParSemaine * 0.90 / 60) * 10) / 10,
      scoreQualite: Math.min(100, (s.scoreQualite ?? 70) + 3),
      justification: 'Approche directe structurée avec tampon généreux (15%) — priorité à la sécurité du programme.',
    }
  }

  // ─── Build comparison table ───────────────────────────────────────────────────

  private buildTable(snaps: StrategySnapshot[], totalSemaines: number): StrategyComparisonRow[] {
    const row = (
      dimension: string,
      extract: (s: StrategySnapshot) => string | number,
      higherIsBetter: boolean,
    ): StrategyComparisonRow => {
      const valeurs = Object.fromEntries(snaps.map(s => [s.label, extract(s)])) as Record<StrategyComparisonLabel, string | number>
      const meilleur = this.best(snaps, extract, higherIsBetter)
      return { dimension, valeurs, meilleur, higherIsBetter }
    }

    return [
      row('Approche pédagogique', s => s.approche.replace(/_/g, ' '), true),
      row('Niveau de difficulté', s => s.niveauDifficulte, true),
      row('Heures planifiées', s => s.heuresPlanifiees, false),
      row('Couverture du programme (%)', s => Math.round(s.coveragePercent), true),
      row('Nb de risques identifiés', s => s.nbRisques, false),
      row('Charge hebdomadaire (h/sem)', s => s.chargeHebdoMoyenne, false),
      row('Score qualité', s => s.scoreQualite, true),
    ]
  }

  // ─── Recommendation ───────────────────────────────────────────────────────────

  private recommend(snaps: StrategySnapshot[]): StrategyComparisonLabel {
    // Exclude irrealisable (too many risks)
    const eligible = snaps.filter(s => s.nbRisques < 5)
    const candidates = eligible.length ? eligible : snaps
    // Maximize score, then coverage
    return candidates.reduce((best, curr) =>
      curr.scoreQualite > best.scoreQualite || (curr.scoreQualite === best.scoreQualite && curr.coveragePercent > best.coveragePercent)
        ? curr : best
    ).label
  }

  private buildReason(snaps: StrategySnapshot[], label: StrategyComparisonLabel): string {
    const snap = snaps.find(s => s.label === label)!
    return `La stratégie ${label} (${snap.approche.replace(/_/g, ' ')}) offre le meilleur score qualité (${snap.scoreQualite}/100) avec ${Math.round(snap.coveragePercent)}% de couverture et ${snap.nbRisques} risque(s).`
  }

  private buildNarrative(snaps: StrategySnapshot[], recommandee: StrategyComparisonLabel): string {
    const a = snaps.find(s => s.label === 'A')!
    const b = snaps.find(s => s.label === 'B')!
    const c = snaps.find(s => s.label === 'C')!
    return [
      `Stratégie A (${a.approche.replace(/_/g, ' ')}) : approche principale, score ${a.scoreQualite}/100.`,
      `Stratégie B (${b.approche.replace(/_/g, ' ')}) : alternative plus engageante, +${Math.round((b.heuresPlanifiees - a.heuresPlanifiees) / a.heuresPlanifiees * 100)}% de temps prévu.`,
      `Stratégie C (${c.approche.replace(/_/g, ' ')}) : option conservatrice, tampon maximisé, couverture réduite à ${Math.round(c.coveragePercent)}%.`,
      `Recommandation : stratégie ${recommandee}.`,
    ].join(' ')
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private alternativeApproach(current: StrategyApproach): StrategyApproach {
    const map: Partial<Record<StrategyApproach, StrategyApproach>> = {
      enseignement_direct: 'apprentissage_actif',
      apprentissage_actif: 'collaboration',
      collaboration: 'apprentissage_actif',
      differentie: 'mixte',
      spirale: 'apprentissage_actif',
      par_projet: 'collaboration',
      mixte: 'apprentissage_actif',
    }
    return map[current] ?? 'mixte'
  }

  private alternativeDifficulty(current: DifficultyLevel, approach: StrategyApproach): DifficultyLevel {
    if (approach === 'apprentissage_actif' || approach === 'collaboration') return 'exigeant'
    return current
  }

  private getAltJustification(approach: StrategyApproach): string {
    const map: Partial<Record<StrategyApproach, string>> = {
      apprentissage_actif: "Exploration active par les élèves — favorise l'engagement et la compréhension profonde.",
      collaboration: 'Apprentissage coopératif — développe les compétences sociales et le soutien par les pairs.',
      mixte: 'Flexibilité entre approches selon la nature de chaque séquence.',
    }
    return map[approach] ?? "Approche alternative pour diversifier les modalités d'enseignement."
  }

  private best(
    snaps: StrategySnapshot[],
    extract: (s: StrategySnapshot) => string | number,
    higherIsBetter: boolean,
  ): StrategyComparisonLabel | undefined {
    const numeric = snaps.every(s => typeof extract(s) === 'number')
    if (!numeric) return undefined
    return snaps.reduce((best, curr) => {
      const bVal = extract(best) as number
      const cVal = extract(curr) as number
      return higherIsBetter ? (cVal > bVal ? curr : best) : (cVal < bVal ? curr : best)
    }).label
  }
}

export const strategyComparisonEngine = new StrategyComparisonEngine()
