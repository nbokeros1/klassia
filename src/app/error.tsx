'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Envoyer l'erreur à un service de monitoring en production
    console.error('[ScorgIA] Erreur non gérée :', error)
  }, [error])

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

        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>

        <h1 style={{
          fontSize: 22, fontWeight: 700, color: '#0F1B2D',
          marginBottom: 10, letterSpacing: '-0.02em',
        }}>
          Une erreur est survenue
        </h1>

        <p style={{ fontSize: 14, color: '#5B6B85', lineHeight: 1.65, marginBottom: 32 }}>
          Quelque chose s&apos;est mal passé. Réessayez ou retournez au tableau de bord.
          Si le problème persiste, contactez le support.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6C5CE7, #4F46E5)',
              color: '#fff', borderRadius: 10, border: 'none',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(108,92,231,0.30)',
            }}
          >
            Réessayer
          </button>
          <a href="/dashboard" style={{
            padding: '12px 24px',
            background: 'rgba(108,92,231,0.08)',
            color: '#6C5CE7', borderRadius: 10,
            fontWeight: 700, fontSize: 14,
            textDecoration: 'none',
            border: '1px solid rgba(108,92,231,0.20)',
          }}>
            Tableau de bord
          </a>
        </div>

        {error.digest && (
          <p style={{ fontSize: 11, color: '#8B97AC', marginTop: 24, fontFamily: 'monospace' }}>
            Code : {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
