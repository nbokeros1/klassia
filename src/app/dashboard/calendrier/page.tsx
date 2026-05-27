'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const JOURS_GRID = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const HEURES = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

// Canadian statutory holidays + school events 2025-2026
const HOLIDAYS: { date: string; titre: string; type: 'ferie' | 'scolaire' | 'fete' }[] = [
  { date: '2025-09-02', titre: 'Rentrée scolaire', type: 'scolaire' },
  { date: '2025-09-01', titre: 'Fête du travail', type: 'ferie' },
  { date: '2025-10-13', titre: 'Action de grâce', type: 'ferie' },
  { date: '2025-10-31', titre: 'Halloween', type: 'fete' },
  { date: '2025-11-11', titre: 'Jour du Souvenir', type: 'ferie' },
  { date: '2025-12-25', titre: 'Noël', type: 'ferie' },
  { date: '2025-12-26', titre: 'Boxing Day', type: 'ferie' },
  { date: '2025-12-22', titre: 'Vacances de Noël', type: 'scolaire' },
  { date: '2026-01-01', titre: 'Jour de l\'An', type: 'ferie' },
  { date: '2026-01-05', titre: 'Retour en classe', type: 'scolaire' },
  { date: '2026-02-14', titre: 'Saint-Valentin', type: 'fete' },
  { date: '2026-02-16', titre: 'Début relâche scolaire', type: 'scolaire' },
  { date: '2026-02-20', titre: 'Fin relâche scolaire', type: 'scolaire' },
  { date: '2026-03-17', titre: 'Saint-Patrick', type: 'fete' },
  { date: '2026-04-03', titre: 'Vendredi Saint', type: 'ferie' },
  { date: '2026-04-05', titre: 'Pâques', type: 'fete' },
  { date: '2026-04-06', titre: 'Lundi de Pâques', type: 'ferie' },
  { date: '2026-05-18', titre: 'Journée des Patriotes', type: 'ferie' },
  { date: '2026-06-21', titre: 'Fête nationale autochtone', type: 'fete' },
  { date: '2026-06-24', titre: 'Fête nationale du Québec', type: 'ferie' },
  { date: '2026-06-26', titre: 'Fin d\'année scolaire', type: 'scolaire' },
  { date: '2026-07-01', titre: 'Fête du Canada', type: 'ferie' },
]

const HOLIDAY_COLORS = { ferie: '#F59E0B', scolaire: '#10B981', fete: '#EC4899' }

const JOUR_MAP: Record<string, number> = {
  'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6, 'Dimanche': 0,
}

function toIso(d: Date) {
  return d.toISOString().split('T')[0]
}

function today() {
  return toIso(new Date())
}

export default function CalendrierPage() {
  const [profil, setProfil] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [cours, setCours] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'semaine' | 'mois'>('mois')
  const [semaine, setSemaine] = useState(0)
  const [moisOffset, setMoisOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(today())
  const [showAddNote, setShowAddNote] = useState(false)
  const [showAddCours, setShowAddCours] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [noteForm, setNoteForm] = useState({ titre: '', description: '', type: 'note', couleur: '#6B3FA0' })
  const [coursForm, setCoursForm] = useState({ classe_id: '', jour: 'Lundi', heure_debut: '8:00', heure_fin: '9:00', salle: '', note: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profil } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      setProfil(profil)
      if (!profil?.id) { setLoading(false); return }
      const [clsRes, coursRes, notesRes] = await Promise.all([
        supabase.from('classes').select('*').eq('enseignant_id', profil.id),
        supabase.from('cours_semaine').select('*').eq('enseignant_id', profil.id),
        supabase.from('notes_agenda').select('*').eq('enseignant_id', profil.id).order('date'),
      ])
      setClasses(clsRes.data || [])
      setCours(coursRes.data || [])
      setNotes(notesRes.data || [])
      setLoading(false)
    }
    init()
  }, [])

  // ── Month helpers ──────────────────────────────────────────────────────────
  const baseMonth = (() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + moisOffset)
    return d
  })()

  const monthYear = { year: baseMonth.getFullYear(), month: baseMonth.getMonth() }

  const daysInMonth = (() => {
    const days: Date[] = []
    const first = new Date(monthYear.year, monthYear.month, 1)
    const last = new Date(monthYear.year, monthYear.month + 1, 0)
    // pad start to Monday
    let start = new Date(first)
    const dow = first.getDay() === 0 ? 7 : first.getDay()
    start.setDate(start.getDate() - (dow - 1))
    while (start <= last || days.length % 7 !== 0) {
      days.push(new Date(start))
      start = new Date(start)
      start.setDate(start.getDate() + 1)
      if (days.length > 42) break
    }
    return days
  })()

  const holidaysForDate = (iso: string) => HOLIDAYS.filter(h => h.date === iso)

  const notesForDate = (iso: string) => notes.filter(n => n.date === iso)

  const coursForDate = (d: Date) => {
    const dow = d.getDay() === 0 ? 7 : d.getDay()
    return cours.filter(c => JOUR_MAP[c.jour] === dow)
  }

  // ── Week helpers (existing logic) ──────────────────────────────────────────
  const getDateSemaine = (offset = 0) => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
    const lundi = new Date(today.setDate(diff))
    return lundi
  }

  const formatDate = (base: Date, jourIndex: number) => {
    const d = new Date(base)
    d.setDate(base.getDate() + jourIndex)
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
  }

  const lundi = getDateSemaine(semaine)

  const getCoursPour = (jour: string, heure: string) => cours.filter(c => c.jour === jour && c.heure_debut === heure)

  // ── Add note ───────────────────────────────────────────────────────────────
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id || !noteForm.titre) return
    setSavingNote(true)
    const { data, error } = await supabase.from('notes_agenda').insert({
      enseignant_id: profil.id,
      date: selectedDate,
      titre: noteForm.titre,
      description: noteForm.description,
      type: noteForm.type,
      couleur: noteForm.couleur,
    }).select().single()
    if (!error && data) {
      setNotes(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
      setNoteForm({ titre: '', description: '', type: 'note', couleur: '#6B3FA0' })
      setShowAddNote(false)
    }
    setSavingNote(false)
  }

  const handleDeleteNote = async (id: string) => {
    await supabase.from('notes_agenda').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // ── Add cours ──────────────────────────────────────────────────────────────
  const handleAddCours = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil?.id || !coursForm.classe_id) return
    const classe = classes.find(c => c.id === coursForm.classe_id)
    const { data, error } = await supabase.from('cours_semaine').insert({
      enseignant_id: profil.id,
      classe_id: coursForm.classe_id,
      nom_classe: classe?.nom || '',
      couleur: classe?.couleur || '#1B3F6E',
      jour: coursForm.jour,
      heure_debut: coursForm.heure_debut,
      heure_fin: coursForm.heure_fin,
      salle: coursForm.salle,
      note: coursForm.note,
      recurrent: true,
    }).select().single()
    if (!error && data) {
      setCours(prev => [...prev, data])
      setShowAddCours(false)
      setCoursForm({ classe_id: '', jour: 'Lundi', heure_debut: '8:00', heure_fin: '9:00', salle: '', note: '' })
    }
  }

  const handleDeleteCours = async (id: string) => {
    await supabase.from('cours_semaine').delete().eq('id', id)
    setCours(prev => prev.filter(c => c.id !== id))
  }

  // ── Upcoming notes (next 30 days) ─────────────────────────────────────────
  const todayIso = today()
  const in30 = toIso(new Date(Date.now() + 30 * 86400000))
  const upcomingHolidays = HOLIDAYS.filter(h => h.date >= todayIso && h.date <= in30).slice(0, 5)
  const upcomingNotes = notes.filter(n => n.date >= todayIso && n.date <= in30).slice(0, 5)

  const selectedHolidays = holidaysForDate(selectedDate)
  const selectedNotes = notesForDate(selectedDate)
  const selectedCours = (() => {
    const d = new Date(selectedDate + 'T12:00:00')
    return coursForDate(d)
  })()

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar profil={profil} activeHref="/dashboard/calendrier" />

      <div className="main-content">

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Calendrier</div>
            <div className="topbar-sub">Agenda pédagogique · {monthYear.year}-{monthYear.year + 1}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 2 }}>
              {(['mois', 'semaine'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{
                    padding: '5px 14px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: view === v ? 'var(--blue)' : 'transparent',
                    color: view === v ? 'white' : 'var(--text-3)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {v === 'mois' ? 'Mois' : 'Semaine'}
                </button>
              ))}
            </div>
            {view === 'mois' ? (
              <>
                <button onClick={() => setMoisOffset(o => o - 1)} className="btn-ghost btn-sm">← Préc.</button>
                <button onClick={() => setMoisOffset(0)} className="btn-ghost btn-sm"
                  style={{ background: moisOffset === 0 ? 'var(--blue-pale)' : undefined, color: moisOffset === 0 ? '#60A5FA' : undefined }}>
                  Aujourd'hui
                </button>
                <button onClick={() => setMoisOffset(o => o + 1)} className="btn-ghost btn-sm">Suiv. →</button>
              </>
            ) : (
              <>
                <button onClick={() => setSemaine(s => s - 1)} className="btn-ghost btn-sm">← Semaine préc.</button>
                <button onClick={() => setSemaine(0)} className="btn-ghost btn-sm"
                  style={{ background: semaine === 0 ? 'var(--blue-pale)' : undefined, color: semaine === 0 ? '#60A5FA' : undefined }}>
                  Aujourd'hui
                </button>
                <button onClick={() => setSemaine(s => s + 1)} className="btn-ghost btn-sm">Semaine suiv. →</button>
              </>
            )}
            <button onClick={() => setShowAddCours(true)} className="btn-ghost btn-sm">+ Cours</button>
            <button onClick={() => { setShowAddNote(true) }} className="btn-primary btn-sm">+ Note</button>
          </div>
        </div>

        <div className="page-content fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

          {/* Main calendar area */}
          <div>

            {/* Add cours form */}
            {showAddCours && (
              <div className="card fade-in" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Ajouter un cours récurrent</div>
                  <button onClick={() => setShowAddCours(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
                </div>
                <form onSubmit={handleAddCours}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Classe *</label>
                      <select value={coursForm.classe_id} onChange={e => setCoursForm({ ...coursForm, classe_id: e.target.value })} required>
                        <option value="">Choisir</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Jour *</label>
                      <select value={coursForm.jour} onChange={e => setCoursForm({ ...coursForm, jour: e.target.value })}>
                        {JOURS_SEMAINE.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Salle</label>
                      <input value={coursForm.salle} onChange={e => setCoursForm({ ...coursForm, salle: e.target.value })} placeholder="B-204" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Heure début</label>
                      <select value={coursForm.heure_debut} onChange={e => setCoursForm({ ...coursForm, heure_debut: e.target.value })}>
                        {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Heure fin</label>
                      <select value={coursForm.heure_fin} onChange={e => setCoursForm({ ...coursForm, heure_fin: e.target.value })}>
                        {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Note</label>
                      <input value={coursForm.note} onChange={e => setCoursForm({ ...coursForm, note: e.target.value })} placeholder="Gym, labo..." />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn-primary btn-sm">Ajouter</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setShowAddCours(false)}>Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {/* ── MONTH VIEW ── */}
            {view === 'mois' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                    {MOIS_NOMS[monthYear.month]} {monthYear.year}
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Férié', color: HOLIDAY_COLORS.ferie },
                      { label: 'Scolaire', color: HOLIDAY_COLORS.scolaire },
                      { label: 'Fête', color: HOLIDAY_COLORS.fete },
                      { label: 'Ma note', color: '#6B3FA0' },
                    ].map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                }}>
                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                    {JOURS_GRID.map(j => (
                      <div key={j} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'rgba(255,255,255,0.03)' }}>
                        {j}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {daysInMonth.map((d, i) => {
                      const iso = toIso(d)
                      const isThisMonth = d.getMonth() === monthYear.month
                      const isToday = iso === todayIso
                      const isSelected = iso === selectedDate
                      const dayHolidays = holidaysForDate(iso)
                      const dayNotes = notesForDate(iso)
                      const dayCours = coursForDate(d)
                      const hasContent = dayHolidays.length > 0 || dayNotes.length > 0 || dayCours.length > 0

                      return (
                        <div key={i}
                          onClick={() => setSelectedDate(iso)}
                          style={{
                            minHeight: 90,
                            padding: '6px 8px',
                            borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--border)',
                            borderBottom: i < daysInMonth.length - 7 ? '1px solid var(--border)' : 'none',
                            background: isSelected ? 'rgba(96,165,250,0.08)' : isToday ? 'rgba(96,165,250,0.04)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            position: 'relative',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(96,165,250,0.04)' : 'transparent' }}
                        >
                          {/* Day number */}
                          <div style={{
                            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 500,
                            background: isToday ? '#3B82F6' : 'transparent',
                            color: isToday ? 'white' : isThisMonth ? 'var(--text-1)' : 'var(--text-5, var(--text-4))',
                            marginBottom: 4,
                          }}>
                            {d.getDate()}
                          </div>

                          {/* Holiday chips */}
                          {dayHolidays.slice(0, 2).map((h, hi) => (
                            <div key={hi} style={{
                              fontSize: 9, fontWeight: 600, padding: '1px 5px',
                              borderRadius: 4, marginBottom: 2,
                              background: `${HOLIDAY_COLORS[h.type]}22`,
                              color: HOLIDAY_COLORS[h.type],
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{h.titre}</div>
                          ))}

                          {/* Notes */}
                          {dayNotes.slice(0, 2).map((n, ni) => (
                            <div key={ni} style={{
                              fontSize: 9, fontWeight: 600, padding: '1px 5px',
                              borderRadius: 4, marginBottom: 2,
                              background: `${n.couleur || '#6B3FA0'}22`,
                              color: n.couleur || '#A78BFA',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{n.titre}</div>
                          ))}

                          {/* Course dots */}
                          {dayCours.length > 0 && (
                            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                              {dayCours.slice(0, 4).map((c, ci) => (
                                <div key={ci} style={{ width: 6, height: 6, borderRadius: '50%', background: c.couleur || 'var(--blue)', flexShrink: 0 }} title={c.nom_classe} />
                              ))}
                              {dayCours.length > 4 && <span style={{ fontSize: 8, color: 'var(--text-4)' }}>+{dayCours.length - 4}</span>}
                            </div>
                          )}

                          {/* Overflow indicator */}
                          {(dayHolidays.length + dayNotes.length > 2) && (
                            <div style={{ fontSize: 8, color: 'var(--text-4)', marginTop: 1 }}>
                              +{dayHolidays.length + dayNotes.length - 2} autres
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── WEEK VIEW ── */}
            {view === 'semaine' && (
              <div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    Semaine du {lundi.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {semaine === 0 && <span className="badge badge-blue">Semaine actuelle</span>}
                </div>
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)' }} />
                    {JOURS_SEMAINE.map((jour, i) => {
                      const d = new Date(lundi)
                      d.setDate(lundi.getDate() + i)
                      const iso = toIso(d)
                      const dayH = holidaysForDate(iso)
                      return (
                        <div key={jour} style={{ padding: '10px', background: 'rgba(255,255,255,0.04)', borderLeft: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: iso === todayIso ? '#60A5FA' : 'var(--text-1)' }}>{jour}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{formatDate(new Date(lundi), i)}</div>
                          {dayH.map((h, hi) => (
                            <div key={hi} style={{ fontSize: 9, color: HOLIDAY_COLORS[h.type], marginTop: 2 }}>● {h.titre}</div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  {HEURES.map((heure, hi) => (
                    <div key={heure} style={{
                      display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)',
                      borderBottom: hi < HEURES.length - 1 ? '1px solid var(--border)' : 'none',
                      minHeight: 70,
                    }}>
                      <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>{heure}</span>
                      </div>
                      {JOURS_SEMAINE.map(jour => {
                        const coursDuSlot = getCoursPour(jour, heure)
                        return (
                          <div key={jour} style={{ borderLeft: '1px solid var(--border)', padding: 4, minHeight: 70 }}>
                            {coursDuSlot.map(c => (
                              <div key={c.id} style={{ background: c.couleur || 'var(--blue)', borderRadius: 6, padding: '6px 8px', marginBottom: 3, position: 'relative' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.nom_classe}</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{c.heure_debut} – {c.heure_fin}{c.salle && ` · ${c.salle}`}</div>
                                {c.note && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{c.note}</div>}
                                <button onClick={() => handleDeleteCours(c.id)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 4, width: 16, height: 16, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Selected day */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  {selectedDate === todayIso && <div style={{ fontSize: 10, color: '#60A5FA', marginTop: 2 }}>Aujourd'hui</div>}
                </div>
                <button onClick={() => setShowAddNote(true)}
                  style={{ padding: '5px 10px', border: '1px dashed var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>
                  + Note
                </button>
              </div>

              {/* Add note form */}
              {showAddNote && (
                <form onSubmit={handleAddNote} style={{ marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input value={noteForm.titre} onChange={e => setNoteForm({ ...noteForm, titre: e.target.value })}
                    placeholder="Titre de la note..." required
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' as const }} />
                  <textarea value={noteForm.description} onChange={e => setNoteForm({ ...noteForm, description: e.target.value })}
                    placeholder="Description (optionnel)..." rows={2}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 12, resize: 'none' as const, marginBottom: 8, boxSizing: 'border-box' as const }} />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[
                      { type: 'note', label: 'Note', color: '#6B3FA0' },
                      { type: 'rappel', label: 'Rappel', color: '#F59E0B' },
                      { type: 'evenement', label: 'Événement', color: '#10B981' },
                    ].map(t => (
                      <button key={t.type} type="button" onClick={() => setNoteForm({ ...noteForm, type: t.type, couleur: t.color })}
                        style={{ flex: 1, padding: '4px 0', border: `1px solid ${noteForm.type === t.type ? t.color : 'var(--border)'}`, borderRadius: 6, background: noteForm.type === t.type ? `${t.color}22` : 'transparent', color: noteForm.type === t.type ? t.color : 'var(--text-3)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="submit" disabled={savingNote} className="btn-primary btn-sm" style={{ flex: 1 }}>
                      {savingNote ? '...' : '✓ Ajouter'}
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setShowAddNote(false)}>Annuler</button>
                  </div>
                </form>
              )}

              {/* Holidays for selected day */}
              {selectedHolidays.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: `${HOLIDAY_COLORS[h.type]}15`, borderRadius: 7, border: `1px solid ${HOLIDAY_COLORS[h.type]}44`, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: HOLIDAY_COLORS[h.type], flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{h.titre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{h.type === 'ferie' ? 'Congé férié' : h.type === 'scolaire' ? 'Événement scolaire' : 'Fête'}</div>
                  </div>
                </div>
              ))}

              {/* Notes for selected day */}
              {selectedNotes.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: `${n.couleur || '#6B3FA0'}15`, borderRadius: 7, border: `1px solid ${n.couleur || '#6B3FA0'}44`, marginBottom: 6, position: 'relative' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.couleur || '#6B3FA0', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{n.titre}</div>
                    {n.description && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{n.description}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{n.type}</div>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 12, padding: 2 }}>✕</button>
                </div>
              ))}

              {/* Courses for selected day */}
              {selectedCours.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: `${c.couleur || '#1B3F6E'}20`, borderRadius: 7, border: `1px solid ${c.couleur || '#1B3F6E'}44`, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.couleur || '#1B3F6E', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.nom_classe}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{c.heure_debut} – {c.heure_fin}{c.salle ? ` · ${c.salle}` : ''}</div>
                  </div>
                </div>
              ))}

              {selectedHolidays.length === 0 && selectedNotes.length === 0 && selectedCours.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-4)', fontSize: 12 }}>
                  Aucun événement ce jour
                </div>
              )}
            </div>

            {/* Prochains événements */}
            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
                Prochains événements <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-4)' }}>(30 jours)</span>
              </div>
              {[
                ...upcomingHolidays.map(h => ({ date: h.date, titre: h.titre, color: HOLIDAY_COLORS[h.type], type: h.type })),
                ...upcomingNotes.map(n => ({ date: n.date, titre: n.titre, color: n.couleur || '#6B3FA0', type: n.type })),
              ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map((ev, i) => (
                <div key={i} onClick={() => setSelectedDate(ev.date)}
                  style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 3, height: 32, background: ev.color, borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{ev.titre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
              {upcomingHolidays.length === 0 && upcomingNotes.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '8px 0' }}>Aucun événement prévu</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
