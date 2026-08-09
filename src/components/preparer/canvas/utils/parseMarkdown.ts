'use client'
// ─── SC-02F — Parseur markdown → blocs pédagogiques ─────────────────────────

import type { BlockType, CanvasBlock } from '@/lib/types/canvas'

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _counter = 0
function uid(): string {
  return `blk_${Date.now()}_${++_counter}`
}

// Detect block type from heading text
function detectType(titre: string, contenu: string): BlockType {
  const t = titre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const c = contenu.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  if (/objectif/.test(t)) return 'objectif'
  if (/competence/.test(t) || /habilete/.test(t)) return 'competence'
  if (/activite|deroulement|etape|sequence|tache/.test(t)) return 'activite'
  if (/evaluation|quiz|examen|bilan|summative|formative/.test(t)) return 'evaluation'
  if (/ressource|materiel|outil|support|document|reference/.test(t)) return 'ressource'
  if (/question|interrogation/.test(t)) return 'question'
  if (/chronologie|timeline|progressi|calendrier/.test(t)) return 'chronologie'
  if (/differentiation|differenciation|adaptation|soutien/.test(t)) return 'activite'
  if (/devoir|travail.*maison|homework/.test(t)) return 'evaluation'
  if (/observation|note|remarque|commentaire/.test(t)) return 'texte'
  if (/introduction|mise.*en.*situation|accroche|amorce/.test(t)) return 'texte'
  if (/conclusion|bilan|synthese|retour/.test(t)) return 'texte'

  // Detect from content structure
  const lines = contenu.split('\n').filter(l => l.trim())
  const tableLines = lines.filter(l => l.startsWith('|') && l.trim().endsWith('|'))
  if (tableLines.length >= 2) return 'tableau'

  const bulletLines = lines.filter(l => /^[-*+]\s/.test(l.trim()) || /^\d+\.\s/.test(l.trim()))
  if (bulletLines.length >= 2) return 'liste'

  // Content keywords fallback
  if (/\| .+ \|/.test(c)) return 'tableau'
  if (/objectif/.test(c.slice(0, 200))) return 'objectif'
  if (/competence|habilete/.test(c.slice(0, 200))) return 'competence'

  return 'texte'
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseMarkdownToBlocks(
  markdown: string,
  _titrePrincipal?: string,
): CanvasBlock[] {
  if (!markdown?.trim()) return []

  const blocks: CanvasBlock[] = []

  // Split by H1, H2, H3 headings (greedy — include all content until next heading)
  // Pattern: line that starts with # (any level 1-3)
  const sections = markdown.split(/(?=^#{1,3}\s)/m)

  let ordre = 0

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/)

    if (headingMatch) {
      const titre = headingMatch[2].replace(/\*+/g, '').trim()
      // Content is everything after the first line
      const firstNewline = trimmed.indexOf('\n')
      const contenu = firstNewline >= 0 ? trimmed.slice(firstNewline + 1).trim() : ''

      // Skip the document title (H1 at the very start) — surface it as meta, not a block
      if (headingMatch[1] === '#' && ordre === 0 && blocks.length === 0) {
        // If this H1 block has content, treat the content as a 'texte' block
        if (contenu.trim()) {
          blocks.push({
            id: uid(),
            titre,
            type: detectType(titre, contenu),
            contenu,
            ordre: ordre++,
            statut: 'normal',
            genereParIA: true,
            modifie: false,
            version: 1,
            collapsed: false,
          })
        }
        continue
      }

      blocks.push({
        id: uid(),
        titre,
        type: detectType(titre, contenu),
        contenu,
        ordre: ordre++,
        statut: 'normal',
        genereParIA: true,
        modifie: false,
        version: 1,
        collapsed: false,
      })
    } else {
      // Orphan content (no heading) — wrap it as a texte block only if non-trivial
      if (trimmed.length > 20) {
        blocks.push({
          id: uid(),
          titre: _titrePrincipal || 'Introduction',
          type: detectType('', trimmed),
          contenu: trimmed,
          ordre: ordre++,
          statut: 'normal',
          genereParIA: true,
          modifie: false,
          version: 1,
          collapsed: false,
        })
      }
    }
  }

  return blocks
}

// ─── Serialize blocks back to markdown ───────────────────────────────────────

export function blocksToMarkdown(blocks: CanvasBlock[]): string {
  return blocks
    .sort((a, b) => a.ordre - b.ordre)
    .map(b => `## ${b.titre}\n\n${b.contenu}`)
    .join('\n\n---\n\n')
}
