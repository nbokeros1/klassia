// ── PIL — Utilitaires texte partagés ─────────────────────────────────────────
//
// Fonctions déterministes de manipulation de texte.
// Aucune IA, aucun appel réseau, aucun import React.

const RE_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Normalise une chaîne : minuscules + NFD + suppression diacritiques + trim. */
export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(RE_DIACRITICS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Découpe un texte en lignes non-vides. */
export function extractLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

/** Retire les préfixes de liste (numéros, puces, tirets…). */
export function removeListPrefix(line: string): string {
  return line.replace(/^[\d.)\-*•–—>\s]+/, '').trim()
}

/** Ligne séparatrice (====, -----, ____). */
export function isSeparatorLine(line: string): boolean {
  return /^[=\-_]{3,}$/.test(line)
}

/** Ligne de date (ex : 12/09, 2026-10-01). */
export function isDateLine(line: string): boolean {
  return /^\d{1,2}[\/\-]\d{1,2}/.test(line) || /^\d{4}-\d{2}-\d{2}/.test(line)
}

/** Ligne URL. */
export function isUrlLine(line: string): boolean {
  return /^https?:\/\//.test(line)
}

/** Détecte si deux chaînes sont similaires (après normalisation). */
export function areSimilar(a: string, b: string): boolean {
  return normaliser(a) === normaliser(b)
}

/** Vérifie si `haystack` contient `needle` (normalisation appliquée). */
export function containsNorm(haystack: string, needle: string): boolean {
  if (!needle) return false
  return normaliser(haystack).includes(normaliser(needle))
}
