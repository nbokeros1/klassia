'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TeachingProvider, useTeaching } from '@/contexts/enseigner/TeachingContext'
import { TeachingWorkspace } from '@/components/enseigner/workspace/TeachingWorkspace'
import { leconToActivities, calcDureeLecon } from '@/utils/enseigner/lecon.utils'
import type { TeachingSessionMeta } from '@/types/enseigner'

// ─── Inner component — has access to TeachingProvider ─────────────────────────

function WorkspaceLoader({ leconId }: { leconId: string }) {
  const router  = useRouter()
  const { initSession, state } = useTeaching()
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)

  useEffect(() => {
    if (state.meta) return  // already initialized

    const load = async () => {
      const supabase = createClient()

      // Auth guard
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      // Fetch leçon
      const { data: lecon, error: leconErr } = await supabase
        .from('lecons')
        .select('*, classes(nom, matiere)')
        .eq('id', leconId)
        .single()

      if (leconErr || !lecon) {
        setError('Leçon introuvable.')
        setLoading(false)
        return
      }

      const contenu = (lecon.contenu_json as Record<string, unknown>) ?? {}
      const duree   = calcDureeLecon(contenu)
      const date    = lecon.date_seance
        ? new Date(lecon.date_seance as string).toLocaleDateString('fr-CA', {
            weekday: 'long', day: 'numeric', month: 'long',
          })
        : new Date().toLocaleDateString('fr-CA', {
            weekday: 'long', day: 'numeric', month: 'long',
          })

      const classeNom  = (lecon.classes as { nom: string; matiere: string } | null)?.nom ?? 'Classe'
      const matiere    = (lecon.classes as { nom: string; matiere: string } | null)?.matiere
        ?? (contenu.matiere as string | undefined)
        ?? '—'

      const meta: TeachingSessionMeta = {
        lecon_id:     lecon.id as string,
        lecon_titre:  (lecon.titre as string) || 'Séance',
        classe_nom:   classeNom,
        matiere:      matiere,
        date:         date,
        duree_prevue: duree || 60,
        objectifs:    typeof contenu.objectifs === 'string' ? (contenu.objectifs as string) : '',
      }

      const activities = leconToActivities(lecon as Record<string, unknown>)
      initSession(meta, activities)
      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leconId])

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)',
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(108,92,231,0.2)',
          borderTop: '3px solid #6C5CE7',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{
          margin: 0, fontSize: 14, color: '#8B97AC',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          Chargement de la séance…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16,
        background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)',
      }}>
        <span style={{ fontSize: 36 }}>⚠️</span>
        <p style={{
          margin: 0, fontSize: 16, color: '#DC2626',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          {error}
        </p>
        <a href="/dashboard/gerer/enseigner" style={{ color: '#6C5CE7', fontSize: 14 }}>
          ← Retour à Enseigner
        </a>
      </div>
    )
  }

  return <TeachingWorkspace />
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function EnseignerWorkspacePage() {
  const { leconId } = useParams<{ leconId: string }>()

  return (
    <TeachingProvider>
      <WorkspaceLoader leconId={leconId} />
    </TeachingProvider>
  )
}
