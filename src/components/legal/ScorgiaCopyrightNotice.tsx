import Link from 'next/link'
import { COMPANY } from '@/lib/legal/constants'

interface ScorgiaCopyrightNoticeProps {
  className?: string
  style?:     React.CSSProperties
  showLinks?: boolean  // show privacy/terms links alongside copyright
  dark?:      boolean  // dark background context
}

export default function ScorgiaCopyrightNotice({
  className,
  style,
  showLinks = false,
  dark = true,
}: ScorgiaCopyrightNoticeProps) {
  const textColor = dark ? 'rgba(255,255,255,0.25)' : '#9BA8BA'
  const linkColor = dark ? 'rgba(255,255,255,0.4)'  : '#6B7A99'

  return (
    <div
      className={className}
      style={{
        display:    'flex',
        flexWrap:   'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap:        '12px',
        fontSize:   '11px',
        color:      textColor,
        lineHeight: 1.5,
        ...style,
      }}
    >
      <span>© 2026 {COMPANY.name}. Tous droits réservés.</span>

      {showLinks && (
        <>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <Link
            href="/privacy"
            style={{ color: linkColor, textDecoration: 'none' }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.65)' : '#1B3F6E')}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = linkColor)}
          >
            Confidentialité
          </Link>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <Link
            href="/terms"
            style={{ color: linkColor, textDecoration: 'none' }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.65)' : '#1B3F6E')}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = linkColor)}
          >
            Conditions
          </Link>
          <span aria-hidden="true" style={{ opacity: 0.3 }}>·</span>
          <Link
            href="/trust"
            style={{ color: linkColor, textDecoration: 'none' }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.65)' : '#1B3F6E')}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = linkColor)}
          >
            Confiance
          </Link>
        </>
      )}
    </div>
  )
}
