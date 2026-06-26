'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreferencesPage {
  // Dashboard
  show_outils_ia?:   boolean
  show_stats?:       boolean
  show_calendrier?:  boolean
  show_taches?:      boolean
  show_liens?:       boolean
  // Sidebar
  sidebar_compact?:  boolean
  sidebar_collapsed?: boolean
  // Studio IA
  apercu_width?:     number
  // Général
  theme_couleur?:    string
  densite?:          'compact' | 'normal' | 'spacieux'
  // Clé libre pour extensions futures
  [key: string]: any
}

// ─── Normaliser le nom de page ────────────────────────────────────────────────

function normalisePage(pathname: string): string {
  // /dashboard/classes/abc → /dashboard/classes
  // /dashboard/classes/abc/lecons/xyz → /dashboard/classes/[id]/lecons
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/[id]')
    .replace(/\/[a-z0-9]{20,}/gi, '/[id]')
    .split('/').slice(0, 4).join('/') || '/dashboard'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePersonnalisation() {
  const pathname = usePathname()
  const supabase = createClient()
  const page     = normalisePage(pathname)

  const [preferences, setPreferences] = useState<PreferencesPage>({})
  const [profilId,    setProfilId]    = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [dirty,       setDirty]       = useState(false)

  // ── Charger le profil ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      supabase
        .from('utilisateurs').select('id').eq('user_id', session.user.id).single()
        .then(({ data }) => {
          if (data?.id) setProfilId(data.id)
          else setLoading(false)
        })
    })
  }, [])

  // ── Charger les préférences ───────────────────────────────────────────────
  useEffect(() => {
    if (!profilId) return
    setLoading(true)
    supabase
      .from('preferences_page')
      .select('preferences')
      .eq('enseignant_id', profilId)
      .eq('page', page)
      .single()
      .then(({ data }) => {
        setPreferences((data?.preferences as PreferencesPage) || {})
        setLoading(false)
      })
  }, [profilId, page])

  // ── Sauvegarder en DB (debounced via dirty flag) ──────────────────────────
  useEffect(() => {
    if (!dirty || !profilId) return
    const timer = setTimeout(async () => {
      await supabase.from('preferences_page').upsert({
        enseignant_id: profilId,
        page,
        preferences,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'enseignant_id,page' })
      setDirty(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [dirty, preferences, profilId, page])

  // ── Mettre à jour une préférence ──────────────────────────────────────────
  const update = useCallback(<K extends keyof PreferencesPage>(
    key:   K,
    value: PreferencesPage[K],
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  // ── Mettre à jour plusieurs préférences ──────────────────────────────────
  const updateMany = useCallback((updates: Partial<PreferencesPage>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
    setDirty(true)
  }, [])

  // ── Réinitialiser les préférences de la page ─────────────────────────────
  const reset = useCallback(async () => {
    setPreferences({})
    setDirty(false)
    if (!profilId) return
    await supabase.from('preferences_page')
      .delete().eq('enseignant_id', profilId).eq('page', page)
  }, [profilId, page])

  // ── Getter avec valeur par défaut ─────────────────────────────────────────
  const get = useCallback(<K extends keyof PreferencesPage>(
    key:          K,
    defaultValue: PreferencesPage[K],
  ): PreferencesPage[K] => {
    return preferences[key] !== undefined ? preferences[key] : defaultValue
  }, [preferences])

  return {
    preferences,
    loading,
    page,
    update,
    updateMany,
    reset,
    get,
  }
}
