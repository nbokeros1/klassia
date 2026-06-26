'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Toast {
  id:      string
  message: string
  type:    'success' | 'info' | 'warning'
}

export default function RealtimeNotifier() {
  const supabase   = createClient()
  const [toasts, setToasts]     = useState<Toast[]>([])
  const [profilId, setProfilId] = useState<string | null>(null)
  const channelRef = useRef<any>(null)

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 8)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  // Charger profil une fois
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('utilisateurs').select('id').eq('user_id', session.user.id).single()
        .then(({ data }) => { if (data?.id) setProfilId(data.id) })
    })
  }, [])

  // Abonnements Realtime
  useEffect(() => {
    if (!profilId) return

    const channel = supabase
      .channel('dashboard-realtime')

      // ── Classes ──────────────────────────────────────────────────────────
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'classes',
        filter: `enseignant_id=eq.${profilId}`,
      }, (payload: any) => {
        const cls = payload.new
        addToast(`✓ Classe "${cls.nom || 'nouvelle'}" créée`, 'success')
        // Émettre un événement pour que les pages rafraîchissent leurs données
        window.dispatchEvent(new CustomEvent('klassia:class-created', { detail: cls }))
      })

      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'classes',
        filter: `enseignant_id=eq.${profilId}`,
      }, (payload: any) => {
        window.dispatchEvent(new CustomEvent('klassia:class-updated', { detail: payload.new }))
      })

      // ── Leçons ────────────────────────────────────────────────────────────
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'lecons',
        filter: `enseignant_id=eq.${profilId}`,
      }, (payload: any) => {
        const lecon = payload.new
        if (lecon.statut === 'prete') {
          addToast(`✓ Leçon "${lecon.titre || ''}" prête à enseigner`, 'success')
        }
        window.dispatchEvent(new CustomEvent('klassia:lecon-created', { detail: lecon }))
      })

      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'lecons',
        filter: `enseignant_id=eq.${profilId}`,
      }, (payload: any) => {
        const lecon = payload.new
        if (lecon.statut === 'prete' && payload.old?.statut !== 'prete') {
          addToast(`▶ Leçon "${lecon.titre || ''}" prête à enseigner`, 'success')
          window.dispatchEvent(new CustomEvent('klassia:lecon-ready', { detail: lecon }))
        }
        window.dispatchEvent(new CustomEvent('klassia:lecon-updated', { detail: lecon }))
      })

      // ── Calendrier ────────────────────────────────────────────────────────
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'evenements_calendrier',
        filter: `enseignant_id=eq.${profilId}`,
      }, (payload: any) => {
        const ev = payload.new
        const today = new Date().toISOString().slice(0, 10)
        if (ev.date_debut?.startsWith(today)) {
          addToast(`📅 Événement ajouté à aujourd'hui : ${ev.titre || ''}`, 'info')
        }
        window.dispatchEvent(new CustomEvent('klassia:event-created', { detail: ev }))
      })

      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Realtime actif — pas de toast, pour éviter le spam au chargement
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profilId])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          color:      '#FFF',
          background: t.type === 'success' ? 'rgba(52,211,153,.95)'
                    : t.type === 'warning' ? 'rgba(251,146,60,.95)'
                    : 'rgba(96,165,250,.95)',
          boxShadow: '0 4px 20px rgba(0,0,0,.25)',
          animation: 'slideInRight .25s ease both',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  )
}
