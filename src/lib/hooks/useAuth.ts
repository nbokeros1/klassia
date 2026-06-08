'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Utilisateur } from '@/lib/types/database'

export function useAuth() {
  const [profil, setProfil] = useState<Utilisateur | null>(null)
  const [loading, setLoading]  = useState(true)
  const router = useRouter()

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      supabase
        .from('utilisateurs')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            router.push('/login')
            return
          }
          setProfil(data as Utilisateur)
          setLoading(false)
        })
    })
  }, [router])

  return { profil, loading, logout }
}
