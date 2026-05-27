'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

export default function PlanificationPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [programmes, setProgrammes] = useState<any[]>([])
  const [classeActive, setClasseActive] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
            const { data: profil } = await supabase.from('utilisateurs').select('*').eq('user_id', user.id).single()
      setProfil(profil)
      const { data: cls } = await supabase.from('classes').select('*').eq('enseignant_id', profil?.id).order('created_at', { ascending: false })
      setClasses(cls || [])
      if (cls && cls.length > 0) {
        setClasseActive(cls[0].id)
        const { data: progs } = await supabase.from('programme_annuel').select('*').eq('classe_id', cls[0].id).order('created_at', { ascending: false })
        setProgrammes(progs || [])
      }
      setLoading(false)
    }
    init()
  }, [])

  const chargerProgramme = async (classeId: string) => {
    setClasseActive(classeId)
    const { data } = await supabase.from('programme_annuel').select('*').eq('classe_id', classeId).order('created_at', { ascending: false })
    setProgrammes(data || [])
  }

  if (loading) return <LoadingScreen />

  const programme = programmes[0]
  const unites = programme?.contenu_json?.unites || []
  const classeActive_ = classes.find(c => c.id === classeActive)

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/planification" />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Planification annuelle</div>
            <div className="topbar-sub">Vue programme · Unités · Leçons</div>
          </div>
          <button className="btn-violet btn-sm" onClick={() => router.push('/dashboard/studio')}>
            ✦ Générer avec l'IA
          </button>
        </div>

        <div className="page-content fade-in">

          {classes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>📋</div>
              <h3 style={{ marginBottom: '8px' }}>Aucune classe encore</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Crée d'abord une classe pour voir sa planification</p>
              <button className="btn-primary" onClick={() => router.push('/dashboard/classes')}>Créer une classe</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>

              {/* Sélecteur classes */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Mes classes
                </div>
                {classes.map(c => (
                  <div key={c.id}
                    onClick={() => chargerProgramme(c.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', marginBottom: '6px',
                      background: classeActive === c.id ? 'var(--blue-pale)' : 'var(--card)',
                      border: `1px solid ${classeActive === c.id ? 'rgba(27,63,110,0.2)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: c.couleur || 'var(--blue)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>{c.nom?.[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: classeActive === c.id ? 'var(--blue)' : 'var(--text-1)' }}>{c.nom}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-4)' }}>{c.niveau}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Programme */}
              <div>
                {!programme ? (
                  <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                    <h3 style={{ marginBottom: '8px' }}>Aucun programme généré</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
                      Upload le curriculum de cette classe pour générer automatiquement le programme annuel
                    </p>
                    <button className="btn-primary" onClick={() => router.push(`/dashboard/classes/${classeActive}`)}>
                      Aller au dossier de classe
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Header programme */}
                    <div className="card" style={{ marginBottom: '16px', background: 'var(--blue-pale)', border: '1px solid var(--border-mid)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#60A5FA', marginBottom: '4px' }}>
                            {programme.titre}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                            {programme.nb_semaines} semaines · {unites.length} unités · {unites.reduce((a: number, u: any) => a + (u.lecons?.length || 0), 0)} leçons planifiées
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span className="badge badge-green">✓ Généré par IA</span>
                          <button className="btn-ghost btn-sm" onClick={() => router.push(`/dashboard/classes/${classeActive}`)}>
                            Voir le dossier
                          </button>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Progression de l'année</span>
                          <span style={{ fontSize: '11px', color: '#60A5FA', fontWeight: 600 }}>0 / {programme.nb_semaines} semaines</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '0%', background: '#60A5FA', borderRadius: '99px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Timeline des unités */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {unites.map((unite: any, i: number) => (
                        <div key={i} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                          {/* Header unité */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 18px',
                            background: `linear-gradient(135deg, ${classeActive_?.couleur || 'var(--blue)'}15, transparent)`,
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: classeActive_?.couleur || 'var(--blue)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 700, color: 'white',
                              }}>{unite.numero}</div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>{unite.titre}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                                  Semaines {unite.semaine_debut} – {unite.semaine_fin} · {(unite.lecons || []).length} leçons
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span className="badge badge-amber">À venir</span>
                            </div>
                          </div>

                          {/* Objectifs */}
                          {(unite.objectifs || []).length > 0 && (
                            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {unite.objectifs.map((obj: string, j: number) => (
                                <span key={j} style={{
                                  fontSize: '11px', padding: '3px 9px',
                                  background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)',
                                  borderRadius: '99px', border: '1px solid var(--border)',
                                }}>{obj}</span>
                              ))}
                            </div>
                          )}

                          {/* Leçons */}
                          <div style={{ padding: '8px 18px 12px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                              Leçons planifiées
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                              {(unite.lecons || []).map((lecon: any, k: number) => (
                                <div key={k} style={{
                                  padding: '8px 10px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '11px',
                                }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
                                    {lecon.numero}. {lecon.titre}
                                  </div>
                                  <div style={{ color: 'var(--text-4)' }}>{lecon.duree_minutes} min</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}