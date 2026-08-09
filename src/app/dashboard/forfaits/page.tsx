'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/lib/hooks/useAuth'

// ─── Taux de change ───────────────────────────────────────────────────────────
const CAD_TO_USD = 0.725  // 1 CAD = 0.725 USD  ↔  1 USD ≈ 1.38 CAD

function price(cad: number, currency: 'CAD' | 'USD', digits = 2): string {
  const val = currency === 'CAD' ? cad : cad * CAD_TO_USD
  return val.toFixed(digits)
}

// ─── Plans ────────────────────────────────────────────────────────────────────

type Plan = {
  id: string
  label: string
  monthlyCAD: number | null  // null = sur demande
  annualCAD:  number | null
  annualSave?: string
  color: string
  highlight?: boolean
  badge?: string
  features: string[]
  cta: string
}

const PLANS: Plan[] = [
  {
    id: 'gratuit',
    label: 'Gratuit',
    monthlyCAD: 0,
    annualCAD: 0,
    color: '#94A3B8',
    features: [
      '1 classe maximum',
      '5 générations IA / mois',
      'Plan de leçon basique (AVANT/PENDANT/APRÈS)',
      'Éditeur de texte enrichi',
      'Sauvegarde automatique',
    ],
    cta: 'Plan actuel',
  },
  {
    id: 'pro',
    label: 'Pro',
    monthlyCAD: 14.99,
    annualCAD: 119.99,
    annualSave: 'Économisez 33 %',
    color: '#60A5FA',
    features: [
      'Classes illimitées',
      'Génération IA illimitée',
      '3 types de documents (Plan de leçon, Séquence, Complet)',
      'Export Word (.docx) et PowerPoint (.pptx)',
      'Programme annuel IA',
      'Planification 36 semaines',
      'Timer · Sondage QR · Tableau blanc · Mode TBI',
      'Historique IA illimité',
    ],
    cta: 'Choisir Pro',
  },
  {
    id: 'pro_plus',
    label: 'Pro+',
    monthlyCAD: 24.99,
    annualCAD: 199.99,
    annualSave: 'Économisez 33 %',
    color: '#A78BFA',
    highlight: true,
    badge: 'Le plus populaire',
    features: [
      'Tout ce qui est inclus dans Pro',
      'Quiz live interactif',
      'Podium et classement en direct',
      '10 ressources premium / mois',
      'Communication école-famille IA',
      'Rapports de progression avancés',
      'Bibliothèque de schémas scientifiques SVG',
      'Import curriculum DOCX/PDF → programme IA',
      'Perspective autochtone et différenciation avancée',
    ],
    cta: 'Choisir Pro+',
  },
  {
    id: 'institution',
    label: 'Institution',
    monthlyCAD: null,
    annualCAD: null,
    color: '#34D399',
    features: [
      'À partir de 9,99 CAD / enseignant / mois',
      'Tout ce qui est inclus dans Pro+',
      'Dashboard administrateur d\'école',
      'Gestion multi-enseignants centralisée',
      'Facturation centralisée',
      'Conformité PIPEDA (données au Canada)',
      'Formation et intégration dédiées',
      'Support prioritaire',
    ],
    cta: 'Nous contacter',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForfaitsPage() {
  const { profil, loading, logout } = useAuth()
  const [currency, setCurrency] = useState<'CAD' | 'USD'>('CAD')
  const [billing,  setBilling]  = useState<'monthly' | 'annual'>('monthly')
  const [toast,    setToast]    = useState('')
  const router = useRouter()

  if (loading) return <LoadingScreen />

  const currentPlan: string = profil?.forfait || 'gratuit'

  const handleUpgrade = (planId: string) => {
    if (planId === 'institution') {
      setToast('Contactez-nous à contact@scorgia.app')
    } else {
      setToast('Paiement en ligne disponible bientôt — Stripe en cours d\'intégration')
    }
    setTimeout(() => setToast(''), 4000)
  }

  const sym = currency === 'CAD' ? 'CAD' : 'USD'

  const cardBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: '28px 24px',
    display: 'flex', flexDirection: 'column', gap: 16,
    position: 'relative',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/forfaits" onLogout={logout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Forfaits & tarifs</div>
            <div className="topbar-sub">Choisissez le plan adapté à votre enseignement</div>
          </div>
        </div>

        <div className="page-content fade-in">

          {/* Toast */}
          {toast && (
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px', background: '#1E3A5F', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, fontSize: 13, color: '#60A5FA', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 380 }}>
              {toast}
            </div>
          )}

          {/* Contrôles devise + facturation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
            {/* Toggle devise */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 99, padding: 3, gap: 0 }}>
              {(['CAD', 'USD'] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  padding: '6px 18px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: currency === c ? 'rgba(96,165,250,0.2)' : 'transparent',
                  color: currency === c ? '#60A5FA' : 'var(--text-4)',
                  transition: 'all 0.15s',
                }}>
                  {c === 'CAD' ? '🇨🇦 CAD' : '🇺🇸 USD'}
                </button>
              ))}
            </div>

            {/* Toggle facturation */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 99, padding: 3, gap: 0 }}>
              {([['monthly', 'Mensuel'], ['annual', 'Annuel']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setBilling(v)} style={{
                  padding: '6px 18px', borderRadius: 99, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: billing === v ? 'rgba(167,139,250,0.2)' : 'transparent',
                  color: billing === v ? '#A78BFA' : 'var(--text-4)',
                  transition: 'all 0.15s',
                }}>
                  {l}
                </button>
              ))}
            </div>

            {billing === 'annual' && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', padding: '3px 10px', background: 'rgba(52,211,153,0.12)', borderRadius: 99 }}>
                Économisez jusqu'à 33 %
              </span>
            )}
          </div>

          {/* Grille plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
            {PLANS.map(plan => {
              const isCurrent = currentPlan === plan.id
              const isHighlight = plan.highlight
              const showPrice = plan.monthlyCAD !== null

              const displayPrice = showPrice
                ? billing === 'annual' && plan.annualCAD !== null && plan.monthlyCAD! > 0
                  ? price(plan.annualCAD! / 12, currency)
                  : price(plan.monthlyCAD!, currency)
                : null

              return (
                <div key={plan.id} style={{
                  ...cardBase,
                  border: `1.5px solid ${isHighlight ? `${plan.color}55` : isCurrent ? `${plan.color}44` : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isHighlight ? `0 0 40px ${plan.color}18` : 'none',
                }}>
                  {/* Badge "le plus populaire" */}
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '3px 14px', background: plan.color, color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '0.4px' }}>
                      {plan.badge}
                    </div>
                  )}

                  {/* En-tête */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: plan.color }}>{plan.label}</div>
                      {isCurrent && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: `${plan.color}22`, color: plan.color, borderRadius: 99, letterSpacing: '0.5px' }}>
                          PLAN ACTUEL
                        </span>
                      )}
                    </div>

                    {showPrice ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                            {displayPrice === '0.00' ? '0' : displayPrice}
                          </span>
                          {plan.monthlyCAD! > 0 && (
                            <span style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 4 }}>
                              {sym}/mois
                            </span>
                          )}
                          {plan.monthlyCAD === 0 && (
                            <span style={{ fontSize: 14, color: 'var(--text-4)', marginBottom: 4 }}>{sym}</span>
                          )}
                        </div>
                        {billing === 'annual' && plan.annualCAD !== null && plan.monthlyCAD! > 0 && (
                          <div style={{ fontSize: 11, color: '#34D399', marginTop: 4 }}>
                            {price(plan.annualCAD!, currency)} {sym}/an · {plan.annualSave}
                          </div>
                        )}
                        {billing === 'monthly' && plan.annualCAD !== null && plan.monthlyCAD! > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
                            Ou {price(plan.annualCAD!, currency)} {sym}/an ({plan.annualSave})
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>Sur demande</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
                          À partir de {currency === 'CAD' ? '9,99 CAD' : '7,24 USD'} / enseignant / mois
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Séparateur */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                        <span style={{ color: plan.color, flexShrink: 0, marginTop: 1, fontSize: 11 }}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => isCurrent ? undefined : handleUpgrade(plan.id)}
                    disabled={isCurrent}
                    style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: isCurrent ? 'default' : 'pointer',
                      background: isCurrent
                        ? 'rgba(255,255,255,0.05)'
                        : plan.id === 'pro_plus'
                        ? `linear-gradient(135deg, ${plan.color}, #6B3FA0)`
                        : plan.id === 'institution'
                        ? `rgba(${plan.color === '#34D399' ? '52,211,153' : '96,165,250'},0.15)`
                        : `rgba(${plan.color === '#60A5FA' ? '96,165,250' : '167,139,250'},0.15)`,
                      color: isCurrent ? 'var(--text-4)' : plan.id === 'pro_plus' ? 'white' : plan.color,
                      transition: 'all 0.15s',
                      boxShadow: !isCurrent && plan.id === 'pro_plus' ? `0 6px 20px ${plan.color}40` : 'none',
                    }}>
                    {isCurrent ? '✓ Plan actuel' : plan.cta}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Ressources à l'unité */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Ressources pédagogiques à l'unité</div>
                <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Accédez à des ressources premium sans changer de forfait</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FBC34A', padding: '2px 10px', background: 'rgba(251,195,74,0.12)', borderRadius: 99 }}>
                Bientôt disponible
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Ressource unitaire',   price: `1,99–4,99 ${sym}`,   desc: 'Schéma SVG, grille évaluation, activité différenciée' },
                { label: 'Pack 10 ressources',   price: `14,99 ${sym}`,       desc: 'Économisez jusqu\'à 25 % sur l\'achat individuel' },
                { label: 'Pack 30 ressources',   price: `34,99 ${sym}`,       desc: 'Idéal pour une année scolaire complète' },
                { label: 'Add-on illimité',      price: `+9,99 ${sym}/mois`,  desc: 'Ajouter des ressources illimitées à votre forfait actuel' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FBC34A', marginBottom: 4 }}>{item.price}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ / notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { q: 'Quand Stripe sera-t-il disponible ?', r: 'Le paiement en ligne sera disponible dans les prochaines semaines. En attendant, contactez-nous pour un accès anticipé Pro ou Pro+.' },
              { q: 'Mes données sont-elles au Canada ?', r: 'Oui. Pour tous les forfaits, vos données sont hébergées au Canada (conformité PIPEDA). Le forfait Institution inclut une garantie contractuelle.' },
              { q: 'Puis-je changer de forfait ?', r: 'Oui. Vous pouvez passer à un forfait supérieur ou inférieur à tout moment. La différence est calculée au prorata.' },
              { q: 'Le forfait Gratuit est-il limité dans le temps ?', r: 'Non. Le forfait Gratuit est permanent. Vous pouvez l\'utiliser sans limite de durée avec 1 classe et 5 générations IA par mois.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>❓ {item.q}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{item.r}</div>
              </div>
            ))}
          </div>

          {/* Pied de page */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-4)', lineHeight: 1.6 }}>
            Taxes applicables selon votre province · Les prix en USD sont indicatifs (taux 1 USD ≈ 1,38 CAD) ·{' '}
            <span style={{ color: '#A78BFA', cursor: 'pointer' }} onClick={() => setToast('Contactez-nous à contact@scorgia.app')}>
              contact@scorgia.app
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
