'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

export default function RepondreEleve() {
  const [sondage, setSondage] = useState<any>(null)
  const [reponse, setReponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('sondages').select('*').eq('code', code).single()
      setSondage(data)
      setLoading(false)
    }
    load()
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reponse.trim() || !sondage) return
    setSending(true)
    setError('')
    const { error } = await supabase.from('reponses_sondage').insert({
      sondage_id: sondage.id,
      reponse: reponse.trim(),
    })
    if (error) {
      setError('Erreur lors de l\'envoi. Réessaie.')
      setSending(false)
      return
    }
    setSubmitted(true)
    setSending(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!sondage) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Sondage introuvable</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Le code <b>{code}</b> ne correspond à aucun sondage actif.</div>
      </div>
    </div>
  )

  if (sondage.statut === 'ferme') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Ce sondage est fermé</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>L'enseignant a fermé les réponses.</div>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A, #1E1B4B)', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20, animation: 'bounce 0.6s ease' }}>✓</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 10 }}>Réponse envoyée !</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Merci pour ta participation.</div>
        <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'inline-block' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Ta réponse</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{reponse}</div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #6B3FA0, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', margin: '0 auto 16px' }}>K</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6, fontWeight: 600 }}>KLASSIA · SONDAGE</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Code : <b style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>{code}</b></div>
        </div>

        {/* Question card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', lineHeight: 1.4, marginBottom: 24, textAlign: 'center' }}>
            {sondage.question}
          </div>

          <form onSubmit={handleSubmit}>
            {sondage.type === 'texte' ? (
              <textarea
                value={reponse}
                onChange={e => setReponse(e.target.value)}
                placeholder="Écris ta réponse ici..."
                required
                autoFocus
                rows={3}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: 12, fontSize: 16, color: 'white',
                  resize: 'none' as const, fontFamily: 'inherit', lineHeight: 1.5,
                  boxSizing: 'border-box' as const, marginBottom: 16,
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(96,165,250,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {(sondage.choix || []).map((choix: string, i: number) => (
                  <label key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    background: reponse === choix ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${reponse === choix ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <input type="radio" name="choix" value={choix} checked={reponse === choix}
                      onChange={() => setReponse(choix)} style={{ accentColor: '#60A5FA', width: 18, height: 18 }} />
                    <span style={{ fontSize: 15, color: 'white', fontWeight: reponse === choix ? 600 : 400 }}>{choix}</span>
                  </label>
                ))}
              </div>
            )}

            {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

            <button type="submit" disabled={sending || !reponse.trim()}
              style={{
                width: '100%', padding: '15px', fontSize: 16, fontWeight: 700,
                background: reponse.trim() ? 'linear-gradient(135deg, #3B82F6, #6B3FA0)' : 'rgba(255,255,255,0.08)',
                color: reponse.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                border: 'none', borderRadius: 12, cursor: reponse.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}>
              {sending ? 'Envoi...' : 'Envoyer ma réponse →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Propulsé par KlassIA+
        </div>
      </div>
    </div>
  )
}
