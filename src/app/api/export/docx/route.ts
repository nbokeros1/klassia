import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120
import {
  Document, Packer, Paragraph, TextRun, Table,
  TableRow, TableCell, Header, Footer,
  AlignmentType, BorderStyle,
  WidthType, ShadingType, VerticalAlign,
  PageNumber,
} from 'docx'

// ── Extraction ContenuLecon depuis Markdown (fallback DOCX) ──────────────────
// Utilisé quand le client ne passe pas contenu_json — assure JSON-first pour
// tous les exports de leçon quelle que soit l'origine de l'appel.
const PROMPT_DOCX_EXTRACTION = `Extrait les sections pédagogiques de ce Markdown et retourne UNIQUEMENT un objet JSON valide. Aucun texte avant ou après. Pas de backticks.

Schéma attendu :
{
  "intention": "intention pédagogique",
  "rag": "résultats généraux d'apprentissage",
  "ras": "résultats d'apprentissage spécifiques",
  "integration_langue": { "vocabulaire": "", "oral": "", "ecrit": "", "visuel": "" },
  "evaluation_formative": "support concret de la trace",
  "perspective_autochtone": "intégration FNMI ou vide",
  "differentiation_universelle": "",
  "differentiation_ciblee": "",
  "differentiation_specialisee": "",
  "avant_amorce": "contenu complet phase AVANT",
  "avant_duree": "chiffre seulement ex: 10",
  "pendant_modelisation": "enseignement explicite",
  "pendant_pratique_guidee": "pratique avec l'enseignant",
  "pendant_pratique_autonome": "pratique autonome",
  "pendant_duree": "chiffre seulement ex: 45",
  "apres_cloture": "retour sur les apprentissages",
  "apres_billet": "billet de sortie ou évaluation",
  "apres_duree": "chiffre seulement ex: 15",
  "materiel": []
}

Règles : champ vide ("") si absent. "materiel" est un tableau de strings.`

async function extraireContenuLeconPourDocx(markdown: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || markdown.length < 80) return null
  try {
    const client = new Anthropic({ apiKey })
    const md = markdown.length > 6000 ? markdown.substring(0, 6000) : markdown
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system:     PROMPT_DOCX_EXTRACTION,
      messages:   [{ role: 'user', content: md }],
    })
    const texte   = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const jsonBrut = texte.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const contenu  = JSON.parse(jsonBrut)
    if (contenu && (contenu.avant_amorce || contenu.pendant_modelisation || contenu.intention)) {
      return contenu
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const {
    contenu,
    contenu_json,   // ContenuLecon structuré — prioritaire sur contenu si fourni
    type_contenu,
    titre,
    classe,
    matiere,
    niveau,
    duree,
    nb_eleves,
    langue,
    enseignant_nom,
    numero_lecon,
  } = await req.json()

  const estAnglais = (langue ?? 'fr') === 'en'

  // Couleurs ScorgIA
  const VIOLET       = '7F77DD'
  const BLEU_SECTION = 'DBEAFE'
  const VERT_SECTION = 'DCFCE7'
  const AMBRE_SECTION = 'FEF9C3'
  const ROSE_SECTION  = 'FCE7F3'

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function cellule(
    texte: string,
    options: {
      gras?: boolean
      fond?: string
      colspan?: number
      fontSize?: number
      couleur?: string
      align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    } = {}
  ) {
    return new TableCell({
      columnSpan: options.colspan,
      verticalAlign: VerticalAlign.CENTER,
      shading: options.fond
        ? { fill: options.fond, type: ShadingType.CLEAR }
        : undefined,
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [new Paragraph({
        alignment: options.align ?? AlignmentType.LEFT,
        children: [new TextRun({
          text:  texte,
          bold:  options.gras ?? false,
          size:  options.fontSize ?? 20,
          color: options.couleur ?? '1F2937',
          font:  'Calibri',
        })]
      })]
    })
  }

  function sectionTitle(texte: string, emoji = '') {
    return new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new TextRun({
        text:  emoji ? emoji + ' ' + texte : texte,
        bold:  true,
        size:  26,
        color: VIOLET,
        font:  'Calibri',
      })]
    })
  }

  // Parser une ligne Markdown en TextRun[]
  function parseMarkdownLine(ligne: string): TextRun[] {
    const runs: TextRun[] = []
    const regex = /\*\*(.*?)\*\*|\*(.*?)\*/g
    let dernierIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(ligne)) !== null) {
      if (match.index > dernierIndex) {
        runs.push(new TextRun({
          text: ligne.substring(dernierIndex, match.index),
          size: 20, font: 'Calibri', color: '1F2937',
        }))
      }
      if (match[1] !== undefined) {
        runs.push(new TextRun({
          text: match[1], bold: true,
          size: 20, font: 'Calibri', color: '1F2937',
        }))
      } else if (match[2] !== undefined) {
        runs.push(new TextRun({
          text: match[2], italics: true,
          size: 20, font: 'Calibri', color: '1F2937',
        }))
      }
      dernierIndex = regex.lastIndex
    }
    if (dernierIndex < ligne.length) {
      runs.push(new TextRun({
        text: ligne.substring(dernierIndex),
        size: 20, font: 'Calibri', color: '1F2937',
      }))
    }
    return runs.length > 0
      ? runs
      : [new TextRun({ text: ligne, size: 20, font: 'Calibri' })]
  }

  // Supprimer les blocs ```code``` (SVG schemas, etc.) — pas rendables en DOCX
  function stripCodeBlocks(md: string): string {
    return md.replace(/```[\s\S]*?```/g, '[Schéma pédagogique — voir version web]')
  }

  // Inline bold pour cellules de tableau (size cohérent, sans passer par parseMarkdownLine)
  function parseCellRuns(text: string, size = 18, color = '1F2937'): TextRun[] {
    const parts  = text.split(/(\*\*[^*]+\*\*)/)
    const result: TextRun[] = []
    for (const p of parts) {
      if (!p) continue
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
        result.push(new TextRun({ text: p.slice(2, -2), bold: true, size, font: 'Calibri', color }))
      } else {
        result.push(new TextRun({ text: p, size, font: 'Calibri', color }))
      }
    }
    return result.length > 0 ? result : [new TextRun({ text, size, font: 'Calibri', color })]
  }

  // Extraire les tableaux Markdown en séquence positionnelle
  function parseMarkdownTables(md: string): Array<{ header: string[]; rows: string[][] }> {
    const tables: Array<{ header: string[]; rows: string[][] }> = []
    const lines  = md.split('\n')
    let cur: { header: string[]; rows: string[][] } | null = null

    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('|')) {
        if (cur) { tables.push(cur); cur = null }
        continue
      }
      if (t.replace(/[|:\s-]/g, '') === '') continue  // ligne séparateur (:---:)
      const cells = t.split('|').filter(c => c.trim() !== '').map(c => c.trim())
      if (!cur) {
        cur = { header: cells, rows: [] }
      } else {
        cur.rows.push(cells)
      }
    }
    if (cur) tables.push(cur)
    return tables
  }

  // Convertir Markdown en paragraphes Word
  function markdownToParagraphs(md: string): Paragraph[] {
    const lignes      = stripCodeBlocks(md).split('\n')
    const paragraphes: Paragraph[] = []
    let dansTableau   = false
    let lignesTableau: TableRow[] = []
    let colonneCount  = 0

    const finaliserTableau = () => {
      if (!lignesTableau.length) return
      // 2 cols → narrative 67% / ressources 33% ; sinon égal
      const largeurs = colonneCount === 2
        ? [Math.floor(9360 * 0.67), Math.floor(9360 * 0.33)]
        : Array(colonneCount).fill(Math.floor(9360 / Math.max(colonneCount, 1)))
      paragraphes.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: largeurs,
        rows: lignesTableau,
      }) as any)
      lignesTableau = []
      colonneCount  = 0
      dansTableau   = false
    }

    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i].trim()

      // ── Tableau Markdown ──────────────────────────────────────────
      if (ligne.startsWith('|')) {
        if (!dansTableau) { dansTableau = true; lignesTableau = [] }
        if (ligne.includes('---')) continue

        const cellules = ligne.split('|').filter(c => c.trim()).map(c => c.trim())
        colonneCount   = Math.max(colonneCount, cellules.length)
        const estHeader = lignes[i + 1]?.includes('---') ?? false

        lignesTableau.push(new TableRow({
          tableHeader: estHeader,
          children: cellules.map(c => new TableCell({
            shading: estHeader ? { fill: VIOLET, type: ShadingType.CLEAR } : undefined,
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
              left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
              right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: estHeader
                ? [new TextRun({ text: c.replace(/\*\*/g, ''), bold: true, size: 18, color: 'FFFFFF', font: 'Calibri' })]
                : parseCellRuns(c, 18, '1F2937'),
            })]
          }))
        }))
        continue
      }

      if (dansTableau) finaliserTableau()

      // ── H1 ────────────────────────────────────────────────────────
      if (ligne.startsWith('# ')) {
        paragraphes.push(new Paragraph({
          spacing: { before: 360, after: 180 },
          children: [new TextRun({
            text:  ligne.replace(/^# /, '').replace(/\*/g, ''),
            bold:  true, size: 36,
            color: VIOLET, font: 'Calibri',
          })]
        }))
        continue
      }

      // ── H2 ────────────────────────────────────────────────────────
      if (ligne.startsWith('## ')) {
        paragraphes.push(new Paragraph({
          spacing: { before: 240, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
          children: [new TextRun({
            text:  ligne.replace(/^## /, '').replace(/\*/g, ''),
            bold:  true, size: 28,
            color: '374151', font: 'Calibri',
          })]
        }))
        continue
      }

      // ── H3 ────────────────────────────────────────────────────────
      if (ligne.startsWith('### ')) {
        paragraphes.push(new Paragraph({
          spacing: { before: 180, after: 80 },
          children: [new TextRun({
            text:  ligne.replace(/^### /, '').replace(/\*/g, ''),
            bold:  true, size: 24,
            color: VIOLET, font: 'Calibri',
          })]
        }))
        continue
      }

      // ── Liste niveau 1 ────────────────────────────────────────────
      if (ligne.startsWith('- ') || ligne.startsWith('• ')) {
        paragraphes.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: parseMarkdownLine(ligne.replace(/^[-•] /, '')),
        }))
        continue
      }

      // ── Liste niveau 2 ────────────────────────────────────────────
      if (ligne.startsWith('  - ') || ligne.startsWith('  • ')) {
        paragraphes.push(new Paragraph({
          bullet: { level: 1 },
          spacing: { after: 40 },
          children: parseMarkdownLine(ligne.replace(/^  [-•] /, '')),
        }))
        continue
      }

      // ── Citation / callout ────────────────────────────────────────
      if (ligne.startsWith('> ')) {
        paragraphes.push(new Paragraph({
          spacing: { before: 120, after: 120 },
          indent: { left: 560 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: VIOLET } },
          children: [new TextRun({
            text: ligne.replace(/^> /, ''),
            italics: true, size: 20,
            color: '6B7280', font: 'Calibri',
          })]
        }))
        continue
      }

      // ── Séparateur ────────────────────────────────────────────────
      if (ligne === '---' || ligne === '***') {
        paragraphes.push(new Paragraph({
          spacing: { before: 120, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' } },
          children: [],
        }))
        continue
      }

      // ── Paragraphe normal ou ligne vide ──────────────────────────
      if (ligne) {
        paragraphes.push(new Paragraph({
          spacing: { after: 100 },
          children: parseMarkdownLine(ligne),
        }))
      } else {
        paragraphes.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: '' })],
        }))
      }
    }

    if (dansTableau) finaliserTableau()
    return paragraphes
  }

  // ─── GABARIT PLAN DE LEÇON USJ (Campus Saint-Jean) ─────────────────────────
  // Reproduit la structure exacte : identification 5-col, sections info 2-col
  // avec en-têtes vert foncé, phases AVANT/PENDANT/APRÈS avec en-tête jaune.
  // Parsing positionnel : le 1er tableau MD = identification, les 3 suivants =
  // sections info, les 3 derniers = phases — conforme à getFormatSection().

  type InfosDoc = {
    enseignant?:   string
    niveau?:       string
    matiere?:      string
    duree?:        string | number
    nb_eleves?:    string | number
    numero_lecon?: string
  }

  function genererGabaritPlanLecon(
    contenuMd: string,
    infos: InfosDoc
  ): Array<Paragraph | Table> {
    const elements: Array<Paragraph | Table> = []
    const md     = stripCodeBlocks(contenuMd)
    const tables = parseMarkdownTables(md)

    const USJ_VERT  = '1B5E20'   // vert foncé (en-têtes Programme, Langue, Autochtone)
    const USJ_JAUNE = 'FFFF00'   // jaune (en-têtes AVANT, PENDANT, APRÈS)
    const SUB_GRAY  = 'F3F4F6'   // gris clair (sous-en-têtes de phase)
    const BORD      = '9CA3AF'   // couleur de bordure uniforme

    function esp() {
      return new Paragraph({ spacing: { after: 140 }, children: [] })
    }

    const bordures = {
      top:    { style: BorderStyle.SINGLE, size: 4, color: BORD },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORD },
      left:   { style: BorderStyle.SINGLE, size: 4, color: BORD },
      right:  { style: BorderStyle.SINGLE, size: 4, color: BORD },
    }

    // Cellule texte simple (en-têtes, valeurs courtes)
    function cellTxt(text: string, opts: {
      fond?: string; couleur?: string; gras?: boolean;
      size?: number; colspan?: number; va?: 'top' | 'center' | 'bottom'
    } = {}): TableCell {
      return new TableCell({
        columnSpan:    opts.colspan,
        verticalAlign: (opts.va ?? VerticalAlign.CENTER) as any,
        shading:       opts.fond ? { fill: opts.fond, type: ShadingType.CLEAR } : undefined,
        borders:       bordures,
        margins:       { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({
            text,
            bold:  opts.gras  ?? false,
            size:  opts.size  ?? 18,
            color: opts.couleur ?? '111827',
            font:  'Calibri',
          })]
        })]
      })
    }

    // Cellule contenu riche (contenu Markdown parsé)
    function cellMd(text: string, opts: { colspan?: number } = {}): TableCell {
      return new TableCell({
        columnSpan:    opts.colspan,
        verticalAlign: VerticalAlign.TOP,
        borders:       bordures,
        margins:       { top: 80, bottom: 80, left: 120, right: 120 },
        children:      text.trim()
          ? markdownToParagraphs(text)
          : [new Paragraph({ children: [new TextRun({ text: '' })] })],
      })
    }

    // ── TABLE IDENTIFICATION (5 colonnes) ────────────────────────────────────
    const t0     = tables[0]
    const idData = t0?.rows[0] ?? []
    const idHdrs = t0?.header ?? ['Nom', 'Niveau scolaire', 'Matière', 'Durée', 'Leçon #']
    elements.push(new Table({
      width:        { size: 9360, type: WidthType.DXA },
      columnWidths: [1872, 1872, 1872, 1872, 1872],
      rows: [
        new TableRow({ children: idHdrs.slice(0, 5).map(h => cellTxt(h, { gras: true, fond: 'F3F4F6' })) }),
        new TableRow({ children: [
          cellTxt(infos.enseignant   ?? idData[0] ?? ''),
          cellTxt(infos.niveau       ?? idData[1] ?? ''),
          cellTxt(infos.matiere      ?? idData[2] ?? ''),
          cellTxt(infos.duree ? String(infos.duree) + ' min' : (idData[3] ?? '')),
          cellTxt(infos.numero_lecon ?? idData[4] ?? ''),
        ]}),
      ],
    }))
    elements.push(esp())

    // ── TABLES INFO 2-colonnes (Programme, Langue, Autochtone) ───────────────
    const infoSections: Array<{ idx: number; fallback: [string, string] }> = [
      {
        idx:      1,
        fallback: [
          estAnglais ? 'Program of Studies — Learning Outcomes' : "Programme d'étude — résultats d'apprentissages",
          estAnglais ? 'Learning Intention'                     : 'Intention pédagogique',
        ],
      },
      {
        idx:      2,
        fallback: [
          estAnglais ? 'Language Integration (vocabulary, oral, written, visual)' : 'Intégration de la langue (vocabulaire, oral, écrit, visuel)',
          estAnglais ? 'Assessment'                                                : 'Évaluation',
        ],
      },
      {
        idx:      3,
        fallback: [
          estAnglais ? 'Integration of Indigenous Perspectives' : 'Intégration de la perspective autochtone',
          estAnglais ? 'Differentiated Instruction'             : 'Différenciation pédagogique (universel/ciblé/spécialisé)',
        ],
      },
    ]

    for (const sec of infoSections) {
      const t    = tables[sec.idx]
      const hdrs = (t?.header?.length === 2 ? t.header : sec.fallback) as [string, string]
      const data = t?.rows[0] ?? ['', '']
      elements.push(new Table({
        width:        { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [
            cellTxt(hdrs[0], { gras: true, fond: USJ_VERT, couleur: 'FFFFFF' }),
            cellTxt(hdrs[1], { gras: true, fond: USJ_VERT, couleur: 'FFFFFF' }),
          ]}),
          new TableRow({ children: [
            cellMd(data[0] ?? ''),
            cellMd(data[1] ?? ''),
          ]}),
        ],
      }))
      elements.push(esp())
    }

    // ── PHASES AVANT / PENDANT / APRÈS (tableaux positionnels 4-5-6) ─────────
    // Structure USJ : en-tête jaune pleine largeur (titre | Matériaux/ressources),
    // sous-en-tête gris (Temps prévu | Connexion/Déroulement | —),
    // ligne contenu (valeur | texte riche | matériaux).
    const phases = [
      {
        titre:    estAnglais ? 'BEFORE — Hook / Introduction'                 : 'AVANT — Préparation/évaluation (amorce, introduction)',
        mat:      estAnglais ? 'Materials / Resources'                        : 'Matériaux/ressources',
        subLeft:  estAnglais ? 'Time'                                         : 'Temps prévu',
        subRight: estAnglais ? 'Connection & Prior Knowledge'                 : 'Connexion et connaissances antérieures',
        idx:      4,
      },
      {
        titre:    estAnglais ? 'DURING — Development / Realization'           : 'PENDANT — Réalisation (développement)',
        mat:      estAnglais ? 'Materials / Resources'                        : 'Matériaux/ressources',
        subLeft:  estAnglais ? 'Time'                                         : 'Temps prévu',
        subRight: estAnglais ? 'Modelling | Guided Practice | Independent'    : 'Modélisation | Pratique guidée | Pratique autonome',
        idx:      5,
      },
      {
        titre:    estAnglais ? 'AFTER — Integration / Closure'                : 'APRÈS — Intégration/évaluation (retour sur les apprentissages, conclusion)',
        mat:      estAnglais ? 'Materials / Resources'                        : 'Matériaux/ressources',
        subLeft:  estAnglais ? 'Time'                                         : 'Temps prévu',
        subRight: estAnglais ? 'Return on Learning'                           : 'Retour sur les apprentissages',
        idx:      6,
      },
    ]

    for (const phase of phases) {
      const t      = tables[phase.idx]
      const header = t?.header ?? []

      // Filtrer les lignes qui dupliquent l'en-tête (l'IA répète parfois la ligne d'en-tête)
      const rawRows = (t?.rows ?? []).filter(row => {
        const hNorm = header.map(h => h.replace(/\s+/g, '').toLowerCase())
        const rNorm = row.map(r => r.replace(/\s+/g, '').toLowerCase())
        return !hNorm.every((h, i) => h === (rNorm[i] ?? ''))
      })
      // S'il n'y a aucune ligne valide, afficher une ligne vide plutôt que planter
      const prows = rawRows.length > 0 ? rawRows : [['', '', '']]

      // Largeurs : Temps (700) | Contenu (5780) | Matériaux (2880) = 9360
      elements.push(new Table({
        width:        { size: 9360, type: WidthType.DXA },
        columnWidths: [700, 5780, 2880],
        rows: [
          // Ligne 1 : en-tête jaune — titre de phase (colspan 2) + Matériaux
          new TableRow({ children: [
            new TableCell({
              columnSpan:    2,
              verticalAlign: VerticalAlign.CENTER,
              shading:       { fill: USJ_JAUNE, type: ShadingType.CLEAR },
              borders:       bordures,
              margins:       { top: 100, bottom: 100, left: 120, right: 120 },
              children: [new Paragraph({
                children: [new TextRun({
                  text:  phase.titre,
                  bold:  true,
                  size:  20,
                  color: '111827',
                  font:  'Calibri',
                })]
              })]
            }),
            cellTxt(phase.mat, { gras: true, fond: USJ_JAUNE, size: 18 }),
          ]}),
          // Ligne 2 : sous-en-têtes gris
          new TableRow({ children: [
            cellTxt(phase.subLeft,  { gras: true, fond: SUB_GRAY, size: 16 }),
            cellTxt(phase.subRight, { gras: true, fond: SUB_GRAY, size: 16 }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading:       { fill: SUB_GRAY, type: ShadingType.CLEAR },
              borders:       bordures,
              children:      [new Paragraph({ children: [] })],
            }),
          ]}),
          // Lignes de données : une par sous-section (Modélisation / Pratique guidée / Pratique autonome)
          ...prows.map(prow => new TableRow({ children: [
            cellTxt(prow[0] ?? '', { size: 16, va: 'top' }),
            cellMd(prow[1] ?? ''),
            cellMd(prow[2] ?? ''),
          ]})),
        ],
      }))
      elements.push(esp())
    }

    return elements
  }

  // ─── SÉRIALISEUR ContenuLecon → Markdown 7-blocs USJ ────────────────────────
  // Convertit un objet ContenuLecon structuré en Markdown gabarit compatible
  // avec genererGabaritPlanLecon() — plus fiable que le parsing positionnel du MD brut.

  function contenuLeconVersMarkdownUSJ(c: Record<string, any>, infos: InfosDoc): string {
    const s = (v: any) => (typeof v === 'string' ? v : '').replace(/\|/g, '\\|').replace(/\n/g, ' • ')
    const lang = c.integration_langue || {}
    const langueContenu = [
      lang.vocabulaire ? `**Vocabulaire :** ${s(lang.vocabulaire)}` : '',
      lang.oral        ? `**Oral :** ${s(lang.oral)}`               : '',
      lang.ecrit       ? `**Écrit :** ${s(lang.ecrit)}`             : '',
      lang.visuel      ? `**Visuel :** ${s(lang.visuel)}`           : '',
    ].filter(Boolean).join(' • ')
    const diff = [
      c.differentiation_universelle  ? `**Universel :** ${s(c.differentiation_universelle)}`  : '',
      c.differentiation_ciblee       ? `**Ciblé :** ${s(c.differentiation_ciblee)}`           : '',
      c.differentiation_specialisee  ? `**Spécialisé :** ${s(c.differentiation_specialisee)}` : '',
    ].filter(Boolean).join(' • ')
    const rag      = s(c.rag)
    const ras      = s(c.ras)
    const prog     = [rag, ras].filter(Boolean).join(' — ')
    const materiel = Array.isArray(c.materiel) && c.materiel.length > 0
      ? c.materiel.map((m: string) => `• ${m}`).join(' ')
      : ''
    const avantD   = c.avant_duree  ? `${c.avant_duree} min`   : '__ min'
    const apresD   = c.apres_duree  ? `${c.apres_duree} min`   : '__ min'
    const apresRet = [s(c.apres_cloture), c.apres_billet ? s(c.apres_billet) : ''].filter(Boolean).join(' — ')
    return [
      `| Nom | Niveau scolaire | Matière | Durée | Leçon # |`,
      `|:---|:---|:---|:---|:---|`,
      `| ${infos.enseignant || ''} | ${infos.niveau || ''} | ${infos.matiere || ''} | ${infos.duree ? infos.duree + ' min' : ''} | ${infos.numero_lecon || ''} |`,
      ``,
      `| Programme d'étude — RAG et RAS (texte officiel exact) | Intention pédagogique |`,
      `|:---|:---|`,
      `| ${prog} | ${s(c.intention)} |`,
      ``,
      `| Intégration de la langue (vocabulaire, oral, écrit, visuel) | Évaluation |`,
      `|:---|:---|`,
      `| ${langueContenu} | ${s(c.evaluation_formative)} |`,
      ``,
      `| Intégration de la perspective autochtone | Différenciation pédagogique |`,
      `|:---|:---|`,
      `| ${s(c.perspective_autochtone)} | ${diff} |`,
      ``,
      `**AVANT** — Préparation/activation (amorce, introduction)`,
      `| Temps prévu | Connexion et connaissances antérieures | Matériaux/ressources |`,
      `|:---|:---|:---|`,
      `| ${avantD} | ${s(c.avant_amorce)} | ${materiel} |`,
      ``,
      `**PENDANT** — Réalisation (développement)`,
      `| Temps prévu | Déroulement | Matériaux/ressources |`,
      `|:---|:---|:---|`,
      `| | **Modélisation :** ${s(c.pendant_modelisation)} | |`,
      `| | **Pratique guidée :** ${s(c.pendant_pratique_guidee)} | |`,
      `| | **Pratique autonome :** ${s(c.pendant_pratique_autonome)} | |`,
      ``,
      `**APRÈS** — Intégration/évaluation (retour sur les apprentissages)`,
      `| Temps prévu | Retour sur les apprentissages | Matériaux/ressources |`,
      `|:---|:---|:---|`,
      `| ${apresD} | ${apresRet} | |`,
    ].join('\n')
  }

  // ─── INFOS DU DOCUMENT ───────────────────────────────────────────────────────

  const infosDoc: InfosDoc = {
    enseignant:    enseignant_nom,
    niveau,
    matiere,
    duree,
    nb_eleves,
    numero_lecon,
  }

  // ─── CONSTRUIRE LE CONTENU ────────────────────────────────────────────────────

  let contenuDoc: Array<Paragraph | Table>

  const estPlanLecon = ['plan_lecon', 'plan_de_lecon', 'lecon_complete', 'fiche_lecon'].includes(type_contenu)

  try {

  // contenu_json disponible ET contient au moins un champ structuré de phase ?
  let contenuJsonEffectif = contenu_json
  if (estPlanLecon && !contenuJsonEffectif && contenu) {
    // Fallback : extraire depuis Markdown via Haiku si le client n'a pas fourni contenu_json
    contenuJsonEffectif = await extraireContenuLeconPourDocx(contenu) ?? undefined
  }

  const aContenuJson = contenuJsonEffectif &&
    (contenuJsonEffectif.avant_amorce || contenuJsonEffectif.pendant_modelisation || contenuJsonEffectif.intention)

  if (estPlanLecon && aContenuJson) {
    // JSON-first : mapping direct, aucun parsing positionnel de tableaux
    contenuDoc = genererGabaritPlanLecon(contenuLeconVersMarkdownUSJ(contenuJsonEffectif!, infosDoc), infosDoc)

  } else if (estPlanLecon) {
    contenuDoc = genererGabaritPlanLecon(contenu, infosDoc)

  } else if (type_contenu === 'quiz') {
    let quiz: any
    try { quiz = JSON.parse(contenu) } catch { quiz = { questions: [], titre } }

    contenuDoc = [
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({
          text: quiz.titre ?? titre,
          bold: true, size: 36,
          color: VIOLET, font: 'Calibri',
        })]
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({
          text: [
            classe, matiere, niveau,
            ((quiz.nb_questions ?? quiz.questions?.length ?? 0) + ' questions'),
          ].filter(Boolean).join(' · '),
          size: 20, color: '6B7280', font: 'Calibri',
        })]
      }),
      ...(quiz.questions ?? []).flatMap((q: any, idx: number) => [
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [
            new TableRow({ children: [
              new TableCell({
                shading: { fill: 'F9FAFB', type: ShadingType.CLEAR },
                borders: {
                  top:    { style: BorderStyle.SINGLE, size: 8, color: VIOLET },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
                  left:   { style: BorderStyle.SINGLE, size: 8, color: VIOLET },
                  right:  { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
                },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [
                  new Paragraph({
                    spacing: { after: 80 },
                    children: [new TextRun({
                      text: 'Question ' + (idx + 1),
                      size: 18, color: '9CA3AF', font: 'Calibri',
                    })]
                  }),
                  new Paragraph({
                    spacing: { after: 160 },
                    children: [new TextRun({
                      text: q.enonce,
                      bold: true, size: 22,
                      color: '111827', font: 'Calibri',
                    })]
                  }),
                  ...(q.options ?? []).map((opt: string) =>
                    new Paragraph({
                      spacing: { after: 60 },
                      shading: opt.startsWith(q.bonne_reponse)
                        ? { fill: 'DCFCE7', type: ShadingType.CLEAR }
                        : undefined,
                      children: [new TextRun({
                        text:  (opt.startsWith(q.bonne_reponse) ? '✓ ' : '○ ') + opt,
                        size:  20,
                        bold:  opt.startsWith(q.bonne_reponse),
                        color: opt.startsWith(q.bonne_reponse) ? '166534' : '374151',
                        font:  'Calibri',
                      })]
                    })
                  ),
                  new Paragraph({
                    spacing: { before: 120 },
                    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
                    children: [new TextRun({
                      text:    '💡 ' + q.explication,
                      size:    18, italics: true,
                      color:   '6B7280', font: 'Calibri',
                    })]
                  }),
                ],
              })
            ]}),
          ],
        }) as any,
        new Paragraph({ spacing: { after: 160 }, children: [] }),
      ]),
    ]

  } else {
    // Leçon complète / autre contenu Markdown
    contenuDoc = markdownToParagraphs(contenu)
  }

  // ─── DOCUMENT FINAL ───────────────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: '1F2937' } }
      }
    },
    sections: [{
      properties: {
        page: {
          size:   { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: VIOLET } },
              children: [
                new TextRun({ text: '✦ ScorgIA', bold: true, size: 18, color: VIOLET, font: 'Calibri' }),
                new TextRun({ text: '  |  ' + (titre ?? ''), size: 18, color: '6B7280', font: 'Calibri' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9CA3AF', font: 'Calibri' }),
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
              children: [new TextRun({
                text:  'Généré par ScorgIA — scorgia.app — ' + new Date().toLocaleDateString('fr-CA'),
                size:  16, color: '9CA3AF', font: 'Calibri',
              })]
            })
          ]
        })
      },
      children: contenuDoc as any,
    }]
  })

  const buffer = await Packer.toBuffer(doc)

  // ── DIAGNOSTIC TEMPORAIRE — retirer après investigation ──────────────────
  console.log('[docx/export] taille buffer:', buffer.length, 'bytes')
  const firstBytes = buffer.slice(0, 4).toString('hex')
  console.log('[docx/export] premiers bytes:', firstBytes)
  if (firstBytes !== '504b0304') {
    console.log('[docx/export] ATTENTION — pas un ZIP valide, contenu brut:',
      buffer.slice(0, 200).toString('utf8'))
  }
  // ─────────────────────────────────────────────────────────────────────────

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(titre ?? 'scorgia-document')}.docx"`,
    }
  })

  } catch (buildErr: any) {
    console.error('[docx/export] Échec construction document — phase:', buildErr?.message)
    console.error('[docx/export] Stack:', buildErr?.stack)
    return NextResponse.json(
      { error: 'Échec de la génération du fichier Word.', detail: buildErr?.message },
      { status: 500 }
    )
  }
}
