// ── Document Context Engine — Extraction texte (DCE-02) ──────────────────────
//
// Reçoit un Buffer + MIME + nom de fichier.
// Retourne le texte extrait avec métadonnées (pages, version extracteur).
// Formats couverts : PDF texte, DOCX, TXT, Markdown, CSV.
// Formats OCR / PowerPoint / Excel : hors périmètre — lever FormatNonSupporte.

export interface ResultatExtraction {
  texte:              string
  nb_pages?:          number
  nb_slides?:         number
  nb_feuilles?:       number
  version_extracteur: string
}

export class FormatNonSupporte extends Error {
  constructor(mime: string) {
    super(`Format non supporté pour l'extraction texte : ${mime}`)
    this.name = 'FormatNonSupporte'
  }
}

// Map extension → MIME canonique (fallback quand le navigateur envoie text/plain)
const EXT_TO_MIME: Record<string, string> = {
  pdf:  'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt:  'text/plain',
  md:   'text/markdown',
  csv:  'text/csv',
}

// Résoudre le MIME effectif : priorité au MIME stocké, sinon fallback sur extension
function mimeResolu(mimeType: string, nom: string): string {
  const ext = nom.split('.').pop()?.toLowerCase() || ''
  // Si le MIME est text/plain mais l'extension est md ou csv, affiner
  if (mimeType === 'text/plain' && (ext === 'md' || ext === 'csv')) {
    return EXT_TO_MIME[ext]
  }
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType
  return EXT_TO_MIME[ext] || mimeType
}

function nettoyerTexte(texte: string): string {
  return texte
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Supprimer les caractères de contrôle sauf \t (0x09) et \n (0x0A)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Réduire les sauts de ligne excessifs
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

export async function extraireTexte(
  buffer: Buffer,
  mimeType: string,
  nom: string,
): Promise<ResultatExtraction> {
  const mime = mimeResolu(mimeType, nom)

  // ── PDF texte ───────────────────────────────────────────────────────────────
  if (mime === 'application/pdf') {
    // pdf-parse est en serverExternalPackages — chargé via Node.js require() au runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
    const data     = await pdfParse(buffer)
    const texte    = nettoyerTexte(data.text)
    if (texte.length < 20) {
      throw new Error(
        'Aucun texte exploitable extrait du PDF. ' +
        'Ce document est probablement numérisé et nécessite une reconnaissance optique (OCR).',
      )
    }
    return {
      texte,
      nb_pages:           data.numpages || undefined,
      version_extracteur: 'pdf-parse-1.1',
    }
  }

  // ── DOCX ────────────────────────────────────────────────────────────────────
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = (await import('mammoth')).default
    const result  = await mammoth.extractRawText({ buffer })
    const texte   = nettoyerTexte(result.value)
    if (!texte) throw new Error('Aucun texte extrait du document Word.')
    return { texte, version_extracteur: 'mammoth-1.12' }
  }

  // ── TXT / Markdown ──────────────────────────────────────────────────────────
  if (
    mime === 'text/plain'    ||
    mime === 'text/markdown' ||
    mime === 'text/x-markdown'
  ) {
    const texte = nettoyerTexte(buffer.toString('utf-8'))
    if (!texte) throw new Error('Document texte vide.')
    return { texte, version_extracteur: 'utf8-decode-1.0' }
  }

  // ── CSV ─────────────────────────────────────────────────────────────────────
  if (mime === 'text/csv' || mime === 'application/csv') {
    const texte = nettoyerTexte(buffer.toString('utf-8'))
    if (!texte) throw new Error('Fichier CSV vide.')
    return { texte, version_extracteur: 'utf8-decode-1.0' }
  }

  throw new FormatNonSupporte(mimeType || `inconnu (${nom})`)
}
