// SPIE-04 — Impact Engine
// Calculates cascading effects when the AcademicYearTwin changes.
// If a sequence changes → which lessons change? Which quizzes? Which evaluations?

import type { ImpactAnalysis, AffectedItem, ImpactAction } from '../types/impact'
import type { SequenceBlock } from '../types/twin'

let impactIndex = 0

export class ImpactEngine {
  // Analyze impact of modifying one or more sequences
  analyzeSequenceChange(
    twinId: string,
    changedSequenceIds: string[],
    allSequences: SequenceBlock[],
    changeDescription: string,
  ): ImpactAnalysis {
    const affected: AffectedItem[] = []

    for (const seqId of changedSequenceIds) {
      const seq = allSequences.find(s => s.id === seqId)
      if (!seq) continue

      // Lessons in this sequence need recalculation
      for (const leconId of seq.leconIds) {
        affected.push({
          id: leconId,
          type: 'lecon',
          raison: `Séquence parente "${seq.titre}" modifiée`,
          actionRequise: 'recalculer',
        })
      }

      // Quizzes need recalculation
      for (const quizId of seq.quizIds) {
        affected.push({
          id: quizId,
          type: 'quiz',
          raison: `Séquence "${seq.titre}" modifiée — quiz potentiellement désaligné`,
          actionRequise: 'verifier',
        })
      }

      // Outcomes might need progression update
      for (const outcomeId of seq.outcomeIds) {
        affected.push({
          id: outcomeId,
          type: 'outcome',
          raison: `Outcome lié à la séquence modifiée`,
          actionRequise: 'aucune',
        })
      }
    }

    // Check downstream sequences (sequences that come after affected ones)
    const maxOrdre = Math.max(...changedSequenceIds.map(id => {
      const seq = allSequences.find(s => s.id === id)
      return seq?.ordre ?? 0
    }))
    const downstreamSeqs = allSequences.filter(s => s.ordre > maxOrdre && !changedSequenceIds.includes(s.id))
    for (const ds of downstreamSeqs) {
      if (ds.needsRecalculation) {
        affected.push({
          id: ds.id,
          type: 'sequence',
          titre: ds.titre,
          raison: 'Séquence en aval — dates potentiellement décalées',
          actionRequise: 'recalculer',
        })
      }
    }

    const nbLecons = affected.filter(a => a.type === 'lecon').length
    const nbQuiz = affected.filter(a => a.type === 'quiz').length
    const nbEvals = affected.filter(a => a.type === 'evaluation').length

    const severite = nbLecons > 10 ? 'critique'
      : nbLecons > 5 ? 'majeure'
      : nbLecons > 0 ? 'moderee'
      : 'mineure'

    return {
      id: `impact_${++impactIndex}`,
      twinId,
      declencheur: {
        type: 'sequence_modifiee',
        elementId: changedSequenceIds[0],
        description: changeDescription,
      },
      affecte: affected,
      nbLeconsTouchees: nbLecons,
      nbQuizTouches: nbQuiz,
      nbEvaluationsTouchees: nbEvals,
      nbCompetencesTouchees: 0,
      severite,
      autoFixable: nbLecons === 0,  // Only auto-fixable if no lessons need regeneration
      recommandations: this.buildRecommandations(severite, nbLecons, nbQuiz),
      calculatedAt: new Date().toISOString(),
    }
  }

  // Analyze impact of a calendar change
  analyzeCalendarChange(
    twinId: string,
    changedWeeks: number[],
    affectedSequenceIds: string[],
    allSequences: SequenceBlock[],
  ): ImpactAnalysis {
    const affected: AffectedItem[] = affectedSequenceIds.map(seqId => {
      const seq = allSequences.find(s => s.id === seqId)
      return {
        id: seqId,
        type: 'sequence' as const,
        titre: seq?.titre,
        raison: `Semaines modifiées : ${changedWeeks.join(', ')}`,
        actionRequise: 'recalculer' as ImpactAction,
      }
    })

    return {
      id: `impact_${++impactIndex}`,
      twinId,
      declencheur: {
        type: 'calendrier_modifie',
        description: `Modification des semaines ${changedWeeks.join(', ')}`,
      },
      affecte: affected,
      nbLeconsTouchees: 0,
      nbQuizTouches: 0,
      nbEvaluationsTouchees: 0,
      nbCompetencesTouchees: 0,
      severite: 'moderee',
      autoFixable: true,
      recommandations: ['Recalculer le rythme pédagogique suite aux changements calendaires.'],
      calculatedAt: new Date().toISOString(),
    }
  }

  private buildRecommandations(severite: string, nbLecons: number, nbQuiz: number): string[] {
    const recs: string[] = []
    if (severite === 'critique') recs.push('Réviser l\'ensemble des leçons affectées — le changement est significatif.')
    if (nbLecons > 0) recs.push(`Vérifier ${nbLecons} leçon(s) dont le contenu peut être désaligné.`)
    if (nbQuiz > 0) recs.push(`Vérifier ${nbQuiz} quiz pour l'alignement avec les nouveaux outcomes couverts.`)
    if (recs.length === 0) recs.push('Aucune action urgente requise — impact mineur.')
    return recs
  }
}

export const impactEngine = new ImpactEngine()
