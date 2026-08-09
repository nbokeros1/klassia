// SPIE-07 — StrategyRecommendationEngine
// Explains the recommended strategy: pourquoi? avantages? risques? alternatives?

import type { PedagogicalStrategy, StrategyApproach } from '../types/strategy'
import type { StrategyRecommendation, StrategyAlternative } from '../types/recommendation'
import type { StrategyValidationReport } from '../types/validation'
import type { StrategyComparison } from '../types/comparison'

export interface RecommendationEngineInput {
  strategy: PedagogicalStrategy
  validationReport: StrategyValidationReport
  comparison?: StrategyComparison
}

// ─── StrategyRecommendationEngine ────────────────────────────────────────────

export class StrategyRecommendationEngine {
  generate(input: RecommendationEngineInput): StrategyRecommendation {
    const { strategy, validationReport, comparison } = input

    const pourquoi = this.buildPourquoi(strategy, validationReport)
    const avantages = this.buildAvantages(strategy, validationReport)
    const risques = this.buildRisques(strategy, validationReport)
    const alternatives = this.buildAlternatives(strategy, comparison)
    const niveauConfiance = this.computeConfidence(validationReport.scoreGlobal)

    return {
      id: `rec-${Date.now()}`,
      strategyId: strategy.id,
      pourquoi,
      avantages,
      risques,
      alternatives,
      scoreGlobal: validationReport.scoreGlobal,
      niveauConfiance,
      generatedAt: new Date().toISOString(),
    }
  }

  // ─── Pourquoi cette stratégie? ───────────────────────────────────────────────

  private buildPourquoi(s: PedagogicalStrategy, report: StrategyValidationReport): string {
    const approcheFr = s.approche.replace(/_/g, ' ')
    const qualite = report.scoreGlobal >= 80 ? 'élevée' : report.scoreGlobal >= 60 ? 'satisfaisante' : 'partielle'
    return (
      `La stratégie retenue adopte une approche d'${approcheFr} de niveau ${s.niveauDifficulte}, ` +
      `couvrant ${s.outcomesCouverts.length} objectifs du programme en ${s.heuresTotalesPrevues}h. ` +
      `${s.justificationApproche} ` +
      `Qualité globale : ${qualite} (${report.scoreGlobal}/100).`
    )
  }

  // ─── Avantages ───────────────────────────────────────────────────────────────

  private buildAvantages(s: PedagogicalStrategy, report: StrategyValidationReport): string[] {
    const avantages: string[] = []

    // Coverage
    const couvertureDim = report.dimensions.find(d => d.nom === 'couverture_curriculum')
    if (couvertureDim && couvertureDim.score >= 75) {
      avantages.push(`Couverture du programme solide : ${s.outcomesCouverts.length} objectifs planifiés.`)
    }

    // Approach-specific
    const approachAdvantages: Partial<Record<StrategyApproach, string>> = {
      enseignement_direct: "Structure claire et prévisible — maximise l'exposition aux contenus.",
      apprentissage_actif: 'Engagement fort des élèves — favorise la compréhension profonde et la rétention.',
      collaboration: 'Développement des compétences sociales et du soutien mutuel entre élèves.',
      differentie: "Adaptation aux besoins individuels — réduit les inégalités d'apprentissage.",
      spirale: "Consolidation progressive des acquis — évite l'oubli par des retours réguliers.",
      par_projet: 'Mobilisation de compétences transversales — liens avec des contextes authentiques.',
      mixte: 'Flexibilité selon le contexte de chaque séquence — évite la monotonie pédagogique.',
    }
    const approachAdv = approachAdvantages[s.approche]
    if (approachAdv) avantages.push(approachAdv)

    // Differentiation
    if (s.differenciationPrevue) {
      avantages.push(`Différenciation prévue (${s.strategiesDifferentiation.join(', ')}) — soutien pour tous les profils d'élèves.`)
    }

    // Time buffer
    if (s.reserveTamponPercent >= 0.10) {
      avantages.push(`Tampon de ${Math.round(s.reserveTamponPercent * 100)}% intégré — absorbe les imprévus du calendrier.`)
    }

    // Evaluations
    const evalRatio = s.nbEvaluationsFormatives / Math.max(1, s.nbEvaluationsFormatives + s.nbEvaluationsSommatives)
    if (evalRatio >= 0.6) {
      avantages.push(`Évaluations formatives prioritaires (${s.nbEvaluationsFormatives}/${s.nbEvaluationsFormatives + s.nbEvaluationsSommatives}) — rétroaction régulière pour les élèves.`)
    }

    return avantages.slice(0, 4)
  }

  // ─── Risques ─────────────────────────────────────────────────────────────────

  private buildRisques(s: PedagogicalStrategy, report: StrategyValidationReport): string[] {
    const risques: string[] = []

    // From bloqueurs
    for (const b of report.bloqueurs.slice(0, 2)) {
      risques.push(`[Bloqueur] ${b}`)
    }

    // From avertissements
    for (const w of report.avertissements.slice(0, 2)) {
      risques.push(w)
    }

    // From strategy risks
    for (const r of s.risquesPrincipaux.slice(0, 2)) {
      if (!risques.includes(r)) risques.push(r)
    }

    if (risques.length === 0) {
      risques.push('Aucun risque majeur identifié — poursuivre avec vigilance sur la cadence.')
    }

    return risques.slice(0, 4)
  }

  // ─── Alternatives ────────────────────────────────────────────────────────────

  private buildAlternatives(s: PedagogicalStrategy, comparison?: StrategyComparison): StrategyAlternative[] {
    if (!comparison) return this.defaultAlternatives(s.approche)

    const alternatives: StrategyAlternative[] = []
    for (const snap of comparison.snapshots) {
      if (snap.label === 'A') continue
      alternatives.push({
        nom: snap.nom,
        approche: snap.approche,
        pourquoiNonRecommandee: snap.label === comparison.strategyRecommandee
          ? 'Classée seconde — viable mais légèrement moins optimale que la stratégie principale.'
          : `Score qualité inférieur (${snap.scoreQualite}/100) ou couverture réduite (${Math.round(snap.coveragePercent)}%).`,
        avantageRelatif: snap.approche === 'enseignement_direct'
          ? 'Risque réduit, structure prévisible.'
          : 'Engagement accru des élèves.',
        inconvenient: snap.approche === 'enseignement_direct'
          ? "Moins d'autonomie et d'exploration pour les élèves."
          : `${snap.nbRisques} risque(s) supplémentaire(s).`,
      })
    }
    return alternatives
  }

  private defaultAlternatives(current: StrategyApproach): StrategyAlternative[] {
    const map: Partial<Record<StrategyApproach, StrategyAlternative[]>> = {
      enseignement_direct: [
        {
          nom: 'Apprentissage actif',
          approche: 'apprentissage_actif',
          pourquoiNonRecommandee: "Nécessite plus de temps disponible et d'encadrement.",
          avantageRelatif: 'Meilleur engagement et compréhension profonde.',
          inconvenient: "Risque de ne pas couvrir tout le programme avec un volume élevé d'objectifs.",
        },
      ],
      apprentissage_actif: [
        {
          nom: 'Enseignement direct',
          approche: 'enseignement_direct',
          pourquoiNonRecommandee: "Moins d'engagement actif des élèves.",
          avantageRelatif: 'Plus prévisible et efficace en temps.',
          inconvenient: 'Risque de passivité et de moins bonne rétention.',
        },
      ],
    }
    return map[current] ?? []
  }

  // ─── Confidence level ────────────────────────────────────────────────────────

  private computeConfidence(score: number): StrategyRecommendation['niveauConfiance'] {
    if (score >= 80) return 'eleve'
    if (score >= 60) return 'moyen'
    return 'faible'
  }
}

export const strategyRecommendationEngine = new StrategyRecommendationEngine()
