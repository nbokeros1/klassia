'use client'

import { useRouter } from 'next/navigation'
import {
  useForfait,
  FONCTIONNALITE_LABELS,
  FORFAIT_LABELS,
  FORFAIT_PRIX,
  type FonctionnaliteForfait,
} from '@/lib/hooks/useForfait'
import type { ForfaitType } from '@/lib/types/database'

interface UpgradePromptProps {
  fonctionnalite: FonctionnaliteForfait
  forfait_actuel: ForfaitType
  onContinuer?: () => void
}

export default function UpgradePrompt({ fonctionnalite, forfait_actuel, onContinuer }: UpgradePromptProps) {
  const router = useRouter()
  const { forfaitRequis } = useForfait(forfait_actuel)
  const requis = forfaitRequis(fonctionnalite)

  const prixCAD = FORFAIT_PRIX[requis]
  const prixUSD: string | null = requis === 'pro' ? '10 $ USD' : requis === 'pro_plus' ? '18 $ USD' : null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1.5px solid rgba(167,139,250,0.3)',
      borderRadius: 14, padding: '24px',
      display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>🔒</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {FONCTIONNALITE_LABELS[fonctionnalite]}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Disponible dans le forfait{' '}
            <span style={{ color: '#A78BFA', fontWeight: 600 }}>
              KlassIA+ {FORFAIT_LABELS[requis]}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
        borderRadius: 10, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>FORFAIT REQUIS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#A78BFA' }}>
            KlassIA+ {FORFAIT_LABELS[requis]}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{prixCAD}/mois</div>
          {prixUSD && <div style={{ fontSize: 11, color: '#94a3b8' }}>{prixUSD}/mois</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => router.push('/dashboard/forfaits')}
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            border: 'none', borderRadius: 8, padding: '11px 20px',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
          Passer au forfait {FORFAIT_LABELS[requis]}
        </button>
        {onContinuer && (
          <button
            onClick={onContinuer}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '9px 20px',
              color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}>
            Continuer en {FORFAIT_LABELS[forfait_actuel]}
          </button>
        )}
      </div>
    </div>
  )
}
