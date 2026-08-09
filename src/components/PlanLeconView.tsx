'use client'

interface Props {
  content: string
}

interface ParsedTable {
  header: string[]
  rows:   string[][]
}

// ── Parser Markdown tables (identique au serveur) ─────────────────────────────

function parseMdTables(md: string): ParsedTable[] {
  const tables: ParsedTable[] = []
  const lines = md.replace(/```[\s\S]*?```/g, '').split('\n')
  let cur: ParsedTable | null = null
  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('|')) {
      if (cur) { tables.push(cur); cur = null }
      continue
    }
    if (t.replace(/[|:\s-]/g, '') === '') continue
    const cells = t.split('|').filter(c => c.trim() !== '').map(c => c.trim())
    if (!cur) {
      cur = { header: cells, rows: [] }
    } else {
      // Déduplique les lignes d'en-tête répétées
      const hNorm = cur.header.map(h => h.replace(/\s+/g, '').toLowerCase())
      const rNorm = cells.map(c => c.replace(/\s+/g, '').toLowerCase())
      if (!hNorm.every((h, i) => h === (rNorm[i] ?? ''))) {
        cur.rows.push(cells)
      }
    }
  }
  if (cur) tables.push(cur)
  return tables
}

// ── Convertit Markdown inline en HTML sécurisé ────────────────────────────────

function mdInlineToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

// ── Styles réutilisables ──────────────────────────────────────────────────────

const S = {
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: 10,
    tableLayout: 'fixed' as const,
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'Calibri, "Segoe UI", system-ui, sans-serif',
  },
  cell: {
    padding: '7px 11px',
    border: '1px solid #d1d5db',
    verticalAlign: 'top' as const,
    color: '#111827',
  },
  headerCell: {
    padding: '7px 11px',
    border: '1px solid #9ca3af',
    fontWeight: 700,
    fontSize: 12,
    background: '#1e3a5f',
    color: '#ffffff',
    verticalAlign: 'middle' as const,
    WebkitPrintColorAdjust: 'exact' as const,
    printColorAdjust: 'exact' as const,
  },
  phaseBand: {
    padding: '8px 11px',
    border: '1px solid #9ca3af',
    fontWeight: 700,
    fontSize: 13,
    background: '#fef9c3',
    color: '#78350f',
    WebkitPrintColorAdjust: 'exact' as const,
    printColorAdjust: 'exact' as const,
  },
  subHeader: {
    padding: '6px 11px',
    border: '1px solid #d1d5db',
    fontWeight: 600,
    fontSize: 12,
    background: '#f3f4f6',
    color: '#374151',
    verticalAlign: 'middle' as const,
    WebkitPrintColorAdjust: 'exact' as const,
    printColorAdjust: 'exact' as const,
  },
} as const

// ── Composant principal ───────────────────────────────────────────────────────

export default function PlanLeconView({ content }: Props) {
  const tables = parseMdTables(content)

  const r0    = tables[0]?.rows[0] ?? []
  const r1    = tables[1]?.rows[0] ?? []
  const r2    = tables[2]?.rows[0] ?? []
  const r3    = tables[3]?.rows[0] ?? []
  const r4    = tables[4]?.rows[0] ?? []
  const pRows = tables[5]?.rows ?? [['', '', '']]
  const r6    = tables[6]?.rows[0] ?? []

  const h0 = tables[0]?.header ?? ['Nom', 'Niveau scolaire', 'Matière', 'Durée', 'Leçon #']
  const h1 = tables[1]?.header ?? ["Programme d'étude — RAG et RAS", 'Intention pédagogique']
  const h2 = tables[2]?.header ?? ['Intégration de la langue (vocabulaire, oral, écrit, visuel)', 'Évaluation']
  const h3 = tables[3]?.header ?? ['Intégration de la perspective autochtone', 'Différenciation pédagogique']
  const h4 = tables[4]?.header ?? ['Temps prévu', 'Connexion et connaissances antérieures', 'Matériaux/ressources']
  const h5 = tables[5]?.header ?? ['Temps prévu', 'Déroulement', 'Matériaux/ressources']
  const h6 = tables[6]?.header ?? ['Temps prévu', 'Retour sur les apprentissages', 'Matériaux/ressources']

  const RichTd = ({ text, style }: { text: string; style?: React.CSSProperties }) => (
    <td style={{ ...S.cell, ...style }}
      dangerouslySetInnerHTML={{ __html: mdInlineToHtml(text || '') }} />
  )

  const PhaseTable = ({
    titre,
    header,
    rows,
    colWidths = ['10%', '65%', '25%'],
  }: {
    titre:      string
    header:     string[]
    rows:       string[][]
    colWidths?: [string, string, string]
  }) => (
    <table style={S.table}>
      <colgroup>
        <col style={{ width: colWidths[0] }} />
        <col style={{ width: colWidths[1] }} />
        <col style={{ width: colWidths[2] }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={2} style={S.phaseBand}>{titre}</td>
          <td style={S.phaseBand}>Matériaux / ressources</td>
        </tr>
        <tr>
          <td style={S.subHeader}>{header[0] ?? 'Temps prévu'}</td>
          <td style={S.subHeader}>{header[1] ?? 'Déroulement'}</td>
          <td style={S.subHeader}>{header[2] ?? 'Matériaux/ressources'}</td>
        </tr>
        {rows.map((row, i) => (
          <tr key={i}>
            <td style={{ ...S.cell, fontWeight: 500 }}>{row[0] ?? ''}</td>
            <RichTd text={row[1] ?? ''} />
            <RichTd text={row[2] ?? ''} />
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div style={{ fontFamily: 'Calibri, "Segoe UI", system-ui, sans-serif', color: '#111827', lineHeight: 1.6 }}>

      {/* ── Identification ── */}
      <table style={S.table}>
        <colgroup>{h0.slice(0, 5).map((_, i) => <col key={i} style={{ width: '20%' }} />)}</colgroup>
        <tbody>
          <tr>{h0.slice(0, 5).map((h, i) => <th key={i} style={S.headerCell}>{h}</th>)}</tr>
          <tr>
            {[r0[0], r0[1], r0[2], r0[3], r0[4]].map((v, i) => (
              <td key={i} style={S.cell}>{v ?? ''}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ── Programme / Intention ── */}
      <table style={S.table}>
        <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>
        <tbody>
          <tr>
            <th style={S.headerCell}>{h1[0]}</th>
            <th style={S.headerCell}>{h1[1]}</th>
          </tr>
          <tr>
            <RichTd text={r1[0] ?? ''} />
            <RichTd text={r1[1] ?? ''} />
          </tr>
        </tbody>
      </table>

      {/* ── Langue / Évaluation ── */}
      <table style={S.table}>
        <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>
        <tbody>
          <tr>
            <th style={S.headerCell}>{h2[0]}</th>
            <th style={S.headerCell}>{h2[1]}</th>
          </tr>
          <tr>
            <RichTd text={r2[0] ?? ''} />
            <RichTd text={r2[1] ?? ''} />
          </tr>
        </tbody>
      </table>

      {/* ── Perspective autochtone / Différenciation ── */}
      <table style={S.table}>
        <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>
        <tbody>
          <tr>
            <th style={S.headerCell}>{h3[0]}</th>
            <th style={S.headerCell}>{h3[1]}</th>
          </tr>
          <tr>
            <RichTd text={r3[0] ?? ''} />
            <RichTd text={r3[1] ?? ''} />
          </tr>
        </tbody>
      </table>

      {/* ── AVANT ── */}
      <PhaseTable
        titre="AVANT — Préparation/activation (amorce, introduction)"
        header={h4}
        rows={[r4.length ? r4 : ['', '', '']]}
      />

      {/* ── PENDANT ── */}
      <PhaseTable
        titre="PENDANT — Réalisation (développement)"
        header={h5}
        rows={pRows.length ? pRows : [['', '', ''], ['', '', ''], ['', '', '']]}
      />

      {/* ── APRÈS ── */}
      <PhaseTable
        titre="APRÈS — Intégration/évaluation (retour sur les apprentissages)"
        header={h6}
        rows={[r6.length ? r6 : ['', '', '']]}
      />

    </div>
  )
}

// ── Génère le HTML complet pour la fenêtre d'impression ──────────────────────

export function buildPlanLeconPrintHtml(content: string, titre: string): string {
  const tables = parseMdTables(content)

  const r0    = tables[0]?.rows[0] ?? []
  const r1    = tables[1]?.rows[0] ?? []
  const r2    = tables[2]?.rows[0] ?? []
  const r3    = tables[3]?.rows[0] ?? []
  const r4    = tables[4]?.rows[0] ?? []
  const pRows = tables[5]?.rows ?? [['', '', '']]
  const r6    = tables[6]?.rows[0] ?? []

  const h0 = tables[0]?.header ?? ['Nom', 'Niveau scolaire', 'Matière', 'Durée', 'Leçon #']
  const h1 = tables[1]?.header ?? ["Programme d'étude — RAG et RAS", 'Intention pédagogique']
  const h2 = tables[2]?.header ?? ['Intégration de la langue', 'Évaluation']
  const h3 = tables[3]?.header ?? ['Intégration de la perspective autochtone', 'Différenciation pédagogique']
  const h4h = tables[4]?.header ?? ['Temps prévu', 'Connexion et connaissances antérieures', 'Matériaux/ressources']
  const h5h = tables[5]?.header ?? ['Temps prévu', 'Déroulement', 'Matériaux/ressources']
  const h6h = tables[6]?.header ?? ['Temps prévu', 'Retour sur les apprentissages', 'Matériaux/ressources']

  const esc = (s: string) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const rich = (s: string) =>
    esc(s || '').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\n/g, '<br>')

  const idCols = h0.slice(0, 5).map(h => `<th>${esc(h)}</th>`).join('')
  const idVals = [r0[0], r0[1], r0[2], r0[3], r0[4]].map(v => `<td>${esc(v ?? '')}</td>`).join('')

  const twoCol = (h: string[], vals: string[]) => `
    <table><tr><th>${esc(h[0] ?? '')}</th><th>${esc(h[1] ?? '')}</th></tr>
    <tr><td>${rich(vals[0] ?? '')}</td><td>${rich(vals[1] ?? '')}</td></tr></table>`

  const phase = (titre: string, hdr: string[], rows: string[][]) => {
    const dataRows = rows.map(row =>
      `<tr><td class="t">${esc(row[0] ?? '')}</td><td>${rich(row[1] ?? '')}</td><td>${rich(row[2] ?? '')}</td></tr>`
    ).join('')
    return `
    <table>
      <tr><td colspan="2" class="phase">${esc(titre)}</td><td class="phase">Matériaux / ressources</td></tr>
      <tr><td class="sub t">${esc(hdr[0] ?? 'Temps')}</td><td class="sub">${esc(hdr[1] ?? '')}</td><td class="sub">${esc(hdr[2] ?? '')}</td></tr>
      ${dataRows}
    </table>`
  }

  const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  return `<!DOCTYPE html><html lang="fr"><head>
  <meta charset="UTF-8">
  <title>Plan de leçon — ${esc(titre)}</title>
  <style>
    @page { margin: 1.5cm 2cm; }
    * { box-sizing: border-box; }
    body { font-family: Calibri, "Segoe UI", sans-serif; font-size: 11pt; color: #111; margin: 0; }
    .header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14pt; padding-bottom:8pt; border-bottom:2pt solid #1e3a5f; }
    .title  { font-size:16pt; font-weight:800; color:#1e3a5f; }
    .meta   { font-size:9pt; color:#6b7280; margin-top:3pt; }
    .logo   { font-size:9pt; color:#7C3AED; font-weight:800; }
    table   { width:100%; border-collapse:collapse; margin-bottom:8pt; table-layout:fixed; }
    th      { background:#1e3a5f; color:#fff; padding:6pt 9pt; text-align:left; font-size:10pt; -webkit-print-color-adjust:exact; print-color-adjust:exact; border:1pt solid #9ca3af; }
    td      { padding:6pt 9pt; border:1pt solid #d1d5db; vertical-align:top; font-size:10.5pt; line-height:1.55; }
    .phase  { background:#fef9c3; color:#78350f; font-weight:700; font-size:11pt; -webkit-print-color-adjust:exact; print-color-adjust:exact; border:1pt solid #9ca3af; }
    .sub    { background:#f3f4f6; font-weight:600; font-size:10pt; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .t      { font-weight:500; width:9%; }
    .footer { margin-top:20pt; padding-top:6pt; border-top:1pt solid #ccc; font-size:8pt; color:#888; text-align:center; }
  </style>
</head><body>
  <div class="header">
    <div>
      <div class="title">${esc(titre)}</div>
      <div class="meta">${date}</div>
    </div>
    <div class="logo">✦ ScorgIA</div>
  </div>
  <table><tr>${idCols}</tr><tr>${idVals}</tr></table>
  ${twoCol(h1, [r1[0] ?? '', r1[1] ?? ''])}
  ${twoCol(h2, [r2[0] ?? '', r2[1] ?? ''])}
  ${twoCol(h3, [r3[0] ?? '', r3[1] ?? ''])}
  ${phase('AVANT — Préparation/activation (amorce, introduction)', h4h, [r4.length ? r4 : ['', '', '']])}
  ${phase('PENDANT — Réalisation (développement)', h5h, pRows.length ? pRows : [['', '', '']])}
  ${phase('APRÈS — Intégration/évaluation (retour sur les apprentissages)', h6h, [r6.length ? r6 : ['', '', '']])}
  <div class="footer">Généré par ScorgIA — scorgia.app</div>
</body></html>`
}
