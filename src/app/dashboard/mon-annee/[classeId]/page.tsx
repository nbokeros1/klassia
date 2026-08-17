'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolYearWorkspace from '@/components/mon-annee/SchoolYearWorkspace'
import type { Classe, ProgrammeAnnuel, ContenuProgramme, TeachingEvent, Eleve, StudentSupportPlanRow } from '@/lib/types/database'
import type { TeachingPack } from '@/lib/types/teaching-pack'
import type { SchoolYearDashboardData } from '@/lib/types/school-year-dashboard'
import { deriveData } from '@/lib/spie/derive-dashboard-data'

export default function WorkspacePage() {
  const { classeId } = useParams<{ classeId: string }>()
  const router = useRouter()

  const [loading,        setLoading]        = useState(true)
  const [profil,         setProfil]         = useState<{ id: string; prenom: string; nom: string; langue: string } | null>(null)
  const [allClasses,     setAllClasses]     = useState<Classe[]>([])
  const [classe,         setClasse]         = useState<Classe | null>(null)
  const [pack,           setPack]           = useState<TeachingPack | null>(null)
  const [programme,      setProgramme]      = useState<ProgrammeAnnuel | null>(null)
  const [teachingEvents, setTeachingEvents] = useState<TeachingEvent[]>([])
  const [loadingPack,    setLoadingPack]    = useState(false)
  const [dashboardData,  setDashboardData]  = useState<SchoolYearDashboardData | null>(null)
  const [eleves,         setEleves]         = useState<Eleve[]>([])
  const [supportPlans,   setSupportPlans]   = useState<StudentSupportPlanRow[]>([])

  const loadUser = useCallback(async () => {
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
    setAllClasses((classesData as Classe[] | null) ?? [])
    setLoading(false)
  }, [router])

  const loadWorkspaceData = useCallback(async (cid: string) => {
    setLoadingPack(true)
    const supabase = createClient()

    const [{ data: classeData }, { data: packData }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', cid).single(),
      supabase.from('teaching_packs').select('*').eq('classe_id', cid).maybeSingle(),
    ])

    setClasse(classeData as Classe | null)
    const tp = packData as TeachingPack | null
    setPack(tp)

    let prog: ProgrammeAnnuel | null = null
    if (tp?.programme_annuel_id) {
      const { data } = await supabase
        .from('programme_annuel').select('*').eq('id', tp.programme_annuel_id).single()
      prog = data as ProgrammeAnnuel | null
    } else if (tp) {
      const { data } = await supabase
        .from('programme_annuel').select('*').eq('classe_id', cid).maybeSingle()
      prog = data as ProgrammeAnnuel | null
    }
    setProgramme(prog)

    // Fetch élèves de la classe + support plans (graceful si table non existante)
    const [eventsRes, elevesRes, plansRes] = await Promise.all([
      tp?.id
        ? supabase.from('teaching_events').select('*').eq('teaching_pack_id', tp.id).order('occurred_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase.from('eleves').select('id, classe_id, enseignant_id, prenom, nom, besoins, notes_enseignant').eq('classe_id', cid),
      supabase.from('student_support_plans').select('*').eq('classe_id', cid),
    ])

    const events = (eventsRes.data as TeachingEvent[] | null) ?? []
    setTeachingEvents(events)
    setEleves((elevesRes.data as Eleve[] | null) ?? [])
    setSupportPlans((plansRes.data as StudentSupportPlanRow[] | null) ?? [])

    if (typeof window !== 'undefined') localStorage.setItem('klassia_active_classe', cid)

    const annee   = tp?.annee_scolaire ?? (classeData as Classe | null)?.annee_scolaire ?? undefined
    const derived = deriveData(tp, prog, events, annee)
    setDashboardData(derived)
    setLoadingPack(false)
  }, [])

  useEffect(() => { loadUser() }, [loadUser])
  useEffect(() => { if (classeId) loadWorkspaceData(classeId) }, [classeId, loadWorkspaceData])

  const handleRefresh = useCallback(() => {
    if (classeId) loadWorkspaceData(classeId)
  }, [classeId, loadWorkspaceData])

  if (loading) return <LoadingScreen />
  if (!dashboardData && loadingPack) return <LoadingScreen />

  return (
    <SchoolYearWorkspace
      profil={profil}
      allClasses={allClasses}
      classeId={classeId}
      classe={classe}
      pack={pack}
      programme={programme}
      teachingEvents={teachingEvents}
      dashboardData={dashboardData}
      loadingPack={loadingPack}
      onRefresh={handleRefresh}
      eleves={eleves}
      supportPlans={supportPlans}
    />
  )
}
