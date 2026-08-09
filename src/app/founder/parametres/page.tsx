'use client'

// ─── Constantes ───────────────────────────────────────────────────────────────

const COMPANY = {
  nom:    'Bodingo AI Tech Inc.',
  produit: 'ScorgIA',
  email:  'contact@bodingo.ai',
  domaine: 'klassia.app',
  region: 'Canada — Alberta',
  fondation: '2024',
  founders: ['Eddy Nwaha'],
}

const FEATURE_FLAGS = [
  { key: 'dark_mode',          label: 'Dark Mode',           statut: false,  note: 'Désactivé — FEATURE_DARK_MODE_ENABLED = false' },
  { key: 'pdf_export',         label: 'Export PDF',          statut: false,  note: 'Désactivé en bêta — soffice non disponible sur Vercel' },
  { key: 'stripe',             label: 'Paiements Stripe',    statut: false,  note: 'Non intégré — bêta gratuite' },
  { key: 'spie_beta',          label: 'SPIE Teaching Pack',  statut: true,   note: 'Actif — Alberta uniquement' },
  { key: 'beta_access',        label: 'Accès bêta fermé',    statut: true,   note: 'Invitation requise via beta_invitations' },
  { key: 'marketplace',        label: 'Marketplace',         statut: false,  note: 'Hors périmètre bêta' },
  { key: 'mobile_app',         label: 'Application mobile',  statut: false,  note: 'Hors périmètre' },
  { key: 'multi_province',     label: 'Multi-province',      statut: false,  note: 'Alberta uniquement en bêta' },
]

const LINKS = [
  { label: 'Supabase Dashboard',    url: 'https://supabase.com/dashboard/project/qacdbcycjzgjygeaujqk', icon: '⚡' },
  { label: 'Vercel Dashboard',      url: 'https://vercel.com/dashboard',                                  icon: '▲' },
  { label: 'Anthropic Console',     url: 'https://console.anthropic.com',                                 icon: '✦' },
  { label: 'Claude.ai',             url: 'https://claude.ai',                                              icon: '✦' },
  { label: 'GitHub',                url: 'https://github.com',                                             icon: '◆' },
  { label: 'Stripe Dashboard',      url: 'https://dashboard.stripe.com',                                   icon: '◈' },
]

const ENV_VARS = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL',       requis: true,  type: 'Public',    note: 'URL du projet Supabase' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',  requis: true,  type: 'Public',    note: 'Clé anon Supabase (RLS appliqué)' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY',      requis: true,  type: 'Serveur',   note: 'Clé service Supabase (bypass RLS)' },
  { name: 'ANTHROPIC_API_KEY',              requis: true,  type: 'Serveur',   note: 'Clé API Anthropic (Claude)' },
  { name: 'NEXT_PUBLIC_APP_URL',            requis: false, type: 'Public',    note: 'URL de déploiement (optionnel)' },
  { name: 'NEXT_PUBLIC_APP_NAME',           requis: false, type: 'Public',    note: 'Nom de l\'app (optionnel)' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderParametres() {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1080 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          Founder Operating Center
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Paramètres Founder</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Configuration de l&apos;entreprise, feature flags, variables d&apos;environnement
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Entreprise */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Entreprise</h2>
          {[
            { label: 'Société',   value: COMPANY.nom      },
            { label: 'Produit',   value: COMPANY.produit   },
            { label: 'Email',     value: COMPANY.email     },
            { label: 'Domaine',   value: COMPANY.domaine   },
            { label: 'Région',    value: COMPANY.region    },
            { label: 'Fondation', value: COMPANY.fondation },
            { label: 'Founders',  value: COMPANY.founders.join(', ') },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: '#F1F5F9', textAlign: 'right' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Liens utiles */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Liens utiles</h2>
          {LINKS.map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, marginBottom: 3,
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = '#A5B4FC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)' }}
            >
              <span style={{ fontSize: 12, opacity: 0.5 }}>{link.icon}</span>
              {link.label}
              <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.3 }}>↗</span>
            </a>
          ))}
        </div>

      </div>

      {/* Feature Flags */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Feature Flags</h2>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>Statut des fonctionnalités — modification manuelle dans le code</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FEATURE_FLAGS.map(flag => (
            <div key={flag.key} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 8, background: '#1C2537', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: flag.statut ? '#10B981' : 'rgba(255,255,255,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 500, marginBottom: 2 }}>{flag.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{flag.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variables d'environnement */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Variables d&apos;environnement</h2>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
          À configurer dans Vercel Dashboard → Settings → Environment Variables
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Variable', 'Type', 'Requis', 'Description'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ENV_VARS.map(v => (
              <tr key={v.name}>
                <td style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <code style={{ fontSize: 11, color: '#A5B4FC', background: 'rgba(99,102,241,0.08)', padding: '2px 5px', borderRadius: 4 }}>{v.name}</code>
                </td>
                <td style={{ padding: '9px 0', fontSize: 11, color: v.type === 'Serveur' ? '#F59E0B' : '#60A5FA', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {v.type}
                </td>
                <td style={{ padding: '9px 0', fontSize: 11, color: v.requis ? '#10B981' : 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {v.requis ? 'Oui' : 'Non'}
                </td>
                <td style={{ padding: '9px 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {v.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          ⚠ Ne jamais committer <code style={{ color: '#FCA5A5' }}>.env.local</code> — voir <code style={{ color: '#A5B4FC' }}>docs/Deployment/SCORGIA_BETA_ENVIRONMENT_VARIABLES.md</code>
        </div>
      </div>

    </div>
  )
}
