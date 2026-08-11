'use client'

// DS 2.0 — Command Bar (Ctrl+K / Cmd+K)
// Mission 3: Navigation rapide style Raycast/Linear adaptée à ScorgIA

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Command {
  id:       string
  label:    string
  sub?:     string
  icon:     string
  href?:    string
  action?:  () => void
  category: string
  keywords?: string[]
}

// ─── Commandes statiques ──────────────────────────────────────────────────────

const STATIC_COMMANDS: Command[] = [
  // Navigation
  { id: 'nav-dashboard',     label: 'Tableau de bord',          sub: 'Vue d\'ensemble de votre journée',          icon: '🏠', href: '/dashboard',                            category: 'Navigation' },
  { id: 'nav-classes',       label: 'Mes classes',              sub: 'Gérer vos classes et matières',             icon: '🎓', href: '/dashboard/classes',                    category: 'Navigation' },
  { id: 'nav-bibliotheque',  label: 'Bibliothèque',             sub: 'Vos leçons, évaluations et ressources',     icon: '📚', href: '/dashboard/bibliotheque',               category: 'Navigation' },
  { id: 'nav-calendrier',    label: 'Agenda intelligent',       sub: 'Planification et emploi du temps',          icon: '🗓️', href: '/dashboard/calendrier',                  category: 'Navigation' },
  { id: 'nav-outils',        label: 'Outils enseignant',        sub: 'Quiz, sondages et outils pédagogiques',     icon: '🛠️', href: '/dashboard/outils',                      category: 'Navigation' },
  { id: 'nav-profil',        label: 'Mon profil',               sub: 'Paramètres et préférences',                 icon: '👤', href: '/dashboard/profil',                     category: 'Compte'     },
  { id: 'nav-forfaits',      label: 'Mes forfaits',             sub: 'Gérer votre abonnement ScorgIA',            icon: '⭐', href: '/dashboard/forfaits',                   category: 'Compte'     },
  // Actions IA
  { id: 'ia-preparer',       label: 'Préparer une leçon avec IA', sub: 'ScorgIA génère un plan pédagogique complet', icon: '✨', href: '/dashboard/gerer/preparer',          category: 'Actions IA' },
  { id: 'ia-evaluation',     label: 'Créer une évaluation',    sub: 'Évaluation formatrice ou sommative',        icon: '📊', href: '/dashboard/gerer/preparer?type=evaluation', category: 'Actions IA' },
  { id: 'ia-quiz',           label: 'Créer un quiz',           sub: 'Quiz interactif avec QCM et corrigé',       icon: '🎮', href: '/dashboard/outils/quiz',                 category: 'Actions IA' },
  { id: 'ia-studio',         label: 'Studio IA',               sub: 'Mémoire pédagogique et profil IA',          icon: '🧠', href: '/dashboard/studio-ia',                  category: 'Actions IA' },
  // Classes rapides — chargées dynamiquement
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function score(cmd: Command, q: string): number {
  const nq    = normalize(q)
  const label = normalize(cmd.label)
  const sub   = normalize(cmd.sub ?? '')
  const kw    = (cmd.keywords ?? []).map(normalize).join(' ')
  if (label.startsWith(nq))                return 3
  if (label.includes(nq))                  return 2
  if (sub.includes(nq) || kw.includes(nq)) return 1
  return 0
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandBar() {
  const router  = useRouter()
  const [open,      setOpen]      = useState(false)
  const [query,     setQuery]     = useState('')
  const [selected,  setSelected]  = useState(0)
  const [classes,   setClasses]   = useState<Command[]>([])
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)

  // ── Keyboard shortcut ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Focus input when opened ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  // ── Load classes dynamically when opened ───────────────────────────────────
  useEffect(() => {
    if (!open || classes.length > 0) return
    const load = async () => {
      try {
        const sb = createClient()
        const { data } = await sb
          .from('classes')
          .select('id, nom, matiere, niveau')
          .order('created_at', { ascending: false })
          .limit(8)
        if (data) {
          setClasses(data.map(c => ({
            id:       `class-${c.id}`,
            label:    c.nom,
            sub:      [c.matiere, c.niveau].filter(Boolean).join(' · '),
            icon:     '🎓',
            href:     `/dashboard/classes/${c.id}`,
            category: 'Mes classes',
            keywords: [c.matiere ?? '', c.niveau ?? ''],
          })))
        }
      } catch { /* ignore — classes remain empty */ }
    }
    load()
  }, [open])

  // ── All commands merged ────────────────────────────────────────────────────
  const allCommands = [...STATIC_COMMANDS, ...classes]

  // ── Filtered and grouped results ───────────────────────────────────────────
  const filtered = query.trim() === ''
    ? allCommands
    : allCommands
        .map(cmd => ({ cmd, s: score(cmd, query) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map(x => x.cmd)

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  // ── Flat list for keyboard navigation ─────────────────────────────────────
  const flat = filtered

  // ── Keyboard navigation within list ───────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = flat[selected]
      if (cmd) runCommand(cmd)
    }
  }, [flat, selected])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-selected="true"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // ── Execute command ────────────────────────────────────────────────────────
  function runCommand(cmd: Command) {
    setOpen(false)
    if (cmd.action) { cmd.action(); return }
    if (cmd.href)   router.push(cmd.href)
  }

  if (!open) return null

  // ── Render ─────────────────────────────────────────────────────────────────
  let itemIndex = 0

  return (
    <>
      {/* Overlay */}
      <div
        className="ds-cmdk-overlay"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Command bar */}
      <div className="ds-cmdk-wrapper" role="dialog" aria-label="Barre de commande ScorgIA" aria-modal>
        <div className="ds-cmdk">

          {/* Input */}
          <div className="ds-cmdk-input-row">
            <span className="ds-cmdk-icon" aria-hidden>⌕</span>
            <input
              ref={inputRef}
              className="ds-cmdk-input"
              type="text"
              placeholder="Rechercher une classe, une action, une leçon…"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(0) }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Recherche"
              aria-autocomplete="list"
            />
            <span className="ds-cmdk-kbd">Échap</span>
          </div>

          {/* Results */}
          <div className="ds-cmdk-results" ref={listRef} role="listbox">
            {flat.length === 0 ? (
              <div className="ds-cmdk-empty">
                <div style={{ fontSize: 28, marginBottom: 8 }} aria-hidden>🔍</div>
                <div>Aucun résultat pour «&nbsp;{query}&nbsp;»</div>
              </div>
            ) : (
              Object.entries(grouped).map(([category, cmds]) => (
                <div key={category} className="ds-cmdk-group">
                  <div className="ds-cmdk-group-label">{category}</div>
                  {cmds.map(cmd => {
                    const idx    = itemIndex++
                    const isSel  = idx === selected
                    return (
                      <button
                        key={cmd.id}
                        className="ds-cmdk-item"
                        data-selected={isSel ? 'true' : undefined}
                        role="option"
                        aria-selected={isSel}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelected(idx)}
                      >
                        <span className="ds-cmdk-item-icon" aria-hidden>{cmd.icon}</span>
                        <span className="ds-cmdk-item-text">
                          <span className="ds-cmdk-item-label">
                            <Highlight text={cmd.label} query={query} />
                          </span>
                          {cmd.sub && (
                            <span className="ds-cmdk-item-sub">{cmd.sub}</span>
                          )}
                        </span>
                        <span className="ds-cmdk-item-arrow" aria-hidden>›</span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="ds-cmdk-footer" aria-hidden>
            <span className="ds-cmdk-footer-hint">
              <span className="ds-cmdk-kbd">↑↓</span>
              Naviguer
            </span>
            <span className="ds-cmdk-footer-hint">
              <span className="ds-cmdk-kbd">↵</span>
              Ouvrir
            </span>
            <span className="ds-cmdk-footer-hint">
              <span className="ds-cmdk-kbd">Échap</span>
              Fermer
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>
              ScorgIA
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Highlight matching text ───────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const q   = query.trim()
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{
        background:   'rgba(108,92,231,0.15)',
        color:        'var(--color-accent-violet)',
        borderRadius: '3px',
        padding:      '0 1px',
      }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}
