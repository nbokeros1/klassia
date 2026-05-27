'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

function UploadCurriculum({ classeId, onSuccess }: {
  classeId: string
  onSuccess: (programme: any) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProgress(10)
    setStatus('Lecture du fichier...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const contenu = ev.target?.result as string
      setProgress(30)
      setStatus('Analyse par KlassIA en cours...')
      await supabase.from('classes').update({ curriculum_charge: true }).eq('id', classeId)
      setProgress(60)
      try {
        const res = await fetch('/api/ia/curriculum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classe_id: classeId,
            contenu_curriculum: contenu?.substring(0, 8000) || '',
            nom_fichier: file.name,
          }),
        })
        const data = await res.json()
        setProgress(100)
        if (data.success) {
          setStatus('Programme annuel généré avec succès !')
          onSuccess(data.programme)
        } else {
          setStatus('Curriculum chargé — connecte la clé IA pour générer le programme')
          onSuccess(null)
        }
      } catch {
        setStatus('Curriculum chargé !')
        onSuccess(null)
      }
      setUploading(false)
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <label className="upload-zone" style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
        <input type="file" accept=".pdf,.doc,.docx,.txt"
          onChange={handleUpload} disabled={uploading}
          style={{ display: 'none' }} />
        {!uploading ? (
          <>
            <div style={{ fontSize: '52px', marginBottom: '14px' }}>📄</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-1)' }}>Upload ton curriculum officiel</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px' }}>
              PDF, Word ou texte — KlassIA analyse et génère automatiquement ton syllabus, programme annuel et plans de leçon
            </p>
            <span className="btn-primary">📁 Choisir un fichier</span>
          </>
        ) : (
          <>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>✦</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--violet)' }}>Analyse en cours...</h3>
            <div style={{ width: '200px', height: '4px', background: 'var(--border)', borderRadius: '99px', margin: '12px auto' }}>
              <div style={{ height: '100%', background: 'var(--violet)', borderRadius: '99px', transition: 'width 0.5s', width: `${progress}%` }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>{status}</p>
          </>
        )}
      </label>
      {status && !uploading && (
        <div className={`alert ${status.includes('succès') ? 'alert-success' : 'alert-info'}`} style={{ marginTop: '16px' }}>
          <span>{status.includes('succès') ? '✓' : 'ℹ'}</span>{status}
        </div>
      )}
      <div style={{ background: 'var(--violet-light)', border: '1px solid rgba(107,63,160,0.15)', borderRadius: 'var(--radius-lg)', padding: '18px', marginTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--violet)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
          ✦ Ce que KlassIA va générer
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {['📚 Syllabus structuré par unités', '📅 Programme annuel sur 36 semaines', '📄 Plans de leçon AVANT/PENDANT/APRÈS', '🎯 Objectifs alignés sur le curriculum', '🧩 Stratégies de différenciation', '📊 Grilles d\'évaluation'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-2)' }}>
              <span style={{ color: 'var(--violet)' }}>✓</span>{item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LeconsList({ classeId, router }: { classeId: string, router: any }) {
  const [lecons, setLecons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const charger = async () => {
      const { data, error } = await supabase
        .from('lecons')
        .select('*')
        .eq('classe_id', classeId)
        .order('numero', { ascending: true })
      if (!error) setLecons(data || [])
      setLoading(false)
    }
    charger()
  }, [classeId])

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>
      Chargement des leçons...
    </div>
  )

  if (lecons.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '14px' }}>📄</div>
      <h3 style={{ marginBottom: '8px' }}>Aucune leçon encore</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>
        Génère d'abord un curriculum ou utilise le Studio IA
      </p>
      <button className="btn-violet" onClick={() => router.push('/dashboard/studio')}>
        ✦ Générer ma première leçon
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lecons.map((lecon) => (
        <div key={lecon.id}
          onClick={() => router.push(`/dashboard/classes/${classeId}/lecons/${lecon.id}`)}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: '14px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            e.currentTarget.style.borderColor = 'var(--border-mid)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(124,58,237,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: '#A78BFA', flexShrink: 0,
          }}>
            {lecon.numero}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
              {lecon.titre}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {lecon.sujet || 'Leçon'} · {lecon.duree_minutes} min
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`badge ${lecon.statut === 'complete' ? 'badge-green' : lecon.statut === 'en_cours' ? 'badge-blue' : 'badge-amber'}`}>
              {lecon.statut === 'complete' ? '✓ Complète' : lecon.statut === 'en_cours' ? 'En cours' : 'À faire'}
            </span>
            <span style={{ color: 'var(--text-4)', fontSize: '16px' }}>›</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ClasseDetailPage() {
  const [classe, setClasse] = useState<any>(null)
  const [profil, setProfil] = useState<any>(null)
  const [programme, setProgramme] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('programme')
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const classeId = params.id as string

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
      const { data: profil } = await supabase.from('utilisateurs').select('*').eq('user_id', user.id).single()
      setProfil(profil)
      const { data: classe } = await supabase.from('classes').select('*').eq('id', classeId).single()
      setClasse(classe)
      const { data: prog } = await supabase.from('programme_annuel').select('*').eq('classe_id', classeId).order('created_at', { ascending: false }).limit(1).single()
      if (prog) setProgramme(prog)
      setLoading(false)
    }
    init()
  }, [classeId])

  if (loading) return <LoadingScreen />

  if (!classe) return (
    <div className="loading-screen">
      <p style={{ color: 'var(--text-3)' }}>Classe introuvable.</p>
      <button className="btn-primary" onClick={() => router.push('/dashboard/classes')}>Retour</button>
    </div>
  )

  const onglets = [
    { id: 'programme', label: 'Programme annuel', icon: '📚' },
    { id: 'lecons', label: 'Plans de leçon', icon: '📄' },
    { id: 'eleves', label: 'Élèves', icon: '👥' },
    { id: 'ressources', label: 'Ressources', icon: '📁' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ]

  return (
    <div className="app-layout">

      <Sidebar profil={profil} activeHref="/dashboard/classes" />

      <div className="main-content">

        {/* Header classe */}
        <div className="class-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={() => router.push('/dashboard/classes')}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
              ← Retour
            </button>
            <div style={{
              width: '44px', height: '44px', borderRadius: '11px',
              background: classe.couleur || 'var(--blue-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, color: 'white',
              border: '2px solid rgba(255,255,255,0.25)',
            }}>
              {classe.nom?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{classe.nom}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '1px' }}>
                {classe.niveau} · {classe.matiere} · {classe.nombre_eleves} élèves
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: '99px',
              background: classe.curriculum_charge ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.1)',
              color: classe.curriculum_charge ? '#6EFFA8' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${classe.curriculum_charge ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.15)'}`,
            }}>
              {classe.curriculum_charge ? '✓ Curriculum chargé' : 'Curriculum non chargé'}
            </span>
            <button className="btn-violet btn-sm" onClick={() => router.push('/dashboard/studio')}>✦ Studio IA</button>
          </div>
        </div>

        {/* Onglets */}
        <div className="tabs">
          {onglets.map(o => (
            <div key={o.id} className={`tab ${onglet === o.id ? 'active' : ''}`} onClick={() => setOnglet(o.id)}>
              {o.icon} {o.label}
            </div>
          ))}
          <div className="tab active-ia" style={{ marginLeft: 'auto' }} onClick={() => router.push('/dashboard/studio')}>
            ✦ Studio IA
          </div>
        </div>

        {/* Contenu */}
        <div className="page-content fade-in">

          {onglet === 'programme' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ marginBottom: '4px' }}>Programme annuel</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                    Upload ton curriculum pour générer automatiquement tout le programme
                  </p>
                </div>
                {classe.curriculum_charge && (
                  <button className="btn-ghost btn-sm">↺ Régénérer</button>
                )}
              </div>
              {!classe.curriculum_charge ? (
                <UploadCurriculum
                  classeId={classeId}
                  onSuccess={(prog) => {
                    setClasse({ ...classe, curriculum_charge: true })
                    if (prog) setProgramme(prog)
                  }}
                />
              ) : programme ? (
                <div>
                  <div className="card" style={{ marginBottom: '16px', background: 'var(--blue-pale)', border: '1px solid var(--border-mid)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#60A5FA', marginBottom: '4px' }}>
                          {programme.titre || 'Programme annuel'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                          {programme.nb_semaines || 36} semaines · {(programme.contenu_json?.unites || []).length} unités · Généré par KlassIA ✦
                        </div>
                      </div>
                      <span className="badge badge-green">✓ Généré</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(programme.contenu_json?.unites || []).map((unite: any, i: number) => (
                      <div key={i} className="card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg,#2D5FA0,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white' }}>
                              {unite.numero}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>{unite.titre}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                                Semaines {unite.semaine_debut} – {unite.semaine_fin} · {(unite.lecons || []).length} leçons
                              </div>
                            </div>
                          </div>
                          <span className="badge badge-blue">À venir</span>
                        </div>
                        {(unite.objectifs || []).length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {unite.objectifs.map((obj: string, j: number) => (
                              <span key={j} style={{ fontSize: '11px', padding: '3px 9px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', borderRadius: '99px', border: '1px solid var(--border)' }}>
                                {obj}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                  <h3 style={{ marginBottom: '6px' }}>Curriculum chargé</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>
                    Connecte ta clé Anthropic pour générer le programme annuel complet
                  </p>
                  <button className="btn-violet" onClick={() => router.push('/dashboard/studio')}>✦ Aller au Studio IA</button>
                </div>
              )}
            </div>
          )}

          {onglet === 'lecons' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ marginBottom: '4px' }}>Plans de leçon</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Génère et gère tes fiches de leçon</p>
                </div>
                <button className="btn-violet" onClick={() => router.push('/dashboard/studio')}>✦ Générer une leçon</button>
              </div>
              <LeconsList classeId={classeId} router={router} />
            </div>
          )}

          {onglet === 'eleves' && (
            <div>
              <h2 style={{ marginBottom: '4px' }}>Élèves à besoins particuliers</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>Décris les profils sans nommer les élèves</p>
              <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>👥</div>
                <h3 style={{ marginBottom: '8px' }}>Module en développement</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>La gestion des profils d'élèves arrive bientôt</p>
              </div>
            </div>
          )}

          {onglet === 'ressources' && (
            <div>
              <h2 style={{ marginBottom: '4px' }}>Ressources</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>Tes fichiers et liens pour cette classe</p>
              <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>📁</div>
                <h3 style={{ marginBottom: '8px' }}>Aucune ressource encore</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Tes ressources apparaîtront ici</p>
              </div>
            </div>
          )}

          {onglet === 'notes' && (
            <div>
              <h2 style={{ marginBottom: '4px' }}>Notes & rappels</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>Tes notes personnelles pour cette classe</p>
              <div className="card">
                <textarea
                  placeholder="Écris tes notes, observations, idées pour cette classe..."
                  style={{ height: '280px', resize: 'none', fontSize: '13px', lineHeight: '1.7', border: 'none', padding: '0', boxShadow: 'none' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}