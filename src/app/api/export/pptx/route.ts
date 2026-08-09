import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import PptxGenJS from 'pptxgenjs'

export async function POST(request: Request) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()

    // Support two call formats:
    // 1. Legacy: { lecon, classe, enseignant }
    // 2. New (contenu_json-first): { contenu_json, titre, matiere, niveau, classe, enseignant_nom }
    let lecon: Record<string, any>, classe: Record<string, any>, enseignant: Record<string, any>
    if (body.lecon) {
      lecon = body.lecon
      classe = body.classe || {}
      enseignant = body.enseignant || {}
    } else {
      const cj = body.contenu_json || {}
      // Cascade: ras → rag → objectifs/objectif → intention (jamais de slide vide)
      const extractLines = (val: any): string[] => {
        if (!val) return []
        if (Array.isArray(val)) return (val as any[]).filter(Boolean).map(String).filter((s: string) => s.trim())
        return String(val).split(/\n|•|-/).map((s: string) => s.trim()).filter(Boolean)
      }
      const objectifsLines = (
        extractLines(cj.ras).length > 0         ? extractLines(cj.ras) :
        extractLines(cj.rag).length > 0         ? extractLines(cj.rag) :
        extractLines(cj.objectifs ?? cj.objectif ?? '').length > 0
                                                 ? extractLines(cj.objectifs ?? cj.objectif ?? '') :
        (cj.intention as string | undefined)     ? [String(cj.intention).substring(0, 200)] : []
      )
      lecon = {
        titre:                    body.titre || 'Leçon ScorgIA',
        objectifs:                objectifsLines.slice(0, 4),
        intention:                cj.intention || '',
        avant_amorce:             cj.avant_amorce || '',
        avant_duree:              cj.avant_duree || '10',
        pendant_modelisation:     cj.pendant_modelisation || '',
        pendant_pratique_guidee:  cj.pendant_pratique_guidee || '',
        pendant_pratique_autonome: cj.pendant_pratique_autonome || '',
        pendant_duree:            cj.pendant_duree || '50',
        apres_cloture:            cj.apres_cloture || '',
        apres_billet:             cj.apres_billet || '',
        apres_duree:              cj.apres_duree || '10',
        criteres:                 typeof cj.evaluation_formative === 'string' && cj.evaluation_formative
                                    ? [cj.evaluation_formative] : [],
      }
      classe = { nom: body.classe || '', matiere: body.matiere || '', niveau: body.niveau || '' }
      const nomParts = (body.enseignant_nom || '').trim().split(' ')
      enseignant = { prenom: nomParts[0] || '', nom: nomParts.slice(1).join(' '), ecole: '' }
    }

    const pres = new PptxGenJS()
    pres.layout = 'LAYOUT_16x9'
    pres.author = 'ScorgIA'
    pres.title = lecon.titre || 'Leçon ScorgIA'

    const C = {
      navy: '0A1628', blue: '1B3F6E', blue2: '2D5FA0',
      accent: '4A90D9', violet: '6B3FA0', violet2: '9B6FD4',
      white: 'FFFFFF', offwhite: 'F4F6FB', muted: '8492A6',
      light: 'E8EEF8', green: '2ECC71', amber: 'F39C12',
      dark: '1A2332', gray: '4A5568',
    }

    const totalDuree = parseInt(lecon.avant_duree || '10') + parseInt(lecon.pendant_duree || '50') + parseInt(lecon.apres_duree || '10')

    // ── SLIDE 1 TITRE ──
    {
      const s = pres.addSlide()
      s.background = { color: C.white }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 4.0, h: 5.625, fill: { color: C.blue }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 5.625, fill: { color: C.violet }, line: { type: 'none' } })
      s.addText('LEÇON', { x: 0.3, y: 0.5, w: 3.5, h: 0.3, fontSize: 9, bold: true, color: 'C9A84C', charSpacing: 3 })
      s.addText(lecon.titre || 'Leçon', { x: 0.3, y: 0.9, w: 3.6, h: 1.8, fontSize: 28, bold: true, color: C.white, fontFace: 'Calibri', lineSpacingMultiple: 1.1 })
      s.addText(classe?.matiere || '', { x: 0.3, y: 2.95, w: 3.6, h: 0.35, fontSize: 14, color: 'E8EEF8', fontFace: 'Calibri' })
      s.addText(`${classe?.niveau || ''} · ${totalDuree} minutes`, { x: 0.3, y: 3.35, w: 3.6, h: 0.3, fontSize: 11, color: C.muted })
      s.addText((lecon.objectifs || []).length > 0 ? 'Objectifs' : 'Intention pédagogique', { x: 4.4, y: 0.5, w: 5.2, h: 0.5, fontSize: 20, bold: true, color: C.blue })
      if ((lecon.objectifs || []).length > 0) {
        ;(lecon.objectifs as string[]).slice(0, 4).forEach((obj: string, i: number) => {
          const y = 1.2 + i * 0.9
          s.addText(`${i + 1}. ${obj}`, { x: 4.4, y: y + 0.1, w: 4.7, h: 0.35, fontSize: 12, color: C.dark })
        })
      } else {
        s.addText('Voir le plan de leçon complet pour les objectifs détaillés.', { x: 4.4, y: 1.2, w: 4.7, h: 2.5, fontSize: 12, color: C.gray, lineSpacingMultiple: 1.4 })
      }
      s.addText(`${enseignant?.prenom || ''} ${enseignant?.nom || ''} · ${enseignant?.ecole || ''} · ScorgIA`, { x: 4.4, y: 5.22, w: 5.3, h: 0.28, fontSize: 9, color: C.muted, align: 'right' })
    }

    // ── SLIDE 2 AVANT ──
    {
      const s = pres.addSlide()
      s.background = { color: 'FEF9EC' }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.blue }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.amber }, line: { type: 'none' } })
      s.addText('AVANT — Amorce & activation', { x: 0.22, y: 0.38, w: 7, h: 0.5, fontSize: 19, bold: true, color: C.white })
      s.addText(`${lecon.avant_duree || 10} min`, { x: 8.5, y: 0.38, w: 1.25, h: 0.38, fontSize: 11, bold: true, color: C.amber, align: 'center' })
      if (lecon.intention) {
        s.addText('Intention pédagogique :', { x: 0.4, y: 1.3, w: 9.2, h: 0.3, fontSize: 10, bold: true, color: C.accent })
        s.addText(lecon.intention, { x: 0.4, y: 1.6, w: 9.2, h: 0.5, fontSize: 12, color: C.blue })
      }
      s.addShape(pres.ShapeType.rect, { x: 0.4, y: 2.3, w: 9.2, h: 3.0, fill: { color: C.white }, line: { color: C.light, width: 1 } })
      s.addText('Amorce', { x: 0.55, y: 2.42, w: 9.0, h: 0.3, fontSize: 12, bold: true, color: '8A5A00' })
      s.addText(lecon.avant_amorce || 'Activité de départ', { x: 0.55, y: 2.76, w: 9.0, h: 2.4, fontSize: 13, color: C.dark, lineSpacingMultiple: 1.4 })
    }

    // ── SLIDE 3 MODÉLISATION ──
    {
      const s = pres.addSlide()
      s.background = { color: C.white }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.navy }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.accent }, line: { type: 'none' } })
      s.addText('PENDANT — Modélisation', { x: 0.22, y: 0.38, w: 7.5, h: 0.5, fontSize: 19, bold: true, color: C.white })
      s.addText(`${Math.round(parseInt(lecon.pendant_duree || '50') / 3)} min`, { x: 8.5, y: 0.38, w: 1.25, h: 0.38, fontSize: 11, bold: true, color: C.white, align: 'center' })
      s.addShape(pres.ShapeType.rect, { x: 0.4, y: 1.25, w: 9.2, h: 4.1, fill: { color: C.offwhite }, line: { color: C.light, width: 1 } })
      s.addText('Enseignement explicite', { x: 0.55, y: 1.38, w: 9.0, h: 0.3, fontSize: 11, bold: true, color: C.blue })
      s.addText(lecon.pendant_modelisation || 'Contenu de la modélisation', { x: 0.55, y: 1.75, w: 9.0, h: 3.5, fontSize: 13, color: C.dark, lineSpacingMultiple: 1.5 })
    }

    // ── SLIDE 4 PRATIQUE GUIDÉE ──
    {
      const s = pres.addSlide()
      s.background = { color: 'F4F7FE' }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.blue2 }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.violet }, line: { type: 'none' } })
      s.addText('PENDANT — Pratique guidée', { x: 0.22, y: 0.38, w: 7.5, h: 0.5, fontSize: 19, bold: true, color: C.white })
      s.addText(`${Math.round(parseInt(lecon.pendant_duree || '50') / 3)} min`, { x: 8.5, y: 0.38, w: 1.25, h: 0.38, fontSize: 11, bold: true, color: C.white, align: 'center' })
      s.addShape(pres.ShapeType.rect, { x: 0.4, y: 1.25, w: 9.2, h: 4.1, fill: { color: C.white }, line: { color: C.light, width: 1 } })
      s.addText('En groupe ou en dyades', { x: 0.55, y: 1.38, w: 9.0, h: 0.3, fontSize: 11, bold: true, color: C.violet })
      s.addText(lecon.pendant_pratique_guidee || 'Contenu de la pratique guidée', { x: 0.55, y: 1.75, w: 9.0, h: 3.5, fontSize: 13, color: C.dark, lineSpacingMultiple: 1.5 })
    }

    // ── SLIDE 5 PRATIQUE AUTONOME ──
    {
      const s = pres.addSlide()
      s.background = { color: C.white }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.navy }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.violet2 }, line: { type: 'none' } })
      s.addText('PENDANT — Pratique autonome', { x: 0.22, y: 0.38, w: 7.5, h: 0.5, fontSize: 19, bold: true, color: C.white })
      s.addText(`${Math.round(parseInt(lecon.pendant_duree || '50') / 3)} min`, { x: 8.5, y: 0.38, w: 1.25, h: 0.38, fontSize: 11, bold: true, color: C.violet2, align: 'center' })
      s.addShape(pres.ShapeType.rect, { x: 0.4, y: 1.25, w: 9.2, h: 4.1, fill: { color: C.offwhite }, line: { color: C.light, width: 1 } })
      s.addText('Travail individuel', { x: 0.55, y: 1.38, w: 9.0, h: 0.3, fontSize: 11, bold: true, color: C.violet })
      s.addText(lecon.pendant_pratique_autonome || 'Contenu de la pratique autonome', { x: 0.55, y: 1.75, w: 9.0, h: 3.5, fontSize: 13, color: C.dark, lineSpacingMultiple: 1.5 })
    }

    // ── SLIDE 6 APRÈS ──
    {
      const s = pres.addSlide()
      s.background = { color: 'EAF9F1' }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.1, fill: { color: C.blue }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 1.1, fill: { color: C.green }, line: { type: 'none' } })
      s.addText('APRÈS — Clôture & évaluation', { x: 0.22, y: 0.38, w: 7.5, h: 0.5, fontSize: 19, bold: true, color: C.white })
      s.addText(`${lecon.apres_duree || 10} min`, { x: 8.5, y: 0.38, w: 1.25, h: 0.38, fontSize: 11, bold: true, color: C.white, align: 'center' })
      s.addShape(pres.ShapeType.rect, { x: 0.3, y: 1.25, w: 4.55, h: 2.8, fill: { color: C.white }, line: { color: C.light, width: 1 } })
      s.addText('Clôture', { x: 0.45, y: 1.38, w: 4.2, h: 0.3, fontSize: 12, bold: true, color: C.blue })
      s.addText(lecon.apres_cloture || 'Retour sur les apprentissages', { x: 0.45, y: 1.75, w: 4.2, h: 2.2, fontSize: 12, color: C.dark, lineSpacingMultiple: 1.4 })
      s.addShape(pres.ShapeType.rect, { x: 5.15, y: 1.25, w: 4.55, h: 2.8, fill: { color: C.white }, line: { color: C.light, width: 1 } })
      s.addText('Billet de sortie', { x: 5.3, y: 1.38, w: 4.2, h: 0.3, fontSize: 12, bold: true, color: '1A7A45' })
      s.addText(lecon.apres_billet || 'Question de clôture', { x: 5.3, y: 1.75, w: 4.2, h: 2.2, fontSize: 12, color: C.dark, lineSpacingMultiple: 1.4 })
      if ((lecon.criteres || []).length > 0) {
        s.addText('Critères de réussite : ' + (lecon.criteres || []).join('  ·  '), { x: 0.3, y: 4.3, w: 9.4, h: 0.9, fontSize: 11, color: C.dark, lineSpacingMultiple: 1.3 })
      }
    }

    // ── SLIDE 7 SYNTHÈSE ──
    {
      const s = pres.addSlide()
      s.background = { color: C.white }
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 4.5, h: 5.625, fill: { color: C.navy }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.07, h: 5.625, fill: { color: C.violet }, line: { type: 'none' } })
      s.addText('Ce que vous avez appris', { x: 0.25, y: 0.8, w: 3.9, h: 1.0, fontSize: 22, bold: true, color: C.white })
      ;(lecon.objectifs || []).slice(0, 3).forEach((obj: string, i: number) => {
        s.addText(`${i + 1}. ${obj}`, { x: 0.3, y: 2.1 + i * 0.9, w: 3.8, h: 0.7, fontSize: 12, color: C.white, lineSpacingMultiple: 1.3 })
      })
      s.addText('✦ Généré par ScorgIA — scorgia.app', { x: 5.0, y: 0.5, w: 4.7, h: 0.4, fontSize: 11, bold: true, color: C.violet })
      s.addText('Prochaine leçon', { x: 5.0, y: 1.1, w: 4.7, h: 0.35, fontSize: 13, bold: true, color: C.blue })
      s.addText("Continue à pratiquer les notions vues aujourd'hui.", { x: 5.0, y: 1.5, w: 4.7, h: 1.0, fontSize: 12, color: C.gray, lineSpacingMultiple: 1.4 })
      s.addText(`${classe?.nom || ''} · ${enseignant?.ecole || ''} · ScorgIA`, { x: 5.0, y: 5.22, w: 4.7, h: 0.28, fontSize: 9, color: C.muted, align: 'right' })
    }

    // ── EXPORT ──
    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="ScorgIA_${(lecon.titre || 'lecon').replace(/\s+/g, '_')}.pptx"`,
      },
    })

  } catch (error: any) {
    console.error('Erreur export PPTX:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}