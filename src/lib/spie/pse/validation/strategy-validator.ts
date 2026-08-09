// SPIE-07 — StrategyValidator
// Validates a PedagogicalStrategy across 7 dimensions.
// Returns a StrategyValidationReport with a quality score.

import type { PedagogicalStrategy } from '../types/strategy'
import type {
  StrategyValidationReport,
  StrategyValidationDimension,
  StrategyValidationDimensionName,
  ValidationStatut,
} from '../types/validation'
import type { PedagogicalSimulation } from '../../pps/types/simulation'
import type { AcademicYearTwin } from '../../aydte/types/twin'

// Dimension weights must sum to 100
const WEIGHTS: Record<StrategyValidationDimensionName, number> = {
  coherence: 15,
  couverture_curriculum: 25,
  equilibre: 15,
  gestion_temps: 20,
  competences: 10,
  evaluations: 10,
  contraintes: 5,
}

export interface StrategyValidatorInput {
  strategy: PedagogicalStrategy
  totalOutcomes: number            // From curriculum
  heuresDisponibles: number        // From calendar
  simulation?: PedagogicalSimulation
  twin?: AcademicYearTwin
}

// ─── StrategyValidator ────────────────────────────────────────────────────────

export class StrategyValidator {
  validate(input: StrategyValidatorInput): StrategyValidationReport {
    const t0 = Date.now()
    const avertissements: string[] = []
    const bloqueurs: string[] = []

    const dims: StrategyValidationDimension[] = [
      this.validateCoherence(input, avertissements),
      this.validateCouverture(input, avertissements, bloqueurs),
      this.validateEquilibre(input, avertissements),
      this.validateTemps(input, avertissements, bloqueurs),
      this.validateCompetences(input, avertissements),
      this.validateEvaluations(input, avertissements),
      this.validateContraintes(input, avertissements, bloqueurs),
    ]

    const scoreGlobal = this.computeGlobalScore(dims)
    const validePourGeneration = scoreGlobal >= 60 && bloqueurs.length === 0

    return {
      id: `val-${Date.now()}`,
      strategyId: input.strategy.id,
      scoreGlobal: Math.round(scoreGlobal),
      validePourGeneration,
      dimensions: dims,
      avertissements,
      bloqueurs,
      validatedAt: new Date().toISOString(),
      durationMs: Date.now() - t0,
    }
  }

  // ─── Coherence ──────────────────────────────────────────────────────────────

  private validateCoherence(input: StrategyValidatorInput, warns: string[]): StrategyValidationDimension {
    const { approche, niveauDifficulte } = input.strategy
    let score = 90
    let details = 'Approche et niveau de difficulté cohérents.'

    // Contradiction: direct teaching + very demanding → rarely coherent
    if (approche === 'enseignement_direct' && niveauDifficulte === 'tres_exigeant') {
      score = 55
      details = "Enseignement direct avec niveau très exigeant : risque de manque d'approfondissement."
      warns.push("L'approche directe est moins adaptée à un niveau très exigeant — envisagez l'apprentissage actif.")
    }
    // Active learning + accessible → slight concern
    else if (approche === 'apprentissage_actif' && niveauDifficulte === 'accessible') {
      score = 70
      details = "Apprentissage actif avec niveau accessible : assurez-vous d'un encadrement fort."
      warns.push("L'apprentissage actif avec un niveau accessible nécessite un étayage soutenu.")
    }

    return this.dim('coherence', score, details)
  }

  // ─── Curriculum coverage ────────────────────────────────────────────────────

  private validateCouverture(
    input: StrategyValidatorInput,
    warns: string[],
    bloqueurs: string[],
  ): StrategyValidationDimension {
    const covered = input.strategy.outcomesCouverts.length
    const total = input.totalOutcomes
    const pct = total > 0 ? (covered / total) * 100 : 100

    let score: number
    let details: string
    if (pct >= 90) {
      score = 100
      details = `Couverture excellente : ${covered}/${total} objectifs (${Math.round(pct)}%).`
    } else if (pct >= 80) {
      score = 75
      details = `Couverture acceptable : ${covered}/${total} (${Math.round(pct)}%).`
      warns.push(`Couverture de ${Math.round(pct)}% — cible recommandée : 90%.`)
    } else if (pct >= 60) {
      score = 45
      details = `Couverture insuffisante : ${covered}/${total} (${Math.round(pct)}%).`
      warns.push(`Couverture critique : ${Math.round(pct)}% — au moins 80% recommandé.`)
    } else {
      score = 20
      details = `Couverture trop faible : ${covered}/${total} (${Math.round(pct)}%).`
      bloqueurs.push(`Couverture du programme insuffisante : ${Math.round(pct)}% (minimum 60%).`)
    }

    return this.dim('couverture_curriculum', score, details, covered, total)
  }

  // ─── Balance across trimesters ──────────────────────────────────────────────

  private validateEquilibre(input: StrategyValidatorInput, warns: string[]): StrategyValidationDimension {
    const [t1, t2, t3] = input.strategy.sequencesParTrimestre
    const total = t1 + t2 + t3
    if (total === 0) return this.dim('equilibre', 50, 'Impossible à évaluer : aucune séquence.')

    const maxPct = Math.max(t1, t2, t3) / total * 100
    let score: number
    let details: string

    if (maxPct <= 45) {
      score = 95
      details = `Distribution équilibrée : T1=${t1}, T2=${t2}, T3=${t3}.`
    } else if (maxPct <= 55) {
      score = 75
      details = `Distribution légèrement déséquilibrée : T1=${t1}, T2=${t2}, T3=${t3}.`
      warns.push(`Un trimestre concentre ${Math.round(maxPct)}% des séquences — redistribuer si possible.`)
    } else {
      score = 50
      details = `Déséquilibre important : T1=${t1}, T2=${t2}, T3=${t3}.`
      warns.push(`Surcharge d'un trimestre (${Math.round(maxPct)}%) — réviser la répartition.`)
    }

    return this.dim('equilibre', score, details)
  }

  // ─── Time management ────────────────────────────────────────────────────────

  private validateTemps(
    input: StrategyValidatorInput,
    warns: string[],
    bloqueurs: string[],
  ): StrategyValidationDimension {
    const prevues = input.strategy.heuresTotalesPrevues
    const dispo = input.heuresDisponibles
    const ratio = dispo > 0 ? prevues / dispo : 1

    let score: number
    let details: string

    if (ratio <= 0.95) {
      score = 100
      details = `Temps bien géré : ${prevues}h prévues / ${dispo}h disponibles.`
    } else if (ratio <= 1.0) {
      score = 80
      details = `Temps ajusté : ${prevues}h prévues ≈ ${dispo}h disponibles.`
    } else if (ratio <= 1.10) {
      score = 60
      details = `Légère surcharge : ${prevues}h prévues pour ${dispo}h disponibles (${Math.round((ratio - 1) * 100)}% de dépassement).`
      warns.push(`Légère surcharge horaire (${Math.round((ratio - 1) * 100)}%) — réduire certaines séquences.`)
    } else {
      score = 20
      details = `Surcharge critique : ${prevues}h pour ${dispo}h (${Math.round((ratio - 1) * 100)}% de dépassement).`
      bloqueurs.push(`Programme irréalisable : ${Math.round((ratio - 1) * 100)}% d'heures en trop.`)
    }

    return this.dim('gestion_temps', score, details, prevues, dispo)
  }

  // ─── Bloom / Competences ────────────────────────────────────────────────────

  private validateCompetences(input: StrategyValidatorInput, warns: string[]): StrategyValidationDimension {
    const prog = input.strategy.progressionDifficulte
    const approche = input.strategy.approche
    let score = 80
    let details = `Progression ${prog} — cohérente avec l'approche ${approche}.`

    // Spiral progression with direct teaching → slight mismatch
    if (prog === 'spirale' && approche === 'enseignement_direct') {
      score = 65
      details = 'Progression spirale avec enseignement direct : la spirale nécessite du temps de retour en arrière.'
      warns.push("La progression spirale est plus adaptée à l'apprentissage actif ou collaboratif.")
    }

    return this.dim('competences', score, details)
  }

  // ─── Evaluations ────────────────────────────────────────────────────────────

  private validateEvaluations(input: StrategyValidatorInput, warns: string[]): StrategyValidationDimension {
    const { nbEvaluationsFormatives: formatives, nbEvaluationsSommatives: sommatives } = input.strategy
    const total = formatives + sommatives
    const ratio = total > 0 ? formatives / total : 0
    let score: number
    let details: string

    if (ratio >= 0.6 && ratio <= 0.8) {
      score = 95
      details = `Bon équilibre : ${formatives} formatives, ${sommatives} sommatives (ratio ${Math.round(ratio * 100)}%).`
    } else if (ratio >= 0.5) {
      score = 75
      details = `Ratio acceptable : ${formatives} formatives, ${sommatives} sommatives.`
    } else {
      score = 50
      details = `Trop peu de formatives : ${formatives} pour ${sommatives} sommatives.`
      warns.push('Augmenter les évaluations formatives pour mieux soutenir les apprentissages.')
    }

    return this.dim('evaluations', score, details, formatives, sommatives)
  }

  // ─── Constraints ────────────────────────────────────────────────────────────

  private validateContraintes(
    input: StrategyValidatorInput,
    warns: string[],
    bloqueurs: string[],
  ): StrategyValidationDimension {
    if (!input.simulation) {
      return this.dim('contraintes', 70, 'Aucune simulation disponible — contraintes non vérifiées.')
    }

    const { nbRisquesCritiques, nbRisquesMajeurs } = input.simulation
    let score: number
    let details: string

    if (nbRisquesCritiques === 0 && nbRisquesMajeurs === 0) {
      score = 100
      details = 'Aucun risque critique ou majeur identifié par la simulation.'
    } else if (nbRisquesCritiques === 0) {
      score = 70
      details = `${nbRisquesMajeurs} risque(s) majeur(s) identifié(s) — à surveiller.`
      warns.push(`${nbRisquesMajeurs} risque(s) majeur(s) dans la simulation.`)
    } else {
      score = 20
      details = `${nbRisquesCritiques} risque(s) critique(s) — programme en danger.`
      bloqueurs.push(`${nbRisquesCritiques} risque(s) critique(s) bloquant(s) — résoudre avant de générer.`)
    }

    return this.dim('contraintes', score, details, nbRisquesCritiques, nbRisquesMajeurs)
  }

  // ─── Weighted score ──────────────────────────────────────────────────────────

  private computeGlobalScore(dims: StrategyValidationDimension[]): number {
    let weighted = 0
    for (const d of dims) {
      weighted += d.score * (WEIGHTS[d.nom] / 100)
    }
    return Math.min(100, Math.max(0, weighted))
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────

  private dim(
    nom: StrategyValidationDimensionName,
    score: number,
    details: string,
    valeurMesuree?: number,
    valeurAttendue?: number,
  ): StrategyValidationDimension {
    const statut: ValidationStatut = score >= 75 ? 'ok' : score >= 50 ? 'attention' : 'probleme'
    return { nom, score, statut, details, valeurMesuree, valeurAttendue }
  }
}

export const strategyValidator = new StrategyValidator()
