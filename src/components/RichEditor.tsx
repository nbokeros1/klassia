'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'

const MATH_SYMBOLS: { label: string; symbols: string[] }[] = [
  { label: 'Opérations', symbols: ['×', '÷', '±', '≠', '≤', '≥', '≈', '∞', '√', '∑', '∏', '∫', '∂'] },
  { label: 'Fractions', symbols: ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅙', '⅚', '⅛', '⅜'] },
  { label: 'Exposants', symbols: ['²', '³', '⁴', '⁵', '⁻¹', 'ⁿ', '₁', '₂', '₃', 'ₙ'] },
  { label: 'Lettres grecques', symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ω', 'Δ', 'Π', 'Σ', 'Ω'] },
  { label: 'Géométrie', symbols: ['∠', '⊥', '∥', '△', '○', '°', '≅', '~', '→', '←', '↔', '⟹', '⟺'] },
  { label: 'Ensembles', symbols: ['∈', '∉', '⊂', '⊃', '∪', '∩', '∅', '∀', '∃', '∧', '∨', '¬'] },
]

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}

export default function RichEditor({ value, onChange, placeholder, rows = 3, disabled = false }: RichEditorProps) {
  const [showMath, setShowMath] = useState(false)
  const [mathCategory, setMathCategory] = useState(0)
  const mathRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder || '' }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. when leçon loads from Supabase)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    // Only update if content actually differs, to avoid cursor jumping
    if (value !== current && value !== '<p></p>') {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  // Close math panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mathRef.current && !mathRef.current.contains(e.target as Node)) {
        setShowMath(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const insertSymbol = (sym: string) => {
    editor?.chain().focus().insertContent(sym).run()
  }

  const btn = (active: boolean, onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        width: 28, height: 28, border: 'none', borderRadius: 5,
        background: active ? 'rgba(96,165,250,0.2)' : 'transparent',
        color: active ? '#60A5FA' : 'var(--text-3)',
        cursor: 'pointer', fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.1s',
      }}
    >{children}</button>
  )

  const minHeight = `${rows * 1.65 * 13 + 22}px`

  return (
    <div style={{ position: 'relative' }}>
      {!disabled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          padding: '4px 8px', borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.03)', borderRadius: '6px 6px 0 0',
          flexWrap: 'wrap',
        }}>
          {btn(editor?.isActive('bold') ?? false, () => editor?.chain().focus().toggleBold().run(), 'Gras (Ctrl+B)', <b>B</b>)}
          {btn(editor?.isActive('italic') ?? false, () => editor?.chain().focus().toggleItalic().run(), 'Italique (Ctrl+I)', <i>I</i>)}
          {btn(editor?.isActive('underline') ?? false, () => editor?.chain().focus().toggleUnderline().run(), 'Souligné (Ctrl+U)', <u>U</u>)}
          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
          {btn(editor?.isActive('bulletList') ?? false, () => editor?.chain().focus().toggleBulletList().run(), 'Liste à puces', <>&#8226;&#8212;</>)}
          {btn(editor?.isActive('orderedList') ?? false, () => editor?.chain().focus().toggleOrderedList().run(), 'Liste numérotée', <>1.</>)}
          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
          <div ref={mathRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setShowMath(v => !v) }}
              title="Symboles mathématiques"
              style={{
                padding: '0 8px', height: 28, border: 'none', borderRadius: 5,
                background: showMath ? 'rgba(167,139,250,0.2)' : 'transparent',
                color: showMath ? '#A78BFA' : 'var(--text-3)',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}>
              ∑ Symboles
            </button>
            {showMath && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 200,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 12, width: 320,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  {MATH_SYMBOLS.map((cat, i) => (
                    <button key={i} type="button"
                      onClick={() => setMathCategory(i)}
                      style={{
                        padding: '3px 8px', border: 'none', borderRadius: 5,
                        background: mathCategory === i ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                        color: mathCategory === i ? '#A78BFA' : 'var(--text-3)',
                        fontSize: 11, cursor: 'pointer', fontWeight: 500,
                      }}>{cat.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {MATH_SYMBOLS[mathCategory].symbols.map((sym, i) => (
                    <button key={i} type="button"
                      onClick={() => insertSymbol(sym)}
                      title={`Insérer ${sym}`}
                      style={{
                        width: 36, height: 36, border: '1px solid var(--border)',
                        borderRadius: 6, background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-1)', fontSize: 16, cursor: 'pointer',
                        fontFamily: 'serif', transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >{sym}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <EditorContent
        editor={editor}
        style={{
          minHeight,
          padding: '10px 13px',
          border: `1.5px solid ${disabled ? 'transparent' : 'var(--border)'}`,
          borderTop: disabled ? undefined : 'none',
          borderRadius: disabled ? 'var(--radius-sm)' : '0 0 6px 6px',
          fontSize: 13, color: 'var(--text-1)',
          background: disabled ? 'transparent' : 'rgba(255,255,255,0.04)',
          outline: 'none', lineHeight: '1.65',
          cursor: disabled ? 'default' : 'text',
        }}
      />
      <style>{`
        .tiptap { outline: none; min-height: inherit; }
        .tiptap p { margin: 0 0 4px 0; }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin: 4px 0; }
        .tiptap li { margin: 2px 0; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--text-4);
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>
    </div>
  )
}
