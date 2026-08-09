// ── PIL — LessonAnalyzer ─────────────────────────────────────────────────────
//
// Analyse les documents-leçons pour en extraire les informations pédagogiques.
// Déterministe — aucun appel IA, aucun réseau.

import type { LessonInfo } from '../types'
import type { DocumentSnapshot } from '../../mission-engine/types'
import type { CurriculumUnit } from '../types'
import { normaliser, containsNorm } from '../shared/text-utils'

export class LessonAnalyzer {
  /**
   * Analyse une liste de snapshots-leçons.
   * Si une structure curriculaire est fournie, tente de rattacher chaque leçon
   * à un chapitre du curriculum.
   */
  analyze(
    lessons:          DocumentSnapshot[],
    curriculumUnits?: CurriculumUnit[],
  ): LessonInfo[] {
    return lessons.map(l => {
      const chapter = curriculumUnits
        ? this.matchChapter(l.nom, curriculumUnits)
        : null

      return {
        id:      l.id,
        nom:     l.nom,
        subject: l.nom || null,
        chapter,
        notions: this.extractNotions(l),
        date:    l.createdAt,
      }
    })
  }

  /**
   * Tente de rattacher le nom d'une leçon à un chapitre du curriculum.
   * Matching par inclusion normalisée (pas de fuzzy-matching lourd).
   */
  private matchChapter(
    lessonNom:      string,
    curriculumUnits: CurriculumUnit[],
  ): string | null {
    const lessonNorm = normaliser(lessonNom)

    // 1. Correspondance exacte
    const exact = curriculumUnits.find(u => normaliser(u.title) === lessonNorm)
    if (exact) return exact.title

    // 2. La leçon contient le titre de l'unité
    const contains = curriculumUnits.find(u => containsNorm(lessonNom, u.title))
    if (contains) return contains.title

    // 3. L'unité contient le nom de la leçon (leçon = sous-partie d'une unité)
    const contained = curriculumUnits.find(u => containsNorm(u.title, lessonNom))
    if (contained) return contained.title

    return null
  }

  /**
   * Extraction de notions à partir du texte extrait d'une leçon (best-effort).
   * Retourne une liste vide si pas de texte disponible.
   */
  private extractNotions(lesson: DocumentSnapshot): string[] {
    if (!lesson.texteExtrait) return []

    const NOTION_KEYWORDS = ['notion', 'concept', 'définition', 'vocabulaire', 'terme']
    const lines = lesson.texteExtrait.split('\n').map(l => l.trim()).filter(Boolean)

    const notions: string[] = []
    for (const line of lines.slice(0, 20)) {
      const lower = line.toLowerCase()
      if (NOTION_KEYWORDS.some(k => lower.includes(k))) {
        const cleaned = line.replace(/^[^:]+:\s*/, '').trim()
        if (cleaned.length >= 3 && cleaned.length <= 80) {
          notions.push(cleaned)
        }
      }
    }

    return notions.slice(0, 5)
  }

  /**
   * Retourne l'ensemble normalisé des noms de leçons pour comparaison rapide.
   */
  completedSet(lessons: LessonInfo[]): Set<string> {
    return new Set(lessons.map(l => normaliser(l.nom)))
  }
}
