// SPIE-06 — Time Recommendation Engine
// Proposes time recovery strategies. NEVER auto-applies. Always explains.
// RÈGLE : supprimer | déplacer | fusionner | réduire | étaler — toujours avec explication.

import type { TimeRecommendation, TimeRecommendationType } from '../types/recommendation'
import type { TimeImpact } from '../types/impact'
import type { SequenceBlock } from '../../aydte/types/twin'

let recCounter = 0
function makeRecId(): string { return `trec_${++recCounter}` }

type RecPriorite = 'critique' | 'haute' | 'normale' | 'faible'

function rec(
  type: TimeRecommendationType,
  priorite: RecPriorite,
  titre: string,
  explication: string,
  commentApplique: string,
  impactAttendu: string,
  minutesRecuperees: number,
  impactsAdresses: string[],
  opts: Partial<Pick<TimeRecommendation, 'sequencesCibles' | 'slotsCibles' | 'coverageRecuperee'>> = {},
): TimeRecommendation {
  return {
    id: makeRecId(),
    type,
    priorite,
    titre,
    explication,
    commentApplique,
    impactAttendu,
    minutesRecuperees,
    impactsAdresses,
    autoApplicable: false,
    ...opts,
  }
}

// ─── Time Recommendation Engine ───────────────────────────────────────────────

export class TimeRecommendationEngine {
  generate(
    impact: TimeImpact,
    sequences: SequenceBlock[],
    minutesParSemaine: number,
  ): TimeRecommendation[] {
    const recs: TimeRecommendation[] = []
    const { minutesPerdues, semainesDecalageCumul, severity, sequencesDecalees } = impact

    // 1. SUPPRIMER — remove low-priority content
    if (severity === 'critique' || severity === 'severe') {
      const candidates = sequences
        .filter(s => s.statut === 'planifiee')
        .sort((a, b) => a.outcomeIds.length - b.outcomeIds.length)
        .slice(0, 2)

      if (candidates.length > 0) {
        const minutesSaved = candidates.reduce((sum, s) => sum + s.dureeEstimeeHeures * 60, 0)
        recs.push(rec(
          'supprimer',
          'critique',
          'Retirer les séquences de moindre priorité',
          `Le retard accumulé (${Math.round(semainesDecalageCumul * 10) / 10} semaine(s)) risque de compromettre la couverture curriculaire. Supprimer les séquences les moins prioritaires est la mesure la plus efficace.`,
          `1. Identifiez les séquences qui couvrent des outcomes non évalués aux examens.\n2. Supprimez-les de votre plan annuel.\n3. Notez quels outcomes ne seront pas couverts.`,
          `Jusqu'à ${Math.round(minutesSaved)} minutes récupérées — couverture réduite mais plan réalisable.`,
          minutesSaved,
          [impact.id],
          { sequencesCibles: candidates.map(s => s.id) },
        ))
      }
    }

    // 2. RÉDUIRE — compress existing sequences
    if (severity === 'severe' || severity === 'modere') {
      const longSeqs = sequences
        .filter(s => s.statut === 'planifiee' && s.dureeEstimeeHeures > 5)
        .slice(0, 3)

      if (longSeqs.length > 0) {
        const minutesSaved = longSeqs.reduce((sum, s) => sum + s.dureeEstimeeHeures * 60 * 0.2, 0)
        recs.push(rec(
          'reduire',
          'haute',
          'Réduire la durée des séquences longues',
          `Les ${longSeqs.length} séquences les plus longues peuvent être compressées de 20% sans compromettre l'essentiel des apprentissages.`,
          `1. Pour chaque séquence listée, identifiez le contenu de renforcement (non essentiel).\n2. Déplacez ce contenu en travail autonome hors cours.\n3. Mettez à jour la durée estimée dans votre plan.`,
          `~${Math.round(minutesSaved)} minutes récupérées — rythme accéléré sans suppression de contenu.`,
          Math.round(minutesSaved),
          [impact.id],
          { sequencesCibles: longSeqs.map(s => s.id) },
        ))
      }
    }

    // 3. DÉPLACER — move sessions
    if (severity === 'modere' || severity === 'faible') {
      recs.push(rec(
        'deplacer',
        'normale',
        'Déplacer les séquences décalées vers des périodes disponibles',
        `Les séquences affectées peuvent être déplacées dans des plages horaires libres (avant les vacances, semaines creuses) pour rattraper le retard.`,
        `1. Consultez votre calendrier et identifiez les semaines avec moins de contenu prévu.\n2. Déplacez les séquences décalées vers ces semaines.\n3. Mettez à jour votre plan annuel.`,
        `Maintien de la couverture curriculaire — pas de contenu supprimé.`,
        0,    // No minutes saved directly
        [impact.id],
        { sequencesCibles: sequencesDecalees },
      ))
    }

    // 4. FUSIONNER — merge short sequences
    const shortSeqs = sequences.filter(s => s.statut === 'planifiee' && s.dureeEstimeeHeures < 4)
    if (shortSeqs.length >= 2) {
      const pairs = Math.floor(shortSeqs.length / 2)
      const minutesSaved = pairs * 30  // 30 min transition time saved per merge
      recs.push(rec(
        'fusionner',
        'normale',
        `Fusionner ${shortSeqs.length} séquences courtes`,
        `Plusieurs séquences très courtes peuvent être regroupées thématiquement, économisant le temps de transition entre séquences.`,
        `1. Identifiez les séquences de moins de 4 heures avec des thèmes proches.\n2. Regroupez leurs outcomes dans une seule séquence.\n3. Réduisez le nombre total de séquences.`,
        `~${minutesSaved} minutes économisées + cohérence thématique renforcée.`,
        minutesSaved,
        [impact.id],
        { sequencesCibles: shortSeqs.slice(0, 4).map(s => s.id) },
      ))
    }

    // 5. ÉTALER — spread content over more time
    if (severity === 'faible' || severity === 'negligeable') {
      recs.push(rec(
        'etaler',
        'faible',
        'Étaler le contenu sur une période légèrement plus longue',
        `Le retard est mineur. Étaler légèrement les prochaines séquences permet d'absorber le décalage sans compromettre la qualité.`,
        `1. Identifiez les prochaines séquences dans votre plan.\n2. Ajoutez 1 séance supplémentaire répartie sur les 2 prochaines semaines.\n3. Aucun contenu n'est supprimé.`,
        `Absorption du retard sans action structurelle — plan maintenu.`,
        0,
        [impact.id],
      ))
    }

    // 6. RÉCUPÉRER — makeup session
    if (minutesPerdues >= 60) {
      recs.push(rec(
        'recuperer',
        'haute',
        'Ajouter une séance de rattrapage',
        `${Math.round(minutesPerdues)} minutes ont été perdues. Une ou deux séances de rattrapage permettraient de regagner ce temps.`,
        `1. Identifiez un créneau libre dans les prochaines semaines (heure de dîner, après les cours, atelier).\n2. Planifiez une séance de ${Math.round(minutesPerdues)} minutes axée sur les contenus en retard.`,
        `Récupération directe de ${Math.round(minutesPerdues)} minutes — aucun contenu sacrifié.`,
        minutesPerdues,
        [impact.id],
      ))
    }

    // Sort by priority
    const order: Record<string, number> = { critique: 4, haute: 3, normale: 2, faible: 1 }
    return recs.sort((a, b) => (order[b.priorite] ?? 0) - (order[a.priorite] ?? 0))
  }
}

export const timeRecommendationEngine = new TimeRecommendationEngine()
