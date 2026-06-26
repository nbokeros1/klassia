import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  Document, Packer, Paragraph, TextRun, Table,
  TableRow, TableCell, Header, Footer,
  AlignmentType, BorderStyle,
  WidthType, ShadingType, VerticalAlign,
  PageNumber,
} from 'docx'

export async function POST(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const {
    contenu,
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

  // Couleurs KlassIA+
  const VIOLET      = '7F77DD'
  const GRIS_HEADER = 'F3F4F6'
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

  // Convertir Markdown en paragraphes Word
  function markdownToParagraphs(md: string): Paragraph[] {
    const lignes      = md.split('\n')
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
              children: [new TextRun({
                text:  c.replace(/\*\*/g, ''),
                bold:  estHeader,
                size:  18,
                color: estHeader ? 'FFFFFF' : '1F2937',
                font:  'Calibri',
              })]
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

  // ─── GABARIT PLAN DE LEÇON ALBERTA ────────────────────────────────────────

  function extraireSections(md: string): Record<string, string> {
    const sections: Record<string, string> = {}
    const regex = /^#{1,3}\s+(.+)$/gm
    const titres: { titre: string; index: number }[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(md)) !== null) {
      titres.push({ titre: match[1], index: match.index })
    }

    for (let i = 0; i < titres.length; i++) {
      const debut = md.indexOf('\n', titres[i].index) + 1
      const fin   = i < titres.length - 1 ? titres[i + 1].index : md.length
      const cle   = titres[i].titre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
      sections[cle] = md.substring(debut, fin).trim()
    }

    // Mappings synonymes
    const mappings: Record<string, string[]> = {
      avant:   ['avant', 'before', 'amorce', 'introduction', 'hook'],
      pendant: ['pendant', 'during', 'realisation', 'developpement', 'development'],
      apres:   ['apres', 'after', 'integration', 'cloture', 'closure'],
      rag:     ['rag', 'resultat_d_apprentissage_general', 'glo', 'general_learning'],
      ras:     ['ras', 'resultat_d_apprentissage_specifique', 'slo', 'specific_learning'],
    }
    for (const [cible, sources] of Object.entries(mappings)) {
      if (!sections[cible]) {
        for (const src of sources) {
          if (sections[src]) { sections[cible] = sections[src]; break }
        }
      }
    }
    return sections
  }

  type InfosDoc = {
    enseignant?: string
    niveau?: string
    matiere?: string
    duree?: string | number
    nb_eleves?: string | number
    numero_lecon?: string
  }

  function genererGabaritPlanLecon(
    contenuMd: string,
    infos: InfosDoc
  ): Array<Paragraph | Table> {
    const elements: Array<Paragraph | Table> = []
    const sections = extraireSections(contenuMd)
    const espacement = new Paragraph({ spacing: { after: 160 }, children: [] })

    // ── TABLE 1 : Informations générales ─────────────────────────────────────
    elements.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1872, 1872, 1872, 1872, 1872],
      rows: [
        new TableRow({ children: [
          cellule(estAnglais ? 'Teacher Name'  : 'Nom',            { gras: true, fond: VIOLET, couleur: 'FFFFFF' }),
          cellule(estAnglais ? 'Grade'         : 'Niveau scolaire', { gras: true, fond: VIOLET, couleur: 'FFFFFF' }),
          cellule(estAnglais ? 'Subject'       : 'Matière',         { gras: true, fond: VIOLET, couleur: 'FFFFFF' }),
          cellule(estAnglais ? 'Duration'      : 'Durée',           { gras: true, fond: VIOLET, couleur: 'FFFFFF' }),
          cellule(estAnglais ? 'Lesson #'      : 'Leçon #',         { gras: true, fond: VIOLET, couleur: 'FFFFFF' }),
        ]}),
        new TableRow({ children: [
          cellule(infos.enseignant  ?? '', { fontSize: 18 }),
          cellule(infos.niveau      ?? '', { fontSize: 18 }),
          cellule(infos.matiere     ?? '', { fontSize: 18 }),
          cellule(infos.duree ? String(infos.duree) + ' min' : '', { fontSize: 18 }),
          cellule(infos.numero_lecon ?? '', { fontSize: 18 }),
        ]}),
      ],
    }))
    elements.push(espacement)

    // ── TABLE 2 : Programme et intention ─────────────────────────────────────
    const rag       = sections['rag']       ?? sections['glo'] ?? ''
    const ras       = sections['ras']       ?? sections['slo'] ?? ''
    const intention = sections['intention'] ?? sections['learning_intention'] ?? ''
    elements.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        new TableRow({ children: [
          cellule(
            estAnglais ? 'Program of Studies: Learning Outcomes' : "Programme d'étude : résultats d'apprentissages",
            { gras: true, fond: VIOLET, couleur: 'FFFFFF' }
          ),
          cellule(
            estAnglais ? 'Learning Intention' : 'Intention pédagogique',
            { gras: true, fond: VIOLET, couleur: 'FFFFFF' }
          ),
        ]}),
        new TableRow({ children: [
          cellule(
            (estAnglais ? 'GLO: ' : 'RAG : ') + rag + '\n\n' + (estAnglais ? 'SLO: ' : 'RAS : ') + ras,
            { fontSize: 18 }
          ),
          cellule(intention, { fontSize: 18 }),
        ]}),
      ],
    }))
    elements.push(espacement)

    // ── TABLE 3 : Langue et évaluation ────────────────────────────────────────
    const vocab    = sections['vocabulaire'] ?? sections['vocabulary'] ?? ''
    const oral     = sections['oral']        ?? ''
    const ecrit    = sections['ecrit']       ?? sections['written']   ?? ''
    const visuel   = sections['visuel']      ?? sections['visual']    ?? ''
    const evalForm = sections['evaluation_formative'] ?? sections['formative'] ?? ''
    const evalSomm = sections['evaluation_sommative'] ?? sections['summative'] ?? ''
    elements.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        new TableRow({ children: [
          cellule(
            estAnglais ? 'Language Integration' : 'Intégration de la langue',
            { gras: true, fond: BLEU_SECTION, couleur: '1D4ED8' }
          ),
          cellule(
            estAnglais ? 'Assessment' : 'Évaluation',
            { gras: true, fond: VERT_SECTION, couleur: '166534' }
          ),
        ]}),
        new TableRow({ children: [
          cellule(
            (estAnglais ? 'Vocabulary: ' : 'Vocabulaire : ') + vocab + '\n\n' +
            (estAnglais ? 'Oral: '       : 'Oral : ')       + oral  + '\n\n' +
            (estAnglais ? 'Written: '    : 'Écrit : ')      + ecrit + '\n\n' +
            (estAnglais ? 'Visual: '     : 'Visuel : ')     + visuel,
            { fontSize: 18 }
          ),
          cellule(
            (estAnglais ? 'Formative: ' : 'Formative : ') + evalForm + '\n\n' +
            (estAnglais ? 'Summative: ' : 'Sommative : ') + evalSomm,
            { fontSize: 18 }
          ),
        ]}),
      ],
    }))
    elements.push(espacement)

    // ── TABLE 4 : Perspective autochtone et différenciation ────────────────────
    const autochtone      = sections['autochtone']     ?? sections['indigenous']    ?? ''
    const differentiation = sections['differentiation'] ?? ''
    elements.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        new TableRow({ children: [
          cellule(
            estAnglais ? 'Integration of Indigenous Perspectives' : 'Intégration de la perspective autochtone',
            { gras: true, fond: AMBRE_SECTION, couleur: '92400E' }
          ),
          cellule(
            estAnglais ? 'Differentiated Instruction' : 'Différenciation pédagogique',
            { gras: true, fond: ROSE_SECTION, couleur: '9D174D' }
          ),
        ]}),
        new TableRow({ children: [
          cellule(
            autochtone || (estAnglais ? 'Not applicable for this lesson.' : 'Non applicable pour cette leçon.'),
            { fontSize: 18 }
          ),
          cellule(differentiation, { fontSize: 18 }),
        ]}),
      ],
    }))
    elements.push(espacement)

    // ── PHASES : AVANT / PENDANT / APRÈS ─────────────────────────────────────
    const phases = [
      {
        label:   estAnglais ? 'BEFORE — Hook / Introduction'        : 'AVANT — Préparation / Introduction',
        key:     'avant',
        fond:    BLEU_SECTION,
        couleur: '1D4ED8',
      },
      {
        label:   estAnglais ? 'DURING — Development / Realization'  : 'PENDANT — Réalisation / Développement',
        key:     'pendant',
        fond:    VERT_SECTION,
        couleur: '166534',
      },
      {
        label:   estAnglais ? 'AFTER — Consolidation / Closure'     : 'APRÈS — Intégration / Clôture',
        key:     'apres',
        fond:    AMBRE_SECTION,
        couleur: '92400E',
      },
    ]

    for (const phase of phases) {
      const contenuPhase = sections[phase.key]             ?? ''
      const materiel     = sections[phase.key + '_materiel'] ?? ''

      elements.push(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [6240, 3120],
        rows: [
          // En-tête de phase
          new TableRow({ children: [
            new TableCell({
              columnSpan: 2,
              shading: { fill: phase.fond, type: ShadingType.CLEAR },
              borders: {
                top:    { style: BorderStyle.SINGLE, size: 8, color: VIOLET },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                left:   { style: BorderStyle.SINGLE, size: 8, color: VIOLET },
                right:  { style: BorderStyle.SINGLE, size: 8, color: VIOLET },
              },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [new Paragraph({
                children: [new TextRun({
                  text:  phase.label,
                  bold:  true, size: 24,
                  color: phase.couleur, font: 'Calibri',
                })]
              })]
            })
          ]}),
          // Sous-entêtes
          new TableRow({ children: [
            cellule(
              estAnglais ? 'Time | Activity' : 'Temps prévu | Activité',
              { gras: true, fond: GRIS_HEADER }
            ),
            cellule(
              estAnglais ? 'Materials / Resources' : 'Matériaux / Ressources',
              { gras: true, fond: GRIS_HEADER }
            ),
          ]}),
          // Contenu
          new TableRow({ children: [
            new TableCell({
              borders: {
                top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
              },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: markdownToParagraphs(contenuPhase),
            }),
            new TableCell({
              borders: {
                top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
              },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: markdownToParagraphs(materiel),
            }),
          ]}),
        ],
      }))
      elements.push(espacement)
    }

    // ── RÉFLEXION ENSEIGNANT ─────────────────────────────────────────────────
    const reflexion = sections['reflexion'] ?? sections['reflection'] ?? ''
    if (reflexion) {
      elements.push(new Paragraph({
        spacing: { before: 240, after: 120 },
        border:  { left: { style: BorderStyle.SINGLE, size: 12, color: VIOLET } },
        indent:  { left: 400 },
        children: [new TextRun({
          text:  estAnglais ? '💭 Teacher Reflection' : "💭 Réflexion de l'enseignant",
          bold:  true, size: 24,
          color: VIOLET, font: 'Calibri',
        })]
      }))
      elements.push(...markdownToParagraphs(reflexion))
    }

    return elements
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

  if (estPlanLecon) {
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
                new TextRun({ text: '✦ KlassIA+', bold: true, size: 18, color: VIOLET, font: 'Calibri' }),
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
                text:  'Généré par KlassIA+ — klassia.app — ' + new Date().toLocaleDateString('fr-CA'),
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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(titre ?? 'klassia-document')}.docx"`,
    }
  })
}
