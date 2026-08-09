'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import type { ForfaitType } from '@/lib/types/database'
import { useForfait, type FonctionnaliteForfait } from '@/lib/hooks/useForfait'

// ─── Outils ────────────────────────────────────────────────────────────────────

const OUTILS = [
  {
    icon: '⏱️',
    title: 'Timer',
    desc: 'Minuteur par phases pour structurer votre leçon avec des temps clairs.',
    href: '/dashboard/outils/timer',
    color: '#6C5CE7',
    bg: '#EDE9FE',
    categorie: 'gestion',
    pro: false,
  },
  {
    icon: '📲',
    title: 'Sondage QR',
    desc: 'Créez un sondage et affichez le QR code pour des réponses instantanées.',
    href: '/dashboard/outils/sondage-qr',
    color: '#10B981',
    bg: '#D1FAE5',
    categorie: 'interaction',
    pro: false,
  },
  {
    icon: '🎮',
    title: 'Quiz live',
    desc: 'Lancez des quiz interactifs en temps réel avec tableau de scores.',
    href: '/dashboard/outils/quiz-live',
    color: '#6C5CE7',
    bg: '#EDE9FE',
    categorie: 'evaluation',
    pro: false,
  },
  {
    icon: '📺',
    title: 'Projection TBI',
    desc: 'Mode présentation plein écran optimisé pour tableau interactif.',
    href: '/dashboard/outils/projection-tbi',
    color: '#3B82F6',
    bg: '#DBEAFE',
    categorie: 'presentation',
    pro: false,
  },
  {
    icon: '🖊️',
    title: 'Tableau blanc',
    desc: 'Canvas numérique pour écrire, dessiner et partager avec vos élèves.',
    href: '/dashboard/outils/tableau-blanc',
    color: '#06B6D4',
    bg: '#CFFAFE',
    categorie: 'tableau',
    pro: false,
  },
  {
    icon: '🏆',
    title: 'Podium Quiz',
    desc: 'Classement en direct avec badges, podium et récompenses gamifiées.',
    href: '/dashboard/outils/podium-quiz',
    color: '#F59E0B',
    bg: '#FEF3C7',
    categorie: 'evaluation',
    pro: true,
  },
  {
    icon: '☁️',
    title: 'Nuage de mots',
    desc: 'Générez un nuage de mots à partir des réponses de vos élèves.',
    href: '/dashboard/outils/nuage-de-mots',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    categorie: 'interaction',
    pro: false,
  },
  {
    icon: '🎲',
    title: 'Tirage au sort',
    desc: 'Sélectionnez aléatoirement un élève ou un groupe en un clic.',
    href: '/dashboard/outils/tirage-au-sort',
    color: '#EC4899',
    bg: '#FCE7F3',
    categorie: 'divers',
    pro: false,
  },
]

const CATS = [
  { id: 'tous',         label: 'Tous' },
  { id: 'gestion',      label: 'Gestion du temps' },
  { id: 'interaction',  label: 'Interaction' },
  { id: 'presentation', label: 'Présentation' },
  { id: 'evaluation',   label: 'Évaluation' },
  { id: 'tableau',      label: 'Tableau' },
  { id: 'divers',       label: 'Divers' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OutilsPage() {
  const { profil, loading } = useAuth()
  const { peutUtiliser }    = useForfait((profil?.forfait || 'gratuit') as ForfaitType)
  const router              = useRouter()
  const supabase            = createClient()

  const [search,  setSearch]  = useState('')
  const [cat,     setCat]     = useState('tous')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <LoadingScreen />

  const isFr = (profil as any)?.langue_interface !== 'en'
  const initiales = `${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'

  const filtered = OUTILS.filter(o => {
    const matchCat    = cat === 'tous' || o.categorie === cat
    const matchSearch = !search.trim() || o.title.toLowerCase().includes(search.toLowerCase()) || o.desc.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(160deg, #EEF5FF 0%, #FFFFFF 100%)' }}>
      <Sidebar profil={profil} activeHref="/dashboard/outils" onLogout={handleLogout} />

      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar notifCount={0} initiales={initiales} isFr={isFr} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

          {/* En-tête + recherche */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                🛠️ Outils enseignant
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Des outils pratiques pour gagner du temps, engager vos élèves et rendre vos leçons plus interactives.
              </div>
            </div>
            {/* Recherche */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un outil…"
                style={{
                  paddingLeft: 32, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 10, border: '1.5px solid rgba(108,92,231,0.15)',
                  background: 'rgba(255,255,255,0.9)', fontSize: 13,
                  color: 'var(--text-primary)', outline: 'none', width: 220,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Catégories */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
            {CATS.map(c => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  border: `1.5px solid ${cat === c.id ? 'var(--violet, #6C5CE7)' : 'rgba(108,92,231,0.15)'}`,
                  background: cat === c.id ? 'var(--violet, #6C5CE7)' : 'rgba(255,255,255,0.8)',
                  color: cat === c.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Grille */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Aucun outil trouvé pour « {search} »
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {filtered.map(outil => (
                <ToolCard key={outil.href} outil={outil} peutUtiliser={peutUtiliser} onClick={() => router.push(outil.href)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Carte outil ──────────────────────────────────────────────────────────────

function ToolCard({ outil, peutUtiliser, onClick }: {
  outil: typeof OUTILS[number]
  peutUtiliser: (f: FonctionnaliteForfait) => boolean
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const locked = outil.pro && !peutUtiliser('quiz_live')

  return (
    <div
      onClick={locked ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(10px)',
        border: `1.5px solid ${hov && !locked ? outil.color + '55' : 'rgba(108,92,231,0.08)'}`,
        borderRadius: 16,
        padding: '20px 18px 16px',
        cursor: locked ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        transform: hov && !locked ? 'translateY(-2px)' : 'none',
        boxShadow: hov && !locked ? `0 10px 28px ${outil.color}22` : '0 2px 10px rgba(15,35,65,0.04)',
        display: 'flex', flexDirection: 'column', gap: 10,
        opacity: locked ? 0.75 : 1,
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{ width: 48, height: 48, borderRadius: 14, background: outil.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {outil.icon}
      </div>

      {/* Title + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          {outil.title}
        </span>
        {outil.pro && (
          <span style={{ fontSize: 10, fontWeight: 700, color: outil.color, background: outil.bg, padding: '2px 7px', borderRadius: 99, letterSpacing: '.3px' }}>
            Pro+
          </span>
        )}
        {locked && <span style={{ fontSize: 10 }}>🔒</span>}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, flex: 1 }}>
        {outil.desc}
      </div>

      {/* Arrow */}
      <div style={{ fontSize: 12, color: outil.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
        {locked ? '🔒 Disponible en Pro+' : <span style={{ opacity: hov ? 1 : 0.5, transition: 'opacity 0.15s' }}>Ouvrir →</span>}
      </div>
    </div>
  )
}
