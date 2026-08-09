'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

export default function ProjectionTBIPage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [classes,     setClasses]     = useState<any[]>([])
  const [lecons,      setLecons]      = useState<any[]>([])
  const [classeId,    setClasseId]    = useState('')
  const [leconId,     setLeconId]     = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [lecLoading,  setLecLoading]  = useState(false)

  useEffect(() => {
    if (!profil) return
    ;(async () => {
      const { data } = await supabase.from('classes').select('id,nom,niveau,matiere').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
      const list = data || []
      setClasses(list)
      if (list[0]) setClasseId(list[0].id)
      setDataLoading(false)
    })()
  }, [profil])

  useEffect(() => {
    if (!classeId) { setLecons([]); setLeconId(''); return }
    setLecLoading(true)
    supabase.from('lecons').select('id,titre,statut').eq('classe_id', classeId).order('updated_at', { ascending: false }).limit(30)
      .then(({ data }) => {
        const list = data || []
        setLecons(list)
        if (list[0]) setLeconId(list[0].id)
        setLecLoading(false)
      })
  }, [classeId])

  if (loading || dataLoading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid rgba(59,130,246,0.15)', background: 'rgba(255,255,255,0.85)',
    fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const canLaunch = classeId && leconId && !lecLoading

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 640 }}>
          <button onClick={() => router.push('/dashboard/outils')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 24, fontFamily: 'inherit' }}>
            ← Outils enseignant
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📺</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Projection TBI</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mode présentation plein écran pour tableau interactif.</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(59,130,246,0.12)', borderRadius: 18, padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Classe</label>
              <select value={classeId} onChange={e => setClasseId(e.target.value)} style={inputStyle}>
                <option value="">Choisir une classe…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` — ${c.niveau}` : ''}</option>)}
              </select>
            </div>

            {classeId && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Leçon</label>
                <select value={leconId} onChange={e => setLeconId(e.target.value)} style={inputStyle} disabled={lecLoading}>
                  <option value="">{lecLoading ? 'Chargement…' : 'Choisir une leçon…'}</option>
                  {lecons.map(l => <option key={l.id} value={l.id}>{l.titre}</option>)}
                </select>
              </div>
            )}

            {classes.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                Aucune classe trouvée. <button onClick={() => router.push('/dashboard/classes')} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' }}>Créer une classe</button>
              </div>
            )}

            <button
              disabled={!canLaunch}
              onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${leconId}/presenter`)}
              style={{
                padding: '13px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: canLaunch ? 'pointer' : 'not-allowed',
                background: canLaunch ? 'linear-gradient(135deg, #1B3F6E, #3B82F6)' : 'rgba(59,130,246,0.15)',
                color: canLaunch ? '#fff' : 'var(--text-muted)',
                fontFamily: 'inherit', transition: 'all 0.15s',
                boxShadow: canLaunch ? '0 4px 20px rgba(59,130,246,0.3)' : 'none',
              }}
            >
              ▶ Lancer le mode TBI
            </button>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, fontSize: 12, color: '#3B82F6' }}>
            💡 Pour un meilleur résultat, connectez votre ordinateur au tableau blanc avant de lancer la présentation.
          </div>
        </div>
      </div>
    </div>
  )
}
