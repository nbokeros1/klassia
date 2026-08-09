// SPIE-05 — Planning Recommendation Engine
// Generates recommendations based on detected risks.
// RÈGLE ABSOLUE : Ce moteur PROPOSE uniquement — il n'applique JAMAIS de changement.

import type { SimulationRisk } from '../types/risk'
import type { SimulationRecommendation, RecommendationType } from '../types/recommendation'
import type { SimulationInput } from '../types/simulation'

let recCounter = 0
function makeRecId(): string { return `rec_${++recCounter}` }

type RecPriorite = 'critique' | 'haute' | 'normale' | 'faible'

function rec(
  type: RecommendationType,
  priorite: RecPriorite,
  titre: string,
  description: string,
  risquesAdresses: string[],
  opts: Partial<Omit<SimulationRecommendation, 'id' | 'type' | 'priorite' | 'titre' | 'description' | 'risquesAdresses' | 'autoApplicable'>> = {},
): SimulationRecommendation {
  return {
    id: makeRecId(),
    type,
    priorite,
    titre,
    description,
    risquesAdresses,
    impactEstime: opts.impactEstime ?? {},
    autoApplicable: false,  // TOUJOURS false
    ...opts,
  }
}

// ─── Planning Recommendation Engine ──────────────────────────────────────────

export class PlanningRecommendationEngine {
  generate(risks: SimulationRisk[], input: SimulationInput): SimulationRecommendation[] {
    const recommendations: SimulationRecommendation[] = []
    const totalHeuresPlanifiees = input.sequences.reduce((sum, s) => sum + s.dureeEstimeeHeures, 0)
    const totalHeuresDisponibles = input.minutesRestantes / 60

    for (const risk of risks) {
      switch (risk.type) {
        case 'programme_irrealisable': {
          const exces = totalHeuresPlanifiees - totalHeuresDisponibles
          const seqsLongues = input.sequences
            .filter(s => s.dureeEstimeeHeures > 5)
            .sort((a, b) => b.dureeEstimeeHeures - a.dureeEstimeeHeures)
            .slice(0, 3)

          recommendations.push(rec(
            'compresser_sequence',
            'critique',
            'Compresser les séquences les plus longues',
            `Réduire la durée des ${seqsLongues.length} séquences les plus longues pourrait libérer jusqu'à ${Math.round(exces)}h. Identifiez le contenu non essentiel dans chaque séquence.`,
            [risk.id],
            {
              sequencesCibles: seqsLongues.map(s => s.id),
              impactEstime: {
                heuresSauvegardees: Math.round(exces * 0.7),
              },
            },
          ))

          recommendations.push(rec(
            'prioriser_outcomes',
            'haute',
            'Prioriser les outcomes essentiels',
            'Identifiez les outcomes incontournables (couverts aux examens provinciaux) et concentrez-vous sur ceux-là. Les outcomes de niveau "enrichissement" peuvent être omis.',
            [risk.id],
            {
              impactEstime: { heuresSauvegardees: Math.round(exces * 0.5) },
            },
          ))

          const seqsSupprimables = input.sequences
            .filter(s => s.dureeEstimeeHeures >= 3)
            .slice(-2)
          if (seqsSupprimables.length > 0 && exces > 4) {
            recommendations.push(rec(
              'supprimer_sequence',
              'haute',
              'Supprimer une ou plusieurs séquences secondaires',
              `Supprimer des séquences de moindre priorité pourrait résoudre le déficit de ${Math.round(exces)}h. Cette action réduira la couverture curriculaire.`,
              [risk.id],
              {
                sequencesCibles: seqsSupprimables.map(s => s.id),
                impactEstime: {
                  heuresSauvegardees: seqsSupprimables.reduce((sum, s) => sum + s.dureeEstimeeHeures, 0),
                  coverageChangement: -Math.round((seqsSupprimables.length / input.sequences.length) * 100),
                },
              },
            ))
          }
          break
        }

        case 'couverture_insuffisante': {
          recommendations.push(rec(
            'prioriser_outcomes',
            'haute',
            'Revoir les priorités curriculaires',
            'La couverture curriculaire est insuffisante. Concentrez-vous sur les outcomes les plus importants et assurez une couverture de qualité pour ceux-là plutôt qu\'une couverture superficielle de tous.',
            [risk.id],
          ))
          break
        }

        case 'sequence_trop_longue': {
          const longSeqs = input.sequences.filter(
            s => risk.sequencesAffectees?.includes(s.id) ?? false,
          )
          for (const seq of longSeqs) {
            const nbParts = Math.ceil(seq.dureeEstimeeHeures / 10)
            recommendations.push(rec(
              'reduire_contenu',
              'normale',
              `Diviser "${seq.titre}" en ${nbParts} parties`,
              `Cette séquence de ${seq.dureeEstimeeHeures}h est trop dense. La diviser en ${nbParts} séquences de ~${Math.round(seq.dureeEstimeeHeures / nbParts)}h facilitera la progression des élèves.`,
              [risk.id],
              { sequencesCibles: [seq.id] },
            ))
          }
          break
        }

        case 'surcharge_hebdomadaire': {
          const affectedIds = risk.sequencesAffectees ?? []
          recommendations.push(rec(
            'reordonner_sequences',
            'normale',
            'Répartir la charge hebdomadaire',
            'Certaines semaines sont surchargées. Réordonner les séquences pour mieux distribuer la charge dans le temps.',
            [risk.id],
            { sequencesCibles: affectedIds },
          ))
          break
        }

        case 'trop_devaluations': {
          recommendations.push(rec(
            'etaler_evaluations',
            'normale',
            'Étaler les évaluations dans le temps',
            'Trop d\'évaluations sont concentrées dans une période courte. Redistribuez-les sur l\'ensemble de l\'année pour réduire la pression sur les élèves.',
            [risk.id],
          ))
          recommendations.push(rec(
            'reduire_evaluations',
            'faible',
            'Réduire le nombre d\'évaluations sommatives',
            'Envisagez de remplacer certaines évaluations sommatives par des évaluations formatives intégrées aux leçons.',
            [risk.id],
          ))
          break
        }

        case 'retard_critique': {
          recommendations.push(rec(
            'compresser_sequence',
            'critique',
            'Accélérer le rythme des prochaines séquences',
            'Le retard accumulé est critique. Identifiez les séquences en cours et élaguez le contenu non essentiel pour rattraper le calendrier.',
            [risk.id],
          ))
          break
        }

        case 'aucune_marge': {
          recommendations.push(rec(
            'compresser_sequence',
            'normale',
            'Créer une marge de sécurité',
            'Réduire légèrement quelques séquences créerait une marge suffisante pour absorber les imprévus (activités spéciales, absences, révisions).',
            [risk.id],
          ))
          break
        }

        default:
          break
      }
    }

    // Deduplicate by type (keep highest priority)
    const seen = new Map<string, SimulationRecommendation>()
    for (const r of recommendations) {
      const existing = seen.get(r.type)
      if (!existing || this.priorityValue(r.priorite) > this.priorityValue(existing.priorite)) {
        seen.set(r.type, r)
      }
    }

    return [...seen.values()].sort((a, b) =>
      this.priorityValue(b.priorite) - this.priorityValue(a.priorite)
    )
  }

  private priorityValue(p: string): number {
    return { critique: 4, haute: 3, normale: 2, faible: 1 }[p] ?? 0
  }
}

export const planningRecommendationEngine = new PlanningRecommendationEngine()
