'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import LoadingScreen from '@/components/LoadingScreen'
import ModalUploadEmploiDuTemps from '@/components/calendrier/ModalUploadEmploiDuTemps'
import ModalUploadCalendrier from '@/components/calendrier/ModalUploadCalendrier'

const JOURS_SEMAINE     = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const JOURS_SEMAINE_7   = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_GRID        = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_NOMS         = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const HEURES            = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
const HEURES_ETENDUES   = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

type JourFerie = { date: string; titre: string; type: 'ferie' | 'scolaire' | 'fete' }

const JOURS_FERIES: Record<string, Record<string, JourFerie[]>> = {
  Canada: {
    default: [
      // Fériés fédéraux
      { date: '2025-09-01', titre: 'Fête du travail',          type: 'ferie' },
      { date: '2025-10-13', titre: 'Action de grâce',          type: 'ferie' },
      { date: '2025-11-11', titre: 'Jour du Souvenir',         type: 'ferie' },
      { date: '2025-12-25', titre: 'Noël',                     type: 'ferie' },
      { date: '2025-12-26', titre: 'Boxing Day',               type: 'ferie' },
      { date: '2026-01-01', titre: "Jour de l'An",             type: 'ferie' },
      { date: '2026-04-03', titre: 'Vendredi Saint',           type: 'ferie' },
      { date: '2026-04-06', titre: 'Lundi de Pâques',          type: 'ferie' },
      { date: '2026-07-01', titre: 'Fête du Canada',           type: 'ferie' },
      // Fêtes populaires pan-canadiennes
      { date: '2025-10-31', titre: 'Halloween',                type: 'fete'  },
      { date: '2026-02-14', titre: 'Saint-Valentin',           type: 'fete'  },
      { date: '2026-03-17', titre: 'Saint-Patrick',            type: 'fete'  },
      { date: '2026-04-05', titre: 'Pâques',                   type: 'fete'  },
      { date: '2026-06-21', titre: 'Fête nationale autochtone',type: 'fete'  },
    ],
    Quebec: [
      { date: '2025-09-02', titre: 'Rentrée scolaire',         type: 'scolaire' },
      { date: '2025-12-22', titre: 'Vacances de Noël',         type: 'scolaire' },
      { date: '2026-01-05', titre: 'Retour en classe',         type: 'scolaire' },
      { date: '2026-02-16', titre: 'Début relâche scolaire',   type: 'scolaire' },
      { date: '2026-02-20', titre: 'Fin relâche scolaire',     type: 'scolaire' },
      { date: '2026-06-26', titre: "Fin d'année scolaire",     type: 'scolaire' },
      { date: '2026-05-18', titre: 'Journée des Patriotes',    type: 'ferie'    },
      { date: '2026-06-24', titre: 'Fête nationale du Québec', type: 'ferie'    },
    ],
    Ontario: [
      { date: '2025-09-02', titre: 'Rentrée scolaire',         type: 'scolaire' },
      { date: '2025-12-22', titre: 'Vacances de Noël',         type: 'scolaire' },
      { date: '2026-01-05', titre: 'Retour en classe',         type: 'scolaire' },
      { date: '2026-03-16', titre: 'Début relâche scolaire',   type: 'scolaire' },
      { date: '2026-03-20', titre: 'Fin relâche scolaire',     type: 'scolaire' },
      { date: '2026-06-26', titre: "Fin d'année scolaire",     type: 'scolaire' },
      { date: '2026-02-16', titre: 'Jour de la Famille',       type: 'ferie'    },
      { date: '2026-05-18', titre: 'Fête de Victoria',         type: 'ferie'    },
    ],
    Alberta: [
      { date: '2025-09-02', titre: 'Rentrée scolaire',         type: 'scolaire' },
      { date: '2025-12-22', titre: 'Vacances de Noël',         type: 'scolaire' },
      { date: '2026-01-05', titre: 'retour en classe',         type: 'scolaire' },
      { date: '2026-03-23', titre: 'Début relâche scolaire',   type: 'scolaire' },
      { date: '2026-03-27', titre: 'Fin relâche scolaire',     type: 'scolaire' },
      { date: '2026-06-26', titre: "Fin d'année scolaire",     type: 'scolaire' },
      { date: '2026-02-16', titre: 'Jour de la Famille',       type: 'ferie'    },
      { date: '2026-05-18', titre: 'Fête de Victoria',         type: 'ferie'    },
    ],
  },
  'États-Unis': {
    default: [
      { date: '2025-09-01', titre: 'Labor Day',                   type: 'ferie' },
      { date: '2025-11-11', titre: 'Veterans Day',                type: 'ferie' },
      { date: '2025-11-27', titre: 'Thanksgiving',                type: 'ferie' },
      { date: '2025-12-25', titre: 'Christmas',                   type: 'ferie' },
      { date: '2026-01-01', titre: "New Year's Day",              type: 'ferie' },
      { date: '2026-01-19', titre: 'Martin Luther King Jr. Day',  type: 'ferie' },
      { date: '2026-02-16', titre: "Presidents' Day",             type: 'ferie' },
      { date: '2026-05-25', titre: 'Memorial Day',                type: 'ferie' },
      { date: '2026-07-04', titre: 'Independence Day',            type: 'ferie' },
      { date: '2025-10-31', titre: 'Halloween',                   type: 'fete'  },
      { date: '2026-02-14', titre: 'Valentine\'s Day',            type: 'fete'  },
    ],
  },
}

function getActiveHolidays(pays?: string, province?: string): JourFerie[] {
  const country     = pays || 'Canada'
  const countryData = JOURS_FERIES[country]
  if (!countryData) return []
  const defaults = countryData['default'] || []
  const specific = province && countryData[province] ? countryData[province] : []
  return [...defaults, ...specific]
}

const HOLIDAY_COLORS: Record<string, string> = { ferie: '#F59E0B', scolaire: '#10B981', fete: '#EC4899' }

const TYPE_EVT_CONFIG: Record<string, { icon: string; color: string }> = {
  lecon:               { icon: '📚', color: '#A78BFA' },
  evaluation:          { icon: '📊', color: '#F87171' },
  devoir:              { icon: '🏠', color: '#FBC34A' },
  reunion_parents:     { icon: '👥', color: '#F472B6' },
  evenement:           { icon: '🎉', color: '#FB923C' },
  rappel:              { icon: '🔔', color: '#60A5FA' },
  ferie:               { icon: '🏖️', color: '#94A3B8' },
  calendrier_scolaire: { icon: '🏫', color: '#818CF8' },
}

const EVT_TYPES   = ['lecon', 'evaluation', 'devoir', 'reunion_parents', 'evenement', 'rappel']
const EVT_COLORS  = ['#6B3FA0', '#A78BFA', '#60A5FA', '#34D399', '#FBC34A', '#F472B6', '#FB923C', '#F87171']

const JOUR_MAP: Record<string, number> = {
  'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6, 'Dimanche': 0,
}

function toIso(d: Date) { return d.toISOString().split('T')[0] }
function todayIso()     { return toIso(new Date()) }

export default function CalendrierPage() {
  const [profil,     setProfil]     = useState<any>(null)
  const [classes,    setClasses]    = useState<any[]>([])
  const [cours,      setCours]      = useState<any[]>([])
  const [notes,      setNotes]      = useState<any[]>([])
  const [evenements, setEvenements] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)

  const [view,         setView]         = useState<'mois' | 'semaine' | 'jour'>('mois')
  const [semaine,      setSemaine]      = useState(0)
  const [moisOffset,   setMoisOffset]   = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(todayIso())

  // Note form (notes_agenda — existing)
  const [showAddNote, setShowAddNote] = useState(false)
  const [savingNote,  setSavingNote]  = useState(false)
  const [noteForm,    setNoteForm]    = useState({ titre: '', description: '', type: 'note', couleur: '#6B3FA0' })

  // Cours form (cours_semaine — existing)
  const [showAddCours, setShowAddCours] = useState(false)
  const [coursForm,    setCoursForm]    = useState({ classe_id: '', jour: 'Lundi', heure_debut: '8:00', heure_fin: '9:00', salle: '', note: '' })

  // Upload modals
  const [showUploadEmploi,     setShowUploadEmploi]     = useState(false)
  const [showUploadCalendrier, setShowUploadCalendrier] = useState(false)

  // Evenement modal (evenements_calendrier — new)
  const [showEvtModal, setShowEvtModal] = useState(false)
  const [savingEvt,    setSavingEvt]    = useState(false)
  const [evtForm,      setEvtForm]      = useState({
    titre: '', type: 'evenement', dateDebut: todayIso(), dateFin: '',
    touteJournee: true, classeId: '', description: '', couleur: '#6B3FA0',
    genererNoteIA: false, heureDebut: '8:00', heureFin: '9:00',
  })

  const supabase = createClient()
  const router   = useRouter()

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      setProfil(p)
      if (!p?.id) { setLoading(false); return }

      const [clsRes, coursRes, notesRes, evtRes] = await Promise.all([
        supabase.from('classes').select('*').eq('enseignant_id', p.id),
        supabase.from('cours_semaine').select('*').eq('enseignant_id', p.id),
        supabase.from('notes_agenda').select('*').eq('enseignant_id', p.id).order('date'),
        supabase.from('evenements_calendrier').select('*').eq('enseignant_id', p.id).order('date_debut'),
      ])
      setClasses(clsRes.data || [])
      setCours(coursRes.data || [])
      setNotes(notesRes.data || [])
      setEvenements(evtRes.data || [])
      setLoading(false)

      // Auto-generate AI notes on first connection of the day
      const autoKey = `klassia_auto_notes_${todayIso()}`
      if (!localStorage.getItem(autoKey) && p?.id) {
        localStorage.setItem(autoKey, '1')
        const evtsToday = (evtRes.data || []).filter((e: any) => e.date_debut === todayIso() && !e.note_ia)
        for (const evt of evtsToday.slice(0, 3)) {
          try {
            const resp = await fetch('/api/ia/generer', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type_contenu: 'note_automatique', sujet: evt.titre, langue: p.langue_interface || 'fr', contexte: { evenement: evt } }),
            })
            const { contenu } = await resp.json()
            if (contenu && !contenu.startsWith('⚠')) {
              await supabase.from('evenements_calendrier').update({ note_ia: contenu }).eq('id', evt.id)
              setEvenements(prev => prev.map((e: any) => e.id === evt.id ? { ...e, note_ia: contenu } : e))
            }
          } catch { /* non-bloquant */ }
        }
      }
    }
    init()
  }, [])

  // ── Month helpers ─────────────────────────────────────────────────────────
  const baseMonth = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + moisOffset); return d
  })()
  const monthYear = { year: baseMonth.getFullYear(), month: baseMonth.getMonth() }
  const daysInMonth = (() => {
    const days: Date[] = []
    const first = new Date(monthYear.year, monthYear.month, 1)
    const last  = new Date(monthYear.year, monthYear.month + 1, 0)
    const start = new Date(first)
    const dow   = first.getDay() === 0 ? 7 : first.getDay()
    start.setDate(start.getDate() - (dow - 1))
    while (start <= last || days.length % 7 !== 0) {
      days.push(new Date(start)); start.setDate(start.getDate() + 1)
      if (days.length > 42) break
    }
    return days
  })()

  // ── Week helpers ──────────────────────────────────────────────────────────
  const getDateSemaine = (offset = 0) => {
    const t = new Date(); const day = t.getDay()
    const diff = t.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
    return new Date(t.setDate(diff))
  }
  const formatDateLabel = (base: Date, jourIndex: number) => {
    const d = new Date(base); d.setDate(base.getDate() + jourIndex)
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
  }
  const lundi = getDateSemaine(semaine)
  const getCoursPour = (jour: string, heure: string) => cours.filter((c: any) => c.jour === jour && c.heure_debut === heure)

  // ── Event helpers ─────────────────────────────────────────────────────────
  const activeHolidays  = getActiveHolidays(profil?.pays, profil?.province)
  const regionConnue    = !profil || !!JOURS_FERIES[profil?.pays || 'Canada']
  const holidaysForDate = (iso: string) => activeHolidays.filter(h => h.date === iso)
  const notesForDate    = (iso: string)  => notes.filter((n: any) => n.date === iso)
  const eventsForDate   = (iso: string)  => evenements.filter((e: any) => e.date_debut === iso)
  const coursForDate    = (d: Date)      => { const dow = d.getDay() === 0 ? 7 : d.getDay(); return cours.filter((c: any) => JOUR_MAP[c.jour] === dow) }

  const getHourFromTime = (t?: string)   => { if (!t) return -1; return parseInt(t.split(':')[0], 10) }
  const evtsForHour     = (iso: string, h: number) => evenements.filter((e: any) => e.date_debut === iso && getHourFromTime(e.heure_debut) === h)
  const evtsAllDay      = (iso: string)  => evenements.filter((e: any) => e.date_debut === iso && !e.heure_debut)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault(); if (!profil?.id || !noteForm.titre) return
    setSavingNote(true)
    const { data, error } = await supabase.from('notes_agenda').insert({ enseignant_id: profil.id, date: selectedDate, titre: noteForm.titre, description: noteForm.description, type: noteForm.type, couleur: noteForm.couleur }).select().single()
    if (!error && data) { setNotes(prev => [...prev, data].sort((a: any, b: any) => a.date.localeCompare(b.date))); setNoteForm({ titre: '', description: '', type: 'note', couleur: '#6B3FA0' }); setShowAddNote(false) }
    setSavingNote(false)
  }

  const handleDeleteNote = async (id: string) => {
    await supabase.from('notes_agenda').delete().eq('id', id)
    setNotes(prev => prev.filter((n: any) => n.id !== id))
  }

  const handleAddCours = async (e: React.FormEvent) => {
    e.preventDefault(); if (!profil?.id || !coursForm.classe_id) return
    const classe = classes.find((c: any) => c.id === coursForm.classe_id)
    const { data, error } = await supabase.from('cours_semaine').insert({ enseignant_id: profil.id, classe_id: coursForm.classe_id, nom_classe: classe?.nom || '', couleur: classe?.couleur || '#1B3F6E', jour: coursForm.jour, heure_debut: coursForm.heure_debut, heure_fin: coursForm.heure_fin, salle: coursForm.salle, note: coursForm.note, recurrent: true }).select().single()
    if (!error && data) { setCours(prev => [...prev, data]); setShowAddCours(false); setCoursForm({ classe_id: '', jour: 'Lundi', heure_debut: '8:00', heure_fin: '9:00', salle: '', note: '' }) }
  }

  const handleDeleteCours = async (id: string) => {
    await supabase.from('cours_semaine').delete().eq('id', id)
    setCours(prev => prev.filter((c: any) => c.id !== id))
  }

  const handleCreateEvenement = async (e: React.FormEvent) => {
    e.preventDefault(); if (!profil?.id || !evtForm.titre) return
    setSavingEvt(true)
    const { data: newEvt, error } = await supabase.from('evenements_calendrier').insert({
      enseignant_id: profil.id,
      classe_id:     evtForm.classeId || null,
      titre:         evtForm.titre,
      description:   evtForm.description || null,
      date_debut:    evtForm.dateDebut,
      date_fin:      evtForm.dateFin || null,
      heure_debut:   evtForm.touteJournee ? null : evtForm.heureDebut,
      heure_fin:     evtForm.touteJournee ? null : evtForm.heureFin,
      type:          evtForm.type,
      couleur:       evtForm.couleur,
      rappel:        false,
    }).select().single()

    if (!error && newEvt) {
      setEvenements(prev => [...prev, newEvt])
      if (evtForm.genererNoteIA) {
        try {
          const resp = await fetch('/api/ia/generer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type_contenu: 'note_automatique', sujet: evtForm.titre, langue: profil.langue_interface || 'fr', contexte: { evenement: newEvt } }),
          })
          const { contenu } = await resp.json()
          if (contenu && !contenu.startsWith('⚠')) {
            await supabase.from('evenements_calendrier').update({ note_ia: contenu }).eq('id', newEvt.id)
            setEvenements(prev => prev.map((ev: any) => ev.id === newEvt.id ? { ...ev, note_ia: contenu } : ev))
          }
        } catch { /* non-bloquant */ }
      }
      setShowEvtModal(false)
      setEvtForm({ titre: '', type: 'evenement', dateDebut: selectedDate, dateFin: '', touteJournee: true, classeId: '', description: '', couleur: '#6B3FA0', genererNoteIA: false, heureDebut: '8:00', heureFin: '9:00' })
    }
    setSavingEvt(false)
  }

  const handleDeleteEvenement = async (id: string) => {
    await supabase.from('evenements_calendrier').delete().eq('id', id)
    setEvenements(prev => prev.filter((e: any) => e.id !== id))
  }

  // ── Upcoming ──────────────────────────────────────────────────────────────
  const now  = todayIso()
  const in30 = toIso(new Date(Date.now() + 30 * 86400000))
  const upcomingHolidays = activeHolidays.filter(h => h.date >= now && h.date <= in30).slice(0, 5)
  const upcomingNotes    = notes.filter((n: any) => n.date >= now && n.date <= in30).slice(0, 5)
  const upcomingEvts     = evenements.filter((e: any) => e.date_debut >= now && e.date_debut <= in30).slice(0, 5)

  const selectedHolidays = holidaysForDate(selectedDate)
  const selectedNotes    = notesForDate(selectedDate)
  const selectedEvts     = eventsForDate(selectedDate)
  const selectedCours    = coursForDate(new Date(selectedDate + 'T12:00:00'))

  if (loading) return <LoadingScreen />

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/calendrier" onLogout={async () => { await supabase.auth.signOut(); router.push('/login') }} />

      <div className="main-content">

        {/* Topbar */}
        <Topbar
          initiales={`${profil?.prenom?.[0] || ''}${profil?.nom?.[0] || ''}`.toUpperCase() || '?'}
          isFr={profil?.langue_interface !== 'en'}
        />

        {/* Calendar nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', borderBottom: '1px solid rgba(15,35,65,0.08)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', flexWrap: 'wrap' as const }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginRight: 4 }}>Calendrier</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{monthYear.year}-{monthYear.year + 1}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', background: 'rgba(108,92,231,0.08)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['mois', 'semaine', 'jour'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 13px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, background: view === v ? 'var(--violet)' : 'transparent', color: view === v ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {v === 'mois' ? 'Mois' : v === 'semaine' ? 'Semaine' : 'Jour'}
              </button>
            ))}
          </div>

          {view === 'mois' && (<>
            <button onClick={() => setMoisOffset(o => o - 1)} className="btn-ghost btn-sm">← Préc.</button>
            <button onClick={() => setMoisOffset(0)} className="btn-ghost btn-sm" style={{ background: moisOffset === 0 ? 'rgba(108,92,231,0.1)' : undefined, color: moisOffset === 0 ? 'var(--violet)' : undefined }}>Aujourd&apos;hui</button>
            <button onClick={() => setMoisOffset(o => o + 1)} className="btn-ghost btn-sm">Suiv. →</button>
          </>)}
          {view === 'semaine' && (<>
            <button onClick={() => setSemaine(s => s - 1)} className="btn-ghost btn-sm">← Semaine préc.</button>
            <button onClick={() => setSemaine(0)} className="btn-ghost btn-sm" style={{ background: semaine === 0 ? 'rgba(108,92,231,0.1)' : undefined, color: semaine === 0 ? 'var(--violet)' : undefined }}>Aujourd&apos;hui</button>
            <button onClick={() => setSemaine(s => s + 1)} className="btn-ghost btn-sm">Semaine suiv. →</button>
          </>)}
          {view === 'jour' && (<>
            <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(toIso(d)) }} className="btn-ghost btn-sm">← Préc.</button>
            <button onClick={() => setSelectedDate(todayIso())} className="btn-ghost btn-sm" style={{ background: selectedDate === todayIso() ? 'rgba(108,92,231,0.1)' : undefined, color: selectedDate === todayIso() ? 'var(--violet)' : undefined }}>Aujourd&apos;hui</button>
            <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(toIso(d)) }} className="btn-ghost btn-sm">Suiv. →</button>
          </>)}

          <button onClick={() => setShowAddCours(true)} className="btn-ghost btn-sm">+ Cours</button>
          <button onClick={() => { setEvtForm((f: any) => ({ ...f, dateDebut: selectedDate })); setShowEvtModal(true) }} className="btn-primary btn-sm">+ Événement</button>
          <button onClick={() => setShowAddNote(true)} className="btn-ghost btn-sm">+ Note</button>
          <button onClick={() => setShowUploadEmploi(true)} className="btn-ghost btn-sm">📤 Importer mon emploi du temps</button>
          <button onClick={() => setShowUploadCalendrier(true)} className="btn-ghost btn-sm">📅 Importer le calendrier scolaire</button>
        </div>

        <div className="page-content fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

          {/* Main area */}
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
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{MOIS_NOMS[monthYear.month]} {monthYear.year}</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ label: 'Férié', color: HOLIDAY_COLORS.ferie }, { label: 'Scolaire', color: HOLIDAY_COLORS.scolaire }, { label: 'Fête', color: HOLIDAY_COLORS.fete }, { label: 'Ma note', color: '#6B3FA0' }, { label: 'Événement', color: '#A78BFA' }, { label: 'Cal. scolaire', color: '#818CF8' }].map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                    {JOURS_GRID.map(j => (
                      <div key={j} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'rgba(255,255,255,0.03)' }}>{j}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {daysInMonth.map((d, i) => {
                      const iso     = toIso(d)
                      const isMonth = d.getMonth() === monthYear.month
                      const isToday = iso === now
                      const isSel   = iso === selectedDate
                      const dHols   = holidaysForDate(iso)
                      const dNotes  = notesForDate(iso)
                      const dEvts   = eventsForDate(iso)
                      const dCours  = coursForDate(d)
                      const allItems = dHols.length + dNotes.length + dEvts.length
                      return (
                        <div key={i} onClick={() => setSelectedDate(iso)}
                          style={{ minHeight: 90, padding: '6px 8px', borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--border)', borderBottom: i < daysInMonth.length - 7 ? '1px solid var(--border)' : 'none', background: isSel ? 'rgba(96,165,250,0.08)' : isToday ? 'rgba(96,165,250,0.04)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? 'rgba(96,165,250,0.04)' : 'transparent' }}>
                          <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 500, background: isToday ? '#3B82F6' : 'transparent', color: isToday ? 'white' : isMonth ? 'var(--text-1)' : 'var(--text-5, var(--text-4))', marginBottom: 4 }}>{d.getDate()}</div>
                          {dHols.slice(0, 1).map((h, hi) => (
                            <div key={hi} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, marginBottom: 2, background: `${HOLIDAY_COLORS[h.type]}22`, color: HOLIDAY_COLORS[h.type], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.titre}</div>
                          ))}
                          {dEvts.slice(0, 1).map((ev: any, ei: number) => {
                            const cfg = TYPE_EVT_CONFIG[ev.type] || TYPE_EVT_CONFIG.evenement
                            return <div key={ei} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, marginBottom: 2, background: `${ev.couleur || cfg.color}22`, color: ev.couleur || cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.icon} {ev.titre}</div>
                          })}
                          {dNotes.slice(0, 1).map((n: any, ni: number) => (
                            <div key={ni} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, marginBottom: 2, background: `${n.couleur || '#6B3FA0'}22`, color: n.couleur || '#A78BFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titre}</div>
                          ))}
                          {dCours.length > 0 && (
                            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                              {dCours.slice(0, 4).map((c: any, ci: number) => <div key={ci} style={{ width: 6, height: 6, borderRadius: '50%', background: c.couleur || 'var(--blue)', flexShrink: 0 }} title={c.nom_classe} />)}
                              {dCours.length > 4 && <span style={{ fontSize: 8, color: 'var(--text-4)' }}>+{dCours.length - 4}</span>}
                            </div>
                          )}
                          {allItems > 2 && <div style={{ fontSize: 8, color: 'var(--text-4)', marginTop: 1 }}>+{allItems - 2} autres</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── WEEK VIEW (7 columns, Mon–Sun) ── */}
            {view === 'semaine' && (
              <div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    Semaine du {lundi.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {semaine === 0 && <span className="badge badge-blue">Semaine actuelle</span>}
                </div>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `70px repeat(7, 1fr)`, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)' }} />
                    {JOURS_SEMAINE_7.map((jour, i) => {
                      const d   = new Date(lundi); d.setDate(lundi.getDate() + i)
                      const iso = toIso(d)
                      const dH  = holidaysForDate(iso)
                      const dE  = eventsForDate(iso)
                      return (
                        <div key={jour} onClick={() => { setSelectedDate(iso); setView('jour') }}
                          style={{ padding: '8px 6px', background: iso === now ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.04)', borderLeft: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: iso === now ? '#60A5FA' : 'var(--text-2)' }}>{JOURS_GRID[i]}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>{formatDateLabel(new Date(lundi), i)}</div>
                          {dH.slice(0, 1).map((h, hi) => <div key={hi} style={{ fontSize: 8, color: HOLIDAY_COLORS[h.type], marginTop: 2 }}>● {h.titre}</div>)}
                          {dE.length > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', margin: '3px auto 0' }} />}
                        </div>
                      )
                    })}
                  </div>
                  {HEURES.map((heure, hi) => (
                    <div key={heure} style={{ display: 'grid', gridTemplateColumns: `70px repeat(7, 1fr)`, borderBottom: hi < HEURES.length - 1 ? '1px solid var(--border)' : 'none', minHeight: 64 }}>
                      <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>{heure}</span>
                      </div>
                      {JOURS_SEMAINE_7.map((jour, jI) => {
                        const d   = new Date(lundi); d.setDate(lundi.getDate() + jI)
                        const iso = toIso(d)
                        const h   = parseInt(heure.split(':')[0], 10)
                        const cds = jI < 5 ? getCoursPour(jour, heure) : []
                        const evs = evtsForHour(iso, h)
                        return (
                          <div key={jour} style={{ borderLeft: '1px solid var(--border)', padding: 3, minHeight: 64 }}>
                            {cds.map((c: any) => (
                              <div key={c.id} style={{ background: c.couleur || 'var(--blue)', borderRadius: 5, padding: '5px 7px', marginBottom: 3, position: 'relative' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{c.nom_classe}</div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)' }}>{c.heure_debut}–{c.heure_fin}{c.salle ? ` · ${c.salle}` : ''}</div>
                                <button onClick={() => handleDeleteCours(c.id)} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 3, width: 14, height: 14, cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </div>
                            ))}
                            {evs.map((ev: any, ei: number) => {
                              const cfg = TYPE_EVT_CONFIG[ev.type] || TYPE_EVT_CONFIG.evenement
                              return <div key={ei} style={{ background: `${ev.couleur || cfg.color}22`, border: `1px solid ${ev.couleur || cfg.color}44`, borderRadius: 5, padding: '4px 6px', marginBottom: 3 }}><div style={{ fontSize: 10, fontWeight: 600, color: ev.couleur || cfg.color }}>{cfg.icon} {ev.titre}</div></div>
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── DAY VIEW ── */}
            {view === 'jour' && (
              <div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {selectedDate === now && <span className="badge badge-blue">Aujourd'hui</span>}
                </div>

                {(evtsAllDay(selectedDate).length > 0 || holidaysForDate(selectedDate).length > 0) && (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 6, textTransform: 'uppercase' }}>Toute la journée</div>
                    {holidaysForDate(selectedDate).map((h, i) => (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, background: `${HOLIDAY_COLORS[h.type]}22`, border: `1px solid ${HOLIDAY_COLORS[h.type]}44`, marginRight: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: HOLIDAY_COLORS[h.type] }}>{h.titre}</span>
                      </div>
                    ))}
                    {evtsAllDay(selectedDate).map((ev: any, i: number) => {
                      const cfg = TYPE_EVT_CONFIG[ev.type] || TYPE_EVT_CONFIG.evenement
                      return <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, background: `${ev.couleur || cfg.color}22`, border: `1px solid ${ev.couleur || cfg.color}44`, marginRight: 6, marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: ev.couleur || cfg.color }}>{cfg.icon} {ev.titre}</span></div>
                    })}
                  </div>
                )}

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {HEURES_ETENDUES.map((heure, hi) => {
                    const h   = parseInt(heure.split(':')[0], 10)
                    const dow = new Date(selectedDate + 'T12:00:00').getDay()
                    const jourNom = JOURS_SEMAINE_7[dow === 0 ? 6 : dow - 1]
                    const cds = getCoursPour(jourNom, heure)
                    const evs = evtsForHour(selectedDate, h)
                    const isNowHour = selectedDate === now && new Date().getHours() === h
                    return (
                      <div key={heure} style={{ display: 'flex', borderBottom: hi < HEURES_ETENDUES.length - 1 ? '1px solid var(--border)' : 'none', minHeight: 56, background: isNowHour ? 'rgba(96,165,250,0.04)' : 'transparent' }}>
                        <div style={{ width: 70, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: isNowHour ? '#60A5FA' : 'var(--text-4)', fontWeight: isNowHour ? 700 : 500 }}>{heure}</span>
                        </div>
                        <div style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {cds.map((c: any) => (
                            <div key={c.id} style={{ padding: '5px 10px', background: `${c.couleur || '#1B3F6E'}22`, borderRadius: 7, border: `1px solid ${c.couleur || '#1B3F6E'}44`, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 3, minHeight: 16, background: c.couleur || '#1B3F6E', borderRadius: 2, flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: c.couleur || '#60A5FA' }}>{c.nom_classe}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{c.heure_debut}–{c.heure_fin}{c.salle ? ` · ${c.salle}` : ''}</div>
                              </div>
                            </div>
                          ))}
                          {evs.map((ev: any, i: number) => {
                            const cfg = TYPE_EVT_CONFIG[ev.type] || TYPE_EVT_CONFIG.evenement
                            return (
                              <div key={i} style={{ padding: '6px 10px', background: `${ev.couleur || cfg.color}15`, borderRadius: 7, border: `1px solid ${ev.couleur || cfg.color}44` }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: ev.couleur || cfg.color, marginBottom: ev.note_ia ? 4 : 0 }}>{cfg.icon} {ev.titre}</div>
                                {ev.description && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: ev.note_ia ? 4 : 0 }}>{ev.description}</div>}
                                {ev.note_ia && (
                                  <div style={{ padding: '5px 8px', background: 'rgba(167,139,250,0.1)', borderRadius: 5, border: '1px solid rgba(167,139,250,0.2)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', marginBottom: 2 }}>✦ NOTE IA</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{ev.note_ia.slice(0, 200)}{ev.note_ia.length > 200 ? '…' : ''}</div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  {selectedDate === now && <div style={{ fontSize: 10, color: '#60A5FA', marginTop: 2 }}>Aujourd'hui</div>}
                </div>
                <button onClick={() => setShowAddNote(true)} style={{ padding: '5px 10px', border: '1px dashed var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>+ Note</button>
              </div>

              {showAddNote && (
                <form onSubmit={handleAddNote} style={{ marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input value={noteForm.titre} onChange={e => setNoteForm({ ...noteForm, titre: e.target.value })} placeholder="Titre de la note..." required
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' as const }} />
                  <textarea value={noteForm.description} onChange={e => setNoteForm({ ...noteForm, description: e.target.value })} placeholder="Description (optionnel)..." rows={2}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 12, resize: 'none' as const, marginBottom: 8, boxSizing: 'border-box' as const }} />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[{ type: 'note', label: 'Note', color: '#6B3FA0' }, { type: 'rappel', label: 'Rappel', color: '#F59E0B' }, { type: 'evenement', label: 'Événement', color: '#10B981' }].map(t => (
                      <button key={t.type} type="button" onClick={() => setNoteForm({ ...noteForm, type: t.type, couleur: t.color })}
                        style={{ flex: 1, padding: '4px 0', border: `1px solid ${noteForm.type === t.type ? t.color : 'var(--border)'}`, borderRadius: 6, background: noteForm.type === t.type ? `${t.color}22` : 'transparent', color: noteForm.type === t.type ? t.color : 'var(--text-3)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="submit" disabled={savingNote} className="btn-primary btn-sm" style={{ flex: 1 }}>{savingNote ? '...' : '✓ Ajouter'}</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setShowAddNote(false)}>Annuler</button>
                  </div>
                </form>
              )}

              {selectedHolidays.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: `${HOLIDAY_COLORS[h.type]}15`, borderRadius: 7, border: `1px solid ${HOLIDAY_COLORS[h.type]}44`, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: HOLIDAY_COLORS[h.type], flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{h.titre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{h.type === 'ferie' ? 'Congé férié' : h.type === 'scolaire' ? 'Événement scolaire' : 'Fête'}</div>
                  </div>
                </div>
              ))}

              {selectedEvts.map((ev: any, i: number) => {
                const cfg = TYPE_EVT_CONFIG[ev.type] || TYPE_EVT_CONFIG.evenement
                return (
                  <div key={i} style={{ padding: '7px 10px', background: `${ev.couleur || cfg.color}15`, borderRadius: 7, border: `1px solid ${ev.couleur || cfg.color}44`, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: ev.note_ia ? 5 : 0 }}>
                      <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: ev.couleur || cfg.color }}>{ev.titre}</div>
                        {ev.heure_debut && <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{ev.heure_debut.slice(0, 5)}{ev.heure_fin ? `–${ev.heure_fin.slice(0, 5)}` : ''}</div>}
                      </div>
                      <button onClick={() => handleDeleteEvenement(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 12, padding: 2 }}>✕</button>
                    </div>
                    {ev.note_ia && (
                      <div style={{ padding: '5px 8px', background: 'rgba(167,139,250,0.1)', borderRadius: 5, border: '1px solid rgba(167,139,250,0.2)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', marginBottom: 2 }}>✦ NOTE IA</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{ev.note_ia.slice(0, 120)}…</div>
                      </div>
                    )}
                  </div>
                )
              })}

              {selectedNotes.map((n: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: `${n.couleur || '#6B3FA0'}15`, borderRadius: 7, border: `1px solid ${n.couleur || '#6B3FA0'}44`, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.couleur || '#6B3FA0', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{n.titre}</div>
                    {n.description && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{n.description}</div>}
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 12, padding: 2 }}>✕</button>
                </div>
              ))}

              {selectedCours.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: `${c.couleur || '#1B3F6E'}20`, borderRadius: 7, border: `1px solid ${c.couleur || '#1B3F6E'}44`, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.couleur || '#1B3F6E', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.nom_classe}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{c.heure_debut}–{c.heure_fin}{c.salle ? ` · ${c.salle}` : ''}</div>
                  </div>
                </div>
              ))}

              {selectedHolidays.length === 0 && selectedEvts.length === 0 && selectedNotes.length === 0 && selectedCours.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-4)', fontSize: 12 }}>
                  Aucun événement ce jour<br />
                  <button onClick={() => { setEvtForm(f => ({ ...f, dateDebut: selectedDate })); setShowEvtModal(true) }} style={{ marginTop: 8, padding: '5px 12px', border: '1px dashed var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>+ Ajouter un événement</button>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
                Prochains événements <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-4)' }}>(30 jours)</span>
              </div>
              {[
                ...upcomingHolidays.map(h => ({ date: h.date, titre: h.titre, color: HOLIDAY_COLORS[h.type] })),
                ...upcomingEvts.map((ev: any) => { const cfg = TYPE_EVT_CONFIG[ev.type] || TYPE_EVT_CONFIG.evenement; return { date: ev.date_debut, titre: `${cfg.icon} ${ev.titre}`, color: ev.couleur || cfg.color } }),
                ...upcomingNotes.map((n: any) => ({ date: n.date, titre: n.titre, color: n.couleur || '#6B3FA0' })),
              ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map((ev, i) => (
                <div key={i} onClick={() => setSelectedDate(ev.date)} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 3, height: 32, background: ev.color, borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>{ev.titre}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))}
              {!regionConnue && profil?.pays && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', padding: '6px 0', fontStyle: 'italic' }}>
                  Aucun jour férié configuré pour votre région
                </div>
              )}
              {upcomingHolidays.length === 0 && upcomingEvts.length === 0 && upcomingNotes.length === 0 && regionConnue && (
                <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '8px 0' }}>Aucun événement prévu</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── EVENT MODAL ── */}
      {showEvtModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowEvtModal(false) }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Nouvel événement</div>
              <button onClick={() => setShowEvtModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateEvenement}>
              <div className="form-group">
                <label className="form-label">Titre *</label>
                <input value={evtForm.titre} onChange={e => setEvtForm({ ...evtForm, titre: e.target.value })} placeholder="Ex: Réunion parents, Évaluation..." required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Type</label>
                  <select value={evtForm.type} onChange={e => setEvtForm({ ...evtForm, type: e.target.value })}>
                    {EVT_TYPES.map(t => <option key={t} value={t}>{TYPE_EVT_CONFIG[t]?.icon} {t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Classe (optionnel)</label>
                  <select value={evtForm.classeId} onChange={e => setEvtForm({ ...evtForm, classeId: e.target.value })}>
                    <option value="">Toutes les classes</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date début *</label>
                  <input type="date" value={evtForm.dateDebut} onChange={e => setEvtForm({ ...evtForm, dateDebut: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date fin</label>
                  <input type="date" value={evtForm.dateFin} onChange={e => setEvtForm({ ...evtForm, dateFin: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="toutejournee" checked={evtForm.touteJournee} onChange={e => setEvtForm({ ...evtForm, touteJournee: e.target.checked })} />
                <label htmlFor="toutejournee" style={{ fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>Toute la journée</label>
              </div>

              {!evtForm.touteJournee && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Heure début</label>
                    <select value={evtForm.heureDebut} onChange={e => setEvtForm({ ...evtForm, heureDebut: e.target.value })}>
                      {HEURES_ETENDUES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Heure fin</label>
                    <select value={evtForm.heureFin} onChange={e => setEvtForm({ ...evtForm, heureFin: e.target.value })}>
                      {HEURES_ETENDUES.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={evtForm.description} onChange={e => setEvtForm({ ...evtForm, description: e.target.value })} placeholder="Notes, agenda, objectifs..." rows={2} style={{ resize: 'none' as const }} />
              </div>

              <div className="form-group">
                <label className="form-label">Couleur</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EVT_COLORS.map(c => (
                    <div key={c} onClick={() => setEvtForm({ ...evtForm, couleur: c })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: evtForm.couleur === c ? '3px solid var(--text-1)' : '3px solid transparent', transition: 'all 0.15s' }} />
                  ))}
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(167,139,250,0.08)', borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="gennoteIA" checked={evtForm.genererNoteIA} onChange={e => setEvtForm({ ...evtForm, genererNoteIA: e.target.checked })} />
                <label htmlFor="gennoteIA" style={{ fontSize: 12, color: '#A78BFA', cursor: 'pointer', fontWeight: 600 }}>✦ Générer une note IA automatique pour cet événement</label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={savingEvt} className="btn-primary" style={{ opacity: savingEvt ? 0.7 : 1 }}>
                  {savingEvt ? (evtForm.genererNoteIA ? '✦ Génération IA...' : 'Création...') : "✓ Créer l'événement"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setShowEvtModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS UPLOAD ── */}
      {showUploadEmploi && (
        <ModalUploadEmploiDuTemps
          profil={profil}
          classes={classes}
          cours={cours}
          onClose={() => setShowUploadEmploi(false)}
          onSuccess={async (nouvellesClasses, nouveauxCours) => {
            // Recharger les classes et cours après import
            if (!profil?.id) return
            const [clsRes, coursRes] = await Promise.all([
              createClient().from('classes').select('*').eq('enseignant_id', profil.id),
              createClient().from('cours_semaine').select('*').eq('enseignant_id', profil.id),
            ])
            setClasses(clsRes.data || [])
            setCours(coursRes.data || [])
          }}
        />
      )}
      {showUploadCalendrier && (
        <ModalUploadCalendrier
          profil={profil}
          classes={classes}
          onClose={() => setShowUploadCalendrier(false)}
          onSuccess={async () => {
            if (!profil?.id) return
            const evtRes = await createClient().from('evenements_calendrier').select('*').eq('enseignant_id', profil.id).order('date_debut')
            setEvenements(evtRes.data || [])
          }}
        />
      )}
    </div>
  )
}
