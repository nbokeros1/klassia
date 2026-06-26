'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Z } from '@/lib/constants/z-index'
import type { ImpersonationState } from '@/lib/hooks/useAuth'

export default function BanniereImpersonation() {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null)
  const [enseignant,    setEnseignant]    = useState<{ prenom: string; nom: string; email: string } | null>(null)
  const [leaving,       setLeaving]       = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('klassia_impersonation')
    if (!stored) return
    try {
      setImpersonation(JSON.parse(stored) as ImpersonationState)
    } catch {
      localStorage.removeItem('klassia_impersonation')
    }
  }, [])

  useEffect(() => {
    if (!impersonation) return
    const supabase = createClient()
    supabase
      .from('utilisateurs')
      .select('prenom, nom, email')
      .eq('id', impersonation.enseignantId)
      .single()
      .then(({ data }) => { if (data) setEnseignant(data) })
  }, [impersonation])

  const arreter = async () => {
    if (!impersonation || leaving) return
    setLeaving(true)
    try {
      await fetch(
        `/api/admin/impersonation?session_id=${impersonation.sessionId}`,
        { method: 'DELETE' },
      )
    } finally {
      localStorage.removeItem('klassia_impersonation')
      window.location.href = '/dashboard/admin/utilisateurs'
    }
  }

  if (!impersonation) return null

  return (
    <div style={{
      position:   'fixed',
      top: 0, left: 0, right: 0,
      zIndex:     Z.banniere_impersonation,
      background: '#92400E',
      color:      '#FEF3C7',
      padding:    '7px 20px',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.01em',
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span>
          Mode admin — Vous consultez le compte de{' '}
          <strong>
            {enseignant
              ? `${enseignant.prenom} ${enseignant.nom} (${enseignant.email})`
              : '…'}
          </strong>
        </span>
      </span>
      <button
        onClick={arreter}
        disabled={leaving}
        style={{
          padding:    '4px 14px',
          borderRadius: 6,
          border:     '1.5px solid rgba(254,243,199,0.55)',
          background: 'rgba(254,243,199,0.15)',
          color:      '#FEF3C7',
          fontSize:   12,
          fontWeight: 700,
          cursor:     leaving ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!leaving) (e.currentTarget as HTMLElement).style.background = 'rgba(254,243,199,0.28)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(254,243,199,0.15)' }}
      >
        {leaving ? '…' : '← Revenir à mon compte admin'}
      </button>
    </div>
  )
}
