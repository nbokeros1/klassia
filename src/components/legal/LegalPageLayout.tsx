import Link from 'next/link'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import { COMPANY } from '@/lib/legal/constants'
import type { LegalSection } from '@/content/legal/privacy-fr'

interface LegalPageLayoutProps {
  title:    string
  subtitle: string
  version:  string
  date:     string
  sections: LegalSection[]
  children?: React.ReactNode
}

export default function LegalPageLayout({
  title,
  subtitle,
  version,
  date,
  sections,
  children,
}: LegalPageLayoutProps) {
  return (
    <div style={{
      minHeight:   '100vh',
      background:  '#050D1A',
      color:       '#E2E8F0',
      fontFamily:  "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* ── NAV ── */}
      <nav style={{
        position:   'sticky',
        top:        0,
        zIndex:     50,
        background: 'rgba(5,13,26,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding:    '0 clamp(20px, 5vw, 48px)',
        height:     '64px',
        display:    'flex',
        alignItems: 'center',
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
            <Link
              key={l.href}
              href={l.href}
              style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontWeight: 400 }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,48px) 80px' }}>

        {/* ── HEADER ── */}
        <header style={{ marginBottom: '48px', paddingBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', padding: '4px 14px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px' }}>
            {COMPANY.name}
          </div>
          <h1 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: 800, color: 'white', lineHeight: 1.15, marginBottom: '12px', letterSpacing: '-0.5px' }}>
            {title}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            {subtitle}
          </p>
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            <span>Version {version}</span>
            <span>·</span>
            <span>Dernière mise à jour : {date}</span>
            <span>·</span>
            <span>Exploitant : {COMPANY.name}</span>
          </div>
        </header>

        {/* ── TABLE OF CONTENTS ── */}
        {sections.length > 4 && (
          <nav aria-label="Table des matières" style={{
            background:   'rgba(255,255,255,0.03)',
            border:       '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding:      '20px 24px',
            marginBottom: '48px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Table des matières
            </p>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sections.map(s => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', lineHeight: 1.5 }}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* ── CUSTOM CONTENT (if any) ── */}
        {children}

        {/* ── SECTIONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`}>
              <h2
                id={`heading-${section.id}`}
                style={{
                  fontSize:     '17px',
                  fontWeight:   700,
                  color:        'white',
                  marginBottom: '14px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  scrollMarginTop: '80px',
                }}
              >
                {section.title}
              </h2>

              {section.paragraphs.map((p, i) => (
                <p key={i} style={{
                  fontSize:     '15px',
                  color:        'rgba(255,255,255,0.62)',
                  lineHeight:   1.8,
                  marginBottom: '10px',
                  maxWidth:     '68ch',
                }}>
                  {p}
                </p>
              ))}

              {section.subsections && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {section.subsections.map((sub, i) => (
                    <div key={i} style={{ paddingLeft: '16px', borderLeft: '2px solid rgba(167,139,250,0.2)' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                        {sub.title}
                      </h3>
                      {sub.paragraphs.map((p, j) => (
                        <p key={j} style={{
                          fontSize:     '14px',
                          color:        'rgba(255,255,255,0.5)',
                          lineHeight:   1.75,
                          marginBottom: '8px',
                          maxWidth:     '65ch',
                        }}>
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* ── DISCLAIMER ── */}
        <div style={{
          marginTop:    '64px',
          paddingTop:   '24px',
          borderTop:    '1px solid rgba(255,255,255,0.06)',
          fontSize:     '12px',
          color:        'rgba(255,255,255,0.2)',
          lineHeight:   1.7,
          fontStyle:    'italic',
        }}>
          Ce document est un projet de politique légale pour ScorgIA et devrait faire l&apos;objet d&apos;un examen juridique professionnel canadien avant toute ouverture commerciale ou publique générale. Il ne constitue pas un avis juridique.
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        background:    '#02060F',
        borderTop:     '1px solid rgba(255,255,255,0.05)',
        padding:       '24px clamp(20px,5vw,48px)',
        display:       'flex',
        flexWrap:      'wrap',
        alignItems:    'center',
        justifyContent: 'space-between',
        gap:           '16px',
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
