// SPIE-05 — Pedagogical Risk Engine
// Detects risks in a planned curriculum before generation.
// All algorithms are deterministic — no AI calls.

import type { SimulationInput } from '../types/simulation'
import type { SimulationRisk, RiskLevel, RiskType } from '../types/risk'

let riskCounter = 0
function makeRiskId(): string { return `risk_${++riskCounter}` }

// ─── Risk factories ───────────────────────────────────────────────────────────

function risk(
  type: RiskType,
  niveau: RiskLevel,
  titre: string,
  description: string,
  opts: Partial<Omit<SimulationRisk, 'id' | 'type' | 'niveau' | 'titre' | 'description'>> = {},
): SimulationRisk {
  return {
    id: makeRiskId(),
    type,
    niveau,
    titre,
    description,
    bloquant: niveau === 'critique',
    ...opts,
  }
}

// ─── Pedagogical Risk Engine ──────────────────────────────────────────────────

export class PedagogicalRiskEngine {
  detect(input: SimulationInput): SimulationRisk[] {
    const risks: SimulationRisk[] = []

    const totalHeuresPlanifiees = input.sequences.reduce(
      (sum, s) => sum + s.dureeEstimeeHeures,
      0,
    )
    const totalHeuresDisponibles = input.minutesRestantes / 60
    const totalHeuresAnnee = (input.minutesParSemaine * input.totalSemaines) / 60
    const coverageTarget = input.coverageTargetPercent ?? 90

    // 1. Programme irréalisable (blocant)
    if (totalHeuresPlanifiees > totalHeuresDisponibles * 1.15) {
      const exces = Math.round(totalHeuresPlanifiees - totalHeuresDisponibles)
      risks.push(risk(
        'programme_irrealisable',
        'critique',
        'Programme irréalisable dans le temps disponible',
        `Le plan nécessite ${Math.round(totalHeuresPlanifiees)}h mais seulement ${Math.round(totalHeuresDisponibles)}h sont disponibles. Excédent : ${exces}h.`,
        {
          valeurActuelle: totalHeuresPlanifiees,
          valeurMaximale: totalHeuresDisponibles,
          unite: 'heures',
          bloquant: true,
        },
      ))
    } else if (totalHeuresPlanifiees > totalHeuresDisponibles) {
      const exces = Math.round((totalHeuresPlanifiees - totalHeuresDisponibles) * 10) / 10
      risks.push(risk(
        'programme_irrealisable',
        'majeur',
        'Légère surcharge du plan pédagogique',
        `Le plan dépasse le temps disponible de ${exces}h. Des ajustements sont recommandés.`,
        {
          valeurActuelle: totalHeuresPlanifiees,
          valeurMaximale: totalHeuresDisponibles,
          unite: 'heures',
        },
      ))
    }

    // 2. Couverture insuffisante
    const outcomesTotaux = input.curriculumOutcomesTotal
    const outcomesCouverts = input.sequences.reduce((sum, s) => sum + s.outcomeIds.length, 0)
    const coverageActuelle = outcomesTotaux > 0 ? Math.round((outcomesCouverts / outcomesTotaux) * 100) : 0
    if (coverageActuelle < coverageTarget) {
      const niveauRisk: RiskLevel = coverageActuelle < 60 ? 'critique' : coverageActuelle < 75 ? 'majeur' : 'avertissement'
      risks.push(risk(
        'couverture_insuffisante',
        niveauRisk,
        `Couverture curriculaire insuffisante (${coverageActuelle}%)`,
        `Le plan couvre ${coverageActuelle}% du curriculum alors que l'objectif est ${coverageTarget}%. ${outcomesTotaux - outcomesCouverts} outcome(s) non planifié(s).`,
        {
          valeurActuelle: coverageActuelle,
          valeurMaximale: coverageTarget,
          unite: '%',
        },
      ))
    }

    // 3. Surcharge hebdomadaire (séquences trop denses)
    const seqsParSemaine = input.minutesParSemaine / 60
    for (const seq of input.sequences) {
      if (seq.semaineDébut !== undefined && seq.semainesFin !== undefined) {
        const semaines = seq.semainesFin - seq.semaineDébut + 1
        if (semaines < 1) continue
        const heuresParSemaine = seq.dureeEstimeeHeures / semaines
        if (heuresParSemaine > seqsParSemaine * 1.5) {
          risks.push(risk(
            'surcharge_hebdomadaire',
            'avertissement',
            `Séquence "${seq.titre}" : densité élevée`,
            `La séquence demande ${Math.round(heuresParSemaine * 10) / 10}h/semaine, soit 50% de plus que la moyenne disponible (${Math.round(seqsParSemaine * 10) / 10}h).`,
            {
              sequencesAffectees: [seq.id],
              valeurActuelle: heuresParSemaine,
              valeurMaximale: seqsParSemaine,
              unite: 'heures/semaine',
            },
          ))
        }
      }
    }

    // 4. Séquences trop longues (> 15h sans interruption)
    const MAX_HEURES_SEQUENCE = 15
    for (const seq of input.sequences.filter(s => s.dureeEstimeeHeures > MAX_HEURES_SEQUENCE)) {
      risks.push(risk(
        'sequence_trop_longue',
        'avertissement',
        `Séquence "${seq.titre}" très longue (${seq.dureeEstimeeHeures}h)`,
        `Les séquences de plus de ${MAX_HEURES_SEQUENCE}h sont difficiles à maintenir pour les élèves. Envisager de la diviser.`,
        {
          sequencesAffectees: [seq.id],
          valeurActuelle: seq.dureeEstimeeHeures,
          valeurMaximale: MAX_HEURES_SEQUENCE,
          unite: 'heures',
        },
      ))
    }

    // 5. Aucune marge de temps
    const heuresBuffer = totalHeuresAnnee - totalHeuresPlanifiees
    if (heuresBuffer < 2 && heuresBuffer >= 0 && !risks.find(r => r.type === 'programme_irrealisable')) {
      risks.push(risk(
        'aucune_marge',
        'avertissement',
        'Marge de temps quasi nulle',
        `Seulement ${Math.round(heuresBuffer * 10) / 10}h de marge dans l'année. Le moindre imprévu peut compromettre l'ensemble du plan.`,
        { valeurActuelle: heuresBuffer, valeurMaximale: totalHeuresAnnee * 0.1, unite: 'heures' },
      ))
    }

    // 6. Retard critique (depuis le pacing model)
    if (input.pacingModel && input.pacingModel.avanceRetardSemainesGlobal < -4) {
      risks.push(risk(
        'retard_critique',
        'critique',
        'Retard critique dans le rythme pédagogique',
        `Le plan accuse un retard de ${Math.abs(input.pacingModel.avanceRetardSemainesGlobal)} semaine(s). La couverture curriculaire risque d'être compromise.`,
        {
          valeurActuelle: input.pacingModel.avanceRetardSemainesGlobal,
          valeurMaximale: 0,
          unite: 'semaines',
          bloquant: false,
        },
      ))
    }

    return risks
  }
}

export const pedagogicalRiskEngine = new PedagogicalRiskEngine()
