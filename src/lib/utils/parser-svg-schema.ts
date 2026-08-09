// ─── Shared SVG-schema parser — used by MarkdownMessage AND print/export paths
// RÈGLE : une seule fonction de détection, zéro copie.

// ── Types ─────────────────────────────────────────────────────────────────────

export type Segment = { type: 'text'; value: string } | { type: 'svg'; value: string }

// ── Sécurité SVG ──────────────────────────────────────────────────────────────

const DANGEROUS_SVG_RE = /<script|on\w+\s*=/i

export function sanitizeSvg(raw: string): string | null {
  if (DANGEROUS_SVG_RE.test(raw)) return null
  return raw.trim()
}

// ── Découpe markdown en segments texte / svg-schema ───────────────────────────

export function splitAtSvg(content: string): Segment[] {
  const segs: Segment[] = []
  const re = /```svg-schema\n?([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segs.push({ type: 'text', value: content.slice(last, m.index) })
    segs.push({ type: 'svg', value: m[1] })
    last = re.lastIndex
  }
  if (last < content.length) segs.push({ type: 'text', value: content.slice(last) })
  if (segs.length === 0) segs.push({ type: 'text', value: content })
  return segs
}

export function hasPendingSvgBlock(content: string): boolean {
  const parts = content.split('```svg-schema')
  if (parts.length < 2) return false
  return !parts[parts.length - 1].includes('```')
}

// ── Markdown → HTML minimal pour le chemin print/export (sans React) ──────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g,     '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/_((?!\s).*?(?<!\s))_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g,       '<code>$1</code>')
}

export function markdownToHtmlSimple(md: string): string {
  const lines = md.split('\n')
  let html    = ''
  let inUl    = false
  let inOl    = false
  let inBq    = false
  let inTable = false
  let tableRows: string[][] = []

  const closeList = () => {
    if (inUl) { html += '</ul>'; inUl = false }
    if (inOl) { html += '</ol>'; inOl = false }
  }
  const closeBq = () => {
    if (inBq) { html += '</blockquote>'; inBq = false }
  }
  const closeTable = () => {
    if (!inTable || !tableRows.length) { inTable = false; tableRows = []; return }
    let out = '<table style="border-collapse:collapse;width:100%">'
    tableRows.forEach((row, idx) => {
      const tag = idx === 0 ? 'th' : 'td'
      const style = idx === 0
        ? 'style="background:#1a56db;color:#fff;padding:6px 10px;border:1px solid #93c5fd;text-align:left"'
        : 'style="padding:5px 10px;border:1px solid #d1d5db;vertical-align:top"'
      out += `<tr>${row.map(c => `<${tag} ${style}>${inlineFormat(c)}</${tag}>`).join('')}</tr>`
    })
    out += '</table>'
    html += out
    tableRows = []
    inTable   = false
  }

  for (const line of lines) {
    const t = line.trim()

    if (t === '') {
      closeTable(); closeList(); closeBq()
      continue
    }

    // ── Tableau Markdown pipe
    if (t.startsWith('|')) {
      // Ligne séparateur (|:---|:---|) : définit la frontière header/body — ignorer
      if (t.replace(/[|:\s-]/g, '') === '') continue
      closeList(); closeBq()
      inTable = true
      const cells = t.split('|').filter(c => c.trim() !== '').map(c => c.trim())
      tableRows.push(cells)
      continue
    }
    if (inTable) closeTable()

    if (/^-{3,}$/.test(t) || /^\*{3,}$/.test(t)) {
      closeList(); closeBq(); html += '<hr>'; continue
    }

    const h4 = t.match(/^####\s+(.+)/)
    const h3 = t.match(/^###\s+(.+)/)
    const h2 = t.match(/^##\s+(.+)/)
    const h1 = t.match(/^#\s+(.+)/)
    if (h1) { closeList(); closeBq(); html += `<h1>${inlineFormat(h1[1])}</h1>`; continue }
    if (h2) { closeList(); closeBq(); html += `<h2>${inlineFormat(h2[1])}</h2>`; continue }
    if (h3) { closeList(); closeBq(); html += `<h3>${inlineFormat(h3[1])}</h3>`; continue }
    if (h4) { closeList(); closeBq(); html += `<h4>${inlineFormat(h4[1])}</h4>`; continue }

    const bq = t.match(/^>\s*(.*)/)
    if (bq) {
      closeList()
      if (!inBq) { html += '<blockquote>'; inBq = true }
      html += `<p>${inlineFormat(bq[1])}</p>`
      continue
    }
    closeBq()

    const ul = t.match(/^[-*•]\s+(.+)/)
    if (ul) {
      if (!inUl) { closeList(); html += '<ul>'; inUl = true }
      html += `<li>${inlineFormat(ul[1])}</li>`
      continue
    }

    const ol = t.match(/^\d+\.\s+(.+)/)
    if (ol) {
      if (!inOl) { closeList(); html += '<ol>'; inOl = true }
      html += `<li>${inlineFormat(ol[1])}</li>`
      continue
    }

    closeList()
    html += `<p>${inlineFormat(t)}</p>`
  }

  closeTable(); closeList(); closeBq()
  return html
}

// ── Point d'entrée principal pour print/export ────────────────────────────────
// Convertit le markdown (avec blocs svg-schema) en HTML imprimable,
// en rendant les SVG comme éléments natifs (pas en texte échappé).

export function contentToHtml(markdown: string): string {
  const segs = splitAtSvg(markdown)
  return segs.map(seg => {
    if (seg.type === 'svg') {
      const clean = sanitizeSvg(seg.value)
      if (!clean) {
        return '<p style="color:#888;font-style:italic;font-size:10pt;">[Schéma non disponible]</p>'
      }
      return `<div style="margin:10pt 0;text-align:center;page-break-inside:avoid;">${clean}</div>`
    }
    return markdownToHtmlSimple(seg.value)
  }).join('\n')
}
