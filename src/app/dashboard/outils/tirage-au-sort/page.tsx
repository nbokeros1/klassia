'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'

export default function TirageAuSortPage() {
  const { profil, loading } = useAuth()
  const router   = useRouter()
  const supabase = createClient()

  const [mode,      setMode]      = useState<'liste' | 'groupe'>('liste')
  const [noms,      setNoms]      = useState('')
  const [nbGroupes, setNbGroupes] = useState(3)
  const [resultat,  setResultat]  = useState<string | null>(null)
  const [groupes,   setGroupes]   = useState<string[][]>([])
  const [spinning,  setSpinning]  = useState(false)
  const [classes,   setClasses]   = useState<any[]>([])
  const [classeId,  setClasseId]  = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!profil) return
    ;(async () => {
      const { data } = await supabase.from('classes').select('id,nom').eq('enseignant_id', profil.id).order('created_at', { ascending: false })
      setClasses(data || [])
    })()
  }, [profil])

  const getListeNoms = () => noms.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean)

  const tirerAuSort = () => {
    const liste = getListeNoms()
    if (liste.length === 0) return

    setSpinning(true)
    setResultat(null)
    setGroupes([])

    let count = 0
    const maxSpin = 20
    intervalRef.current = setInterval(() => {
      const rand = liste[Math.floor(Math.random() * liste.length)]
      setResultat(rand)
      count++
      if (count >= maxSpin) {
        clearInterval(intervalRef.current!)
        setSpinning(false)
      }
    }, 80)
  }

  const formerGroupes = () => {
    const liste = [...getListeNoms()].sort(() => Math.random() - 0.5)
    if (liste.length === 0) return
    const nb   = Math.min(nbGroupes, liste.length)
    const gps: string[][] = Array.from({ length: nb }, () => [])
    liste.forEach((n, i) => gps[i % nb].push(n))
    setGroupes(gps)
    setResultat(null)
  }

  if (loading) return <LoadingScreen />

  const isFr      = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const liste      = getListeNoms()

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
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎲</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Tirage au sort</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sélectionnez aléatoirement un élève ou formez des groupes.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            {/* Gauche : saisie */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Mode tabs */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(236,72,153,0.12)', borderRadius: 12, padding: 4, gap: 4 }}>
                {[{ id: 'liste', label: '🎲 Tirage individuel' }, { id: 'groupe', label: '👥 Former des groupes' }].map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id as 'liste' | 'groupe'); setResultat(null); setGroupes([]) }}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: mode === m.id ? 700 : 500, fontFamily: 'inherit', background: mode === m.id ? '#EC4899' : 'transparent', color: mode === m.id ? '#fff' : 'var(--text-secondary)' }}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Noms des élèves
                </label>
                <textarea
                  value={noms}
                  onChange={e => setNoms(e.target.value)}
                  placeholder={'Un nom par ligne :\nEmma L.\nLiam T.\nSofia M.\n...'}
                  rows={10}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, resize: 'vertical',
                    border: '1.5px solid rgba(236,72,153,0.15)', background: 'rgba(255,255,255,0.9)',
                    fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                  }}
                />
                {liste.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{liste.length} élève{liste.length > 1 ? 's' : ''} dans la liste</div>
                )}
              </div>

              {mode === 'groupe' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nombre de groupes :</label>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[2, 3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => setNbGroupes(n)}
                        style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${nbGroupes === n ? '#EC4899' : 'rgba(236,72,153,0.15)'}`, background: nbGroupes === n ? '#FCE7F3' : 'transparent', color: nbGroupes === n ? '#EC4899' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={liste.length === 0}
                onClick={mode === 'liste' ? tirerAuSort : formerGroupes}
                style={{
                  padding: '13px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: liste.length > 0 ? 'pointer' : 'not-allowed',
                  background: liste.length > 0 ? 'linear-gradient(135deg, #EC4899, #DB2777)' : 'rgba(236,72,153,0.15)',
                  color: liste.length > 0 ? '#fff' : 'var(--text-muted)', fontFamily: 'inherit',
                  boxShadow: liste.length > 0 ? '0 4px 16px rgba(236,72,153,0.3)' : 'none',
                }}
              >
                {mode === 'liste' ? '🎲 Tirer au sort' : '👥 Former les groupes'}
              </button>
            </div>

            {/* Droite : résultat */}
            <div>
              {mode === 'liste' && (
                <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(236,72,153,0.12)', borderRadius: 18, padding: '32px 24px', textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  {resultat ? (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                        {spinning ? 'Tirage en cours…' : '🎉 Sélectionné !'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: '#EC4899', transition: spinning ? 'none' : 'all 0.4s' }}>
                        {resultat}
                      </div>
                      {!spinning && (
                        <button onClick={tirerAuSort} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.25)', background: 'rgba(236,72,153,0.06)', color: '#EC4899', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          🎲 Retirer
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 44, marginBottom: 10 }}>🎲</div>
                      <div style={{ fontSize: 13 }}>Le résultat du tirage apparaîtra ici</div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'groupe' && groupes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {groupes.map((g, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(236,72,153,0.12)', borderRadius: 14, padding: '14px 18px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#EC4899', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Groupe {i + 1}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {g.map((nom, j) => (
                          <span key={j} style={{ padding: '4px 10px', background: '#FCE7F3', color: '#DB2777', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                            {nom}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={formerGroupes} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.2)', background: 'rgba(236,72,153,0.05)', color: '#EC4899', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🔀 Reformer les groupes
                  </button>
                </div>
              )}

              {mode === 'groupe' && groupes.length === 0 && (
                <div style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(236,72,153,0.12)', borderRadius: 18, padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>👥</div>
                  <div style={{ fontSize: 13 }}>Les groupes formés apparaîtront ici</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
