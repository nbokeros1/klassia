'use client'

import { useId } from 'react'

interface LogoKlassIAProps {
  variant?: 'icone' | 'horizontal' | 'vertical'
  taille?: number
  className?: string
}

export default function LogoKlassIA({
  variant = 'horizontal',
  taille = 40,
  className,
}: LogoKlassIAProps) {
  // useId garantit des IDs uniques même si plusieurs instances co-existent
  const raw = useId()
  const u   = raw.replace(/:/g, '')

  const viewBox = variant === 'icone'
    ? '0 0 100 100'
    : variant === 'horizontal'
    ? '0 0 340 100'
    : '0 0 100 150'

  const svgWidth  = variant === 'icone'      ? taille
    : variant === 'horizontal' ? Math.round(taille * 3.4)
    : taille

  const svgHeight = variant === 'icone'      ? taille
    : variant === 'horizontal' ? taille
    : Math.round(taille * 1.5)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={svgWidth}
      height={svgHeight}
      className={className}
      aria-label="KlassIA+"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* ── Médaillon : dégradé radial bleu ciel → bleu nuit ── */}
        <radialGradient id={`${u}m`} cx="32%" cy="25%" r="75%">
          <stop offset="0%"   stopColor="#7DD3FC" />
          <stop offset="28%"  stopColor="#2563EB" />
          <stop offset="65%"  stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0B2654" />
        </radialGradient>

        {/* ── Reflet glass : blanc opaque → transparent ── */}
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </linearGradient>

        {/* ── K face claire : blanc → bleu très clair ── */}
        <linearGradient id={`${u}kc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>

        {/* ── K face foncée : bleu très clair → bleu moyen ── */}
        <linearGradient id={`${u}kf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#EFF6FF" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>

        {/* ── Wordmark horizontal : blanc → bleu → violet ── */}
        {variant === 'horizontal' && (
          <linearGradient id={`${u}wm`} gradientUnits="userSpaceOnUse" x1="115" y1="0" x2="335" y2="0">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="55%"  stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        )}

        {/* ── Wordmark vertical : même dégradé sur la largeur du viewBox ── */}
        {variant === 'vertical' && (
          <linearGradient id={`${u}wm`} gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="92" y2="0">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="55%"  stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        )}

        {/* ── Clip circle : évite que K et reflet dépassent le disque ── */}
        <clipPath id={`${u}cc`}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>

      {/* ════════════════════════════════════════════
          MÉDAILLON — commun aux 3 variants
      ════════════════════════════════════════════ */}
      <g>
        {/* Fond du médaillon */}
        <circle cx="50" cy="50" r="48" fill={`url(#${u}m)`} />

        {/* K géométrique à facettes + reflet glass — clipés dans le cercle */}
        <g clipPath={`url(#${u}cc)`}>
          {/* 1. Barre verticale — face claire (polygone plein gauche) */}
          <polygon points="26,18 40,18 40,82 26,82"  fill={`url(#${u}kc)`} />

          {/* 2. Bras supérieur — corps (face angled, légèrement plus foncée) */}
          <polygon points="40,38 40,50 75,26 75,18"  fill={`url(#${u}kf)`} />

          {/* 3. Bras supérieur — facette brillante (arête du dessus, fine) */}
          <polygon points="40,38 75,18 75,20 40,40"  fill={`url(#${u}kc)`} opacity="0.85" />

          {/* 4. Bras inférieur — corps (même traitement que bras sup) */}
          <polygon points="40,50 40,62 75,82 75,74"  fill={`url(#${u}kf)`} />

          {/* Reflet glass : ellipse tilted en haut-gauche */}
          <ellipse
            cx="38" cy="28" rx="22" ry="11"
            fill={`url(#${u}g)`}
            transform="rotate(-18 38 28)"
          />
        </g>

        {/* Badge + violet en haut-droite (hors clip → déborde légèrement) */}
        <circle cx="84" cy="18" r="14" fill="#000" opacity="0.25" />
        <circle cx="84" cy="18" r="12" fill="#7C3AED" />
        <line x1="84" y1="12.5" x2="84" y2="23.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="78.5" y1="18" x2="89.5" y2="18" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
      </g>

      {/* ════════════════════════════════════════════
          WORDMARK — variant horizontal
      ════════════════════════════════════════════ */}
      {variant === 'horizontal' && (
        <text
          x="115"
          y="67"
          fontFamily="Lexend, 'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="500"
          fontSize="46"
          letterSpacing="-1.5"
          fill={`url(#${u}wm)`}
        >
          KlassIA+
        </text>
      )}

      {/* ════════════════════════════════════════════
          WORDMARK — variant vertical
      ════════════════════════════════════════════ */}
      {variant === 'vertical' && (
        <text
          x="50"
          y="135"
          textAnchor="middle"
          fontFamily="Lexend, 'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="500"
          fontSize="20"
          letterSpacing="-0.6"
          fill={`url(#${u}wm)`}
        >
          KlassIA+
        </text>
      )}
    </svg>
  )
}
