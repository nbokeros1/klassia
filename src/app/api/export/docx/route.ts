import { NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, PageBreak,
} from 'docx'

export async function POST(request: Request) {
  try {
    const { lecon, classe, enseignant } = await request.json()

    const totalDuree = parseInt(lecon.avant_duree || '10') + parseInt(lecon.pendant_duree || '50') + parseInt(lecon.apres_duree || '10')

    // Couleurs
    const BLUE = '1B3F6E'
    const VIOLET = '6B3FA0'
    const AMBER = 'F39C12'
    const GREEN = '2ECC71'
    const LIGHT = 'EEF4FC'

    const titre = (text: string, color = BLUE) => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 28, color })],
      spacing: { before: 300, after: 150 },
    })

    const sous_titre = (text: string, color = BLUE) => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 22, color })],
      spacing: { before: 200, after: 100 },
    })

    const corps = (text: string) => new Paragraph({
      children: [new TextRun({ text, size: 20 })],
      spacing: { before: 60, after: 60 },
    })

    const note_enseignant = (text: string) => new Paragraph({
      children: [
        new TextRun({ text: '💡 Note : ', bold: true, size: 18, color: VIOLET }),
        new TextRun({ text, size: 18, color: '6B3FA0', italics: true }),
      ],
      spacing: { before: 80, after: 80 },
      indent: { left: 400 },
    })

    const ligne_vide = () => new Paragraph({ text: '', spacing: { before: 80, after: 80 } })

    const entete_section = (label: string, color: string, duree: string) => new Paragraph({
      children: [
        new TextRun({ text: `  ${label}  `, bold: true, size: 24, color: 'FFFFFF', highlight: 'none' }),
        new TextRun({ text: `    ${duree} minutes`, size: 20, color: '888888' }),
      ],
      shading: { type: ShadingType.SOLID, color, fill: color },
      spacing: { before: 300, after: 150 },
    })

    const separateur = () => new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E8EEF8' } },
      spacing: { before: 150, after: 150 },
    })

    // ── EN-TÊTE DU DOCUMENT ──
    const enTeteTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'KlassIA+', bold: true, size: 32, color: BLUE })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Plan de leçon', size: 22, color: '8492A6' })],
                }),
              ],
              shading: { type: ShadingType.SOLID, color: 'EEF4FC', fill: 'EEF4FC' },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: classe?.nom || '', bold: true, size: 22, color: BLUE })],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [new TextRun({ text: `${classe?.niveau || ''} · ${classe?.matiere || ''}`, size: 18, color: '8492A6' })],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [new TextRun({ text: `${enseignant?.prenom || ''} ${enseignant?.nom || ''}`, size: 18, color: '8492A6' })],
                  alignment: AlignmentType.RIGHT,
                }),
                new Paragraph({
                  children: [new TextRun({ text: enseignant?.ecole || '', size: 18, color: '8492A6' })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              shading: { type: ShadingType.SOLID, color: 'EEF4FC', fill: 'EEF4FC' },
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
    })

    // ── TABLEAU INFOS ──
    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Durée totale', bold: true, size: 18, color: BLUE })] })],
              shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${totalDuree} minutes`, size: 18 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Élèves', bold: true, size: 18, color: BLUE })] })],
              shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${classe?.nombre_eleves || ''}`, size: 18 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'AVANT', bold: true, size: 18, color: AMBER })] })],
              shading: { type: ShadingType.SOLID, color: 'FEF9EC', fill: 'FEF9EC' },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${lecon.avant_duree || 10} min`, size: 18 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'PENDANT', bold: true, size: 18, color: BLUE })] })],
              shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${lecon.pendant_duree || 50} min`, size: 18 })] })],
            }),
          ],
        }),
      ],
    })

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          enTeteTable,
          ligne_vide(),

          // Titre
          new Paragraph({
            children: [new TextRun({ text: lecon.titre || 'Plan de leçon', bold: true, size: 40, color: BLUE })],
            spacing: { before: 300, after: 200 },
          }),

          infoTable,
          ligne_vide(),

          // Intention
          sous_titre('Intention pédagogique'),
          corps(lecon.intention || ''),
          note_enseignant("Partager cette intention avec les élèves au début de la leçon."),
          separateur(),

          // Objectifs
          sous_titre('Objectifs d\'apprentissage'),
          ...(lecon.objectifs || []).map((obj: string, i: number) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${i + 1}. `, bold: true, size: 20, color: BLUE }),
                new TextRun({ text: obj, size: 20 }),
              ],
              spacing: { before: 60, after: 60 },
              indent: { left: 300 },
            })
          ),
          separateur(),

          // ── AVANT ──
          entete_section('AVANT — Amorce & activation', AMBER, lecon.avant_duree || '10'),
          sous_titre('Amorce', AMBER),
          corps(lecon.avant_amorce || ''),
          note_enseignant("Prépare le matériel à l'avance. Commence ponctuellement. Laisse les élèves répondre avant de valider."),
          separateur(),

          // ── PENDANT ──
          entete_section('PENDANT — Enseignement & pratique', BLUE, lecon.pendant_duree || '50'),

          sous_titre('Modélisation — Enseignement explicite', BLUE),
          corps(lecon.pendant_modelisation || ''),
          note_enseignant("Pense à voix haute. Montre tes erreurs. Vérifie la compréhension avant de passer à la suite."),
          ligne_vide(),

          sous_titre('Pratique guidée — En groupe ou en dyades', BLUE),
          corps(lecon.pendant_pratique_guidee || ''),
          note_enseignant("Circule dans la classe. Note les erreurs fréquentes pour les corriger collectivement."),
          ligne_vide(),

          sous_titre('Pratique autonome — Travail individuel', BLUE),
          corps(lecon.pendant_pratique_autonome || ''),
          note_enseignant("C'est le moment d'évaluation formative. Observe qui comprend et qui a besoin de soutien."),
          separateur(),

          // ── APRÈS ──
          entete_section('APRÈS — Clôture & évaluation', '2ECC71', lecon.apres_duree || '10'),

          sous_titre('Clôture de la leçon', '1A7A45'),
          corps(lecon.apres_cloture || ''),
          note_enseignant("Reviens sur l'intention pédagogique. Demande aux élèves de nommer 1 chose apprise."),
          ligne_vide(),

          sous_titre('Billet de sortie', '1A7A45'),
          corps(lecon.apres_billet || ''),
          note_enseignant("Collecte les billets avant que les élèves partent. Analyse-les pour ajuster la prochaine leçon."),
          separateur(),

          // Différenciation
          ...(lecon.differentiation ? [
            sous_titre('✦ Différenciation & inclusion', VIOLET),
            corps(lecon.differentiation || ''),
            separateur(),
          ] : []),

          // Critères
          ...(lecon.criteres && lecon.criteres.length > 0 ? [
            sous_titre('Critères de réussite'),
            ...(lecon.criteres || []).map((c: string) =>
              new Paragraph({
                children: [
                  new TextRun({ text: '✓ ', bold: true, size: 20, color: '2ECC71' }),
                  new TextRun({ text: c, size: 20 }),
                ],
                spacing: { before: 60, after: 60 },
                indent: { left: 300 },
              })
            ),
            separateur(),
          ] : []),

          // Matériel
          ...(lecon.materiel && lecon.materiel.length > 0 ? [
            sous_titre('Matériel requis'),
            ...(lecon.materiel || []).map((m: string) =>
              new Paragraph({
                children: [
                  new TextRun({ text: '• ', bold: true, size: 20, color: BLUE }),
                  new TextRun({ text: m, size: 20 }),
                ],
                spacing: { before: 40, after: 40 },
                indent: { left: 300 },
              })
            ),
          ] : []),

          ligne_vide(),
          new Paragraph({
            children: [new TextRun({ text: `Généré par KlassIA+ — klassia.app · ${new Date().toLocaleDateString('fr-CA')}`, size: 16, color: 'B0B8C8', italics: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="KlassIA_${(lecon.titre || 'lecon').replace(/\s+/g, '_')}.docx"`,
      },
    })

  } catch (error: any) {
    console.error('Erreur export DOCX:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}