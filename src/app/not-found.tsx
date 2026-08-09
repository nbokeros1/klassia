'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28, fontWeight: 900, color: '#fff',
          letterSpacing: '-1px',
          boxShadow: '0 8px 32px rgba(108,92,231,0.28)',
        }}>
          S
        </div>

        <div style={{
          fontSize: 96, fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          404
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 700, color: '#0F1B2D',
          marginBottom: 10, letterSpacing: '-0.02em',
        }}>
          Page introuvable
        </h1>

        <p style={{ fontSize: 14, color: '#5B6B85', lineHeight: 1.65, marginBottom: 32 }}>
          Cette page n&apos;existe pas ou a été déplacée.
          Retournez au tableau de bord pour continuer votre travail.
        </p>

        <Link href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)',
          color: '#fff', borderRadius: 10,
          fontWeight: 700, fontSize: 14,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(108,92,231,0.30)',
        }}>
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
