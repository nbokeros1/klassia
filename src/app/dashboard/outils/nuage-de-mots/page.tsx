'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

const COLORS = ['#A78BFA', '#60A5FA', '#34D399', '#FBC34A', '#F472B6', '#FB923C', '#F87171', '#6C5CE7', '#10B981']

interface Mot { word: string; size: number; color: string; x: number; y: number; rotate: number }

export default function NuageDeMotsPage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [texte,  setTexte]  = useState('')
  const [nuage,  setNuage]  = useState<Mot[]>([])
  const [minOcc, setMinOcc] = useState(1)

  const generer = useCallback(() => {
    const counts: Record<string, number> = {}
    texte.split(/[,\n;|\t]+/).map(w => w.trim().toLowerCase()).filter(Boolean).forEach(w => { counts[w] = (counts[w] || 0) + 1 })
    const filtered = Object.entries(counts).filter(([, c]) => c >= minOcc).sort((a, b) => b[1] - a[1])
    const maxCount = filtered[0]?.[1] || 1
    const mots: Mot[] = filtered.map(([word, count], i) => ({
      word,
      size:   Math.round(12 + (count / maxCount) * 32),
      color:  COLORS[i % COLORS.length],
      x:      10 + Math.random() * 80,
      y:      10 + Math.random() * 80,
      rotate: Math.random() > 0.6 ? (Math.random() > 0.5 ? 90 : -90) : 0,
    }))
    setNuage(mots)
  }, [texte, minOcc])

  if (loading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <button onClick={() => router.push('/dashboard/outils')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 24, fontFamily: 'inherit' }}>
            ← Outils enseignant
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>☁️</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Nuage de mots</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Visualisez les mots-clés de vos élèves sous forme de nuage.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            {/* Entrée */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Mots ou phrases
                </label>
                <textarea
                  value={texte}
                  onChange={e => setTexte(e.target.value)}
                  placeholder={'Entrez les mots, séparés par :\n• virgules : chat, chien, oiseau\n• sauts de ligne\n• points-virgules ; pipes |'}
                  rows={10}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, resize: 'vertical',
                    border: '1.5px solid rgba(108,92,231,0.15)', background: 'rgba(255,255,255,0.9)',
                    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Occurrences min :</label>
                <select value={minOcc} onChange={e => setMinOcc(Number(e.target.value))}
                  style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(108,92,231,0.15)', background: 'rgba(255,255,255,0.9)', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}>
                  {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button
                disabled={!texte.trim()}
                onClick={generer}
                style={{
                  padding: '12px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: texte.trim() ? 'pointer' : 'not-allowed',
                  background: texte.trim() ? 'linear-gradient(135deg, #8B5CF6, #6C5CE7)' : 'rgba(108,92,231,0.15)',
                  color: texte.trim() ? '#fff' : 'var(--text-muted)', fontFamily: 'inherit',
                  boxShadow: texte.trim() ? '0 4px 16px rgba(108,92,231,0.3)' : 'none',
                }}
              >
                ✦ Générer le nuage
              </button>

              {nuage.length > 0 && (
                <button onClick={() => { setNuage([]); setTexte('') }} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(108,92,231,0.12)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Recommencer
                </button>
              )}
            </div>

            {/* Nuage */}
            <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(108,92,231,0.1)', borderRadius: 18, minHeight: 340, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {nuage.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>☁️</div>
                  <div style={{ fontSize: 13 }}>Le nuage de mots apparaîtra ici</div>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 340 }}>
                  {nuage.map((mot, i) => (
                    <span key={i} style={{
                      position: 'absolute',
                      left: `${mot.x}%`, top: `${mot.y}%`,
                      transform: `translate(-50%, -50%) rotate(${mot.rotate}deg)`,
                      fontSize: mot.size,
                      color: mot.color,
                      fontWeight: 700,
                      userSelect: 'none',
                      lineHeight: 1.2,
                      cursor: 'default',
                    }}>
                      {mot.word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
