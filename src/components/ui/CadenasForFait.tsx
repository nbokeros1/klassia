'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useForfait,
  FONCTIONNALITE_LABELS,
  FORFAIT_LABELS,
  FORFAIT_PRIX,
  FORFAIT_AVANTAGES,
  type FonctionnaliteForfait,
} from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CadenasForFaitProps {
  fonctionnalite: FonctionnaliteForfait
  forfait_actuel: ForfaitType
  children: React.ReactNode
  mode?: 'overlay' | 'banniere'
  /** scorgia_roles.id of the current user — beta role bypasses all locks */
  role?: string | null
  /** Force le cadenas indépendamment du feature flag (ex: quota numérique atteint) */
  bloque?: boolean
  /** Message personnalisé affiché en titre de la modal quand bloque=true */
  messageCustom?: string
  /** Forfait recommandé quand bloque=true (par défaut : 'pro') */
  forfait_cible?: ForfaitType
}

// ─── Couleurs par forfait ─────────────────────────────────────────────────────

const FORFAIT_COLORS: Record<ForfaitType, { accent: string; bg: string; border: string }> = {
  gratuit:     { accent: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
  pro:         { accent: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.30)'  },
  pro_plus:    { accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.30)' },
  institution: { accent: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)'  },
}

// ─── Composant modal ──────────────────────────────────────────────────────────

function CadenasModal({
  fonctionnalite,
  forfait_actuel,
  forfaitRequis,
  onClose,
  messageCustom,
}: {
  fonctionnalite: FonctionnaliteForfait
  forfait_actuel: ForfaitType
  forfaitRequis: ForfaitType
  onClose: () => void
  messageCustom?: string
}) {
  const router    = useRouter()
  const colors    = FORFAIT_COLORS[forfaitRequis]
  const avantages = FORFAIT_AVANTAGES[forfaitRequis]
  const prix      = FORFAIT_PRIX[forfaitRequis]
  const label     = FORFAIT_LABELS[forfaitRequis]

  return (
    <>
      {/* Fond */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 440,
        background: '#0D1526',
        border: `1.5px solid ${colors.border}`,
        borderRadius: 16,
        padding: 28,
        zIndex: 1001,
        boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${colors.border}`,
      }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, lineHeight: 1.5 }}>
            {messageCustom || FONCTIONNALITE_LABELS[fonctionnalite]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Disponible avec ScorgIA{' '}
            <span style={{
              padding: '2px 8px',
              background: colors.bg,
              color: colors.accent,
              borderRadius: 99, fontSize: 11, fontWeight: 700,
            }}>
              {label}
            </span>
          </div>
        </div>

        {/* Avantages */}
        <div style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10, padding: '14px 16px',
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.accent, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Ce que vous débloquez
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {avantages.map((av, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ color: colors.accent, flexShrink: 0, marginTop: 1 }}>✓</span>
                {av}
              </div>
            ))}
          </div>
        </div>

        {/* CTA principal */}
        {prix !== 'Sur devis' ? (
          <button
            onClick={() => { router.push('/dashboard/forfaits'); onClose() }}
            style={{
              width: '100%', padding: '12px',
              background: `linear-gradient(135deg, ${colors.accent}CC, ${colors.accent}88)`,
              border: 'none', borderRadius: 10,
              color: 'white', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', marginBottom: 8,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Voir les forfaits — {label} dès {prix}/mois
          </button>
        ) : (
          <button
            onClick={() => { router.push('/dashboard/forfaits'); onClose() }}
            style={{
              width: '100%', padding: '12px',
              background: colors.bg,
              border: `1.5px solid ${colors.border}`,
              borderRadius: 10, color: colors.accent,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            Demander un devis Institution
          </button>
        )}

        {/* Voir tous les forfaits */}
        <button
          onClick={() => { router.push('/dashboard/forfaits'); onClose() }}
          style={{
            width: '100%', padding: '9px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'var(--text-3)',
            fontSize: 12, cursor: 'pointer', marginBottom: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          Voir tous les forfaits
        </button>

        {/* Rester */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '8px',
            background: 'transparent', border: 'none',
            color: 'var(--text-4)', fontSize: 11,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-3)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
        >
          Continuer en {FORFAIT_LABELS[forfait_actuel]}
        </button>
      </div>
    </>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CadenasForFait({
  fonctionnalite,
  forfait_actuel,
  children,
  mode = 'overlay',
  role,
  bloque,
  messageCustom,
  forfait_cible,
}: CadenasForFaitProps) {
  const { peutUtiliser, forfaitRequis } = useForfait(forfait_actuel, undefined, role ?? undefined)
  const [modalOpen, setModalOpen]       = useState(false)

  // Déterminer si le cadenas doit s'activer
  const estBloque = bloque === true ? true : !peutUtiliser(fonctionnalite)

  // Accès libre
  if (!estBloque) {
    return <>{children}</>
  }

  const requis = forfait_cible ?? forfaitRequis(fonctionnalite)
  const colors  = FORFAIT_COLORS[requis]

  // ── Mode bannière ──────────────────────────────────────────────────────────
  if (mode === 'banniere') {
    return (
      <>
        {children}
        <div
          onClick={() => setModalOpen(true)}
          style={{
            marginTop: 8,
            padding: '10px 14px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.accent }}>
              {messageCustom ? 'Limite atteinte' : `Fonctionnalité ScorgIA ${FORFAIT_LABELS[requis]}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
              {messageCustom || `${FONCTIONNALITE_LABELS[fonctionnalite]} · Cliquez pour débloquer`}
            </div>
          </div>
          <span style={{
            padding: '3px 10px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 99, fontSize: 10,
            fontWeight: 700, color: colors.accent,
          }}>
            {FORFAIT_LABELS[requis]}
          </span>
        </div>

        {modalOpen && (
          <CadenasModal
            fonctionnalite={fonctionnalite}
            forfait_actuel={forfait_actuel}
            forfaitRequis={requis}
            messageCustom={messageCustom}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  // ── Mode overlay (par défaut) ──────────────────────────────────────────────
  return (
    <>
      <div
        style={{ position: 'relative', display: 'contents' }}
        onClick={() => setModalOpen(true)}
      >
        <div style={{
          position: 'relative',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <div
            onClick={e => { e.stopPropagation(); setModalOpen(true) }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(13,21,38,0.72)',
              borderRadius: 'inherit', zIndex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6, cursor: 'pointer',
              backdropFilter: 'blur(1.5px)',
              pointerEvents: 'all',
            }}
          >
            <span style={{ fontSize: 22 }}>🔒</span>
            <span style={{
              padding: '3px 12px',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 99, fontSize: 10,
              fontWeight: 700, color: colors.accent,
            }}>
              ScorgIA {FORFAIT_LABELS[requis]}
            </span>
          </div>
          {children}
        </div>
      </div>

      {modalOpen && (
        <CadenasModal
          fonctionnalite={fonctionnalite}
          forfait_actuel={forfait_actuel}
          forfaitRequis={requis}
          messageCustom={messageCustom}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
