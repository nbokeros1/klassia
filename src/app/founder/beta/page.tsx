'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BetaInvitation {
  id:           string
  email:        string
  code:         string
  statut:       string
  expire_at:    string
  sent_at:      string | null
  activated_at: string | null
  notes:        string | null
  created_at:   string
}

interface WaitItem {
  id:         string
  email:      string
  prenom:     string | null
  message:    string | null
  created_at: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  en_attente: { bg: 'rgba(99,102,241,0.1)',    text: '#A5B4FC', border: 'rgba(99,102,241,0.25)'  },
  envoyee:    { bg: 'rgba(167,139,250,0.1)',   text: '#A78BFA', border: 'rgba(167,139,250,0.25)' },
  acceptee:   { bg: 'rgba(16,185,129,0.1)',    text: '#10B981', border: 'rgba(16,185,129,0.25)'  },
  expiree:    { bg: 'rgba(239,68,68,0.08)',    text: '#EF4444', border: 'rgba(239,68,68,0.2)'    },
  annulee:    { bg: 'rgba(255,255,255,0.04)',  text: 'rgba(255,255,255,0.3)', border: 'rgba(255,255,255,0.08)' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderBeta() {
  const supabase = createClient()

  const [invitations, setInvitations] = useState<BetaInvitation[]>([])
  const [waitlist,    setWaitlist]    = useState<WaitItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<'invitations' | 'waitlist'>('invitations')

  const [formEmail,  setFormEmail]  = useState('')
  const [formNotes,  setFormNotes]  = useState('')
  const [formExpire, setFormExpire] = useState(30)
  const [creating,   setCreating]   = useState(false)
  const [showForm,   setShowForm]   = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: inv }, { data: wait }] = await Promise.all([
      supabase.from('beta_invitations').select('*').order('created_at', { ascending: false }),
      supabase.from('liste_attente').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setInvitations((inv || []) as BetaInvitation[])
    setWaitlist((wait || []) as WaitItem[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!formEmail.trim() || creating) return
    setCreating(true)
    try {
      await fetch('/api/founder/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     formEmail.trim(),
          notes:     formNotes.trim() || null,
          expire_in: formExpire,
        }),
      })
      setFormEmail(''); setFormNotes(''); setFormExpire(30); setShowForm(false)
      await load()
    } finally {
      setCreating(false)
    }
  }

  const handleStatut = async (id: string, statut: string) => {
    await fetch('/api/founder/beta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut }),
    })
    setInvitations(prev => prev.map(i => i.id === id ? { ...i, statut } : i))
  }

  const inviteFromWaitlist = (email: string, prenom: string | null) => {
    setFormEmail(email)
    setFormNotes(prenom ? `De la liste d'attente — ${prenom}` : 'De la liste d\'attente')
    setActiveTab('invitations')
    setShowForm(true)
  }

  const stats = {
    total:   invitations.length,
    envoyee: invitations.filter(i => i.statut === 'envoyee').length,
    active:  invitations.filter(i => i.statut === 'acceptee').length,
    attente: waitlist.length,
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
            Founder Operating Center
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Programme bêta</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Invitations · Liste d&apos;attente · Accès fermé
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: showForm ? 'rgba(99,102,241,0.15)' : '#6366F1',
            border: '1px solid rgba(99,102,241,0.4)',
            color: showForm ? '#A5B4FC' : '#fff',
            cursor: 'pointer',
          }}>
          {showForm ? 'Annuler' : '+ Créer une invitation'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Invitations',      value: stats.total,   sub: 'créées au total',    color: '#818CF8' },
          { label: 'Envoyées',         value: stats.envoyee, sub: 'en attente d\'usage', color: '#A78BFA' },
          { label: 'Activées',         value: stats.active,  sub: 'enseignants bêta',    color: '#10B981' },
          { label: 'Liste d\'attente', value: stats.attente, sub: 'à traiter',            color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 4, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Formulaire nouvelle invitation */}
      {showForm && (
        <div style={{ background: '#111827', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>Nouvelle invitation bêta</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email *</div>
              <input
                value={formEmail} onChange={e => setFormEmail(e.target.value)}
                placeholder="enseignant@ecole.ca" type="email"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: '#1C2537', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Notes (optionnel)</div>
              <input
                value={formNotes} onChange={e => setFormNotes(e.target.value)}
                placeholder="Ex : recommandé par X"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: '#1C2537', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Expire dans</div>
              <select
                value={formExpire} onChange={e => setFormExpire(Number(e.target.value))}
                style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, background: '#1C2537', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
                <option value={90}>90 jours</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={handleCreate} disabled={!formEmail.trim() || creating}
              style={{
                padding: '9px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: formEmail.trim() ? '#6366F1' : 'rgba(99,102,241,0.3)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#fff', cursor: formEmail.trim() ? 'pointer' : 'not-allowed',
                opacity: formEmail.trim() ? 1 : 0.5,
              }}>
              {creating ? 'Création…' : '+ Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'invitations', label: `Invitations (${stats.total})` },
          { id: 'waitlist',    label: `Liste d'attente (${stats.attente})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as 'invitations' | 'waitlist')}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background:  activeTab === t.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              border:      activeTab === t.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.07)',
              color:       activeTab === t.id ? '#A5B4FC' : 'rgba(255,255,255,0.4)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table Invitations */}
      {activeTab === 'invitations' && (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Chargement…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Email','Code','Statut','Expire le','Notes','Créée le','Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map(inv => {
                    const sc      = STATUT_COLORS[inv.statut] ?? STATUT_COLORS.en_attente
                    const expired = new Date(inv.expire_at) < new Date()
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', color: '#E2E8F0', fontWeight: 500 }}>{inv.email}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <code style={{ fontSize: 11, background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 5, color: '#A5B4FC', letterSpacing: '0.08em' }}>
                            {inv.code}
                          </code>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select
                            value={inv.statut} onChange={e => handleStatut(inv.id, e.target.value)}
                            style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {['en_attente','envoyee','acceptee','expiree','annulee'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px', color: expired ? '#EF4444' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(inv.expire_at).toLocaleDateString('fr-CA')}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)', maxWidth: 180 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{inv.notes || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(inv.created_at).toLocaleDateString('fr-CA')}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button
                            onClick={() => navigator.clipboard.writeText(inv.code)}
                            title="Copier le code"
                            style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#A5B4FC', cursor: 'pointer' }}>
                            Copier
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {invitations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                  Aucune invitation créée. Cliquez sur « + Créer une invitation » pour commencer.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table Liste d'attente */}
      {activeTab === 'waitlist' && (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Prénom','Email','Message','Date','Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waitlist.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', color: '#E2E8F0', fontWeight: 500 }}>{w.prenom || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.55)' }}>{w.email}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)', maxWidth: 220 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{w.message || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(w.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => inviteFromWaitlist(w.email, w.prenom)}
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC', cursor: 'pointer' }}>
                        Inviter →
                      </button>
                    </td>
                  </tr>
                ))}
                {waitlist.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                      La liste d&apos;attente est vide.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
