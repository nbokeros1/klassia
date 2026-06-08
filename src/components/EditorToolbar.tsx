'use client'

import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import { TOUS_SCHEMAS } from './editor/SchemasSVG/index'
import { CATEGORIES_SCHEMAS } from '@/lib/constants/schemas-svg'
import SchemasPanel from './editor/SchemasPanel'

// ─── Symbol data ──────────────────────────────────────────────────────────────

const MATH_SYMS: { label: string; symbols: string[] }[] = [
  { label: 'Opérations',  symbols: ['×','÷','±','≠','≤','≥','≈','∞','√','∛','∑','∏','∫','∂','∆','∇'] },
  { label: 'Fractions',   symbols: ['½','⅓','⅔','¼','¾','⅕','⅖','⅗','⅘','⅙','⅚','⅛','⅜','⅝','⅞'] },
  { label: 'Exposants',   symbols: ['²','³','⁴','⁵','⁶','⁷','⁸','⁹','⁰','⁻¹','ⁿ','₁','₂','₃','₄','ₙ'] },
  { label: 'Grec',        symbols: ['α','β','γ','δ','ε','θ','λ','μ','π','ρ','σ','τ','φ','ω','Δ','Σ','Ω','Γ','Λ','Φ','Ψ'] },
  { label: 'Géométrie',   symbols: ['∠','⊥','∥','△','○','°','≅','~','→','←','↔','⟹','⟺','⊡','⊿'] },
  { label: 'Ensembles',   symbols: ['∈','∉','⊂','⊃','⊆','⊇','∪','∩','∅','∀','∃','∧','∨','¬','ℕ','ℤ','ℚ','ℝ','ℂ'] },
]

const SCIENCE_SYMS: { label: string; symbols: string[] }[] = [
  { label: 'Chimie',     symbols: ['→','⇌','⇒','↑','↓','·','•','⁺','⁻','°C','°F','Å','ℏ','μ','λ','ν'] },
  { label: 'Physique',   symbols: ['Ω','μ','ε₀','μ₀','ħ','ℏ','σ','ρ','η','κ','∇','∂','∮','∯','Φ','ψ'] },
  { label: 'Bio',        symbols: ['☣','⚕','🧬','🔬','🧫','🧪','⚗','🩺','💊','🫀','🫁','🧠','🦠','🌱'] },
  { label: 'Astro',      symbols: ['☀','🌙','⭐','🪐','☄','🌌','🔭','🌍','🌏','🌕','☁','⚡','🌊','🌋','❄'] },
]

const CALLOUT_TYPES = [
  { id: 'info',    label: 'Info',       icon: 'ℹ',  bg: 'rgba(96,165,250,0.1)',  border: '#60A5FA', color: '#60A5FA' },
  { id: 'success', label: 'Succès',     icon: '✓',  bg: 'rgba(52,211,153,0.1)',  border: '#34D399', color: '#34D399' },
  { id: 'warning', label: 'Attention',  icon: '⚠',  bg: 'rgba(251,195,74,0.1)',  border: '#FBC34A', color: '#FBC34A' },
  { id: 'formula', label: 'Formule',    icon: 'ƒ',  bg: 'rgba(167,139,250,0.1)', border: '#A78BFA', color: '#A78BFA' },
  { id: 'def',     label: 'Définition', icon: '📖', bg: 'rgba(45,95,160,0.1)',   border: '#60A5FA', color: '#60A5FA' },
  { id: 'example', label: 'Exemple',    icon: '💡', bg: 'rgba(251,195,74,0.08)', border: '#FBC34A', color: '#FBC34A' },
]

const TEXT_COLORS = ['#FFFFFF','#E2E8F0','#60A5FA','#A78BFA','#34D399','#FBC34A','#F87171','#F472B6','#94A3B8','#1E293B','#000000']
const HIGHLIGHT_COLORS = [
  { c: 'rgba(251,195,74,0.4)',  l: 'Jaune' },
  { c: 'rgba(96,165,250,0.35)', l: 'Bleu' },
  { c: 'rgba(167,139,250,0.35)',l: 'Violet' },
  { c: 'rgba(52,211,153,0.35)', l: 'Vert' },
  { c: 'rgba(248,113,113,0.35)',l: 'Rouge' },
  { c: 'rgba(244,114,182,0.35)',l: 'Rose' },
]

type PanelId = 'math'|'science'|'callout'|'color'|'highlight'|'table'|'image'|'video'|'link'|'schemas'|null

interface Props { editor: Editor | null; matiereClasse?: string }

export default function EditorToolbar({ editor, matiereClasse }: Props) {
  const [panel, setPanel] = useState<PanelId>(null)
  const [schemasOpen, setSchemasOpen] = useState(false)
  const [mathCat, setMathCat]     = useState(0)
  const [sciCat, setSciCat]       = useState(0)
  const [schemaCat, setSchemaCat] = useState<string>('biologie')
  const [tableR, setTableR]     = useState(3)
  const [tableC, setTableC]     = useState(3)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [linkUrl,  setLinkUrl]  = useState('')
  const [linkText, setLinkText] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel(null)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Écouter l'event de SchemasPanel pour insérer un SVG dans l'éditeur
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

  const tog = (p: PanelId) => setPanel(prev => prev === p ? null : p)

  // ── Insert helpers ──────────────────────────────────────────────────────────
  const ins = (html: string) => { editor?.chain().focus().insertContent(html).run(); setPanel(null) }

  const insertImage = () => {
    if (!imageUrl) return
    editor?.chain().focus().setImage({ src: imageUrl, alt: imageAlt || '' }).run()
    setImageUrl(''); setImageAlt(''); setPanel(null)
  }

  const insertImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      editor?.chain().focus().setImage({ src, alt: file.name }).run()
      setPanel(null)
    }
    reader.readAsDataURL(file)
  }

  const getYoutubeEmbed = (url: string) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0`
    return url
  }

  const insertVideo = () => {
    if (!videoUrl) return
    const src = getYoutubeEmbed(videoUrl)
    const html = `<div style="margin:12px 0;border-radius:10px;overflow:hidden;max-width:100%"><iframe src="${src}" width="100%" height="315" frameborder="0" allowfullscreen style="display:block;border-radius:10px"></iframe></div>`
    ins(html)
    setVideoUrl('')
  }

  const insertLink = () => {
    if (!linkUrl) return
    if (linkText) {
      ins(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color:#60A5FA;text-decoration:underline">${linkText}</a>`)
    } else {
      editor?.chain().focus().setLink({ href: linkUrl, target: '_blank' }).run()
    }
    setLinkUrl(''); setLinkText(''); setPanel(null)
  }

  const insertCallout = (t: typeof CALLOUT_TYPES[0]) => {
    ins(`<div data-callout="${t.id}" style="margin:8px 0;padding:10px 14px;background:${t.bg};border-left:3px solid ${t.border};border-radius:4px"><span style="font-weight:700;color:${t.color};margin-right:6px">${t.icon} ${t.label} —</span> <span>Saisir le contenu ici...</span></div>`)
  }

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: tableR, cols: tableC, withHeaderRow: true }).run()
    setPanel(null)
  }

  // ── Style helpers ───────────────────────────────────────────────────────────
  const btn = (active: boolean, onClick: () => void, title: string, content: React.ReactNode, w = 28) => (
    <button key={title} type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ width: w, height: 26, border: 'none', borderRadius: 4, cursor: editor ? 'pointer' : 'default',
        background: active ? 'rgba(96,165,250,0.18)' : 'transparent',
        color: active ? '#60A5FA' : editor ? 'var(--text-2)' : 'var(--text-4)',
        fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.1s', flexShrink: 0, opacity: editor ? 1 : 0.4 }}>
      {content}
    </button>
  )

  const pbtn = (id: PanelId, label: string) => (
    <button key={String(id)} type="button" onMouseDown={e => { e.preventDefault(); tog(id) }}
      style={{ padding: '0 7px', height: 26, border: 'none', borderRadius: 4, cursor: editor ? 'pointer' : 'default',
        background: panel === id ? 'rgba(167,139,250,0.2)' : 'transparent',
        color: panel === id ? '#A78BFA' : editor ? 'var(--text-2)' : 'var(--text-4)',
        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, opacity: editor ? 1 : 0.4 }}>
      {label} ▾
    </button>
  )

  const Div = () => <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />

  const popStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 500,
    background: '#0D1526', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 12, minWidth: 260,
    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, fontSize: 12,
    color: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...style,
  })

  const actBtn: React.CSSProperties = {
    padding: '7px 14px', background: 'var(--violet)', color: 'white',
    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  }

  const isActive = editor?.isActive.bind(editor)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ── Toolbar strip ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, rowGap: 2,
        padding: '5px 10px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid var(--border)',
        borderRadius: '10px 10px 0 0',
        minHeight: 38,
      }}>

        {/* Undo / Redo */}
        {btn(false, () => editor?.chain().focus().undo().run(), 'Annuler', '↩')}
        {btn(false, () => editor?.chain().focus().redo().run(), 'Rétablir', '↪')}
        <Div />

        {/* Headings / Normal */}
        {btn(isActive?.('heading', { level: 1 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), 'Titre 1', 'H1')}
        {btn(isActive?.('heading', { level: 2 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), 'Titre 2', 'H2')}
        {btn(isActive?.('heading', { level: 3 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), 'Titre 3', 'H3')}
        {btn(false, () => editor?.chain().focus().setParagraph().run(), 'Normal', '¶', 24)}
        <Div />

        {/* Inline format */}
        {btn(isActive?.('bold')      ?? false, () => editor?.chain().focus().toggleBold().run(),      'Gras',      <b>B</b>)}
        {btn(isActive?.('italic')    ?? false, () => editor?.chain().focus().toggleItalic().run(),    'Italique',  <i>I</i>)}
        {btn(isActive?.('underline') ?? false, () => editor?.chain().focus().toggleUnderline().run(), 'Souligné',  <u>U</u>)}
        {btn(isActive?.('strike')    ?? false, () => editor?.chain().focus().toggleStrike().run(),    'Barré',     <s>S</s>)}
        {btn(isActive?.('code')      ?? false, () => editor?.chain().focus().toggleCode().run(),      'Code',      <code style={{ fontSize: 10 }}>{'<>'}</code>)}
        <Div />

        {/* Alignment */}
        {btn(isActive?.({ textAlign: 'left' })    ?? false, () => editor?.chain().focus().setTextAlign('left').run(),    'Gauche',  '⬅', 24)}
        {btn(isActive?.({ textAlign: 'center' })  ?? false, () => editor?.chain().focus().setTextAlign('center').run(),  'Centré',  '≡', 24)}
        {btn(isActive?.({ textAlign: 'right' })   ?? false, () => editor?.chain().focus().setTextAlign('right').run(),   'Droite',  '➡', 24)}
        {btn(isActive?.({ textAlign: 'justify' }) ?? false, () => editor?.chain().focus().setTextAlign('justify').run(), 'Justifié','☰', 24)}
        <Div />

        {/* Lists */}
        {btn(isActive?.('bulletList')  ?? false, () => editor?.chain().focus().toggleBulletList().run(),  'Liste à puces',   '• —', 34)}
        {btn(isActive?.('orderedList') ?? false, () => editor?.chain().focus().toggleOrderedList().run(), 'Liste numérotée', '1.—', 34)}
        <Div />

        {/* Sub / Sup */}
        {btn(isActive?.('subscript')   ?? false, () => editor?.chain().focus().toggleSubscript().run(),   'Indice',    <span>X<sub style={{fontSize:8}}>2</sub></span>)}
        {btn(isActive?.('superscript') ?? false, () => editor?.chain().focus().toggleSuperscript().run(), 'Exposant',  <span>X<sup style={{fontSize:8}}>2</sup></span>)}
        <Div />

        {/* Colors */}
        <button type="button" title="Couleur du texte" onMouseDown={e => { e.preventDefault(); tog('color') }}
          style={{ width: 28, height: 26, border: 'none', borderRadius: 4, background: panel === 'color' ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: editor ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: editor ? 1 : 0.4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1 }}>A</span>
          <div style={{ width: 16, height: 3, background: '#60A5FA', borderRadius: 2, marginTop: 2 }} />
        </button>
        <button type="button" title="Surlignage" onMouseDown={e => { e.preventDefault(); tog('highlight') }}
          style={{ width: 28, height: 26, border: 'none', borderRadius: 4, background: panel === 'highlight' ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: editor ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: editor ? 1 : 0.4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(251,195,74,0.4)', color: 'var(--text-2)', lineHeight: 1, padding: '0 2px', borderRadius: 2 }}>ab</span>
        </button>
        <Div />

        {/* Table */}
        {pbtn('table', '⊞ Tableau')}
        <Div />

        {/* Insert media */}
        {pbtn('image', '🖼️ Image')}
        {pbtn('video', '▶ Vidéo')}
        {pbtn('link',  '🔗 Lien')}
        <Div />

        {/* Symbols */}
        {pbtn('math',    'Σ Math')}
        {pbtn('science', '⚗ Sciences')}
        {pbtn('callout', '💬 Blocs')}
        <button type="button" onMouseDown={e => { e.preventDefault(); setSchemasOpen(true) }}
          style={{ padding: '0 7px', height: 26, border: 'none', borderRadius: 4, cursor: editor ? 'pointer' : 'default',
            background: schemasOpen ? 'rgba(167,139,250,0.2)' : 'transparent',
            color: schemasOpen ? '#A78BFA' : editor ? 'var(--text-2)' : 'var(--text-4)',
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, opacity: editor ? 1 : 0.4 }}>
          🔬 Schémas ▾
        </button>

        {/* Table row/col controls when in table */}
        {editor?.isActive('table') && (
          <>
            <Div />
            {btn(false, () => editor.chain().focus().addRowAfter().run(),    'Ajouter ligne',    '+ Ligne', 54)}
            {btn(false, () => editor.chain().focus().addColumnAfter().run(), 'Ajouter colonne',  '+ Col',   48)}
            {btn(false, () => editor.chain().focus().deleteRow().run(),      'Supprimer ligne',  '− Ligne', 54)}
            {btn(false, () => editor.chain().focus().deleteColumn().run(),   'Supprimer col',    '− Col',   48)}
          </>
        )}
      </div>

      {/* ── Panels ─────────────────────────────────────────────────────────── */}

      {/* Color panel */}
      {panel === 'color' && (
        <div style={{ ...popStyle, minWidth: 220 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, letterSpacing: 1 }}>COULEUR DU TEXTE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEXT_COLORS.map(c => (
              <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setColor(c).run(); setPanel(null) }}
                style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} />
            ))}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().unsetColor().run(); setPanel(null) }}
              style={{ padding: '0 8px', height: 24, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 10, color: 'var(--text-3)', cursor: 'pointer' }}>
              Défaut
            </button>
          </div>
        </div>
      )}

      {/* Highlight panel */}
      {panel === 'highlight' && (
        <div style={{ ...popStyle, minWidth: 220 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, letterSpacing: 1 }}>SURLIGNAGE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {HIGHLIGHT_COLORS.map(h => (
              <button key={h.c} type="button" title={h.l} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setHighlight({ color: h.c }).run(); setPanel(null) }}
                style={{ width: 28, height: 22, borderRadius: 4, background: h.c, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 10, color: 'var(--text-2)' }}>
                ab
              </button>
            ))}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().unsetHighlight().run(); setPanel(null) }}
              style={{ padding: '0 8px', height: 22, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 10, color: 'var(--text-3)', cursor: 'pointer' }}>
              Enlever
            </button>
          </div>
        </div>
      )}

      {/* Table panel */}
      {panel === 'table' && (
        <div style={{ ...popStyle, minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10, letterSpacing: 1 }}>INSÉRER UN TABLEAU</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)' }}>Lignes
              <input type="number" value={tableR} min={1} max={20} onChange={e => setTableR(Number(e.target.value))}
                style={{ ...inp({ width: 56, marginLeft: 6, textAlign: 'center' }) }} />
            </label>
            <label style={{ fontSize: 11, color: 'var(--text-3)' }}>Colonnes
              <input type="number" value={tableC} min={1} max={10} onChange={e => setTableC(Number(e.target.value))}
                style={{ ...inp({ width: 56, marginLeft: 6, textAlign: 'center' }) }} />
            </label>
          </div>
          <button type="button" onMouseDown={e => { e.preventDefault(); insertTable() }} style={actBtn}>
            ⊞ Insérer ({tableR}×{tableC})
          </button>
        </div>
      )}

      {/* Image panel */}
      {panel === 'image' && (
        <div style={{ ...popStyle, minWidth: 300 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10, letterSpacing: 1 }}>INSÉRER UNE IMAGE</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>URL de l'image</div>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..." style={inp()} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Texte alternatif (optionnel)</div>
            <input value={imageAlt} onChange={e => setImageAlt(e.target.value)}
              placeholder="Description de l'image..." style={inp()} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-4)' }}>OU</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
            📁 Importer depuis l'ordinateur
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={insertImageFile} />
          </label>
          <button type="button" onMouseDown={e => { e.preventDefault(); insertImage() }} style={actBtn} disabled={!imageUrl}>
            🖼️ Insérer l'image
          </button>
        </div>
      )}

      {/* Video panel */}
      {panel === 'video' && (
        <div style={{ ...popStyle, minWidth: 300 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10, letterSpacing: 1 }}>INSÉRER UNE VIDÉO</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>URL YouTube ou lien direct</div>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... ou lien direct" style={inp()} />
          </div>
          <div style={{ padding: '8px 10px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 7, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
            ℹ YouTube, Vimeo et liens MP4 directs sont supportés. La vidéo sera intégrée dans la leçon.
          </div>
          <button type="button" onMouseDown={e => { e.preventDefault(); insertVideo() }} style={actBtn} disabled={!videoUrl}>
            ▶ Insérer la vidéo
          </button>
        </div>
      )}

      {/* Link panel */}
      {panel === 'link' && (
        <div style={{ ...popStyle, minWidth: 300 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10, letterSpacing: 1 }}>INSÉRER UN LIEN</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>URL *</div>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..." style={inp()} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Texte affiché (optionnel — sinon lien sur la sélection)</div>
            <input value={linkText} onChange={e => setLinkText(e.target.value)}
              placeholder="Texte du lien..." style={inp()} />
          </div>
          <button type="button" onMouseDown={e => { e.preventDefault(); insertLink() }} style={actBtn} disabled={!linkUrl}>
            🔗 Insérer le lien
          </button>
        </div>
      )}

      {/* Math panel */}
      {panel === 'math' && (
        <div style={{ ...popStyle, minWidth: 320 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, letterSpacing: 1 }}>SYMBOLES MATHÉMATIQUES</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {MATH_SYMS.map((cat, i) => (
              <button key={cat.label} type="button" onMouseDown={e => { e.preventDefault(); setMathCat(i) }}
                style={{ padding: '3px 8px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: mathCat === i ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)',
                  color: mathCat === i ? '#60A5FA' : 'var(--text-3)' }}>
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {MATH_SYMS[mathCat]?.symbols.map(sym => (
              <button key={sym} type="button" onMouseDown={e => { e.preventDefault(); ins(sym) }}
                style={{ width: 32, height: 32, borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Science panel */}
      {panel === 'science' && (
        <div style={{ ...popStyle, minWidth: 320 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, letterSpacing: 1 }}>SYMBOLES SCIENTIFIQUES</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {SCIENCE_SYMS.map((cat, i) => (
              <button key={cat.label} type="button" onMouseDown={e => { e.preventDefault(); setSciCat(i) }}
                style={{ padding: '3px 8px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: sciCat === i ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                  color: sciCat === i ? '#A78BFA' : 'var(--text-3)' }}>
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {SCIENCE_SYMS[sciCat]?.symbols.map(sym => (
              <button key={sym} type="button" onMouseDown={e => { e.preventDefault(); ins(sym) }}
                style={{ width: 36, height: 32, borderRadius: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Callout panel */}
      {panel === 'callout' && (
        <div style={{ ...popStyle, minWidth: 260 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10, letterSpacing: 1 }}>BLOCS SPÉCIAUX</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CALLOUT_TYPES.map(t => (
              <button key={t.id} type="button" onMouseDown={e => { e.preventDefault(); insertCallout(t) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}30`, borderRadius: 7, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.color }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SchemasPanel modal */}
      <SchemasPanel
        isOpen={schemasOpen}
        onClose={() => setSchemasOpen(false)}
        onInsert={schemaId => {
          const found = TOUS_SCHEMAS.find(s => s.id === schemaId || s.id.includes(schemaId.replace(/^(bio|chi|phy|mat)-/, '')) || schemaId.includes(s.id.replace(/^(bio|chi|phy|mat)-/, '')))
          if (found) ins(`<div style="margin:12px auto;text-align:center;max-width:100%">${found.toSvg()}</div>`)
          setSchemasOpen(false)
        }}
        matiereClasse={matiereClasse}
      />

      {/* Schemas inline panel (fallback — catalogue basique) */}
      {panel === 'schemas' && (
        <div style={{ ...popStyle, left: 'auto', right: 0, width: 680, maxHeight: 520, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10, letterSpacing: 1 }}>SCHÉMAS SVG SCIENTIFIQUES</div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
            {CATEGORIES_SCHEMAS.map(cat => (
              <button key={cat.id} type="button" onMouseDown={e => { e.preventDefault(); setSchemaCat(cat.id) }}
                style={{ padding: '4px 10px', borderRadius: 99, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: schemaCat === cat.id ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)',
                  color: schemaCat === cat.id ? '#A78BFA' : 'var(--text-3)' }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Schema grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {TOUS_SCHEMAS.filter(s => s.categorie === schemaCat).map(schema => (
              <div key={schema.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                {/* SVG preview */}
                <div
                  style={{ background: '#080E1E', padding: 6, lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90 }}
                  dangerouslySetInnerHTML={{ __html: schema.toSvg() }}
                />
                {/* Title + actions */}
                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {schema.titre}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        ins(`<div style="margin:12px auto;text-align:center;max-width:100%">${schema.toSvg()}</div>`)
                      }}
                      style={{ flex: 1, padding: '4px 0', background: 'var(--violet)', color: 'white', border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      Insérer
                    </button>
                    <button type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        const blob = new Blob([schema.toSvg()], { type: 'image/svg+xml' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `${schema.id}.svg`
                        document.body.appendChild(a); a.click(); a.remove()
                        URL.revokeObjectURL(url)
                      }}
                      style={{ padding: '4px 6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, fontSize: 10, cursor: 'pointer' }}
                      title="Télécharger SVG">
                      ⬇
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
