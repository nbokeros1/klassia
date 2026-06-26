'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Utilisateur } from '@/lib/types/database'

// ─── Type impersonation ────────────────────────────────────────────────────────

export type ImpersonationState = {
  adminId:      string
  enseignantId: string
  sessionId:    string
}

const IMPERSONATION_KEY = 'klassia_impersonation'

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [realProfil,          setRealProfil]          = useState<Utilisateur | null>(null)
  const [profil,              setProfil]              = useState<Utilisateur | null>(null)
  const [impersonationActive, setImpersonationActive] = useState<ImpersonationState | null>(null)
  const [loading,             setLoading]             = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: realData, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error || !realData) { router.push('/login'); return }

      setRealProfil(realData as Utilisateur)

      const isRealAdmin =
        realData.is_admin === true || realData.type_compte === 'admin'

      const stored =
        typeof window !== 'undefined'
          ? localStorage.getItem(IMPERSONATION_KEY)
          : null

      if (stored && isRealAdmin) {
        try {
          const parsed = JSON.parse(stored) as ImpersonationState
          const { data: ensData } = await supabase
            .from('utilisateurs')
            .select('*')
            .eq('id', parsed.enseignantId)
            .single()

          if (ensData) {
            setImpersonationActive(parsed)
            setProfil(ensData as Utilisateur)
          } else {
            // enseignant introuvable — abandon de l'impersonation
            localStorage.removeItem(IMPERSONATION_KEY)
            setProfil(realData as Utilisateur)
          }
        } catch {
          localStorage.removeItem(IMPERSONATION_KEY)
          setProfil(realData as Utilisateur)
        }
      } else {
        // Pas admin ou pas d'impersonation active
        if (stored) localStorage.removeItem(IMPERSONATION_KEY)
        setProfil(realData as Utilisateur)
      }

      setLoading(false)
    }

    init()
  }, [router])

  // isAdmin se base toujours sur le VRAI compte, jamais sur l'impersonné
  const isAdmin =
    realProfil?.is_admin === true || realProfil?.type_compte === 'admin'

  const logout = useCallback(async () => {
    const supabase = createClient()
    if (typeof window !== 'undefined') localStorage.removeItem(IMPERSONATION_KEY)
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  // Démarre une session d'impersonation — vérification côté serveur obligatoire
  const demarrerImpersonation = useCallback(async (
    enseignantId: string,
    raison?: string,
  ): Promise<void> => {
    if (!realProfil || !isAdmin) throw new Error('Non autorisé')

    const res = await fetch('/api/admin/impersonation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enseignant_id: enseignantId, raison }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erreur serveur')
    }

    const { session_id } = await res.json()

    const state: ImpersonationState = {
      adminId:      realProfil.id,
      enseignantId,
      sessionId:    session_id,
    }

    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state))
    // Rechargement complet pour que tous les useAuth re-initialisent proprement
    window.location.href = '/dashboard'
  }, [realProfil, isAdmin])

  // Termine la session d'impersonation en cours
  const arreterImpersonation = useCallback(async (): Promise<void> => {
    if (!impersonationActive) return

    try {
      await fetch(
        `/api/admin/impersonation?session_id=${impersonationActive.sessionId}`,
        { method: 'DELETE' },
      )
    } finally {
      localStorage.removeItem(IMPERSONATION_KEY)
      window.location.href = '/dashboard/admin/utilisateurs'
    }
  }, [impersonationActive])

  return {
    profil,
    loading,
    logout,
    isAdmin,
    impersonationActive,
    demarrerImpersonation,
    arreterImpersonation,
  }
}
