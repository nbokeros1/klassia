'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.toLowerCase().includes('confirm') || error.message.toLowerCase().includes('verified')) {
        setError('Email non confirmé — vérifie ta boîte mail et clique sur le lien de confirmation Supabase')
      } else if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
        setError('Email ou mot de passe incorrect')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* Aurora orbs */}
      <div style={{ position: 'absolute', top: '-180px', right: '-120px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'aurora 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,63,110,0.35) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'aurora 15s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      {/* Grid pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)', borderRadius: '13px', fontSize: '22px', fontWeight: 800, color: 'white', boxShadow: '0 0 32px rgba(124,58,237,0.5)', marginBottom: '14px' }}>K</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>
            Klass<span style={{ color: '#A78BFA' }}>IA</span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
            Ton quartier général pédagogique
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(13,21,37,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '22px',
          padding: '36px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
            Bienvenue 👋
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>
            Connecte-toi à ton espace pédagogique
          </p>

          {error && (
            <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#F85149', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.3px' }}>ADRESSE EMAIL</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="marie@ecole.ca" required
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', fontSize: '14px',
                  color: 'white', outline: 'none', fontFamily: 'inherit',
                  transition: 'all 0.15s', boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.border = '1px solid rgba(124,58,237,0.6)'; e.target.style.background = 'rgba(124,58,237,0.08)' }}
                onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.3px' }}>MOT DE PASSE</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{
                    width: '100%', padding: '12px 46px 12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', fontSize: '14px',
                    color: 'white', outline: 'none', fontFamily: 'inherit',
                    transition: 'all 0.15s', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.border = '1px solid rgba(124,58,237,0.6)'; e.target.style.background = 'rgba(124,58,237,0.08)' }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(45,95,160,0.5)' : 'linear-gradient(135deg, #2D5FA0, #7C3AED)',
              color: 'white', border: 'none', borderRadius: '11px',
              fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(124,58,237,0.4)',
              transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 10px 32px rgba(124,58,237,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.4)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Connexion...
                </span>
              ) : 'Se connecter →'}
            </button>
          </form>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

          <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Pas encore de compte ?{' '}
            <Link href="/signup" style={{ color: '#A78BFA', fontWeight: 600, textDecoration: 'none' }}>
              Créer un compte gratuit
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>
          🔒 Données protégées · Conformité LPRPDE · Canada
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
      `}</style>
    </div>
  )
}
