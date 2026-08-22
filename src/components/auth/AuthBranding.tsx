'use client'

interface AuthBrandingProps {
  slogan?: string
  logoHeight?: number
  theme?: 'dark' | 'light'
  style?: React.CSSProperties
}

/**
 * Composant de branding officiel Scorgia pour les pages Auth et Onboarding.
 * theme="dark"  → fond sombre (login, signup)
 * theme="light" → fond clair (onboarding)
 */
export default function AuthBranding({
  slogan,
  logoHeight = 44,
  theme = 'dark',
  style,
}: AuthBrandingProps) {
  const logoSrc =
    theme === 'dark'
      ? '/brand/scorgia-logo-dark.png'
      : '/brand/scorgia-logo-light.png'

  return (
    <div style={{ textAlign: 'center', ...style }}>
      <img
        src={logoSrc}
        alt="Scorgia"
        style={{ height: logoHeight, width: 'auto', display: 'block', margin: '0 auto' }}
      />
      {slogan && (
        <div
          style={{
            fontSize: '13px',
            marginTop: '10px',
            color:
              theme === 'dark'
                ? 'rgba(255,255,255,0.35)'
                : 'var(--color-text-muted, rgba(0,0,0,0.4))',
          }}
        >
          {slogan}
        </div>
      )}
    </div>
  )
}
