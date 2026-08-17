'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolYearHub from '@/components/mon-annee/SchoolYearHub'
import type { Classe, ProgrammeAnnuel, TeachingEvent } from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'

// ─── Hub inner (lit useSearchParams) ─────────────────────────────────────────

function MonAnneeHubInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [loading,    setLoading]    = useState(true)
  const [profil,     setProfil]     = useState<{ id: string; prenom: string; nom: string; langue: string } | null>(null)
  const [classes,    setClasses]    = useState<Classe[]>([])
  const [packs,      setPacks]      = useState<Record<string, TeachingPack>>({})
  const [programmes, setProgrammes] = useState<Record<string, ProgrammeAnnuel>>({})
  const [eventCounts,setEventCounts]= useState<Record<string, number>>({})  // packId → nb taught

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profilData } = await supabase
      .from('utilisateurs').select('id, prenom, nom, langue').eq('user_id', user.id).single()
    if (!profilData) { setLoading(false); return }
    setProfil(profilData)

    const { data: classesData } = await supabase
      .from('classes').select('*').eq('enseignant_id', profilData.id).order('created_at', { ascending: false })

    const cls = (classesData as Classe[] | null) ?? []
    setClasses(cls)
    if (cls.length === 0) { setLoading(false); return }

    const classeIds = cls.map(c => c.id)

    // Batch : packs, programmes, events en parallèle
    const [packsRes, progRes, eventsRes] = await Promise.all([
      supabase.from('teaching_packs').select('*').in('classe_id', classeIds),
      supabase.from('programme_annuel').select('id, classe_id, nb_unites, nb_lecons_total, syllabus_json, contenu_json').in('classe_id', classeIds),
      supabase.from('teaching_events').select('teaching_pack_id, sequence_index, lecon_index, event_type, occurred_at').in('classe_id', classeIds).order('occurred_at', { ascending: true }),
    ])

    // Indexer packs par classe_id (prend le plus récent si plusieurs)
    const packMap: Record<string, TeachingPack> = {}
    for (const p of (packsRes.data as TeachingPack[] | null) ?? []) {
      packMap[p.classe_id] = p
    }
    setPacks(packMap)

    // Indexer programmes par classe_id
    const progMap: Record<string, ProgrammeAnnuel> = {}
    for (const p of (progRes.data as ProgrammeAnnuel[] | null) ?? []) {
      progMap[p.classe_id] = p
    }
    setProgrammes(progMap)

    // Compter les leçons enseignées par pack (dernier event par (packId, seqIdx, leconIdx))
    const events = (eventsRes.data as Pick<TeachingEvent, 'teaching_pack_id' | 'sequence_index' | 'lecon_index' | 'event_type' | 'occurred_at'>[] | null) ?? []
    const lastEvent = new Map<string, string>()  // key → last event_type
    for (const ev of events) {
      const k = `${ev.teaching_pack_id}:${ev.sequence_index}:${ev.lecon_index}`
      lastEvent.set(k, ev.event_type)
    }
    const counts: Record<string, number> = {}
    for (const [k, et] of lastEvent) {
      if (et !== 'lesson_taught') continue
      const packId = k.split(':')[0]
      counts[packId] = (counts[packId] ?? 0) + 1
    }
    setEventCounts(counts)

    // Préférence de classe active pour lien hub
    const qParam = searchParams.get('classeId')
    if (qParam && typeof window !== 'undefined') {
      localStorage.setItem('klassia_active_classe', qParam)
    }

    setLoading(false)
  }, [router, searchParams])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingScreen />

  return (
    <SchoolYearHub
      profil={profil}
      classes={classes}
      packs={packs}
      programmes={programmes}
      eventCounts={eventCounts}
    />
  )
}

export default function MonAnneeHubPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MonAnneeHubInner />
    </Suspense>
  )
}
