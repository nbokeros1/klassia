'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'

// ─── Symbol panels ────────────────────────────────────────────────────────────

const MATH_SYMBOLS: { label: string; symbols: string[] }[] = [
  { label: 'Opérations',    symbols: ['×', '÷', '±', '≠', '≤', '≥', '≈', '∞', '√', '∛', '∑', '∏', '∫', '∂', '∆', '∇'] },
  { label: 'Fractions',     symbols: ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅙', '⅚', '⅛', '⅜', '⅝', '⅞'] },
  { label: 'Exposants',     symbols: ['²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁰', '⁻¹', 'ⁿ', '₁', '₂', '₃', '₄', 'ₙ'] },
  { label: 'Grec',          symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Δ', 'Σ', 'Ω', 'Γ', 'Λ', 'Φ', 'Ψ'] },
  { label: 'Géométrie',     symbols: ['∠', '⊥', '∥', '△', '○', '°', '≅', '~', '→', '←', '↔', '⟹', '⟺', '⊡', '⊿'] },
  { label: 'Ensembles',     symbols: ['∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅', '∀', '∃', '∧', '∨', '¬', 'ℕ', 'ℤ', 'ℚ', 'ℝ', 'ℂ'] },
]

const SCIENCE_SYMBOLS: { label: string; symbols: string[] }[] = [
  { label: 'Chimie',        symbols: ['→', '⇌', '⇒', '↑', '↓', '·', '•', '⁺', '⁻', '°C', '°F', 'Å', 'ℏ', 'μ', 'λ', 'ν'] },
  { label: 'Physique',      symbols: ['Ω', 'μ', 'ε₀', 'μ₀', 'ħ', 'ℏ', 'σ', 'ρ', 'η', 'κ', '∇', '∂', '∮', '∯', 'Φ', 'ψ'] },
  { label: 'Bio/Médical',   symbols: ['☣', '⚕', '🧬', '🔬', '🧫', '🧪', '⚗', '🩺', '💊', '🫀', '🫁', '🧠', '🦠', '🐛', '🌱'] },
  { label: 'Astronomie',    symbols: ['☀', '🌙', '⭐', '🪐', '☄', '🌌', '🔭', '🌍', '🌏', '🌕', '☁', '⚡', '🌊', '🌋', '❄'] },
]

const CALLOUT_TYPES = [
  { id: 'info',    label: 'Info',      icon: 'ℹ',  bg: 'rgba(96,165,250,0.1)',  border: '#60A5FA', color: '#60A5FA' },
  { id: 'success', label: 'Succès',    icon: '✓',  bg: 'rgba(52,211,153,0.1)',  border: '#34D399', color: '#34D399' },
  { id: 'warning', label: 'Attention', icon: '⚠',  bg: 'rgba(251,195,74,0.1)',  border: '#FBC34A', color: '#FBC34A' },
  { id: 'formula', label: 'Formule',   icon: 'ƒ',  bg: 'rgba(167,139,250,0.1)', border: '#A78BFA', color: '#A78BFA' },
  { id: 'def',     label: 'Définition',icon: '📖', bg: 'rgba(45,95,160,0.1)',   border: '#60A5FA', color: '#60A5FA' },
  { id: 'example', label: 'Exemple',   icon: '💡', bg: 'rgba(251,195,74,0.08)', border: '#FBC34A', color: '#FBC34A' },
]

const SCIENCE_DIAGRAMS: { label: string; svg: string }[] = [
  {
    label: 'Atome (Bohr)',
    svg: `<figure class="science-diagram"><svg viewBox="0 0 120 120" width="160" height="160"><circle cx="60" cy="60" r="10" fill="#A78BFA"/><circle cx="60" cy="60" r="8" fill="#7C3AED"/><text x="60" y="64" text-anchor="middle" fill="white" font-size="8">N</text><ellipse cx="60" cy="60" rx="25" ry="8" fill="none" stroke="#60A5FA" stroke-width="1.2"/><circle cx="85" cy="60" r="3" fill="#60A5FA"/><ellipse cx="60" cy="60" rx="40" ry="12" fill="none" stroke="#34D399" stroke-width="1.2" transform="rotate(60 60 60)"/><circle cx="80" cy="90" r="3" fill="#34D399"/><ellipse cx="60" cy="60" rx="40" ry="12" fill="none" stroke="#FBC34A" stroke-width="1.2" transform="rotate(120 60 60)"/><circle cx="25" cy="85" r="3" fill="#FBC34A"/></svg><figcaption>Modèle atomique de Bohr</figcaption></figure>`,
  },
  {
    label: 'Cellule animale',
    svg: `<figure class="science-diagram"><svg viewBox="0 0 140 120" width="180" height="150"><ellipse cx="70" cy="60" rx="60" ry="50" fill="rgba(52,211,153,0.08)" stroke="#34D399" stroke-width="1.5"/><ellipse cx="70" cy="60" rx="18" ry="15" fill="rgba(167,139,250,0.2)" stroke="#A78BFA" stroke-width="1.2"/><text x="70" y="64" text-anchor="middle" fill="#A78BFA" font-size="7">Noyau</text><circle cx="40" cy="45" r="5" fill="rgba(251,195,74,0.3)" stroke="#FBC34A" stroke-width="1"/><text x="40" y="38" text-anchor="middle" fill="#FBC34A" font-size="6">Mito.</text><circle cx="95" cy="75" r="4" fill="rgba(96,165,250,0.3)" stroke="#60A5FA" stroke-width="1"/><text x="95" y="68" text-anchor="middle" fill="#60A5FA" font-size="6">RER</text><circle cx="110" cy="50" r="5" fill="rgba(248,113,113,0.3)" stroke="#F87171" stroke-width="1"/><text x="110" y="43" text-anchor="middle" fill="#F87171" font-size="6">Golgi</text></svg><figcaption>Cellule animale (schéma simplifié)</figcaption></figure>`,
  },
  {
    label: 'Circuit électrique',
    svg: `<figure class="science-diagram"><svg viewBox="0 0 160 100" width="200" height="120"><rect x="10" y="40" width="20" height="20" fill="rgba(251,195,74,0.2)" stroke="#FBC34A" stroke-width="1.5"/><line x1="8" y1="45" x2="8" y2="55" stroke="#FBC34A" stroke-width="2.5"/><line x1="12" y1="42" x2="12" y2="58" stroke="#FBC34A" stroke-width="1.5"/><text x="20" y="70" text-anchor="middle" fill="#FBC34A" font-size="8">Bat.</text><line x1="30" y1="50" x2="60" y2="50" stroke="#94A3B8" stroke-width="1.5"/><path d="M60 50 L65 40 L70 60 L75 40 L80 60 L85 40 L90 50" fill="none" stroke="#60A5FA" stroke-width="1.5"/><text x="75" y="78" text-anchor="middle" fill="#60A5FA" font-size="8">Résistance</text><line x1="90" y1="50" x2="130" y2="50" stroke="#94A3B8" stroke-width="1.5"/><circle cx="135" cy="50" r="8" fill="rgba(248,113,113,0.2)" stroke="#F87171" stroke-width="1.5"/><text x="135" y="54" text-anchor="middle" fill="#F87171" font-size="8">L</text><text x="135" y="70" text-anchor="middle" fill="#F87171" font-size="8">Lampe</text><line x1="143" y1="50" x2="150" y2="50" stroke="#94A3B8" stroke-width="1.5"/><line x1="150" y1="50" x2="150" y2="15" stroke="#94A3B8" stroke-width="1.5"/><line x1="10" y1="15" x2="150" y2="15" stroke="#94A3B8" stroke-width="1.5"/><line x1="10" y1="15" x2="10" y2="40" stroke="#94A3B8" stroke-width="1.5"/><text x="80" y="12" text-anchor="middle" fill="#94A3B8" font-size="7">I →</text></svg><figcaption>Circuit électrique simple</figcaption></figure>`,
  },
  {
    label: 'Plan cartésien',
    svg: `<figure class="science-diagram"><svg viewBox="0 0 120 120" width="150" height="150"><line x1="10" y1="60" x2="110" y2="60" stroke="#60A5FA" stroke-width="1.5" marker-end="url(#arrow)"/><line x1="60" y1="110" x2="60" y2="10" stroke="#60A5FA" stroke-width="1.5" marker-end="url(#arrow)"/><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#60A5FA"/></marker></defs><text x="112" y="63" fill="#60A5FA" font-size="9">x</text><text x="63" y="10" fill="#60A5FA" font-size="9">y</text><text x="62" y="68" fill="#94A3B8" font-size="7">O</text>${[1,2,3,4].map(i=>`<line x1="${60+i*10}" y1="57" x2="${60+i*10}" y2="63" stroke="#94A3B8" stroke-width="0.8"/><line x1="${60-i*10}" y1="57" x2="${60-i*10}" y2="63" stroke="#94A3B8" stroke-width="0.8"/><line x1="57" y1="${60-i*10}" x2="63" y2="${60-i*10}" stroke="#94A3B8" stroke-width="0.8"/><line x1="57" y1="${60+i*10}" x2="63" y2="${60+i*10}" stroke="#94A3B8" stroke-width="0.8"/>`).join('')}</svg><figcaption>Plan cartésien</figcaption></figure>`,
  },
  {
    label: 'Droite numérique',
    svg: `<figure class="science-diagram"><svg viewBox="0 0 200 60" width="240" height="70"><line x1="10" y1="30" x2="190" y2="30" stroke="#60A5FA" stroke-width="1.5"/><polygon points="190,27 197,30 190,33" fill="#60A5FA"/><polygon points="10,27 3,30 10,33" fill="#60A5FA"/>${[-4,-3,-2,-1,0,1,2,3,4].map(i=>`<line x1="${100+i*20}" y1="25" x2="${100+i*20}" y2="35" stroke="#60A5FA" stroke-width="1.2"/><text x="${100+i*20}" y="48" text-anchor="middle" fill="#94A3B8" font-size="9">${i}</text>`).join('')}</svg><figcaption>Droite numérique</figcaption></figure>`,
  },
  {
    label: 'Cycle de l\'eau',
    svg: `<figure class="science-diagram"><svg viewBox="0 0 160 120" width="200" height="150"><path d="M10 90 Q40 50 80 30 Q120 10 150 90 Z" fill="rgba(52,211,153,0.08)" stroke="#34D399" stroke-width="1"/><ellipse cx="80" cy="95" rx="70" ry="20" fill="rgba(96,165,250,0.15)" stroke="#60A5FA" stroke-width="1.2"/><text x="80" y="99" text-anchor="middle" fill="#60A5FA" font-size="7">Mer / Lac</text><path d="M30 80 Q20 50 50 30" fill="none" stroke="#60A5FA" stroke-width="1.5" stroke-dasharray="4 2" marker-end="url(#a2)"/><defs><marker id="a2" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#60A5FA"/></marker></defs><text x="12" y="55" fill="#60A5FA" font-size="7">Évaporation</text><ellipse cx="80" cy="20" rx="25" ry="10" fill="rgba(148,163,184,0.3)" stroke="#94A3B8" stroke-width="1"/><text x="80" y="23" text-anchor="middle" fill="#94A3B8" font-size="7">Nuages</text><path d="M90 30 Q110 50 130 80" fill="none" stroke="#A78BFA" stroke-width="1.5" stroke-dasharray="4 2" marker-end="url(#a3)"/><defs><marker id="a3" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#A78BFA"/></marker></defs><text x="118" y="55" fill="#A78BFA" font-size="7">Précipitation</text></svg><figcaption>Cycle de l'eau</figcaption></figure>`,
  },
]

const TEXT_COLORS = ['#FFFFFF', '#60A5FA', '#A78BFA', '#34D399', '#FBC34A', '#F87171', '#F472B6', '#94A3B8', '#000000']
const HIGHLIGHT_COLORS = [
  { c: 'rgba(251,195,74,0.35)',  l: 'Jaune' },
  { c: 'rgba(96,165,250,0.3)',   l: 'Bleu' },
  { c: 'rgba(167,139,250,0.3)',  l: 'Violet' },
  { c: 'rgba(52,211,153,0.3)',   l: 'Vert' },
  { c: 'rgba(248,113,113,0.3)',  l: 'Rouge' },
  { c: 'rgba(244,114,182,0.3)',  l: 'Rose' },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  showToolbar?: boolean        // default true; set false when using shared EditorToolbar
  lightBackground?: boolean    // white/light bg for the content area
  onEditorReady?: (editor: Editor) => void  // called once editor is mounted
  onFocus?: (editor: Editor) => void        // called when this editor gains focus
  uploadImage?: (file: File) => Promise<string>  // upload to Storage, return signed URL
}

type Panel = 'math' | 'science' | 'table' | 'blocks' | 'diagrams' | 'color' | 'highlight' | null

export default function RichEditor({
  value, onChange, placeholder, rows = 3, disabled = false,
  showToolbar = true, lightBackground = false,
  onEditorReady, onFocus, uploadImage,
}: RichEditorProps) {
  const [openPanel, setOpenPanel] = useState<Panel>(null)
  const [mathCat, setMathCat] = useState(0)
  const [sciCat, setSciCat] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const uploadImageRef = useRef(uploadImage)
  uploadImageRef.current = uploadImage
  const editorRef = useRef<Editor | null>(null)

  const insertImageFromFile = (file: File) => {
    const fn = uploadImageRef.current
    if (fn) {
      fn(file).then(src => {
        editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run()
      }).catch(() => {
        const reader = new FileReader()
        reader.onload = ev => editorRef.current?.chain().focus().setImage({ src: ev.target?.result as string, alt: file.name }).run()
        reader.readAsDataURL(file)
      })
    } else {
      const reader = new FileReader()
      reader.onload = ev => editorRef.current?.chain().focus().setImage({ src: ev.target?.result as string, alt: file.name }).run()
      reader.readAsDataURL(file)
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || '' }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', style: 'color:#60A5FA;text-decoration:underline' } }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) { onChange(editor.getHTML()) },
    onFocus({ editor }) { onFocus?.(editor as Editor) },
    editorProps: {
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items || [])
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) insertImageFromFile(file)
            return true
          }
        }
        return false
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const files = Array.from((event as DragEvent).dataTransfer?.files || [])
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            insertImageFromFile(file)
            return true
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editorRef.current = editor
    onEditorReady?.(editor as Editor)
    const current = editor.getHTML()
    if (value !== current && value !== '<p></p>') editor.commands.setContent(value || '')
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current && value !== '<p></p>') editor.commands.setContent(value || '')
  }, [value])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenPanel(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const togglePanel = (p: Panel) => setOpenPanel(prev => prev === p ? null : p)

  const insert = (content: string) => {
    editor?.chain().focus().insertContent(content).run()
    setOpenPanel(null)
  }

  const insertCallout = (type: typeof CALLOUT_TYPES[0]) => {
    const html = `<div data-callout="${type.id}" style="margin:8px 0;padding:10px 14px;background:${type.bg};border-left:3px solid ${type.border};border-radius:4px;"><span style="font-weight:700;color:${type.color};margin-right:6px;">${type.icon} ${type.label} —</span> <span>Saisir le contenu ici...</span></div>`
    insert(html)
  }

  const insertDiagram = (d: typeof SCIENCE_DIAGRAMS[0]) => {
    insert(d.svg)
    setOpenPanel(null)
  }

  const insertTable = (r: number, c: number) => {
    editor?.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
    setOpenPanel(null)
  }

  const isInTable = editor?.isActive('table') ?? false
  const minHeight = `${rows * 1.65 * 13 + 22}px`

  // ── Toolbar button helper ─────────────────────────────────────────────────
  const tb = (active: boolean, onClick: () => void, title: string, content: React.ReactNode, width = 28) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ width, height: 28, border: 'none', borderRadius: 5, background: active ? 'rgba(96,165,250,0.2)' : 'transparent', color: active ? '#60A5FA' : 'var(--text-3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s', flexShrink: 0 }}>
      {content}
    </button>
  )

  const panelBtn = (id: Panel, label: string, active = false) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); togglePanel(id) }}
      style={{ padding: '0 8px', height: 28, border: 'none', borderRadius: 5, background: openPanel === id || active ? 'rgba(167,139,250,0.2)' : 'transparent', color: openPanel === id || active ? '#A78BFA' : 'var(--text-3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
    </button>
  )

  const divider = <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />

  // ── Panel dropdown style ─────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: 0, zIndex: 300,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 14, minWidth: 260,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  }

  const contentBg    = lightBackground ? (disabled ? 'transparent' : '#FFFFFF') : (disabled ? 'transparent' : 'rgba(255,255,255,0.04)')
  const contentColor = lightBackground ? '#1a1a1a' : 'var(--text-1)'

  return (
    <div className={lightBackground ? 'rich-editor-light' : 'rich-editor-dark'} style={{ position: 'relative' }}>
      {!disabled && showToolbar && (
        <div ref={panelRef} style={{ position: 'relative' }}>
          {/* ── Toolbar ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', borderRadius: '8px 8px 0 0', flexWrap: 'wrap', rowGap: 3 }}>

            {/* Format */}
            {tb(editor?.isActive('bold') ?? false,       () => editor?.chain().focus().toggleBold().run(),       'Gras',      <b>B</b>)}
            {tb(editor?.isActive('italic') ?? false,     () => editor?.chain().focus().toggleItalic().run(),     'Italique',  <i>I</i>)}
            {tb(editor?.isActive('underline') ?? false,  () => editor?.chain().focus().toggleUnderline().run(), 'Souligné',  <u>U</u>)}
            {tb(editor?.isActive('strike') ?? false,     () => editor?.chain().focus().toggleStrike().run(),    'Barré',     <s style={{ fontSize: 11 }}>S</s>)}
            {tb(editor?.isActive('subscript') ?? false,  () => editor?.chain().focus().toggleSubscript().run(), 'Indice',    <span style={{ fontSize: 10 }}>x₂</span>)}
            {tb(editor?.isActive('superscript') ?? false,() => editor?.chain().focus().toggleSuperscript().run(),'Exposant', <span style={{ fontSize: 10 }}>x²</span>)}
            {divider}

            {/* Headings */}
            {tb(editor?.isActive('heading', { level: 1 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), 'Titre H1', <span style={{ fontSize: 11, fontWeight: 900 }}>H1</span>)}
            {tb(editor?.isActive('heading', { level: 2 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), 'Titre H2', <span style={{ fontSize: 11, fontWeight: 800 }}>H2</span>)}
            {tb(editor?.isActive('heading', { level: 3 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), 'Titre H3', <span style={{ fontSize: 10, fontWeight: 700 }}>H3</span>)}
            {divider}

            {/* Align */}
            {tb(editor?.isActive({ textAlign: 'left' }) ?? false,   () => editor?.chain().focus().setTextAlign('left').run(),   'Gauche',  <span style={{ fontSize: 12 }}>≡</span>)}
            {tb(editor?.isActive({ textAlign: 'center' }) ?? false, () => editor?.chain().focus().setTextAlign('center').run(), 'Centre',  <span style={{ fontSize: 12 }}>≡</span>)}
            {tb(editor?.isActive({ textAlign: 'right' }) ?? false,  () => editor?.chain().focus().setTextAlign('right').run(),  'Droite',  <span style={{ fontSize: 12 }}>≡</span>)}
            {divider}

            {/* Lists */}
            {tb(editor?.isActive('bulletList') ?? false,  () => editor?.chain().focus().toggleBulletList().run(),  'Liste puces',    <>•—</>)}
            {tb(editor?.isActive('orderedList') ?? false, () => editor?.chain().focus().toggleOrderedList().run(), 'Liste numéros',  <>1.</>)}
            {tb(editor?.isActive('blockquote') ?? false,  () => editor?.chain().focus().toggleBlockquote().run(), 'Citation',       <span style={{ fontSize: 14 }}>"</span>)}
            {divider}

            {/* Color panel */}
            <div style={{ position: 'relative' }}>
              {panelBtn('color', '🎨 Couleur')}
              {openPanel === 'color' && (
                <div style={{ ...panelStyle, minWidth: 220 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8 }}>Couleur du texte</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {TEXT_COLORS.map(c => (
                      <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setColor(c).run(); }}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: editor?.isActive('textStyle', { color: c }) ? '3px solid white' : '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
                    ))}
                    <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().unsetColor().run(); }}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #fff 50%, #000 50%)', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 8 }} title="Réinitialiser" />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8 }}>Surlignage</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {HIGHLIGHT_COLORS.map(h => (
                      <button key={h.c} type="button" title={h.l} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleHighlight({ color: h.c }).run(); }}
                        style={{ width: 24, height: 24, borderRadius: 5, background: h.c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
                    ))}
                    <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().unsetHighlight().run(); }}
                      style={{ padding: '0 8px', height: 24, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 10 }}>✕</button>
                  </div>
                </div>
              )}
            </div>
            {divider}

            {/* Table */}
            <div style={{ position: 'relative' }}>
              {panelBtn('table', '⊞ Tableau', isInTable)}
              {openPanel === 'table' && (
                <div style={{ ...panelStyle, minWidth: 190 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8 }}>Insérer un tableau</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    {[[2,2],[2,3],[3,3],[3,4],[4,4],[5,3]].map(([r,c]) => (
                      <button key={`${r}x${c}`} type="button" onMouseDown={e => { e.preventDefault(); insertTable(r,c); }}
                        style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                        {r} × {c} tableau
                      </button>
                    ))}
                  </div>
                  {isInTable && (
                    <>
                      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {[['+ Ligne', () => editor?.chain().focus().addRowAfter().run()], ['− Ligne', () => editor?.chain().focus().deleteRow().run()], ['+ Col.', () => editor?.chain().focus().addColumnAfter().run()], ['− Col.', () => editor?.chain().focus().deleteColumn().run()]].map(([l, a]) => (
                          <button key={l as string} type="button" onMouseDown={e => { e.preventDefault(); (a as ()=>void)(); }}
                            style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>{l as string}</button>
                        ))}
                      </div>
                      <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().deleteTable().run(); setOpenPanel(null); }}
                        style={{ marginTop: 4, width: '100%', padding: '4px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, background: 'rgba(239,68,68,0.08)', color: '#F87171', fontSize: 11, cursor: 'pointer' }}>
                        Supprimer le tableau
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {divider}

            {/* Callout blocks */}
            <div style={{ position: 'relative' }}>
              {panelBtn('blocks', '📦 Blocs')}
              {openPanel === 'blocks' && (
                <div style={{ ...panelStyle, minWidth: 220 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8 }}>Blocs pédagogiques</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {CALLOUT_TYPES.map(t => (
                      <button key={t.id} type="button" onMouseDown={e => { e.preventDefault(); insertCallout(t); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: `1px solid ${t.border}30`, borderRadius: 8, background: t.bg, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t.color }}>{t.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {divider}

            {/* Math symbols */}
            <div style={{ position: 'relative' }}>
              {panelBtn('math', '∑ Maths')}
              {openPanel === 'math' && (
                <div style={{ ...panelStyle, width: 340 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                    {MATH_SYMBOLS.map((cat, i) => (
                      <button key={i} type="button" onClick={() => setMathCat(i)}
                        style={{ padding: '3px 8px', border: 'none', borderRadius: 5, background: mathCat === i ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', color: mathCat === i ? '#A78BFA' : 'var(--text-3)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {MATH_SYMBOLS[mathCat].symbols.map((sym, i) => (
                      <button key={i} type="button" onClick={() => insert(sym)} title={sym}
                        style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)', fontSize: 15, cursor: 'pointer', fontFamily: 'serif' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Science symbols */}
            <div style={{ position: 'relative' }}>
              {panelBtn('science', '⚗ Sciences')}
              {openPanel === 'science' && (
                <div style={{ ...panelStyle, width: 340 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                    {SCIENCE_SYMBOLS.map((cat, i) => (
                      <button key={i} type="button" onClick={() => setSciCat(i)}
                        style={{ padding: '3px 8px', border: 'none', borderRadius: 5, background: sciCat === i ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)', color: sciCat === i ? '#60A5FA' : 'var(--text-3)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {SCIENCE_SYMBOLS[sciCat].symbols.map((sym, i) => (
                      <button key={i} type="button" onClick={() => insert(sym)} title={sym}
                        style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)', fontSize: 16, cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Science diagrams */}
            <div style={{ position: 'relative' }}>
              {panelBtn('diagrams', '🔬 Schémas')}
              {openPanel === 'diagrams' && (
                <div style={{ ...panelStyle, width: 360 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 10 }}>Schémas scientifiques prédéfinis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {SCIENCE_DIAGRAMS.map((d, i) => (
                      <button key={i} type="button" onMouseDown={e => { e.preventDefault(); insertDiagram(d); }}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                        <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 500 }}>{d.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <EditorContent editor={editor} style={{ minHeight, padding: '10px 13px', borderLeft: `1.5px solid ${disabled ? 'transparent' : 'var(--border)'}`, borderRight: `1.5px solid ${disabled ? 'transparent' : 'var(--border)'}`, borderBottom: `1.5px solid ${disabled ? 'transparent' : 'var(--border)'}`, borderTop: (disabled || !showToolbar) ? `1.5px solid ${disabled ? 'transparent' : 'var(--border)'}` : 'none', borderRadius: disabled ? 'var(--radius-sm)' : (showToolbar ? '0 0 8px 8px' : '8px'), fontSize: 13, color: contentColor, background: contentBg, outline: 'none', lineHeight: '1.65', cursor: disabled ? 'default' : 'text' }} />

      <style>{`
        /* ── Base tiptap (dark mode) ─────────────────────────────────────── */
        .tiptap { outline: none; min-height: inherit; }
        .tiptap p { margin: 0 0 4px 0; }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin: 4px 0; }
        .tiptap li { margin: 2px 0; }
        .tiptap h1 { font-size: 20px; font-weight: 800; margin: 12px 0 6px; }
        .tiptap h2 { font-size: 16px; font-weight: 700; margin: 10px 0 5px; }
        .tiptap h3 { font-size: 14px; font-weight: 600; margin: 8px 0 4px; }
        .tiptap blockquote { border-left: 3px solid var(--violet); padding-left: 12px; margin: 8px 0; color: var(--text-3); font-style: italic; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-4); pointer-events: none; float: left; height: 0; }
        .tiptap table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
        .tiptap th, .tiptap td { border: 1px solid var(--border); padding: 6px 10px; min-width: 60px; vertical-align: top; }
        .tiptap th { background: rgba(255,255,255,0.06); font-weight: 600; }
        .tiptap .selectedCell:after { background: rgba(96,165,250,0.15); content: ""; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none; position: absolute; z-index: 2; }
        .science-diagram { display: inline-flex; flex-direction: column; align-items: center; margin: 10px 4px; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 10px; cursor: default; }
        .science-diagram svg { display: block; }
        .science-diagram figcaption { font-size: 10px; color: var(--text-4); margin-top: 5px; text-align: center; font-style: italic; }
        .tiptap [data-callout] { margin: 8px 0; }

        /* ── Light background mode — texte noir absolu ───────────────────── */
        .rich-editor-light .tiptap,
        .rich-editor-light .tiptap p,
        .rich-editor-light .tiptap li,
        .rich-editor-light .tiptap td,
        .rich-editor-light .tiptap th,
        .rich-editor-light .tiptap blockquote,
        .rich-editor-light .tiptap span:not([style*="color"]) { color: #1a1a1a !important; }
        .rich-editor-light .tiptap h1 { color: #111111 !important; font-size: 20px; font-weight: 800; margin: 12px 0 6px; }
        .rich-editor-light .tiptap h2 { color: #111111 !important; font-size: 16px; font-weight: 700; margin: 10px 0 5px; }
        .rich-editor-light .tiptap h3 { color: #111111 !important; font-size: 14px; font-weight: 600; margin: 8px 0 4px; }
        .rich-editor-light .tiptap p.is-editor-empty:first-child::before { color: #9ca3af !important; }
        .rich-editor-light .tiptap th { background: #f3f4f6; color: #111 !important; }
        .rich-editor-light .tiptap td { border-color: #d1d5db; }
        .rich-editor-light .tiptap blockquote { color: #374151 !important; border-left-color: #7C3AED; }
        .rich-editor-light .tiptap a { color: #2563EB !important; }
        /* Garantir que le fond reste blanc et le caret visible */
        .rich-editor-light .ProseMirror { background: #ffffff !important; caret-color: #1a1a1a; }
      `}</style>
    </div>
  )
}
