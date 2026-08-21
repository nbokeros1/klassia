import type { Metadata } from 'next'
import Link from 'next/link'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import { COMPANY, LEGAL_VERSIONS, LEGAL_DATES, LEGAL_PLACEHOLDERS } from '@/lib/legal/constants'

export const metadata: Metadata = {
  title: 'Centre de confiance — ScorgIA',
  description: 'Comment ScorgIA protège vos données, vos élèves et votre vie privée.',
  robots: { index: true, follow: true },
}

const pillars = [
  {
    icon: '🔒',
    title: 'Authentification sécurisée',
    body: 'Chaque requête est validée par un JWT serveur avant tout traitement. Les sessions cookie-only ne suffisent pas — nous exigeons une vérification côté serveur.',
  },
  {
    icon: '🙈',
    title: 'Les données élèves ne quittent pas votre classe',
    body: 'ScorgIA ne transmet jamais les noms d\'élèves, diagnostics médicaux nominatifs ou notes personnelles à nos systèmes d\'IA. Seules des descriptions fonctionnelles anonymisées sont utilisées.',
  },
  {
    icon: '🤖',
    title: 'IA transparente',
    body: 'Le contenu pédagogique est généré par Claude (Anthropic), un modèle à grande capacité de langage. Le traitement se fait côté serveur — vos requêtes ne passent jamais par le navigateur.',
  },
  {
    icon: '📝',
    title: 'Votre contenu vous appartient',
    body: 'Les documents pédagogiques que vous créez dans ScorgIA vous appartiennent. Bodingo ne revendique aucun droit de propriété sur vos créations et ne les utilise pas à des fins commerciales.',
  },
  {
    icon: '🚫',
    title: 'Pas de vente de données',
    body: 'Bodingo ne vend, ne loue et ne cède jamais vos renseignements personnels à des tiers à des fins commerciales ou publicitaires.',
  },
  {
    icon: '🧪',
    title: 'Phase bêta — honnêteté',
    body: 'ScorgIA est en bêta contrôlée. Certaines fonctionnalités sont encore en développement. Nous préférons être transparents sur les limites actuelles plutôt que de promettre plus que ce que nous livrons.',
  },
]

const subprocessors = [
  {
    name:    'Anthropic (Claude)',
    role:    'Génération de contenu pédagogique par IA',
    country: 'États-Unis',
    notes:   'Traitement côté serveur uniquement. Aucune donnée élève nominative transmise.',
  },
  {
    name:    'Supabase',
    role:    'Base de données et authentification',
    country: 'États-Unis / hébergement PostgreSQL',
    notes:   'Données chiffrées au repos et en transit.',
  },
  {
    name:    'Vercel',
    role:    'Hébergement et déploiement de l\'application',
    country: 'États-Unis',
    notes:   'Plateforme d\'hébergement Next.js.',
  },
]

export default function TrustPage() {
  return (
    <div style={{
      minHeight:  '100vh',
      background: '#050D1A',
      color:      '#E2E8F0',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* ── NAV ── */}
      <nav style={{
        position:       'sticky',
        top:             0,
        zIndex:          50,
        background:     'rgba(5,13,26,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        padding:        '0 clamp(20px, 5vw, 48px)',
        height:         '64px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ScorgiaLogo variant="dark" height={80} style={{ height: '56px' }} />
        </Link>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {[
            { label: 'Confidentialité', href: '/privacy' },
            { label: 'Conditions',      href: '/terms'   },
            { label: 'Confiance',       href: '/trust'   },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,48px) 80px' }}>

        {/* ── HEADER ── */}
        <header style={{ marginBottom: '56px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', padding: '4px 14px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px' }}>
            {COMPANY.name}
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Centre de confiance ScorgIA
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
            Ce que nous faisons pour protéger vos données, vos élèves et votre vie privée — en langage clair.
          </p>
        </header>

        {/* ── PILLARS ── */}
        <section aria-label="Nos engagements" style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px' }}>
            Nos engagements
          </h2>
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap:                 '16px',
          }}>
            {pillars.map((p, i) => (
              <div key={i} style={{
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding:      '20px 22px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{p.icon}</div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '8px', lineHeight: 1.4 }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI DISCLOSURE ── */}
        <section aria-labelledby="ia-heading" style={{ marginBottom: '64px' }}>
          <h2 id="ia-heading" style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px' }}>
            Intelligence artificielle
          </h2>
          <div style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: '14px', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>✦</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#A78BFA' }}>ScorgIA utilise l&apos;IA — voici comment</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Le modèle utilisé est Claude, développé par Anthropic (San Francisco, CA).',
                'Toutes les requêtes IA sont traitées côté serveur — votre navigateur ne communique jamais directement avec Anthropic.',
                'Les données transmises à Claude : le contenu pédagogique que vous saisissez (niveau, matière, intentions) et des descriptions fonctionnelles anonymisées des besoins d\'apprentissage.',
                'Ce qui n\'est jamais transmis à Claude : les noms d\'élèves, diagnostics médicaux nominatifs, notes personnelles d\'enseignant.',
                'Le contenu généré doit être vérifié par l\'enseignant avant utilisation — il est fourni à titre de suggestion, pas de vérité.',
                'ScorgIA n\'utilise pas vos données pour entraîner des modèles d\'IA.',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                  <span style={{ color: '#A78BFA', flexShrink: 0, marginTop: '1px' }}>→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── SUBPROCESSORS ── */}
        <section aria-labelledby="sp-heading" style={{ marginBottom: '64px' }}>
          <h2 id="sp-heading" style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px' }}>
            Sous-traitants techniques
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px', lineHeight: 1.6 }}>
            ScorgIA utilise les fournisseurs suivants pour opérer la plateforme. Aucun n&apos;est autorisé à utiliser vos données à ses propres fins.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Fournisseur', 'Rôle', 'Pays', 'Notes'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'rgba(255,255,255,0.25)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subprocessors.map((sp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 14px', color: 'white', fontWeight: 600 }}>{sp.name}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)' }}>{sp.role}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{sp.country}</td>
                    <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.35)' }}>{sp.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
            Liste mise à jour au {LEGAL_DATES.trust}. La liste complète des transferts transfrontaliers est détaillée dans notre Politique de confidentialité.
          </p>
        </section>

        {/* ── CONTACT ── */}
        <section aria-labelledby="contact-heading" style={{ marginBottom: '64px' }}>
          <h2 id="contact-heading" style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px' }}>
            Contact et responsabilité
          </h2>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px 28px' }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 0 12px' }}>
              Pour toute question sur la protection de vos données :
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: '0 0 16px' }}>
              {LEGAL_PLACEHOLDERS.privacyEmail}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: 0 }}>
              Responsable de la protection des renseignements personnels : {LEGAL_PLACEHOLDERS.privacyOfficer}
            </p>
          </div>
        </section>

        {/* ── DOCS LINKS ── */}
        <section aria-label="Documents légaux" style={{ marginBottom: '64px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px' }}>
            Documents légaux
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { label: 'Politique de confidentialité', href: '/privacy', desc: `v${LEGAL_VERSIONS.privacy} — ${LEGAL_DATES.privacy}` },
              { label: "Conditions d'utilisation",     href: '/terms',   desc: `v${LEGAL_VERSIONS.terms} — ${LEGAL_DATES.terms}` },
            ].map(d => (
              <Link key={d.href} href={d.href} style={{
                display:      'flex',
                flexDirection: 'column',
                gap:          '4px',
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px',
                padding:      '14px 18px',
                textDecoration: 'none',
                minWidth:     '200px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{d.label}</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{d.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── BETA NOTICE ── */}
        <div style={{
          background:   'rgba(245,158,11,0.06)',
          border:       '1px solid rgba(245,158,11,0.15)',
          borderRadius: '12px',
          padding:      '16px 20px',
          fontSize:     '13px',
          color:        'rgba(255,255,255,0.4)',
          lineHeight:   1.7,
        }}>
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>Bêta contrôlée — </span>
          ScorgIA est actuellement en phase bêta. Les engagements décrits ici s&apos;appliquent dès maintenant. Certains processus (ex. : portail libre-service de suppression de compte) sont en cours d&apos;implémentation et seront disponibles avant l&apos;ouverture générale.
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        background:     '#02060F',
        borderTop:      '1px solid rgba(255,255,255,0.05)',
        padding:        '24px clamp(20px,5vw,48px)',
        display:        'flex',
        flexWrap:       'wrap',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '16px',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ScorgiaLogo variant="dark" height={24} />
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          {[
            { label: 'Confidentialité', href: '/privacy' },
            { label: 'Conditions',      href: '/terms'   },
            { label: 'Confiance',       href: '/trust'   },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          © 2026 {COMPANY.name}. Tous droits réservés.
        </span>
      </footer>
    </div>
  )
}
