'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import RichEditor from '@/components/RichEditor'
import type { Editor } from '@tiptap/core'
import SchemasPanel from './SchemasPanel'
import PanneauSchemas from './PanneauSchemas'
import { TOUS_SCHEMAS } from './SchemasSVG/index'
import type { SchemaImage } from '@/lib/constants/schemas-images'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentEditorProps {
  lecon:       any
  classe:      any
  profil:      any
  leconId:     string
  onValidate?: () => Promise<void>
}

// ── Callouts pédagogiques ─────────────────────────────────────────────────────

const CALLOUTS = [
  { id: 'intention',  icon: '🎯', label: "Intention d'apprentissage", bg: '#EFF6FF', border: '#2563EB', color: '#1D4ED8' },
  { id: 'definition', icon: '📚', label: 'Définition',                bg: '#F5F3FF', border: '#7C3AED', color: '#6D28D9' },
  { id: 'exemple',    icon: '💡', label: 'Exemple',                   bg: '#FFFBEB', border: '#D97706', color: '#B45309' },
  { id: 'activite',   icon: '✏️', label: 'Activité de groupe',        bg: '#ECFDF5', border: '#059669', color: '#065F46' },
  { id: 'important',  icon: '⚠️', label: 'Point important',           bg: '#FFF7ED', border: '#EA580C', color: '#9A3412' },
  { id: 'formule',    icon: '🧮', label: 'Formule / Calcul',          bg: '#F9FAFB', border: '#6B7280', color: '#374151' },
  { id: 'exercice',   icon: '📝', label: "Exercice d'application",    bg: '#FAFAF9', border: '#78716C', color: '#44403C' },
  { id: 'devoir',     icon: '🏠', label: 'Devoir',                    bg: '#FFF1F2', border: '#E11D48', color: '#9F1239' },
]

// ── Polices ────────────────────────────────────────────────────────────────────

const FONTS = ['Inter', 'Georgia', 'Arial', 'Times New Roman', 'Courier New']
const SIZES = ['10', '11', '12', '14', '16', '18', '24', '32', '48']
const LINE_HEIGHTS = [{ v: '1',    l: '1' }, { v: '1.15', l: '1.15' }, { v: '1.5', l: '1.5' }, { v: '2', l: '2' }]

// ── Couleurs texte ─────────────────────────────────────────────────────────────

const TEXT_COLORS = ['#000000','#1D4ED8','#7C3AED','#059669','#D97706','#DC2626','#DB2777','#6B7280','#FFFFFF']

// ── Bouton toolbar ────────────────────────────────────────────────────────────

function TBtn({ title, active, onClick, children, danger }: {
  title: string; active?: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        padding: '0 7px', height: 28, border: 'none', borderRadius: 4,
        background: active ? '#E8F0FE' : 'transparent',
        color: danger ? '#DC2626' : active ? '#1D4ED8' : '#374151',
        cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F3F4F6' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      {children}
    </button>
  )
}

function TDivider() {
  return <div style={{ width: 1, height: 20, background: '#E5E7EB', margin: '0 3px', flexShrink: 0 }} />
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function DocumentEditor({ lecon, classe, profil, leconId, onValidate }: DocumentEditorProps) {
  const supabase = createClient()

  const [content,     setContent]     = useState<string>('')
  const [saveMsg,     setSaveMsg]     = useState('')
  const [font,        setFont]        = useState('Inter')
  const [fontSize,    setFontSize]    = useState('12')
  const [lineHeight,  setLineHeight]  = useState('1.5')
  const [showCallouts,setShowCallouts]= useState(false)
  const [showAI,      setShowAI]      = useState(false)
  const [aiGenerating,setAiGenerating]= useState(false)
  const [aiMsg,       setAiMsg]       = useState('')
  const [editor,      setEditor]      = useState<Editor | null>(null)
  const [openColor,   setOpenColor]   = useState(false)
  const [openHL,      setOpenHL]      = useState(false)
  const [schemasOpen,         setSchemasOpen]         = useState(false)
  const [panneauSchemasOpen,  setPanneauSchemasOpen]  = useState(false)
  const [validating,          setValidating]          = useState(false)
  const [validateMsg,    setValidateMsg]    = useState('')

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calloutRef    = useRef<HTMLDivElement>(null)
  const colorRef      = useRef<HTMLDivElement>(null)

  // ── Charger le contenu initial ────────────────────────────────────────────
  useEffect(() => {
    const html = lecon?.contenu_json?.lecon_complete_html || ''
    setContent(html)
  }, [lecon?.id])

  // ── Fermer panels au clic extérieur ───────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (calloutRef.current && !calloutRef.current.contains(e.target as Node)) setShowCallouts(false)
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) { setOpenColor(false); setOpenHL(false) }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Auto-save 2.5s ─────────────────────────────────────────────────────────
  const handleChange = useCallback((html: string) => {
    setContent(html)
    setSaveMsg('Sauvegarde...')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const existing = lecon?.contenu_json || {}
        await supabase.from('lecons').update({
          contenu_json: { ...existing, lecon_complete_html: html },
        }).eq('id', leconId)
        setSaveMsg('✓ Sauvegardé')
        setTimeout(() => setSaveMsg(''), 2500)
      } catch {
        setSaveMsg('⚠ Erreur de sauvegarde')
        setTimeout(() => setSaveMsg(''), 3000)
      }
    }, 2500)
  }, [leconId, lecon?.contenu_json])

  // ── Insérer callout ────────────────────────────────────────────────────────
  const insertCallout = (c: typeof CALLOUTS[0]) => {
    editor?.chain().focus().insertContent(
      `<div data-callout="${c.id}" style="margin:12px 0;padding:12px 16px;background:${c.bg};border-left:4px solid ${c.border};border-radius:0 8px 8px 0;">`
      + `<p style="margin:0 0 4px;font-weight:700;color:${c.color};">${c.icon} ${c.label}</p>`
      + `<p style="margin:0;color:#374151;">Saisir le contenu ici...</p></div>`
    ).run()
    setShowCallouts(false)
  }

  // ── Génération IA ─────────────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    setAiGenerating(true)
    setAiMsg('✦ Génération en cours...')
    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: 'fiche_lecon',
          sujet:        lecon?.titre || 'Leçon',
          duree:        lecon?.duree_minutes || 75,
          instructions: `Génère une leçon complète et riche en HTML structuré pour la classe "${classe?.nom}" (${classe?.niveau}, ${classe?.matiere}).
Utilise des balises h1 (titre principal), h2 (AVANT, PENDANT, APRÈS), h3 (sous-sections).
Inclus des tableaux HTML pour les exercices comparatifs.
Inclus des blocs div avec attribut data-callout pour les éléments pédagogiques :
- data-callout="definition" pour les définitions importantes
- data-callout="exemple" pour les exemples concrets
- data-callout="activite" pour les activités de groupe
- data-callout="exercice" pour les exercices d'application
- data-callout="devoir" pour le devoir à faire à la maison
Inclus : amorce, modélisation, pratique guidée, pratique autonome, différenciation, billet de sortie.
La leçon doit être complète et prête à enseigner, pas un squelette.
Utilise du HTML propre, pas de markdown.`,
          contexte: { classe: { nom: classe?.nom, niveau: classe?.niveau, matiere: classe?.matiere, nombre_eleves: classe?.nombre_eleves } },
          langue:   'fr',
          profil_ia: profil?.profil_ia || {},
        }),
      })
      const data = await res.json()
      if (data.contenu && !data.contenu.startsWith('⚠')) {
        const parsed = parseSchemasSvg(data.contenu)
        editor?.chain().focus().setContent(parsed).run()
        setContent(parsed)
        handleChange(parsed)
        setAiMsg('✓ Leçon générée !')
      } else {
        setAiMsg(data.contenu || 'Erreur lors de la génération')
      }
    } catch {
      setAiMsg('Erreur réseau')
    }
    setAiGenerating(false)
    setShowAI(false)
    setTimeout(() => setAiMsg(''), 4000)
  }

  // ── Listener event klassia:insert-svg (depuis SchemasPanel) ──────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const svg = (e as CustomEvent<{ svg: string }>).detail?.svg
      if (svg && editor) {
        editor.chain().focus().insertContent(`<div style="margin:12px auto;text-align:center;max-width:100%">${svg}</div>`).run()
      }
    }
    document.addEventListener('klassia:insert-svg', handler)
    return () => document.removeEventListener('klassia:insert-svg', handler)
  }, [editor])

  // ── Parser schema-svg balises dans le HTML généré par l'IA ────────────────
  const parseSchemasSvg = useCallback((html: string): string => {
    return html.replace(/<schema-svg[^>]*id=['"]([^'"]+)['"][^>]*\/?>/gi, (_, id: string) => {
      const found = TOUS_SCHEMAS.find(s =>
        s.id === id ||
        s.id.replace(/^(bio|chi|phy|mat)-/, '') === id ||
        id === s.id.replace(/^(bio|chi|phy|mat)-/, '')
      )
      if (!found) return ''
      return `<div style="margin:12px auto;text-align:center;max-width:100%">${found.toSvg()}</div>`
    })
  }, [])

  // ── Impression ────────────────────────────────────────────────────────────
  const handlePrint = () => window.print()

  // ── Export DOCX ───────────────────────────────────────────────────────────
  const handleExportDocx = async () => {
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecon: {
            titre:  lecon?.titre,
            intention: '',
            objectifs: [],
            avant_amorce: content,
          },
          classe:     { nom: classe?.nom, niveau: classe?.niveau, matiere: classe?.matiere },
          enseignant: { prenom: profil?.prenom, nom: profil?.nom, ecole: profil?.ecole },
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `${lecon?.titre || 'lecon'}.docx`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* silently fail */ }
  }

  const today = new Date().toLocaleDateString('fr-CA')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Styles CSS ────────────────────────────────────────────────────── */}
      <style>{`
        /* Toolbar document */
        .doc-toolbar { background:#fff; border-bottom:1px solid #E5E7EB; padding:4px 12px; display:flex; align-items:center; gap:2px; flex-wrap:wrap; position:sticky; top:0; z-index:100; box-shadow:0 1px 4px rgba(0,0,0,0.06); }

        /* Zone de saisie document */
        .doc-zone { background:#F0F0F0; padding:32px 24px; min-height:calc(100vh - 160px); overflow-y:auto; }

        /* Page A4 */
        .doc-page { width:210mm; min-height:297mm; background:#ffffff; margin:0 auto 24px; padding:25mm 20mm; box-shadow:0 2px 8px rgba(0,0,0,0.15); border-radius:2px; position:relative; color:#1a1a1a; }

        /* En-tête de page */
        .doc-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1B3F6E; padding-bottom:12px; margin-bottom:20px; }
        .doc-header-left { display:flex; flex-direction:column; gap:3px; }
        .doc-header-logo { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#1B3F6E,#7C3AED); display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; color:white; }

        /* Styles typographiques dans l'éditeur document */
        .doc-page .tiptap { font-family:var(--doc-font, Inter), system-ui, sans-serif; font-size:var(--doc-size, 12pt); line-height:var(--doc-lh, 1.5); color:#1a1a1a !important; min-height:200mm; }
        .doc-page .tiptap h1 { font-size:24px; font-weight:700; color:#1B3F6E !important; margin:24px 0 12px; border-bottom:2px solid #1B3F6E; padding-bottom:6px; }
        .doc-page .tiptap h2 { font-size:18px; font-weight:600; color:#2563EB !important; margin:20px 0 10px; }
        .doc-page .tiptap h3 { font-size:15px; font-weight:600; color:#374151 !important; margin:16px 0 8px; }
        .doc-page .tiptap p  { font-size:12pt; line-height:1.6; color:#1a1a1a !important; margin-bottom:10px; }
        .doc-page .tiptap table { border-collapse:collapse; width:100%; margin:16px 0; }
        .doc-page .tiptap td, .doc-page .tiptap th { border:1px solid #D1D5DB; padding:8px 12px; }
        .doc-page .tiptap th { background:#F3F4F6; font-weight:600; color:#111 !important; }
        .doc-page .tiptap blockquote { border-left:4px solid #7C3AED; padding:12px 16px; background:#F5F3FF; margin:16px 0; border-radius:0 8px 8px 0; }
        .doc-page .tiptap ul, .doc-page .tiptap ol { padding-left:24px; margin:8px 0; }
        .doc-page .tiptap li { margin:4px 0; color:#1a1a1a !important; }
        .doc-page .tiptap [data-callout] { margin:14px 0; page-break-inside:avoid; }
        .doc-page .tiptap a { color:#2563EB !important; }

        /* Numéro de page */
        .doc-page-num { position:absolute; bottom:15mm; right:20mm; font-size:10px; color:#9CA3AF; }

        /* @media print */
        @media print {
          body * { visibility: hidden !important; }
          .doc-print-area, .doc-print-area * { visibility: visible !important; }
          .doc-print-area { position:fixed; inset:0; z-index:9999; background:#F0F0F0; overflow:visible; }
          .doc-page { box-shadow:none !important; margin:0 auto !important; page-break-after:always; }
          .doc-page:last-child { page-break-after:auto; }
          .doc-toolbar, .doc-ai-btn, .doc-save-msg { display:none !important; }
          @page { size:A4; margin:0; }
        }
      `}</style>

      {/* ── Barre d'outils document ──────────────────────────────────────── */}
      <div className="doc-toolbar">
        {/* Police + Taille */}
        <select value={font} onChange={e => setFont(e.target.value)}
          style={{ height: 26, border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 12, color: '#374151', background: 'white', padding: '0 4px' }}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={fontSize} onChange={e => setFontSize(e.target.value)}
          style={{ width: 50, height: 26, border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 12, color: '#374151', background: 'white', padding: '0 2px' }}>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <TDivider />

        {/* Format */}
        <TBtn title="Gras"      active={editor?.isActive('bold')      ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}>      <b>B</b> </TBtn>
        <TBtn title="Italique"  active={editor?.isActive('italic')    ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()}>    <i>I</i> </TBtn>
        <TBtn title="Souligné"  active={editor?.isActive('underline') ?? false} onClick={() => editor?.chain().focus().toggleUnderline().run()}> <u>U</u> </TBtn>
        <TBtn title="Barré"     active={editor?.isActive('strike')    ?? false} onClick={() => editor?.chain().focus().toggleStrike().run()}>    <s style={{ fontSize: 11 }}>S</s> </TBtn>
        <TDivider />

        {/* Couleur + Surlignage */}
        <div ref={colorRef} style={{ position: 'relative' }}>
          <TBtn title="Couleur texte" onClick={() => { setOpenColor(p => !p); setOpenHL(false) }}>
            <span style={{ fontSize: 12 }}>A</span>
            <span style={{ display: 'block', width: 12, height: 3, background: editor?.getAttributes('textStyle')?.color || '#000', marginTop: 2, borderRadius: 1 }} />
          </TBtn>
          {openColor && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', gap: 4, flexWrap: 'wrap', width: 140 }}>
              {TEXT_COLORS.map(c => (
                <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setColor(c).run(); setOpenColor(false) }}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1.5px solid #D1D5DB', cursor: 'pointer' }} />
              ))}
              <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().unsetColor().run(); setOpenColor(false) }}
                style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#fff 50%,#000 50%)', border: '1.5px solid #D1D5DB', cursor: 'pointer', fontSize: 8 }} title="Réinitialiser" />
            </div>
          )}
        </div>
        <TDivider />

        {/* Titres */}
        <TBtn title="Titre H1" active={editor?.isActive('heading', { level: 1 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><span style={{ fontSize: 11, fontWeight: 900 }}>H1</span></TBtn>
        <TBtn title="Titre H2" active={editor?.isActive('heading', { level: 2 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><span style={{ fontSize: 11, fontWeight: 800 }}>H2</span></TBtn>
        <TBtn title="Titre H3" active={editor?.isActive('heading', { level: 3 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><span style={{ fontSize: 10, fontWeight: 700 }}>H3</span></TBtn>
        <TBtn title="Paragraphe" active={editor?.isActive('paragraph') ?? false} onClick={() => editor?.chain().focus().setParagraph().run()}><span style={{ fontSize: 11 }}>¶</span></TBtn>
        <TDivider />

        {/* Alignement */}
        <TBtn title="Gauche"   active={editor?.isActive({ textAlign: 'left' })    ?? false} onClick={() => editor?.chain().focus().setTextAlign('left').run()}>   <span style={{ fontSize: 12 }}>⇤</span></TBtn>
        <TBtn title="Centre"   active={editor?.isActive({ textAlign: 'center' })  ?? false} onClick={() => editor?.chain().focus().setTextAlign('center').run()}> <span style={{ fontSize: 12 }}>≡</span></TBtn>
        <TBtn title="Droite"   active={editor?.isActive({ textAlign: 'right' })   ?? false} onClick={() => editor?.chain().focus().setTextAlign('right').run()}>  <span style={{ fontSize: 12 }}>⇥</span></TBtn>
        <TBtn title="Justifié" active={editor?.isActive({ textAlign: 'justify' }) ?? false} onClick={() => editor?.chain().focus().setTextAlign('justify').run()}><span style={{ fontSize: 12 }}>☰</span></TBtn>
        <TDivider />

        {/* Listes */}
        <TBtn title="Liste à puces"   active={editor?.isActive('bulletList')  ?? false} onClick={() => editor?.chain().focus().toggleBulletList().run()}>  <span style={{ fontSize: 12 }}>• —</span></TBtn>
        <TBtn title="Liste numérotée" active={editor?.isActive('orderedList') ?? false} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><span style={{ fontSize: 11 }}>1.</span></TBtn>
        <TDivider />

        {/* Tableau */}
        <TBtn title="Insérer un tableau" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <span style={{ fontSize: 12 }}>⊞</span>
        </TBtn>
        <TBtn title="Séparateur horizontal" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <span style={{ fontSize: 12 }}>—</span>
        </TBtn>
        <TDivider />

        {/* Callouts */}
        <div ref={calloutRef} style={{ position: 'relative' }}>
          <TBtn title="Blocs pédagogiques" active={showCallouts} onClick={() => setShowCallouts(p => !p)}>
            <span style={{ fontSize: 11 }}>📦 Blocs</span>
          </TBtn>
          {showCallouts && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 240 }}>
              {CALLOUTS.map(c => (
                <button key={c.id} type="button" onMouseDown={e => { e.preventDefault(); insertCallout(c) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6, textAlign: 'left', fontSize: 12, color: '#374151' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{c.icon}</span>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: c.bg, border: `2px solid ${c.border}` }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Schémas SVG */}
        <TBtn title="Bibliothèque de schémas SVG" onClick={() => setSchemasOpen(true)}>
          <span style={{ fontSize: 11 }}>🔬 Schémas</span>
        </TBtn>
        {/* Schémas images réelles annotables */}
        <TBtn title="Schémas avec images réelles" onClick={() => setPanneauSchemasOpen(true)}>
          <span style={{ fontSize: 11 }}>🖼️ Images</span>
        </TBtn>
        <TDivider />

        {/* Interligne */}
        <select value={lineHeight} onChange={e => setLineHeight(e.target.value)}
          style={{ height: 26, border: '1px solid #E5E7EB', borderRadius: 4, fontSize: 11, color: '#374151', background: 'white', padding: '0 4px' }}
          title="Interligne">
          {LINE_HEIGHTS.map(lh => <option key={lh.v} value={lh.v}>↕ {lh.l}</option>)}
        </select>
        <TDivider />

        {/* Impression / Export */}
        <TBtn title="Imprimer" onClick={handlePrint}><span style={{ fontSize: 13 }}>🖨️</span></TBtn>
        <TBtn title="Télécharger Word" onClick={handleExportDocx}><span style={{ fontSize: 11 }}>📥 Word</span></TBtn>

        {/* Indicateur sauvegarde */}
        {saveMsg && (
          <span className="doc-save-msg" style={{
            marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
            color: saveMsg.startsWith('✓') ? '#059669' : saveMsg.startsWith('⚠') ? '#DC2626' : '#6B7280',
            background: saveMsg.startsWith('✓') ? '#ECFDF5' : saveMsg.startsWith('⚠') ? '#FEF2F2' : '#F9FAFB',
          }}>{saveMsg}</span>
        )}
      </div>

      {/* ── Zone document ─────────────────────────────────────────────────── */}
      <div className="doc-zone doc-print-area">
        <div className="doc-page"
          style={{ '--doc-font': font, '--doc-size': `${fontSize}pt`, '--doc-lh': lineHeight } as React.CSSProperties}>

          {/* En-tête document */}
          <div className="doc-header">
            <div className="doc-header-left">
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1B3F6E', lineHeight: 1.2 }}>
                {lecon?.titre || 'Plan de leçon'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {classe?.nom && <span>{classe.nom}</span>}
                {classe?.matiere && <span> · {classe.matiere}</span>}
                {classe?.niveau && <span> · {classe.niveau}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {today}{lecon?.duree_minutes ? ` · ${lecon.duree_minutes} min` : ''}
              </div>
            </div>
            <div className="doc-header-logo">K</div>
          </div>

          {/* Éditeur */}
          <RichEditor
            value={content}
            onChange={handleChange}
            showToolbar={false}
            lightBackground={true}
            placeholder="Commencez à rédiger votre leçon complète..."
            rows={60}
            onEditorReady={setEditor}
            onFocus={setEditor}
          />

          {/* Numéro de page */}
          <div className="doc-page-num">Page 1</div>
        </div>
      </div>

      {/* ── Bouton IA flottant ──────────────────────────────────────────── */}
      <button className="doc-ai-btn" onClick={() => setShowAI(p => !p)}
        style={{ position: 'fixed', bottom: 32, right: 32, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6B3FA0,#A78BFA)', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', boxShadow: '0 6px 24px rgba(124,58,237,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(124,58,237,0.65)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.5)' }}
        title="Générer la leçon avec l'IA">
        ✦
      </button>

      {/* ── Panneau IA slide-in ─────────────────────────────────────────── */}
      {showAI && (
        <div style={{ position: 'fixed', bottom: 100, right: 24, width: 320, background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 20, zIndex: 500 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1B3F6E', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            ✦ Générer avec l&apos;IA
            <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>✕</button>
          </div>

          {aiMsg && (
            <div style={{ padding: '8px 12px', background: aiMsg.startsWith('✓') ? '#ECFDF5' : aiMsg.startsWith('⚠') || aiMsg.startsWith('Erreur') ? '#FEF2F2' : '#F5F3FF', color: aiMsg.startsWith('✓') ? '#059669' : aiMsg.startsWith('⚠') || aiMsg.startsWith('Erreur') ? '#DC2626' : '#7C3AED', borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
              {aiMsg}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 1.6 }}>
            KlassIA+ va générer une leçon complète pour <strong>{lecon?.titre || 'cette leçon'}</strong> avec :
            introduction, activités, exercices, différenciation et billet de sortie.
          </div>

          <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#9CA3AF' }}>
            ⚠ Le contenu actuel sera remplacé
          </div>

          <button onClick={handleGenerateAI} disabled={aiGenerating}
            style={{ width: '100%', padding: '11px', background: aiGenerating ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: aiGenerating ? '#7C3AED' : 'white', border: aiGenerating ? '1px solid rgba(124,58,237,0.3)' : 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: aiGenerating ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
            {aiGenerating ? '✦ Génération en cours...' : '✦ Générer la leçon complète'}
          </button>
        </div>
      )}

      {/* ── Barre de validation (bas de page) ───────────────────────────── */}
      {onValidate && (
        <div style={{ position: 'sticky', bottom: 0, background: 'white', borderTop: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100, boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
          {validateMsg && (
            <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: validateMsg.startsWith('✓') ? '#059669' : '#DC2626', padding: '6px 12px', background: validateMsg.startsWith('✓') ? '#ECFDF5' : '#FEF2F2', borderRadius: 7 }}>
              {validateMsg}
            </div>
          )}
          {!validateMsg && (
            <div style={{ flex: 1, fontSize: 12, color: '#6B7280' }}>
              Leçon en cours d&apos;édition — validez pour pouvoir l&apos;enseigner
            </div>
          )}
          <button onClick={async () => {
            setValidating(true)
            try {
              await onValidate()
              setValidateMsg('✓ Leçon validée — le bouton Enseigner est maintenant actif !')
            } catch { setValidateMsg('Erreur lors de la validation') }
            setValidating(false)
            setTimeout(() => setValidateMsg(''), 5000)
          }} disabled={validating}
            style={{ padding: '10px 28px', borderRadius: 10, background: validating ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg,#6B3FA0,#A78BFA)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: validating ? 'default' : 'pointer', whiteSpace: 'nowrap', boxShadow: validating ? 'none' : '0 4px 14px rgba(107,63,160,0.4)', transition: 'all 0.2s' }}>
            {validating ? 'Validation…' : '✅ Valider la leçon'}
          </button>
        </div>
      )}

      {/* ── PanneauSchemas (images réelles annotables) ──────────────────── */}
      <PanneauSchemas
        isOpen={panneauSchemasOpen}
        onClose={() => setPanneauSchemasOpen(false)}
        matiereClasse={classe?.matiere}
        onInsert={(schema: SchemaImage) => {
          if (!editor) return
          const annotationsHtml = schema.annotations_defaut.map(a => `
            <span style="
              position:absolute;left:${a.x}%;top:${a.y}%;
              transform:translate(-50%,-50%);
              background:${a.couleur};color:white;
              padding:2px 8px;border-radius:12px;
              font-size:11px;font-weight:500;
              white-space:nowrap;cursor:default;
              box-shadow:0 2px 4px rgba(0,0,0,0.3);z-index:10;
            ">${a.texte}</span>`).join('')
          const html = `<div data-schema-id="${schema.id}" style="position:relative;display:inline-block;max-width:100%;margin:12px auto;">
            <img src="${schema.url_fallback}" alt="${schema.nom}" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #E5E7EB;" />
            ${annotationsHtml}
          </div>`
          editor.chain().focus().insertContent(html).run()
          setPanneauSchemasOpen(false)
        }}
      />

      {/* ── SchemasPanel (SVG) ───────────────────────────────────────────── */}
      <SchemasPanel
        isOpen={schemasOpen}
        onClose={() => setSchemasOpen(false)}
        onInsert={schemaId => {
          const found = TOUS_SCHEMAS.find(s =>
            s.id === schemaId ||
            s.id.replace(/^(bio|chi|phy|mat)-/, '') === schemaId ||
            schemaId.includes(s.id.replace(/^(bio|chi|phy|mat)-/, ''))
          )
          if (found && editor) {
            editor.chain().focus().insertContent(
              `<div style="margin:12px auto;text-align:center;max-width:100%">${found.toSvg()}</div>`
            ).run()
          }
          setSchemasOpen(false)
        }}
        matiereClasse={classe?.matiere}
      />
    </div>
  )
}
