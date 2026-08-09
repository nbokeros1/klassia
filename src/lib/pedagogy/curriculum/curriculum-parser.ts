// ── PIL — CurriculumParser ───────────────────────────────────────────────────
//
// Extrait une structure curriculaire lisible à partir du texte brut
// d'un programme annuel ou d'un document curriculaire.
// Déterministe — aucun appel IA, aucun réseau.

import type { CurriculumStructure, CurriculumUnit } from '../types'
import {
  extractLines,
  removeListPrefix,
  isSeparatorLine,
  isDateLine,
  isUrlLine,
} from '../shared/text-utils'

// ── Heuristiques pour détecter les titres de section ────────────────────────

/** Une ligne semble être un titre de section/unité si elle est courte et capitalisée. */
function looksLikeSectionHeader(line: string): boolean {
  const stripped = removeListPrefix(line)
  // Titre : commence par majuscule, ≤ 60 chars, pas de ponctuation de fin de phrase
  return (
    stripped.length >= 3 &&
    stripped.length <= 60 &&
    /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ]/.test(stripped) &&
    !stripped.endsWith('.') &&
    !stripped.includes('→')
  )
}

/** Détecte les compétences à partir du texte d'une ligne. */
function extractCompetencies(line: string): string[] {
  const markers = ['compétence', 'competence', 'objectif', 'standard']
  const lower = line.toLowerCase()
  if (markers.some(m => lower.includes(m))) {
    return [removeListPrefix(line)]
  }
  return []
}

// ── Parser ────────────────────────────────────────────────────────────────────

export class CurriculumParser {
  /**
   * Parse le texte extrait d'un document pédagogique pour en extraire
   * une structure curriculaire (unités, thèmes, compétences).
   *
   * @param document  Document avec `texteExtrait` ou null.
   */
  parse(document: { texteExtrait: string | null } | null): CurriculumStructure {
    if (!document?.texteExtrait) {
      return { units: [], totalTopics: 0, rawLines: [] }
    }

    const rawLines = extractLines(document.texteExtrait)
    const units: CurriculumUnit[] = []
    let orderIdx = 0

    for (const rawLine of rawLines) {
      // Ignorer les lignes structurelles
      if (isSeparatorLine(rawLine)) continue
      if (isDateLine(rawLine))      continue
      if (isUrlLine(rawLine))       continue

      const title = removeListPrefix(rawLine)
      if (title.length < 3 || title.length > 120) continue

      const competencies = extractCompetencies(rawLine)

      units.push({
        id:           `unit_${orderIdx}`,
        title,
        order:        orderIdx,
        themes:       [],           // rempli par analyse future si nécessaire
        competencies,
      })

      orderIdx++
    }

    return {
      units,
      totalTopics: units.length,
      rawLines,
    }
  }

  /**
   * Retourne les titres de toutes les unités (pour la comparaison rapide).
   */
  unitTitles(structure: CurriculumStructure): string[] {
    return structure.units.map(u => u.title)
  }
}
