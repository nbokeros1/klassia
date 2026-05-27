'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', password: '',
    ecole: '', type_compte: 'enseignant', langue: 'fr'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.user) {
      await new Promise(r => setTimeout(r, 800))
      await supabase.from('utilisateurs').upsert({
        user_id: data.user.id, prenom: form.prenom, nom: form.nom,
        email: form.email, ecole: form.ecole, type_compte: form.type_compte,
        langue_interface: form.langue,
        langue_enseignement: form.langue,
      }, { onConflict: 'user_id' })
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', fontSize: '14px',
    color: 'white', outline: 'none', fontFamily: 'inherit',
    transition: 'all 0.15s', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.3px',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.border = '1px solid rgba(124,58,237,0.6)'
    e.target.style.background = 'rgba(124,58,237,0.08)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.border = '1px solid rgba(255,255,255,0.1)'
    e.target.style.background = 'rgba(255,255,255,0.05)'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* Aurora */}
      <div style={{ position: 'absolute', top: '-200px', right: '-100px', width: '650px', height: '650px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'aurora 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-180px', left: '-130px', width: '550px', height: '550px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,63,110,0.32) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'aurora 16s ease-in-out infinite reverse', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)', borderRadius: '13px', fontSize: '22px', fontWeight: 800, color: 'white', boxShadow: '0 0 32px rgba(124,58,237,0.5)', marginBottom: '14px' }}>K</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>
            Klass<span style={{ color: '#A78BFA' }}>IA</span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
            Crée ton espace pédagogique gratuit
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13,21,37,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '22px', padding: '36px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>

          {/* Header + progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '3px' }}>Créer un compte</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                Étape {step}/2 · Gratuit · Aucune carte requise
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  width: s === step ? '28px' : '8px', height: '8px',
                  borderRadius: '99px',
                  background: s <= step ? 'linear-gradient(135deg, #2D5FA0, #7C3AED)' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s',
                  boxShadow: s === step ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                }} />
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#F85149', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2) } : handleSignup}>

            {step === 1 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>PRÉNOM *</label>
                    <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Marie" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <div>
                    <label style={labelStyle}>NOM *</label>
                    <input name="nom" value={form.nom} onChange={handleChange} placeholder="Leblanc" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>ADRESSE EMAIL *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="marie@ecole.ca" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>
                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>MOT DE PASSE *</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Minimum 6 caractères" required minLength={6} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>

                {/* Avantages */}
                <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#A78BFA', marginBottom: '10px', letterSpacing: '0.5px' }}>✦ CE QUE TU OBTIENS GRATUITEMENT</div>
                  {['1 classe organisée automatiquement', '10 générations IA par mois', 'Plans de leçon AVANT/PENDANT/APRÈS', 'Export PDF de tes leçons'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: i < 3 ? '6px' : 0 }}>
                      <span style={{ color: '#4ADE80', fontWeight: 700, fontSize: '13px' }}>✓</span> {f}
                    </div>
                  ))}
                </div>

                <button type="submit" style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #2D5FA0, #7C3AED)',
                  color: 'white', border: 'none', borderRadius: '11px',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(124,58,237,0.4)', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(124,58,237,0.55)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.4)' }}>
                  Continuer →
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>ÉCOLE</label>
                  <input name="ecole" value={form.ecole} onChange={handleChange} placeholder="École Saint-Michel" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>TYPE DE COMPTE *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { v: 'enseignant', icon: '👨‍🏫', label: 'Enseignant actif', desc: 'Je prépare et donne des cours' },
                      { v: 'etudiant', icon: '🎓', label: 'Étudiant en éducation', desc: 'Je suis en formation' },
                      { v: 'institution', icon: '🏫', label: 'Institution / École', desc: 'Gestion multi-enseignants' },
                    ].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setForm({ ...form, type_compte: opt.v })} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px', borderRadius: '10px',
                        background: form.type_compte === opt.v ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
                        border: form.type_compte === opt.v ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: '20px' }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: form.type_compte === opt.v ? '#A78BFA' : 'rgba(255,255,255,0.7)' }}>{opt.label}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{opt.desc}</div>
                        </div>
                        {form.type_compte === opt.v && <span style={{ marginLeft: 'auto', color: '#A78BFA', fontSize: '16px' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>LANGUE DE L'INTERFACE</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[{ v: 'fr', l: '🇫🇷', label: 'Français' }, { v: 'en', l: '🇨🇦', label: 'English' }].map(lang => (
                      <button key={lang.v} type="button" onClick={() => setForm({ ...form, langue: lang.v })} style={{
                        flex: 1, padding: '11px', borderRadius: '10px',
                        border: form.langue === lang.v ? '1.5px solid rgba(124,58,237,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                        background: form.langue === lang.v ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
                        color: form.langue === lang.v ? '#A78BFA' : 'rgba(255,255,255,0.5)',
                        fontSize: '13px', fontWeight: form.langue === lang.v ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {lang.l} {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setStep(1)} style={{
                    flex: 1, padding: '14px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px',
                    color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                    ← Retour
                  </button>
                  <button type="submit" disabled={loading} style={{
                    flex: 2, padding: '14px',
                    background: loading ? 'rgba(45,95,160,0.5)' : 'linear-gradient(135deg, #2D5FA0, #7C3AED)',
                    color: 'white', border: 'none', borderRadius: '11px',
                    fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 6px 24px rgba(124,58,237,0.4)', transition: 'all 0.2s',
                  }}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        Création...
                      </span>
                    ) : 'Créer mon compte 🚀'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: '#A78BFA', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>
          🔒 Données protégées · Conformité LPRPDE · Aucune donnée nominative transmise à l'IA
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, select::placeholder { color: rgba(255,255,255,0.2) !important; }
        select option { background: #0D1525; color: white; }
      `}</style>
    </div>
  )
}
