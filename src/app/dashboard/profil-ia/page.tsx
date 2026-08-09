'use client'
// ─── SC-02H — Mon Profil Pédagogique · Mémoire ───────────────────────────────
// Remplace la page profil-ia deprecated.
// Permet à l'enseignant de consulter, modifier, désactiver et supprimer
// les informations mémorisées par ScorgIA.

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import type { MemoryEntry, MemoryType } from '@/lib/ia/teacher-memory-engine'

// ─── Labels ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<MemoryType, { label: string; emoji: string; desc: string }> = {
  preference:  { label: 'Préférences',          emoji: '⭐', desc: 'Types de contenu et durées habituelles' },
  methode:     { label: 'Méthodes',              emoji: '🧠', desc: 'Approches pédagogiques utilisées' },
  progression: { label: 'Progression',           emoji: '📈', desc: 'Sujets couverts par classe' },
  ressource:   { label: 'Ressources',            emoji: '📚', desc: 'Supports et outils récurrents' },
  contrainte:  { label: 'Contraintes',           emoji: '⚠️', desc: 'Limites connues (matériel, temps)' },
  style:       { label: 'Style de présentation', emoji: '🎨', desc: 'Format et mise en page préférés' },
  observation: { label: 'Observations',          emoji: '🔍', desc: 'Patterns détectés dans vos générations' },
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i <= value
            ? i <= 2 ? '#F59E0B' : i <= 3 ? '#6C5CE7' : '#22C55E'
            : 'rgba(15,35,65,0.1)',
          transition: 'background 0.2s',
        }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{value}/5</span>
    </div>
  )
}

// ─── Format valeur ────────────────────────────────────────────────────────────

function FormatValeur({ valeur }: { valeur: Record<string, unknown> }) {
  const entries = Object.entries(valeur)
  if (entries.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{
          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: 'rgba(108,92,231,0.08)', color: 'var(--violet)',
          border: '1px solid rgba(108,92,231,0.15)',
        }}>
          {String(v)}
        </span>
      ))}
    </div>
  )
}

// ─── Memory row ───────────────────────────────────────────────────────────────

function MemoryRow({
  entry, onToggle, onDelete
}: {
  entry: MemoryEntry
  onToggle: (id: string, actif: boolean) => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(15,35,65,0.06)',
      opacity: entry.actif ? 1 : 0.45,
      transition: 'opacity 0.2s',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {entry.cle.replace(/_/g, ' ')}
          </span>
          {(entry.matiere || entry.niveau) && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 6px', background: 'rgba(15,35,65,0.05)', borderRadius: 99 }}>
              {[entry.matiere, entry.niveau].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        <FormatValeur valeur={entry.valeur} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <ConfidenceBar value={entry.confiance} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {entry.compte_observations} observation{entry.compte_observations > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 6px', background: 'rgba(15,35,65,0.04)', borderRadius: 99 }}>
            {entry.source}
          </span>
        </div>
      </div>

      {/* Toggle actif */}
      <button
        onClick={() => onToggle(entry.id!, !entry.actif)}
        title={entry.actif ? 'Désactiver' : 'Réactiver'}
        style={{
          width: 32, height: 18, borderRadius: 99, border: 'none',
          background: entry.actif ? 'var(--violet)' : 'rgba(15,35,65,0.12)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: entry.actif ? 14 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>

      {/* Delete */}
      {confirming ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onDelete(entry.id!)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            Oui
          </button>
          <button onClick={() => setConfirming(false)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'none', border: '1px solid rgba(15,35,65,0.1)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Non
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          title="Supprimer définitivement"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, lineHeight: 1, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >
          🗑️
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilIAMemoryPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profil,    setProfil]    = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [memories,  setMemories]  = useState<MemoryEntry[]>([])
  const [memLoading, setMemLoading] = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setProfil(p)
      setLoading(false)
      loadMemories()
    }
    init()
  }, [])

  const loadMemories = useCallback(async () => {
    setMemLoading(true)
    try {
      const res = await fetch('/api/ia/memory')
      if (res.ok) {
        const data = await res.json()
        setMemories(data.memories || [])
      }
    } finally {
      setMemLoading(false)
    }
  }, [])

  const handleToggle = useCallback(async (id: string, actif: boolean) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, actif } : m))
    try {
      await fetch(`/api/ia/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif }),
      })
    } catch {}
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id))
    try {
      await fetch(`/api/ia/memory/${id}?hard=true`, { method: 'DELETE' })
      setToast('Entrée supprimée.')
      setTimeout(() => setToast(null), 2500)
    } catch {}
  }, [])

  const handleReset = useCallback(async () => {
    if (!confirm('Réinitialiser toute la mémoire ? Cette action est irréversible.')) return
    setResetting(true)
    try {
      await Promise.all(memories.map(m =>
        fetch(`/api/ia/memory/${m.id}?hard=true`, { method: 'DELETE' })
      ))
      setMemories([])
      setToast('Mémoire réinitialisée.')
      setTimeout(() => setToast(null), 3000)
    } catch {
      setToast('Erreur lors de la réinitialisation.')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setResetting(false)
    }
  }, [memories])

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const grouped   = memories.reduce<Record<string, MemoryEntry[]>>((acc, m) => {
    acc[m.type_memoire] = acc[m.type_memoire] || []
    acc[m.type_memoire].push(m)
    return acc
  }, {})
  const typeOrder: MemoryType[] = ['preference', 'methode', 'observation', 'progression', 'style', 'ressource', 'contrainte']

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(155deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/profil-ia" />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, padding: '32px 40px', maxWidth: 860, margin: '0 auto', paddingLeft: 'calc(var(--sidebar-w) + 40px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--violet)', marginBottom: 8 }}>
            SC-02H · Teacher Memory
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Mon profil pédagogique
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 560 }}>
            ScorgIA apprend de chaque préparation pour mieux personnaliser les suivantes.
            Voici tout ce qu'il a mémorisé vous concernant. Vous contrôlez intégralement ces données.
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
            ✓ {toast}
          </div>
        )}

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total mémorisé', value: memories.length },
            { label: 'Actif',          value: memories.filter(m => m.actif).length },
            { label: 'Confiance ≥ 3',  value: memories.filter(m => m.confiance >= 3).length },
            { label: 'Types',          value: Object.keys(grouped).length },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(15,35,65,0.08)', boxShadow: '0 2px 8px rgba(15,35,65,0.05)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--violet)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={loadMemories}
            style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none', border: '1px solid rgba(15,35,65,0.1)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
            ↻ Actualiser
          </button>
          {memories.length > 0 && (
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer', background: 'none', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontFamily: 'inherit', opacity: resetting ? 0.5 : 1 }}>
              {resetting ? '…' : '🗑️ Réinitialiser tout'}
            </button>
          )}
        </div>

        {/* Loading */}
        {memLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
            Chargement de la mémoire…
          </div>
        )}

        {/* Empty state */}
        {!memLoading && memories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Mémoire vide pour l'instant
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
              ScorgIA commence à apprendre après vos premières préparations.
              Chaque génération enrichit progressivement votre profil pédagogique.
            </div>
            <button
              onClick={() => router.push('/dashboard/gerer/preparer')}
              style={{ marginTop: 24, padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--violet)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(108,92,231,0.25)' }}>
              → Aller préparer une leçon
            </button>
          </div>
        )}

        {/* Memory groups */}
        {!memLoading && memories.length > 0 && typeOrder.filter(t => grouped[t]?.length > 0).map(type => {
          const info  = TYPE_LABELS[type]
          const items = grouped[type] || []
          return (
            <div key={type} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{info.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{info.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '2px 8px', background: 'rgba(15,35,65,0.05)', borderRadius: 99 }}>
                  {items.length}
                </span>
              </div>
              <div style={{ borderRadius: 16, border: '1px solid rgba(15,35,65,0.08)', background: 'rgba(255,255,255,0.85)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,35,65,0.04)' }}>
                {items.map(entry => (
                  <MemoryRow key={entry.id} entry={entry} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )
        })}

        {/* Privacy note */}
        <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 14, background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.12)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>🔒 Confidentialité</strong>
          {' '}— Ces données sont strictement personnelles et accessibles uniquement par vous. Elles ne sont jamais partagées. Aucune donnée élève n'est stockée ici. Vous pouvez supprimer intégralement votre profil pédagogique à tout moment via le bouton "Réinitialiser".
        </div>

      </div>
    </div>
  )
}
