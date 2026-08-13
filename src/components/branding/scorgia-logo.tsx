import Image from 'next/image'
import type { CSSProperties } from 'react'

type ScorgiaLogoProps = {
  variant?: 'light' | 'dark' | 'icon'
  width?: number
  height?: number
  style?: CSSProperties
  className?: string
  preload?: boolean
}

const logoSources = {
  light: '/branding/scorgia-logo-light.png',
  dark:  '/branding/scorgia-logo-dark.png',
  icon:  '/branding/scorgia-icon.png',
}

export function ScorgiaLogo({
  variant = 'light',
  width,
  height,
  style,
  className,
  preload = false,
}: ScorgiaLogoProps) {
  const isIcon = variant === 'icon'

  const imgH = height ?? (isIcon ? 48 : 72)
  const imgW = width  ?? (isIcon ? 48 : 220)

  // width et height props requis par Next.js pour les URLs dynamiques (E451 si absents).
  // Pour le wordmark : style.width: 'auto' prend le dessus sur le prop (comportement voulu).
  // Ce conflit génère un warning Next/Image — acceptable ; le prop est néanmoins requis.
  return (
    <Image
      src={logoSources[variant]}
      alt="Scorgia"
      width={imgW}
      height={imgH}
      className={['object-contain', isIcon ? 'aspect-square' : '', className].filter(Boolean).join(' ')}
      preload={preload}
      style={
        isIcon
          ? { display: 'block', flexShrink: 0, width: imgW, height: imgH, ...style }
          : { display: 'block', flexShrink: 0, height: imgH, width: 'auto', ...style }
      }
    />
  )
}
