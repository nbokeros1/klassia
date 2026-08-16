// ─── SPIE — Curriculum Coverage Engine ────────────────────────────────────────
// Calcule la relation bi-directionnelle curriculum ↔ séquences ↔ leçons.
// Entrée : ContenuProgramme V2 (avec curriculum_outcomes + curriculum_outcome_ids)
// Pas de mutation — fonction pure, déterministe.

import type { ContenuProgramme, CurriculumOutcome } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'
import { makeLessonKey } from '@/lib/spie/teaching-events'

export type OutcomeSequenceLink = {
  sequenceNumero: number
  sequenceTitre:  string
  leconNumeros:   number[]  // numéros des leçons qui citent explicitement ce RA
  hasPrepared:    boolean   // au moins une de ces leçons a un lecon_id
}

export type CurriculumCoverageItem = {
  outcome:            CurriculumOutcome
  sequences:          OutcomeSequenceLink[]
  isPlanified:        boolean  // au moins une séquence ou leçon référence ce RA
  isPrepared:         boolean  // au moins une leçon détaillée (lecon_id) sur ce RA
  isTaught:           boolean  // au moins une leçon couvrant ce RA a été enseignée
  coverageConfidence: 'high' | 'medium' | 'low'  // V5 : fiabilité de la couverture
  isAssessed:         boolean  // V5 : au moins une leçon couvrant ce RA a une évaluation
}

export type CurriculumCoverageData = {
  items:     CurriculumCoverageItem[]
  hasV2Data: boolean  // false si curriculum_outcomes absent (pack V1)
}

// ─── BUG-05 FIX — Règle de couverture ─────────────────────────────────────────
//
// Avant (V4) : seqCovers → toute leçon de la séquence marquée 'enseignee' suffisait
//              pour déclarer le RA comme enseigné, même si la leçon enseignée
//              avait ses propres curriculum_outcome_ids ne listant pas ce RA.
//
// Après (V5) :
//   - Leçon avec curriculum_outcome_ids explicites → seuls ses propres outcome_ids comptent
//   - Leçon sans curriculum_outcome_ids → inférence depuis la séquence (seqCovers) autorisée
// Cela évite la fausse déclaration quand la leçon enseignée ne couvre pas ce RA.

function isLeconTaught(
  leconStatut: string | undefined,
  seqIdx: number,
  leconIdx: number,
  lessonStateMap: Record<string, LessonTeachingState> | undefined,
): boolean {
  if (lessonStateMap) {
    return lessonStateMap[makeLessonKey(seqIdx, leconIdx)]?.isTaught ?? false
  }
  return leconStatut === 'enseignee'
}

export function getCurriculumCoverage(
  contenu: ContenuProgramme,
  lessonStateMap?: Record<string, LessonTeachingState>,
): CurriculumCoverageData {
  const outcomes = contenu.curriculum_outcomes ?? []

  if (outcomes.length === 0) {
    return { items: [], hasV2Data: false }
  }

  const items: CurriculumCoverageItem[] = outcomes.map(outcome => {
    const sequences: OutcomeSequenceLink[] = []
    let taughtInAnySeq = false
    let hasAnyAssessed  = false
    let hasExplicitLecon = false   // au moins une leçon a curriculum_outcome_ids listant ce RA
    let hasSeqOnlyLink   = false   // couverture uniquement via séquence (pas de leçon explicite)

    for (let si = 0; si < contenu.unites.length; si++) {
      const unite = contenu.unites[si]
      const seqCovers = unite.curriculum_outcome_ids?.includes(outcome.id) ?? false
      const leconsCovering = unite.lecons.filter(
        l => l.curriculum_outcome_ids?.includes(outcome.id) ?? false,
      )

      if (!seqCovers && leconsCovering.length === 0) continue

      const leconNumeros = leconsCovering.map(l => l.numero)
      const hasPrepared  = leconsCovering.some(l => !!l.lecon_id)
        || (seqCovers && leconsCovering.length === 0 && unite.lecons.some(l => !!l.lecon_id))

      // BUG-05 : leçon avec curriculum_outcome_ids explicites → n'utiliser que ces leçons
      //          leçon sans → inférence seqCovers autorisée uniquement si pas de leçon explicite
      let hasTaught = false

      if (leconsCovering.length > 0) {
        // Couverture explicite : seules les leçons qui citent ce RA comptent
        hasExplicitLecon = true
        for (let li = 0; li < unite.lecons.length; li++) {
          const l = unite.lecons[li]
          if (!l.curriculum_outcome_ids?.includes(outcome.id)) continue
          if (isLeconTaught(l.statut, si, li, lessonStateMap)) {
            hasTaught = true
          }
        }
      } else if (seqCovers) {
        // Couverture implicite via séquence : on inspecte les leçons sans mapping explicite
        hasSeqOnlyLink = true
        for (let li = 0; li < unite.lecons.length; li++) {
          const l = unite.lecons[li]
          // Ne pas utiliser une leçon qui a ses propres outcome_ids (elle a choisi ses RA)
          if (l.curriculum_outcome_ids && l.curriculum_outcome_ids.length > 0) continue
          if (isLeconTaught(l.statut, si, li, lessonStateMap)) {
            hasTaught = true
          }
        }
      }

      // isAssessed : leçon couvrant ce RA avec preuve_apprentissage renseignée
      const assessed = leconsCovering.some(l => !!l.preuve_apprentissage)
        || (seqCovers && leconsCovering.length === 0 && unite.lecons.some(l => !!l.preuve_apprentissage))
      if (assessed) hasAnyAssessed = true

      sequences.push({
        sequenceNumero: unite.numero,
        sequenceTitre:  unite.titre,
        leconNumeros,
        hasPrepared,
      })

      if (hasTaught) taughtInAnySeq = true
    }

    // coverageConfidence
    let coverageConfidence: 'high' | 'medium' | 'low'
    if (hasExplicitLecon) {
      coverageConfidence = 'high'
    } else if (hasSeqOnlyLink) {
      coverageConfidence = 'medium'
    } else {
      coverageConfidence = 'low'
    }

    return {
      outcome,
      sequences,
      isPlanified:        sequences.length > 0,
      isPrepared:         sequences.some(s => s.hasPrepared),
      isTaught:           taughtInAnySeq,
      coverageConfidence,
      isAssessed:         hasAnyAssessed,
    }
  })

  return { items, hasV2Data: true }
}
