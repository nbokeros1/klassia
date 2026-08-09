'use client'

import { useEffect, useState } from 'react'

interface CompanyInfo {
  id: string
  nom: string
  numero_entreprise: string | null
  adresse: string | null
  ville: string | null
  province: string | null
  code_postal: string | null
  pays: string | null
  site_web: string | null
  email_contact: string | null
  domaines: string[] | null
  github_org: string | null
  aws_region: string | null
  supabase_project: string | null
  stripe_mode: string | null
  anthropic_org: string | null
  openai_org: string | null
}

const CLOUD_ACCOUNTS = [
  { key: 'aws',       label: 'Amazon Web Services',  icon: '☁️', field: 'aws_region',       display: (v: string) => `Région : ${v}`, color: '#FB923C' },
  { key: 'supabase',  label: 'Supabase',             icon: '🟢', field: 'supabase_project',  display: (v: string) => `Projet : ${v.slice(0,8)}…`, color: '#34D399' },
  { key: 'github',    label: 'GitHub',               icon: '🐙', field: 'github_org',        display: (v: string) => `Org : ${v}`, color: '#E2E8F0' },
  { key: 'stripe',    label: 'Stripe',               icon: '💳', field: 'stripe_mode',       display: (v: string) => `Mode : ${v}`, color: '#A78BFA' },
  { key: 'anthropic', label: 'Anthropic (Claude)',   icon: '🤖', field: 'anthropic_org',     display: (v: string) => v ? `Org configurée` : 'Non configuré', color: '#60A5FA' },
  { key: 'openai',    label: 'OpenAI',               icon: '🧠', field: 'openai_org',        display: (v: string) => v ? `Org configurée` : 'Non configuré', color: '#34D399' },
]

const TEAM = [
  { nom: 'Eddy Nwaha', role: 'Founder & CEO', email: 'enwaha22@gmail.com', badge: 'founder', avatar: 'EN' },
]

export default function FounderCompany() {
  const [info,    setInfo]    = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState<Partial<CompanyInfo>>({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetch('/api/founder/company').then(r => r.json()).then(d => {
      setInfo(d); setForm(d ?? {})
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/founder/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const updated = await res.json()
    setInfo(updated); setEditing(false); setSaving(false)
  }

  const getField = (field: string): string => ((info as unknown as Record<string, unknown>)?.[field] as string) ?? ''

  return (
    <div style={{ padding: '28px 32px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Founder Operating Center</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Company</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Bodingo AI Tech Inc. — Informations entreprise</div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', cursor: 'pointer' }}>
            ✏️ Modifier
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Chargement…</div>
      ) : (
        <>
          {/* ── Info entreprise ── */}
          <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>INFORMATIONS ENTREPRISE</div>

            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Nom légal', key: 'nom' },
                  { label: 'Numéro d\'entreprise', key: 'numero_entreprise' },
                  { label: 'Adresse', key: 'adresse' },
                  { label: 'Ville', key: 'ville' },
                  { label: 'Province', key: 'province' },
                  { label: 'Code postal', key: 'code_postal' },
                  { label: 'Site web', key: 'site_web' },
                  { label: 'Email contact', key: 'email_contact' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{f.label}</div>
                    <input value={(form as Record<string, unknown>)[f.key] as string ?? ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 12, background: '#060D1A', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#04091A', border: 'none', cursor: 'pointer' }}>
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                  <button onClick={() => { setEditing(false); setForm(info ?? {}) }}
                    style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Raison sociale', value: info?.nom },
                  { label: 'N° entreprise', value: info?.numero_entreprise || '—' },
                  { label: 'Adresse', value: info?.adresse || '—' },
                  { label: 'Ville', value: info?.ville || '—' },
                  { label: 'Province / État', value: info?.province || '—' },
                  { label: 'Code postal', value: info?.code_postal || '—' },
                  { label: 'Pays', value: info?.pays || '—' },
                  { label: 'Email contact', value: info?.email_contact || '—' },
                ].map(r => (
                  <div key={r.label} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Domaines ── */}
          <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>DOMAINES</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(info?.domaines ?? ['klassia.app', 'scorgia.ai']).map(d => (
                <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 12, fontWeight: 600, color: '#60A5FA' }}>
                  🌐 {d}
                </span>
              ))}
            </div>
          </div>

          {/* ── Comptes cloud ── */}
          <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>COMPTES CLOUD</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Aucune clé API n&apos;est affichée. Consultez votre gestionnaire de secrets (AWS Secrets Manager, env vars).</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {CLOUD_ACCOUNTS.map(a => {
                const val = getField(a.field)
                const configured = !!val
                return (
                  <div key={a.key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${configured ? a.color + '22' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{a.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: configured ? a.color : 'rgba(255,255,255,0.35)' }}>{a.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{configured ? a.display(val) : 'Non configuré'}</div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: configured ? '#34D399' : 'rgba(255,255,255,0.2)' }} />
                      <span style={{ fontSize: 10, color: configured ? '#34D399' : 'rgba(255,255,255,0.3)' }}>{configured ? 'Configuré' : 'À configurer'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Équipe ── */}
          <div style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>ÉQUIPE</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {TEAM.map(m => (
                <div key={m.email} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#04091A', flexShrink: 0 }}>
                    {m.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FEF3C7' }}>{m.nom}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{m.role}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{m.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {m.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
