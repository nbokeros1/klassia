'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Slide = { id: string; type: string; titre: string; contenu: string; duree?: string; icon: string; couleur: string }

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim()

function buildSlides(form: any, classe: any): Slide[] {
  const objectifs = form.objectifs.split('\n').filter(Boolean)
  const materiel = form.materiel.split('\n').filter(Boolean)
  const vocabulaire = form.vocabulaire.split('\n').filter(Boolean)
  const slides: Slide[] = []

  slides.push({
    id: 'titre', type: 'titre', icon: '✦',
    titre: form.titre || 'Leçon',
    contenu: objectifs.map((o: string) => `${o}`).join('\n'),
    duree: `${parseInt(form.avant_duree || '10') + parseInt(form.pendant_duree || '50') + parseInt(form.apres_duree || '10')} min`,
    couleur: classe?.couleur || '#3B82F6',
  })

  if (form.avant_amorce) slides.push({ id: 'avant', type: 'section', icon: '🎯', titre: 'Mise en contexte', contenu: stripHtml(form.avant_amorce), duree: `${form.avant_duree} min`, couleur: '#F59E0B' })
  if (form.pendant_modelisation) slides.push({ id: 'modelisation', type: 'section', icon: '📖', titre: 'Modélisation', contenu: stripHtml(form.pendant_modelisation), couleur: '#3B82F6' })
  if (form.pendant_pratique_guidee) slides.push({ id: 'guidee', type: 'section', icon: '🤝', titre: 'Pratique guidée', contenu: stripHtml(form.pendant_pratique_guidee), couleur: '#3B82F6' })
  if (form.pendant_pratique_autonome) slides.push({ id: 'autonome', type: 'section', icon: '✏️', titre: 'Pratique autonome', contenu: stripHtml(form.pendant_pratique_autonome), duree: `${form.pendant_duree} min`, couleur: '#3B82F6' })
  if (form.apres_cloture) slides.push({ id: 'cloture', type: 'section', icon: '🎯', titre: 'Clôture', contenu: stripHtml(form.apres_cloture), duree: `${form.apres_duree} min`, couleur: '#10B981' })
  if (form.apres_billet) slides.push({ id: 'billet', type: 'section', icon: '📝', titre: 'Billet de sortie', contenu: stripHtml(form.apres_billet), couleur: '#10B981' })
  if (vocabulaire.length > 0) slides.push({ id: 'vocabulaire', type: 'liste', icon: '📚', titre: 'Vocabulaire clé', contenu: vocabulaire.join('\n'), couleur: '#8B5CF6' })
  if (materiel.length > 0) slides.push({ id: 'materiel', type: 'liste', icon: '🧰', titre: 'Matériel requis', contenu: materiel.join('\n'), couleur: '#6B7280' })

  return slides
}

// ── Timer ────────────────────────────────────────────────────────────────────
function Timer({ onClose }: { onClose: () => void }) {
  const PRESETS = [{ l: '5', s: 300 }, { l: '10', s: 600 }, { l: '15', s: 900 }, { l: '20', s: 1200 }, { l: '25', s: 1500 }]
  const [seconds, setSeconds] = useState(300)
  const [running, setRunning] = useState(false)
  const [initial, setInitial] = useState(300)

  useEffect(() => {
    if (!running || seconds <= 0) { if (seconds <= 0) setRunning(false); return }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, seconds])

  const pct = (seconds / initial) * 100
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const urgent = seconds <= 30 && running

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 200,
      background: 'rgba(8,12,24,0.97)',
      border: `2px solid ${urgent ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 20, padding: '18px 22px', minWidth: 210,
      boxShadow: `0 8px 40px rgba(0,0,0,0.7)${urgent ? ', 0 0 30px rgba(239,68,68,0.3)' : ''}`,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 2 }}>TIMER</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.s} onClick={() => { setSeconds(p.s); setInitial(p.s); setRunning(false) }}
            style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11, background: initial === p.s ? 'rgba(255,255,255,0.15)' : 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            {p.l} min
          </button>
        ))}
      </div>
      <div style={{ fontSize: 56, fontWeight: 800, textAlign: 'center', color: urgent ? '#EF4444' : 'white', fontVariantNumeric: 'tabular-nums', letterSpacing: -2, lineHeight: 1, marginBottom: 10, transition: 'color 0.3s' }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: urgent ? '#EF4444' : '#3B82F6', borderRadius: 99, transition: 'width 1s linear, background 0.3s' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setRunning(r => !r)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: running ? '#EF4444' : '#3B82F6', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button onClick={() => { setSeconds(initial); setRunning(false) }} style={{ padding: '9px 13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>↺</button>
      </div>
    </div>
  )
}

// ── Presenter ────────────────────────────────────────────────────────────────
export default function PresenterPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showTimer, setShowTimer] = useState(false)
  const [classe, setClasse] = useState<any>(null)
  const [light, setLight] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const [{ data: cl }, { data: lecon }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', params.id as string).single(),
        supabase.from('lecons').select('*').eq('id', params.leconId as string).single(),
      ])
      setClasse(cl)
      if (lecon) {
        const c = lecon.contenu_json || {}
        setSlides(buildSlides({
          titre: lecon.titre || '',
          objectifs: Array.isArray(c.objectifs) ? c.objectifs.join('\n') : '',
          avant_amorce: c.avant_amorce || '', avant_duree: c.avant_duree || '10',
          pendant_modelisation: c.pendant_modelisation || '',
          pendant_pratique_guidee: c.pendant_pratique_guidee || '',
          pendant_pratique_autonome: c.pendant_pratique_autonome || '', pendant_duree: c.pendant_duree || '50',
          apres_cloture: c.apres_cloture || '', apres_billet: c.apres_billet || '', apres_duree: c.apres_duree || '10',
          materiel: Array.isArray(c.materiel) ? c.materiel.join('\n') : '',
          vocabulaire: Array.isArray(c.vocabulaire) ? c.vocabulaire.join('\n') : '',
          differentiation: c.differentiation || '',
        }, cl))
      }
      setLoading(false)
    }
    init()
  }, [])

  const go = useCallback((dir: number) =>
    setCurrent(c => Math.max(0, Math.min(slides.length - 1, c + dir))), [slides.length])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1)
      else if (e.key === 'Escape') router.back()
      else if (e.key === 't' || e.key === 'T') setShowTimer(s => !s)
      else if (e.key === 'l' || e.key === 'L') setLight(s => !s)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [go, router])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A1A' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (slides.length === 0) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A1A', color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>
      Aucun contenu à présenter.
    </div>
  )

  const slide = slides[current]
  const bg = light ? '#F8FAFF' : '#0A0A1A'
  const text1 = light ? '#0D1525' : '#FFFFFF'
  const text2 = light ? 'rgba(13,21,37,0.5)' : 'rgba(255,255,255,0.45)'
  const cardBg = light ? 'white' : 'rgba(255,255,255,0.05)'
  const cardBorder = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const lines = slide.contenu.split('\n').filter(Boolean)

  return (
    <div style={{ height: '100vh', width: '100vw', background: bg, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', transition: 'background 0.4s', userSelect: 'none' }}>

      {/* Corner controls */}
      <div style={{ position: 'absolute', top: 20, left: 28, display: 'flex', alignItems: 'center', gap: 8, zIndex: 50 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: light ? 'rgba(13,21,37,0.2)' : 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>
          Klass<span style={{ color: light ? 'rgba(107,63,160,0.25)' : 'rgba(107,63,160,0.4)' }}>IA</span>
        </div>
        <div style={{ width: 1, height: 16, background: text2, opacity: 0.3 }} />
        <div style={{ fontSize: 12, color: text2 }}>{classe?.nom}</div>
      </div>

      <div style={{ position: 'absolute', top: 20, right: 28, display: 'flex', gap: 8, zIndex: 50 }}>
        <button onClick={() => setLight(l => !l)}
          style={{ padding: '6px 13px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer' }}>
          {light ? '🌙 Sombre' : '☀ Clair'}
        </button>
        <button onClick={() => setShowTimer(s => !s)}
          style={{ padding: '6px 13px', borderRadius: 8, border: `1px solid ${showTimer ? 'transparent' : cardBorder}`, background: showTimer ? '#3B82F6' : cardBg, color: showTimer ? 'white' : text2, fontSize: 12, fontWeight: showTimer ? 700 : 400, cursor: 'pointer' }}>
          ⏱ Timer
        </button>
        <button onClick={() => router.back()}
          style={{ padding: '6px 13px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer' }}>
          ✕ Quitter
        </button>
      </div>

      {/* Slide number */}
      <div style={{ position: 'absolute', bottom: 52, right: 28, fontSize: 12, color: text2, zIndex: 50 }}>
        {current + 1} / {slides.length}
      </div>

      {/* ── SLIDE CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 100px 60px' }}>

        {slide.type === 'titre' ? (
          <div style={{ textAlign: 'center', maxWidth: 960, width: '100%' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: slide.couleur, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
              {classe?.matiere}{classe?.niveau ? ` · ${classe.niveau}` : ''}
            </div>
            <h1 style={{ fontSize: 64, fontWeight: 900, color: text1, lineHeight: 1.05, marginBottom: 40, letterSpacing: -2 }}>
              {slide.titre}
            </h1>
            {lines.length > 0 && (
              <div style={{ display: 'inline-block', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: '24px 40px', textAlign: 'left', marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: slide.couleur, letterSpacing: '0.1em', marginBottom: 14 }}>OBJECTIFS D'APPRENTISSAGE</div>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 20, color: text1, lineHeight: 1.7 }}>
                    <span style={{ color: slide.couleur, marginTop: 4, fontSize: 8 }}>●</span>{l}
                  </div>
                ))}
              </div>
            )}
            {slide.duree && (
              <div style={{ fontSize: 15, color: text2, marginTop: 8 }}>⏱ Durée totale : <b style={{ color: text1 }}>{slide.duree}</b></div>
            )}
          </div>

        ) : (
          <div style={{ maxWidth: 1040, width: '100%' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: `${slide.couleur}20`,
                border: `2px solid ${slide.couleur}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, flexShrink: 0,
              }}>
                {slide.icon}
              </div>
              <div>
                <h2 style={{ fontSize: 44, fontWeight: 800, color: text1, lineHeight: 1, letterSpacing: -1, margin: 0 }}>
                  {slide.titre}
                </h2>
                {slide.duree && <div style={{ fontSize: 14, color: slide.couleur, fontWeight: 600, marginTop: 6 }}>⏱ {slide.duree}</div>}
              </div>
            </div>

            {/* Content */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: '32px 44px' }}>
              {slide.type === 'liste' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {lines.map((l, i) => (
                    <div key={i} style={{
                      padding: '10px 22px', borderRadius: 99,
                      background: `${slide.couleur}18`,
                      border: `1.5px solid ${slide.couleur}40`,
                      color: text1, fontSize: 20, fontWeight: 500,
                    }}>{l}</div>
                  ))}
                </div>
              ) : (
                lines.map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    fontSize: 22, lineHeight: 1.75, color: text1,
                    padding: '10px 0',
                    borderBottom: i < lines.length - 1 ? `1px solid ${cardBorder}` : 'none',
                  }}>
                    <span style={{ color: slide.couleur, fontSize: 10, marginTop: 10, flexShrink: 0 }}>●</span>
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── PREV / NEXT ── */}
      <button onClick={() => go(-1)} disabled={current === 0}
        style={{
          position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
          width: 52, height: 52, borderRadius: 14,
          background: cardBg, border: `1px solid ${cardBorder}`,
          color: current === 0 ? text2 : text1,
          fontSize: 24, cursor: current === 0 ? 'not-allowed' : 'pointer',
          opacity: current === 0 ? 0.25 : 0.8, transition: 'opacity 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>

      <button onClick={() => go(1)} disabled={current === slides.length - 1}
        style={{
          position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
          width: 52, height: 52, borderRadius: 14,
          background: cardBg, border: `1px solid ${cardBorder}`,
          color: current === slides.length - 1 ? text2 : text1,
          fontSize: 24, cursor: current === slides.length - 1 ? 'not-allowed' : 'pointer',
          opacity: current === slides.length - 1 ? 0.25 : 0.8, transition: 'opacity 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>

      {/* ── PROGRESS DOTS ── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '14px 0', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 28 : 7, height: 7,
              borderRadius: 99, border: 'none', cursor: 'pointer',
              background: i === current ? slide.couleur : (light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'),
              transition: 'all 0.25s', padding: 0,
            }} />
        ))}
      </div>

      {showTimer && <Timer onClose={() => setShowTimer(false)} />}

      {/* Keyboard hint */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: text2, opacity: 0.5, whiteSpace: 'nowrap' }}>
        ← → Naviguer · T Timer · L Clair/Sombre · Échap Quitter
      </div>
    </div>
  )
}
