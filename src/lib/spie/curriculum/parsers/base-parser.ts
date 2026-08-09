// SPIE-02 — Base curriculum parser
// Shared logic for all parsers: section detection, metadata extraction,
// line analysis.

import type { ParsedSection, SectionType, CurriculumDocumentMetadata } from './types'

// ─── Heuristics ────────────────────────────────────────────────────────────────

// Province/authority markers for metadata detection
const PROVINCE_MARKERS: Record<string, string> = {
  alberta: 'alberta',
  'alberta education': 'alberta',
  ontario: 'ontario',
  québec: 'quebec',
  quebec: 'quebec',
  'colombie-britannique': 'bc',
  'british columbia': 'bc',
  saskatchewan: 'saskatchewan',
  manitoba: 'manitoba',
  'nouveau-brunswick': 'nouveau_brunswick',
  'new brunswick': 'nouveau_brunswick',
  france: 'france',
  'common core': 'common_core',
}

const OUTCOME_GENERAL_MARKERS = [
  'résultat d\'apprentissage général',
  'résultat général',
  'overall expectation',
  'general outcome',
  'compétence disciplinaire',
  'big idea',
  'grande idée',
]

const OUTCOME_SPECIFIC_MARKERS = [
  'résultat d\'apprentissage spécifique',
  'résultat spécifique',
  'specific expectation',
  'specific outcome',
  'indicateur',
  'curricular competency',
  'résultat d\'apprentissage transdisciplinaire',
]

const COMPETENCY_MARKERS = [
  'compétence transversale',
  'core competency',
  'cross-curricular',
  'compétence essentielle',
]

const VOCABULARY_MARKERS = [
  'vocabulaire',
  'vocabulary',
  'glossaire',
  'glossary',
  'termes clés',
  'key terms',
]

// ─── Section type detection ───────────────────────────────────────────────────

export function detectSectionType(titre: string, contenu: string): SectionType {
  const lower = (titre + ' ' + contenu.substring(0, 100)).toLowerCase()

  if (OUTCOME_GENERAL_MARKERS.some(m => lower.includes(m))) return 'outcome_general'
  if (OUTCOME_SPECIFIC_MARKERS.some(m => lower.includes(m))) return 'outcome_specifique'
  if (COMPETENCY_MARKERS.some(m => lower.includes(m))) return 'competence'
  if (VOCABULARY_MARKERS.some(m => lower.includes(m))) return 'vocabulaire'

  if (/big ideas?/i.test(titre)) return 'big_idea'
  if (/évaluation|assessment/i.test(titre)) return 'evaluation'
  if (/activit(é|e)|activity/i.test(titre)) return 'activite'
  if (/ressource|resource/i.test(titre)) return 'ressource'
  if (/glossaire|glossary/i.test(titre)) return 'glossaire'
  if (/introduction|présentation|overview/i.test(titre)) return 'introduction'

  return 'autre'
}

// ─── Outcome code detection ───────────────────────────────────────────────────
// Detects codes like A1, B2.1, MA-20-1, SS7.1, etc.

export function detectOutcomeCode(line: string): string | undefined {
  // Alberta/SK pattern: letter + number (A1, B2, C3.1)
  const albertaMatch = line.match(/^([A-Z]\d+(?:\.\d+)?)\s/)
  if (albertaMatch) return albertaMatch[1]

  // Ontario pattern: alphanumeric codes (B1.1, C2.3)
  const ontarioMatch = line.match(/^([A-Z]\d+\.\d+)\s/)
  if (ontarioMatch) return ontarioMatch[1]

  // Saskatchewan pattern: subject code + level (SS7, MA10, ELA20)
  const skMatch = line.match(/^([A-Z]{2,4}\d+(?:\.\d+)?)\s/)
  if (skMatch) return skMatch[1]

  return undefined
}

// ─── Metadata extraction ──────────────────────────────────────────────────────

export function extractMetadataFromText(text: string, lines: string[]): CurriculumDocumentMetadata {
  const lowerText = text.toLowerCase()

  // Province detection
  let province: string | undefined
  for (const [marker, code] of Object.entries(PROVINCE_MARKERS)) {
    if (lowerText.includes(marker)) {
      province = code
      break
    }
  }

  // Language detection (simple heuristic)
  const frWords = (text.match(/\b(le|la|les|de|du|des|et|un|une|pour|dans|sur)\b/gi) || []).length
  const enWords = (text.match(/\b(the|and|of|to|in|a|for|is|are|with)\b/gi) || []).length
  const langue: 'fr' | 'en' | 'bilingual' =
    frWords > enWords * 2 ? 'fr'
    : enWords > frWords * 2 ? 'en'
    : 'bilingual'

  // Year detection
  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  const anneePublication = yearMatch ? parseInt(yearMatch[0]) : undefined

  // Level detection (grades)
  const niveauMatches = text.match(/grade\s+(\d+)|niveau\s+(\d+)|année\s+(\d+)|secondaire\s+(\d+)/gi)
  const niveaux = niveauMatches
    ? [...new Set(niveauMatches.map(m => m.replace(/\D+/, '').trim()))].filter(Boolean)
    : undefined

  return {
    province,
    langue,
    anneePublication,
    niveaux,
    nbMots: text.split(/\s+/).length,
    nbLignes: lines.length,
    nbCaracteres: text.length,
  }
}

// ─── Section splitter ─────────────────────────────────────────────────────────
// Split raw text into sections based on header heuristics.

const HEADER_PATTERNS = [
  /^#{1,4}\s+(.+)$/,               // Markdown headers
  /^([A-Z][A-Z\s]{4,50})$/,        // ALL CAPS headers
  /^(\d+\.\s+[A-Z].{3,60})$/,      // Numbered sections
  /^([A-Z][a-zàâäéèêëîïôùûüç].{3,60})\s*:?\s*$/,  // Title-case headers
]

export function isSectionHeader(line: string): boolean {
  if (line.trim().length < 3 || line.trim().length > 100) return false
  return HEADER_PATTERNS.some(p => p.test(line.trim()))
}

export function extractSectionTitle(line: string): string {
  for (const p of HEADER_PATTERNS) {
    const m = line.trim().match(p)
    if (m) return m[1].trim()
  }
  return line.trim()
}

export function splitIntoSections(lines: string[]): Array<{ titre: string; lignes: string[]; ligneDebut: number }> {
  const sections: Array<{ titre: string; lignes: string[]; ligneDebut: number }> = []
  let currentTitle = 'Début du document'
  let currentLines: string[] = []
  let currentStart = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isSectionHeader(line) && currentLines.some(l => l.trim().length > 0)) {
      sections.push({ titre: currentTitle, lignes: currentLines, ligneDebut: currentStart })
      currentTitle = extractSectionTitle(line)
      currentLines = []
      currentStart = i
    } else {
      currentLines.push(line)
    }
  }
  if (currentLines.length > 0) {
    sections.push({ titre: currentTitle, lignes: currentLines, ligneDebut: currentStart })
  }
  return sections
}
