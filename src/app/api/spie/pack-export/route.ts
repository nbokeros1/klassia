import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, Footer, PageNumber,
  ShadingType, VerticalAlign,
} from 'docx'

export const maxDuration = 60
import type { ContenuProgramme, Unite } from '@/lib/types/database'
import type { PackSyllabus } from '@/lib/types/teaching-pack'
import type { DetailedLesson } from '@/lib/types/detailed-lesson'
import { ALBERTA_PACK_METADATA } from '@/lib/alberta-teaching-pack'
import { requireEntitlement, isFounderPreview } from '@/lib/spie-access'

// ─── POST /api/spie/pack-export ───────────────────────────────────────────────
// Corps : { teaching_pack_id, type: 'syllabus'|'plan_annuel'|'sequence'|'pack_condense', sequence_index? }
//      OU { fichier_id, type: 'lecon_detaillee' }
// RÈGLE : Ne jamais afficher "Powered by Claude".
// RÈGLE : Ne pas exporter les éléments verrouillés comme s'ils étaient complets.
// RÈGLE : Footer = "Document généré par ScorgIA (Bodingo AI Tech Inc.)"

export async function POST(request: NextRequest) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.type) {
    return NextResponse.json({ error: 'type requis' }, { status: 400 })
  }

  const { type: exportType, sequence_index, fichier_id, teaching_pack_id } = body

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id, nom, prenom, forfait, is_admin')
    .eq('user_id', user.id)
    .single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  // ── Branche lecon_detaillee ──────────────────────────────────────────────────
  if (exportType === 'lecon_detaillee') {
    if (!fichier_id) return NextResponse.json({ error: 'fichier_id requis pour lecon_detaillee' }, { status: 400 })

    const denied = requireEntitlement('export_detailed_lesson', profil.forfait, isFounderPreview(profil))
    if (denied) return denied

    const { data: fichier } = await supabase
      .from('fichiers_dossier')
      .select('id, contenu_json, enseignant_id, titre')
      .eq('id', fichier_id)
      .eq('enseignant_id', profil.id)
      .single()

    if (!fichier?.contenu_json) return NextResponse.json({ error: 'Leçon introuvable' }, { status: 404 })

    const lecon = fichier.contenu_json as DetailedLesson
    const nomEnseignant = [profil.prenom, profil.nom].filter(Boolean).join(' ') || 'Enseignant'
    const piedLecon = makePied('Leçon détaillée ScorgIA')

    const doc = buildLeconDetailleeDoc(lecon, nomEnseignant, piedLecon)
    const buffer = await Packer.toBuffer(doc)
    const filename = `${lecon.titre.replace(/[^a-zA-Z0-9\-_]/g, '_')}_lecon_detaillee.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ── Branche packs classiques ─────────────────────────────────────────────────
  if (!teaching_pack_id) {
    return NextResponse.json({ error: 'teaching_pack_id requis' }, { status: 400 })
  }

  const { data: pack } = await supabase
    .from('teaching_packs')
    .select('*, programme_annuel_id')
    .eq('id', teaching_pack_id)
    .eq('enseignant_id', profil.id)
    .single()
  if (!pack) return NextResponse.json({ error: 'Pack non trouvé' }, { status: 404 })

  const { data: prog } = pack.programme_annuel_id
    ? await supabase.from('programme_annuel').select('contenu_json, syllabus_json, nb_semaines').eq('id', pack.programme_annuel_id).single()
    : { data: null }

  const contenu = prog?.contenu_json as ContenuProgramme | null
  const syllabus = prog?.syllabus_json as PackSyllabus | null
  const nomEnseignant = [profil.prenom, profil.nom].filter(Boolean).join(' ') || 'Enseignant'

  let doc: Document

  const pied = makePied(pack.nom)

  if (exportType === 'syllabus' && syllabus) {
    doc = buildSyllabusDoc(syllabus, pack, nomEnseignant, pied)
  } else if (exportType === 'plan_annuel' && contenu) {
    doc = buildPlanAnnuelDoc(contenu, pack, nomEnseignant, pied)
  } else if (exportType === 'sequence' && contenu && sequence_index !== undefined) {
    const unite = contenu.unites?.[sequence_index]
    if (!unite) return NextResponse.json({ error: 'Séquence introuvable' }, { status: 404 })
    doc = buildSequenceDoc(unite, pack, nomEnseignant, pied, sequence_index)
  } else if (exportType === 'pack_condense' && contenu) {
    doc = buildPackCondenseDoc(contenu, syllabus, pack, nomEnseignant, pied)
  } else {
    return NextResponse.json({ error: 'Type d\'export non supporté ou données manquantes' }, { status: 400 })
  }

  const buffer = await Packer.toBuffer(doc)
  const filename = `${pack.nom.replace(/[^a-zA-Z0-9\-_]/g, '_')}_${exportType}.docx`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ─── Footer factory ───────────────────────────────────────────────────────────

function makePied(nom: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${nom}  —  ScorgIA Teaching Pack  —  `, size: 16, color: '888888' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' }),
          new TextRun({ text: '/', size: 16, color: '888888' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '888888' }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Document généré par ScorgIA (Bodingo AI Tech Inc.) — Ce document n\'est pas un formulaire officiel d\'Alberta Education.',
            size: 14, color: 'AAAAAA',
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  })
}

// ─── Builders DOCX ───────────────────────────────────────────────────────────

function titre(text: string, level: 1 | 2 | 3 = 1): Paragraph {
  const sizes = { 1: 32, 2: 26, 3: 22 }
  const bolds = { 1: true, 2: true, 3: false }
  return new Paragraph({
    children: [new TextRun({ text, bold: bolds[level], size: sizes[level], color: level === 1 ? '4F46E5' : '1E293B' })],
    spacing: { before: level === 1 ? 400 : 240, after: 120 },
  })
}

function para(text: string, opts?: { italic?: boolean; color?: string; size?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, italics: opts?.italic, color: opts?.color, size: opts?.size ?? 22 })],
    spacing: { before: 60, after: 60 },
  })
}

function liste(items: string[]): Paragraph[] {
  return items.map(item =>
    new Paragraph({
      children: [new TextRun({ text: `• ${item}`, size: 22 })],
      spacing: { before: 40, after: 40 },
      indent: { left: 360 },
    })
  )
}

function avertissement(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `⚠ ${text}`, italics: true, size: 18, color: '92400E' })],
    spacing: { before: 80, after: 80 },
    shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' },
  })
}

function buildSyllabusDoc(syl: PackSyllabus, pack: Record<string, unknown>, enseignant: string, footer: Footer): Document {
  const children: Paragraph[] = [
    titre(`Syllabus — ${syl.titre_cours}`),
    avertissement('Document généré par ScorgIA — À réviser par l\'enseignant avant distribution.'),
    para(''),
    titre('Identification', 2),
    para(`Cours : ${syl.titre_cours}`),
    para(`Niveau : ${syl.niveau}    Matière : ${syl.matiere}`),
    para(`Enseignant : ${enseignant}`),
    para(`Province : ${String(pack.province ?? '')}    Année : ${String(pack.annee_scolaire ?? '')}`),
    para(''),
    ...(syl.description ? [titre('Description', 2), para(syl.description)] : []),
    titre('Grandes idées', 2),
    ...liste(syl.grandes_idees ?? []),
    titre("Résultats d'apprentissage", 2),
    ...liste(syl.resultats_apprentissage ?? []),
    titre('Méthodes pédagogiques', 2),
    ...liste(syl.methodes_pedagogiques ?? []),
    titre("Méthodes d'évaluation", 2),
    ...liste(syl.methodes_evaluation ?? []),
    ...(syl.ressources_suggeres?.length ? [titre('Ressources suggérées', 2), ...liste(syl.ressources_suggeres)] : []),
    ...(syl.normes_reference?.length ? [titre('Références curriculaires', 2), ...liste(syl.normes_reference)] : []),
    para(''),
    para(`Version : ${syl.version ?? '1.0'}    Généré le : ${new Date().toLocaleDateString('fr-CA')}`, { color: '888888', size: 18 }),
  ]
  return new Document({ sections: [{ properties: {}, footers: { default: footer }, children }] })
}

function buildPlanAnnuelDoc(contenu: ContenuProgramme, pack: Record<string, unknown>, enseignant: string, footer: Footer): Document {
  const children: Paragraph[] = [
    titre(`Plan annuel — ${contenu.titre}`),
    avertissement('Document généré par ScorgIA — À réviser par l\'enseignant avant utilisation officielle.'),
    para(''),
    titre('Identification', 2),
    para(`Matière : ${String(pack.matiere ?? '')}    Niveau : ${String(pack.niveau ?? pack.province ?? '')}`),
    para(`Province : ${String(pack.province ?? '')}    Année scolaire : ${String(pack.annee_scolaire ?? '')}`),
    para(`Enseignant : ${enseignant}`),
    para(`Durée : ${contenu.nb_semaines} semaines`),
    para(''),
    titre('Organisation par séquences', 2),
  ]

  for (const u of contenu.unites ?? []) {
    children.push(
      titre(`${u.numero}. ${u.titre}`, 2),
      para(`Semaines ${u.semaine_debut} à ${u.semaine_fin} (${u.semaine_fin - u.semaine_debut + 1} semaines) — ${u.lecons?.length ?? 0} leçons planifiées`, { color: '555555', size: 20 }),
    )
    if (u.objectifs?.length) {
      children.push(para('Objectifs :', { italic: true }), ...liste(u.objectifs))
    }
    if (u.lecons?.length) {
      children.push(para('Leçons :'))
      u.lecons.forEach((l, i) =>
        children.push(para(`  ${i + 1}. ${l.titre}  (${l.duree_minutes} min — ${l.type})`, { size: 20 }))
      )
    }
    children.push(para(''))
  }

  children.push(
    para(`Version : 1.0    Généré le : ${new Date().toLocaleDateString('fr-CA')}`, { color: '888888', size: 18 }),
  )

  return new Document({ sections: [{ properties: {}, footers: { default: footer }, children }] })
}

function buildSequenceDoc(unite: Unite, pack: Record<string, unknown>, enseignant: string, footer: Footer, idx: number): Document {
  const nb = unite.semaine_fin - unite.semaine_debut + 1
  const children: Paragraph[] = [
    titre(`Plan de séquence — ${unite.titre}`),
    avertissement('Document généré par ScorgIA — À réviser par l\'enseignant avant utilisation.'),
    para(''),
    titre('Identification', 2),
    para(`Matière : ${String(pack.matiere ?? '')}    Niveau : ${String(pack.niveau ?? '')}`),
    para(`Province : ${String(pack.province ?? '')}    Enseignant : ${enseignant}`),
    para(''),
    titre('Place dans le plan annuel', 2),
    para(`Séquence ${idx + 1} — Semaines ${unite.semaine_debut} à ${unite.semaine_fin} (${nb} semaine${nb !== 1 ? 's' : ''})`),
    ...(unite.theme ? [para(`Thème : ${unite.theme}`)] : []),
    para(''),
    titre('Objectifs curriculaires', 2),
    ...liste(unite.objectifs ?? ['À préciser depuis le curriculum officiel']),
    ...(unite.competences?.length ? [titre('Compétences visées', 2), ...liste(unite.competences)] : []),
    para(''),
    titre('Progression des leçons', 2),
    para('Chaque leçon contribue aux objectifs curriculaires de cette séquence.'),
  ]

  for (const l of unite.lecons ?? []) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${l.numero}. ${l.titre}`, bold: true, size: 22 }),
          new TextRun({ text: `  [${l.type} — ${l.duree_minutes} min]`, size: 20, color: '666666' }),
        ],
        spacing: { before: 80, after: 40 },
      }),
      para(`    ${l.sujet}`, { size: 20, color: '444444' }),
    )
  }

  children.push(
    para(''),
    para(`Version : 1.0    Généré le : ${new Date().toLocaleDateString('fr-CA')}`, { color: '888888', size: 18 }),
  )
  return new Document({ sections: [{ properties: {}, footers: { default: footer }, children }] })
}

function buildPackCondenseDoc(contenu: ContenuProgramme, syllabus: PackSyllabus | null, pack: Record<string, unknown>, enseignant: string, footer: Footer): Document {
  const children: Paragraph[] = [
    titre(`Teaching Pack condensé — ${String(pack.nom ?? '')}`),
    avertissement('Document généré par ScorgIA — Résumé du Teaching Pack. À compléter et réviser par l\'enseignant.'),
    para(''),
    para(`Matière : ${String(pack.matiere ?? '')}    Niveau : ${String(pack.niveau ?? '')}`),
    para(`Province : ${String(pack.province ?? '')}    Année : ${String(pack.annee_scolaire ?? '')}`),
    para(`Enseignant : ${enseignant}`),
    para(''),
  ]

  if (syllabus) {
    children.push(titre('Syllabus', 2), para(syllabus.description ?? ''))
    if (syllabus.grandes_idees?.length) children.push(...liste(syllabus.grandes_idees))
    children.push(para(''))
  }

  children.push(titre('Plan annuel', 2))
  for (const u of contenu.unites ?? []) {
    children.push(
      para(`${u.numero}. ${u.titre}  (sem. ${u.semaine_debut}–${u.semaine_fin} — ${u.lecons?.length ?? 0} leçons)`)
    )
  }

  children.push(
    para(''),
    para(`Version : 1.0    Généré le : ${new Date().toLocaleDateString('fr-CA')}`, { color: '888888', size: 18 }),
  )
  return new Document({ sections: [{ properties: {}, footers: { default: footer }, children }] })
}

// ─── Leçon détaillée DOCX ────────────────────────────────────────────────────
// RÈGLE : Le corrigé figure en section finale marquée "ENSEIGNANT SEULEMENT".
// RÈGLE : "Powered by Claude" n'apparaît jamais dans le document.

function buildLeconDetailleeDoc(lecon: DetailedLesson, enseignant: string, footer: Footer): Document {
  const children: Paragraph[] = [
    titre(`Plan de leçon — ${lecon.titre}`),
    avertissement('Document généré par ScorgIA — Document enseignant. À réviser avant distribution aux élèves.'),
    para(''),
    titre('Identification', 2),
    para(`Matière : ${lecon.matiere}    Niveau : ${lecon.niveau}`),
    para(`Durée : ${lecon.duree_minutes} min    Langue : ${lecon.langue ?? 'fr'}`),
    para(`Province : ${lecon.province ?? 'Canada'}    Enseignant : ${enseignant}`),
    para(`Généré le : ${new Date().toLocaleDateString('fr-CA')}    Version : ${lecon.version ?? 1}`),
    para(''),
  ]

  // Objectifs
  if (lecon.objectifs?.length) {
    children.push(titre("Objectifs d'apprentissage", 2))
    lecon.objectifs.forEach((o, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${o.enonce}`, bold: true, size: 22 }),
          ],
          spacing: { before: 80, after: 20 },
          indent: { left: 360 },
        }),
        para(`   Critère : ${o.critere_reussite}`, { size: 20, color: '555555' }),
      )
    })
    children.push(para(''))
  }

  // Alignement curriculaire
  if (lecon.alignment?.rag?.length) {
    children.push(titre('Résultats curriculaires', 2), ...liste(lecon.alignment.rag), para(''))
  }

  // Déroulement
  children.push(titre('Déroulement de la leçon', 2))
  for (const phase of lecon.phases ?? []) {
    const phaseLabel = phase.phase === 'avant' ? '⏰ Avant' : phase.phase === 'pendant' ? '📚 Pendant' : '✅ Après'
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${phaseLabel} — ${phase.label}`, bold: true, size: 24, color: '4F46E5' }),
          new TextRun({ text: `  (${phase.duree_minutes} min)`, size: 20, color: '888888' }),
        ],
        spacing: { before: 160, after: 60 },
      })
    )
    for (const el of phase.elements ?? []) {
      children.push(
        para(`• ${el.titre}`, { italic: true, size: 20 }),
        para(el.contenu, { size: 20 }),
      )
    }
  }
  children.push(para(''))

  // Contenu pédagogique
  if (lecon.sections_contenu?.length) {
    children.push(titre('Contenu à enseigner', 2))
    for (const s of lecon.sections_contenu) {
      if (s.titre) children.push(para(s.titre, { italic: true, size: 22 }))
      children.push(para(s.contenu ?? '', { size: 20 }))
    }
    children.push(para(''))
  }

  // Activités
  if (lecon.activites?.length) {
    children.push(titre('Activités', 2))
    lecon.activites.forEach((act, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${act.titre}`, bold: true, size: 22 }),
            new TextRun({ text: `  [${act.type} — ${act.duree_minutes} min — ${act.taille_groupe}]`, size: 18, color: '666666' }),
          ],
          spacing: { before: 120, after: 40 },
        }),
        para(`Intention : ${act.intention_pedagogique}`, { size: 20, italic: true }),
        para(`Enseignant : ${act.consignes_enseignant}`, { size: 20 }),
        para(`Élèves : ${act.consignes_eleves}`, { size: 20 }),
      )
      if (act.differentiation?.soutien) children.push(para(`Soutien : ${act.differentiation.soutien}`, { size: 18, color: '92400E' }))
      if (act.differentiation?.enrichissement) children.push(para(`Enrichissement : ${act.differentiation.enrichissement}`, { size: 18, color: '065F46' }))
    })
    children.push(para(''))
  }

  // Évaluation formative
  if (lecon.evaluation_formative) {
    children.push(titre('Évaluation formative', 2))
    children.push(para(`Méthode : ${(lecon.evaluation_formative as Record<string, unknown>).methode as string ?? ''}`))
    const criteres = (lecon.evaluation_formative as Record<string, unknown>).criteres as string[] | undefined
    if (criteres?.length) children.push(...liste(criteres))
    children.push(para(''))
  }

  // Différenciation
  if (lecon.differentiation?.length) {
    children.push(titre('Différenciation et inclusion', 2))
    for (const d of lecon.differentiation) {
      children.push(
        para(`${d.type === 'soutien' ? 'Soutien' : d.type === 'enrichissement' ? 'Enrichissement' : 'Adaptation'} : ${d.description}`, { size: 20 })
      )
    }
    children.push(para(''))
  }

  // Quiz
  if (lecon.quiz?.questions?.length) {
    children.push(titre('Quiz', 2))
    children.push(para(`${lecon.quiz.titre ?? 'Quiz'} — ${lecon.quiz.duree_estimee_minutes ?? '?'} min — ${lecon.quiz.questions.length} questions`))
    lecon.quiz.questions.forEach((q, i) => {
      children.push(para(`Q${i + 1}. ${q.enonce}`, { size: 22 }))
      if (q.options?.length) children.push(...liste(q.options))
    })
    children.push(para(''))
  }

  // Corrigé (section protégée — enseignant seulement)
  if (lecon.corrige?.length) {
    children.push(
      avertissement('SECTION ENSEIGNANT SEULEMENT — Ne pas projeter ni distribuer aux élèves.'),
      titre('Corrigé', 2),
    )
    lecon.corrige.forEach((c, i) => {
      children.push(
        para(`Q${i + 1} — Réponse attendue : ${c.reponse_attendue}`, { size: 22 }),
        para(`Justification : ${c.justification}`, { size: 20, italic: true }),
        para(`Rétroaction : ${c.retroaction_courte}`, { size: 20, color: '065F46' }),
      )
    })
    children.push(para(''))
  }

  children.push(
    para(`Document généré par ScorgIA (Bodingo AI Tech Inc.) — Version ${lecon.version ?? 1}`, { color: '888888', size: 18 }),
  )

  return new Document({ sections: [{ properties: {}, footers: { default: footer }, children }] })
}
