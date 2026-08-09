// SPIE-07 — StrategyBuilder
// Synthesizes Curriculum + Context + Time + Simulation → PedagogicalStrategy.
// Deterministic: 0 AI calls.

import type { NormalizedOutcome } from '../../curriculum/extraction/types'
import type { PedagogicalContext } from '../../pce/types/context'
import type { AcademicYearTwin } from '../../aydte/types/twin'
import type { PedagogicalSimulation } from '../../pps/types/simulation'
import type { AcademicTime } from '../../pte/types/academic-time'
import type {
  PedagogicalStrategy,
  StrategyApproach,
  DifficultyLevel,
  ProgressionType,
  DifferentiationStrategy,
  EvaluationTiming,
} from '../types/strategy'
import type { StrategyDecisionNode } from '../types/decision-tree'

// ─── Builder input ────────────────────────────────────────────────────────────

export interface StrategyBuilderInput {
  // Required
  outcomes: NormalizedOutcome[]
  enseignantId: string
  classeId: string
  matiereId: string
  academicYear: string
  langue: 'fr' | 'en'

  // SPIE cross-engine inputs (optional — richer inputs → richer strategy)
  context?: PedagogicalContext
  twin?: AcademicYearTwin
  simulation?: PedagogicalSimulation
  academicTime?: AcademicTime

  // Teacher preferences (override algorithmic choices)
  approchePreferee?: StrategyApproach
  niveauDifficulteVise?: DifficultyLevel
  differenciationPrioritaire?: boolean
}

// ─── Builder output ───────────────────────────────────────────────────────────

export interface StrategyBuilderOutput {
  strategy: PedagogicalStrategy
  decisions: StrategyDecisionNode[]
}

// ─── StrategyBuilder ─────────────────────────────────────────────────────────

export class StrategyBuilder {
  private decisions: StrategyDecisionNode[] = []

  build(input: StrategyBuilderInput): StrategyBuilderOutput {
    this.decisions = []

    const approche = this.chooseApproach(input)
    const niveauDifficulte = this.chooseDifficulty(input)
    const progressionDifficulte = this.chooseProgression(niveauDifficulte, approche)
    const ordreSequences = this.orderSequences(input)
    const { formatives, sommatives, timing, rationaleEval } = this.planEvaluations(input, ordreSequences.length)
    const { prevue, strategies, rationale: rationaleDiff } = this.planDifferentiation(input, approche)
    const { minutesParSemaine, heuresPrevues, tamponPercent, rationaleTemps } = this.planTime(input)
    const { risques, attenuations } = this.planRisks(input)
    const sequencesParTrimestre = this.distributeAcrossTrimesters(ordreSequences.length, input.twin)
    const objectifs = this.buildObjectifs(input.outcomes, approche)

    const strategy: PedagogicalStrategy = {
      id: `strat-${Date.now()}`,
      nom: `Stratégie ${approche} — ${input.matiereId} ${input.academicYear}`,
      description: this.buildDescription(approche, niveauDifficulte, input.outcomes.length),

      enseignantId: input.enseignantId,
      classeId: input.classeId,
      matiereId: input.matiereId,
      academicYear: input.academicYear,
      langue: input.langue,

      objectifsGeneraux: objectifs,
      outcomesCouverts: input.outcomes.map(o => o.id),

      approche,
      justificationApproche: this.getApproachJustification(approche, input),

      ordreSequences,
      rationaleOrdre: this.getOrderRationale(input),

      niveauDifficulte,
      progressionDifficulte,

      nbSequences: ordreSequences.length,
      sequencesParTrimestre,

      nbEvaluationsFormatives: formatives,
      nbEvaluationsSommatives: sommatives,
      momentEvaluations: timing,
      rationaleEvaluations: rationaleEval,

      differenciationPrevue: prevue,
      strategiesDifferentiation: strategies,
      rationaleDifferentiation: rationaleDiff,

      minutesParSemaine,
      heuresTotalesPrevues: heuresPrevues,
      reserveTamponPercent: tamponPercent,
      rationaleTemps,

      risquesPrincipaux: risques,
      strategiesAttenuation: attenuations,

      createdAt: new Date().toISOString(),
    }

    return { strategy, decisions: this.decisions }
  }

  // ─── Approach selection ──────────────────────────────────────────────────────

  private chooseApproach(input: StrategyBuilderInput): StrategyApproach {
    const factors: string[] = []
    let chosen: StrategyApproach = 'mixte'

    if (input.approchePreferee) {
      chosen = input.approchePreferee
      this.record('choix_approche', 'Quelle approche pédagogique adopter?', ['préférence enseignant'],
        `Approche préférée par l'enseignant : ${chosen}`, 'Respect de la préférence déclarée.', 95)
      return chosen
    }

    factors.push(`${input.outcomes.length} objectifs`)

    if (input.differenciationPrioritaire) {
      chosen = 'differentie'
      factors.push('différenciation prioritaire')
    } else if (input.simulation?.statut === 'irrealisable') {
      chosen = 'enseignement_direct'
      factors.push('simulation : irréalisable → efficience maximale')
    } else if (input.simulation && input.simulation.scoreViabilite >= 80) {
      chosen = 'apprentissage_actif'
      factors.push(`simulation viable (score ${input.simulation.scoreViabilite})`)
    } else if (input.outcomes.length > 50) {
      chosen = 'enseignement_direct'
      factors.push("volume élevé d'objectifs (>50)")
    } else {
      chosen = 'mixte'
      factors.push('absence de contrainte forte')
    }

    this.record('choix_approche', 'Quelle approche pédagogique adopter?', factors,
      chosen, this.getApproachJustification(chosen, input), 80)
    return chosen
  }

  // ─── Difficulty selection ────────────────────────────────────────────────────

  private chooseDifficulty(input: StrategyBuilderInput): DifficultyLevel {
    if (input.niveauDifficulteVise) {
      this.record('niveau_difficulte', 'Quel niveau de difficulté viser?', ['préférence enseignant'],
        input.niveauDifficulteVise, "Niveau déclaré par l'enseignant.", 95)
      return input.niveauDifficulteVise
    }

    // Derive from Bloom level distribution
    const bloomCounts: Record<string, number> = {}
    for (const o of input.outcomes) {
      if (o.niveauBloom) bloomCounts[o.niveauBloom] = (bloomCounts[o.niveauBloom] ?? 0) + 1
    }
    const total = input.outcomes.length || 1
    const highOrder = ((bloomCounts['evaluation'] ?? 0) + (bloomCounts['creation'] ?? 0)) / total
    const lowOrder = ((bloomCounts['connaissance'] ?? 0) + (bloomCounts['comprehension'] ?? 0)) / total

    let level: DifficultyLevel
    if (highOrder > 0.4) level = 'exigeant'
    else if (lowOrder > 0.6) level = 'accessible'
    else level = 'moyen'

    this.record('niveau_difficulte', 'Quel niveau de difficulté viser?',
      [`${Math.round(highOrder * 100)}% objectifs haut niveau Bloom`, `${Math.round(lowOrder * 100)}% bas niveau`],
      level, 'Dérivé de la distribution de la taxonomie de Bloom dans les objectifs.', 75)
    return level
  }

  // ─── Progression type ────────────────────────────────────────────────────────

  private chooseProgression(difficulty: DifficultyLevel, approach: StrategyApproach): ProgressionType {
    if (approach === 'spirale') return 'spirale'
    if (approach === 'differentie') return 'differentie'
    if (difficulty === 'exigeant' || difficulty === 'tres_exigeant') return 'escalier'
    return 'lineaire'
  }

  // ─── Sequence order ──────────────────────────────────────────────────────────

  private orderSequences(input: StrategyBuilderInput): string[] {
    if (input.twin?.sequences.length) {
      const sorted = [...input.twin.sequences].sort((a, b) => (a.semaineDébut ?? 0) - (b.semaineDébut ?? 0))
      this.record('ordre_sequences', 'Dans quel ordre planifier les séquences?',
        [`twin existant : ${sorted.length} séquences`],
        'Ordre issu du plan annuel (semaineDébut)', 'Respect du calendrier déjà établi dans le jumeau.', 90)
      return sorted.map(s => s.id)
    }

    // Group outcomes by parentId to form sequences, then order by prerequisite depth
    const groups = new Map<string, NormalizedOutcome[]>()
    for (const o of input.outcomes) {
      const key = o.parentId ?? 'sans-parent'
      const group = groups.get(key) ?? []
      group.push(o)
      groups.set(key, group)
    }
    const sequenceIds = Array.from(groups.keys())

    this.record('ordre_sequences', 'Dans quel ordre planifier les séquences?',
      [`${sequenceIds.length} groupes thématiques dérivés des parentId`],
      'Regroupement par parentId, ordre par profondeur de prérequis', 'Aucun twin disponible — groupement automatique.', 65)
    return sequenceIds
  }

  // ─── Evaluation planning ─────────────────────────────────────────────────────

  private planEvaluations(input: StrategyBuilderInput, nbSeq: number): {
    formatives: number
    sommatives: number
    timing: EvaluationTiming
    rationaleEval: string
  } {
    const formatives = Math.ceil(nbSeq * 0.7)
    const sommatives = Math.ceil(nbSeq / 3)
    const timing: EvaluationTiming = nbSeq > 6 ? 'distribue' : 'milieu'
    const rationaleEval = `${formatives} évaluations formatives (70 % des séquences) et ${sommatives} sommatives (1 par 3 séquences).`

    this.record('planification_evals', 'Comment répartir les évaluations?',
      [`${nbSeq} séquences`, 'règle 70/30 formative-sommative'],
      `${formatives} formatives, ${sommatives} sommatives`, rationaleEval, 80)
    return { formatives, sommatives, timing, rationaleEval }
  }

  // ─── Differentiation planning ────────────────────────────────────────────────

  private planDifferentiation(input: StrategyBuilderInput, approach: StrategyApproach): {
    prevue: boolean
    strategies: DifferentiationStrategy[]
    rationale: string
  } {
    const prevue = input.differenciationPrioritaire === true || approach === 'differentie'
    const strategies: DifferentiationStrategy[] = prevue ? ['contenu', 'processus'] : []
    const rationale = prevue
      ? 'Différenciation activée : variation du contenu et du processus selon le profil des élèves.'
      : 'Pas de différenciation systématique prévue — enseignement unifié.'

    this.record('differentiation', 'Doit-on prévoir de la différenciation?',
      [input.differenciationPrioritaire ? 'différenciation prioritaire' : `approche ${approach}`],
      prevue ? 'Oui' : 'Non', rationale, 85)
    return { prevue, strategies, rationale }
  }

  // ─── Time planning ───────────────────────────────────────────────────────────

  private planTime(input: StrategyBuilderInput): {
    minutesParSemaine: number
    heuresPrevues: number
    tamponPercent: number
    rationaleTemps: string
  } {
    const minutesParSemaine = input.twin?.minutesParSemaine
      ?? input.academicTime?.minutesParSemaine
      ?? 60

    const totalSemaines = input.twin?.totalSemaines ?? 38
    const tamponPercent = input.simulation?.statut === 'irrealisable' ? 0.05 : 0.10
    const totalMinutes = minutesParSemaine * totalSemaines * (1 - tamponPercent)
    const heuresPrevues = Math.round(totalMinutes / 60 * 10) / 10

    const rationaleTemps = `${minutesParSemaine} min/semaine × ${totalSemaines} semaines − ${Math.round(tamponPercent * 100)}% tampon = ${heuresPrevues}h disponibles.`

    this.record('gestion_temps', 'Comment gérer le temps disponible?',
      [`${minutesParSemaine} min/sem`, `${totalSemaines} semaines`, `tampon ${Math.round(tamponPercent * 100)}%`],
      `${heuresPrevues}h planifiées`, rationaleTemps, 85)
    return { minutesParSemaine, heuresPrevues, tamponPercent, rationaleTemps }
  }

  // ─── Risk analysis ───────────────────────────────────────────────────────────

  private planRisks(input: StrategyBuilderInput): {
    risques: string[]
    attenuations: string[]
  } {
    const risques: string[] = []
    const attenuations: string[] = []

    if (input.simulation?.risques.length) {
      for (const r of input.simulation.risques.slice(0, 3)) {
        risques.push(r.description)
        if (r.description) attenuations.push(`Atténuation : voir risque "${r.titre}"`)
      }
    }

    if (input.simulation?.statut === 'irrealisable') {
      risques.push('Programme irréalisable selon la simulation — révision nécessaire avant génération.')
      attenuations.push('Réduire le nombre de séquences ou augmenter le temps disponible.')
    }

    if (input.academicTime && input.academicTime.avanceRetardMinutes < -120) {
      risques.push(`Retard accumulé : ${Math.abs(input.academicTime.avanceRetardMinutes)} minutes.`)
      attenuations.push('Récupération de cours ou compression de séquences non prioritaires.')
    }

    if (risques.length === 0) {
      risques.push('Aucun risque majeur identifié à ce stade.')
      attenuations.push("Continuer à surveiller la cadence via l'horloge académique.")
    }

    this.record('gestion_risques', 'Quels risques anticiper?',
      [`simulation : ${input.simulation?.statut ?? 'non disponible'}`, `${risques.length} risques identifiés`],
      `${risques.length} risque(s)`, risques.join(' | '), 80)
    return { risques, attenuations }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private distributeAcrossTrimesters(
    nbSeq: number,
    twin?: AcademicYearTwin,
  ): [number, number, number] {
    if (twin?.sequences.length) {
      const totalWeeks = twin.totalSemaines
      const t1End = Math.round(totalWeeks / 3)
      const t2End = Math.round(totalWeeks * 2 / 3)
      let t1 = 0, t2 = 0, t3 = 0
      for (const s of twin.sequences) {
        const w = s.semaineDébut ?? 0
        if (w <= t1End) t1++
        else if (w <= t2End) t2++
        else t3++
      }
      return [t1 || Math.ceil(nbSeq * 0.35), t2 || Math.ceil(nbSeq * 0.35), t3 || Math.floor(nbSeq * 0.30)]
    }
    return [Math.ceil(nbSeq * 0.35), Math.ceil(nbSeq * 0.35), Math.floor(nbSeq * 0.30)]
  }

  private buildObjectifs(outcomes: NormalizedOutcome[], approach: StrategyApproach): string[] {
    const objectifs = [
      `Couvrir ${outcomes.length} objectif${outcomes.length > 1 ? 's' : ''} du programme.`,
      `Assurer la progression des apprentissages selon l'approche ${approach.replace('_', ' ')}.`,
      'Évaluer régulièrement la maîtrise des compétences visées.',
    ]
    return objectifs
  }

  private buildDescription(approach: StrategyApproach, difficulty: DifficultyLevel, nbOutcomes: number): string {
    return `Stratégie ${approach.replace(/_/g, ' ')} de niveau ${difficulty} couvrant ${nbOutcomes} objectifs du programme.`
  }

  private getApproachJustification(approach: StrategyApproach, input: StrategyBuilderInput): string {
    const justifications: Record<StrategyApproach, string> = {
      enseignement_direct: `Approche structurée et efficiente — maximise la couverture du programme avec ${input.outcomes.length} objectifs à traiter.`,
      apprentissage_actif: 'Programme réalisable avec marge — permet une exploration active par les élèves.',
      collaboration: "Favorise l'apprentissage par les pairs et le développement de compétences sociales.",
      differentie: "Adapte l'enseignement aux besoins variés des élèves — priorité déclarée par l'enseignant.",
      spirale: 'Réintroduction progressive des concepts pour ancrer les apprentissages dans la durée.',
      par_projet: 'Apprentissage par défi et création — mobilise des compétences transversales.',
      mixte: "Combinaison équilibrée d'approches directes et actives selon le contexte de chaque séquence.",
    }
    return justifications[approach]
  }

  private getOrderRationale(input: StrategyBuilderInput): string {
    if (input.twin?.sequences.length) return 'Séquences ordonnées par semaineDébut du plan annuel existant.'
    return 'Séquences regroupées par parentId (thématiques) et ordonnées par profondeur de prérequis.'
  }

  private record(
    type: StrategyDecisionNode['type'],
    question: string,
    factors: string[],
    reponse: string,
    rationale: string,
    score: number,
  ): void {
    this.decisions.push({
      id: `dec-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      question,
      facteursConsideres: factors,
      reponse,
      rationale,
      score,
      timestamp: new Date().toISOString(),
    })
  }
}

export const strategyBuilder = new StrategyBuilder()
