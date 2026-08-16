'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import SchoolYearDashboard from '@/components/mon-annee/SchoolYearDashboard'
import type { Classe, ProgrammeAnnuel, ContenuProgramme, TeachingEvent } from '@/lib/types/database'
import type { TeachingPack, PackSyllabus } from '@/lib/types/teaching-pack'
import type {
  SchoolYearDashboardData,
  SchoolYearMetrics,
  SequenceProgress,
  PriorityTask,
  LessonTeachingState,
} from '@/lib/types/school-year-dashboard'
import { getCurriculumCoverage } from '@/lib/spie/curriculum-coverage'
import { getSyllabusCompleteness } from '@/lib/spie/syllabus-v3'
import {
  getSchoolYearElapsedPercent,
  derivePacingIndicator,
  getNextTeachingAction,
} from '@/lib/spie/teaching-progress'
import { buildLessonStateMap, countTaughtFromMap, makeLessonKey } from '@/lib/spie/teaching-events'

// ─── Dérivation des métriques (V5) ───────────────────────────────────────────

function deriveData(
  pack: TeachingPack | null,
  programme: ProgrammeAnnuel | null,
  teachingEvents: TeachingEvent[],
  anneeScolaire?: string,
): SchoolYearDashboardData {
  const contenu  = programme?.contenu_json as ContenuProgramme | undefined
  const unites   = contenu?.unites ?? []
  const syllabus = programme?.syllabus_json as (PackSyllabus & Record<string, unknown>) | undefined

  // ── V5 : lessonStateMap ────────────────────────────────────────────────────
  const lessonStateMap: Record<string, LessonTeachingState> | undefined = contenu
    ? buildLessonStateMap(contenu, teachingEvents)
    : undefined

  // Métriques brutes
  const totalSequences = programme?.nb_unites ?? (unites.length > 0 ? unites.length : null)

  // BUG-06 fix : totalLecons depuis la structure, pas le champ dénormalisé
  const totalLecons = unites.length > 0
    ? unites.reduce((s, u) => s + u.lecons.length, 0)
    : null

  const preparedLecons = (pack?.contenu_json?.nb_lecons_generees ?? null) as number | null

  // taughtLecons depuis la map V5 (ou fallback V4 si pas d'events ni de contenu)
  const taughtLecons = lessonStateMap
    ? countTaughtFromMap(lessonStateMap)
    : (unites.length > 0 ? unites.flatMap(u => u.lecons).filter(l => l.statut === 'enseignee').length : null)

  const raList   = (syllabus?.resultats_apprentissage as string[] | undefined) ?? []
  const totalRA  = raList.length > 0 ? raList.length : null

  // completedSequences : séquence terminée si toutes ses leçons sont enseignées (V5)
  const completedSequences = unites.length > 0
    ? unites.filter((u, si) => {
        if (u.lecons.length === 0) return false
        if (lessonStateMap) {
          return u.lecons.every((_, li) => lessonStateMap[makeLessonKey(si, li)]?.isTaught)
        }
        return u.lecons.every(l => l.statut === 'enseignee')
      }).length
    : null

  const metrics: SchoolYearMetrics = {
    totalSequences,
    completedSequences,
    totalLecons,
    preparedLecons,
    taughtLecons,
    totalRA,
    coveredRA: null,
  }

  // Progression par séquence (V5 : seqIdx inclus, taughtLecons depuis map)
  const sequences: SequenceProgress[] = unites.map((u, si) => {
    let taught: number
    if (lessonStateMap) {
      taught = u.lecons.filter((_, li) => lessonStateMap[makeLessonKey(si, li)]?.isTaught).length
    } else {
      taught = u.lecons.filter(l => l.statut === 'enseignee').length
    }
    const total  = u.lecons.length
    const statut = total > 0 && taught === total
      ? 'terminee'
      : taught > 0
        ? 'en_cours'
        : 'a_venir'
    return {
      seqIdx:       si,
      numero:       u.numero,
      titre:        u.titre,
      semaineDebut: u.semaine_debut,
      semaineFin:   u.semaine_fin,
      objectif:     u.objectifs?.[0] ?? '',
      totalLecons:  total,
      taughtLecons: taught,
      statut,
      progressPct:  total > 0 ? Math.round((taught / total) * 100) : 0,
      uniteData:    u,
    }
  })

  const currentSequence = sequences.find(s => s.statut !== 'terminee') ?? null

  // ── V4 : Rythme pédagogique ───────────────────────────────────────────────
  const schoolYearElapsedPct = anneeScolaire
    ? getSchoolYearElapsedPercent(anneeScolaire)
    : 0
  const teachingPct = totalLecons && taughtLecons !== null
    ? Math.round((taughtLecons / totalLecons) * 100)
    : null
  const pacingIndicator = derivePacingIndicator(teachingPct, schoolYearElapsedPct) ?? undefined

  // ── V4 : Tâches prioritaires ──────────────────────────────────────────────
  const priorityTasks: PriorityTask[] = []

  const nextAction = getNextTeachingAction(sequences, lessonStateMap)
  if (nextAction?.type === 'enseigner') {
    priorityTasks.push({
      type:        'enseigner',
      label:       `Enseigner : ${nextAction.titre}`,
      detail:      nextAction.detail,
      sequenceNum: nextAction.sequenceNum,
      leconNum:    nextAction.leconNum,
    })
  }

  if (currentSequence) {
    const leconsSansPlan = currentSequence.uniteData.lecons
      .filter((l, li) => {
        if (l.lecon_id) return false
        const isTaught = lessonStateMap
          ? (lessonStateMap[makeLessonKey(currentSequence.seqIdx, li)]?.isTaught ?? false)
          : l.statut === 'enseignee'
        return !isTaught
      })
      .slice(0, 3)
    leconsSansPlan.forEach(l => {
      priorityTasks.push({
        type:        'preparer',
        label:       `Préparer : ${l.titre}`,
        detail:      `Séquence ${currentSequence.numero}`,
        sequenceNum: currentSequence.numero,
        leconNum:    l.numero,
      })
    })
  }

  const syllabusCompleteness = syllabus?.titre_cours
    ? getSyllabusCompleteness(syllabus as import('@/lib/types/teaching-pack').PackSyllabus).score
    : undefined

  if (syllabusCompleteness !== undefined && syllabusCompleteness < 80) {
    priorityTasks.push({
      type:        'planifier',
      label:       `Compléter le syllabus — ${syllabusCompleteness}% rempli`,
      detail:      'Politiques, communication et objectifs manquants',
      sequenceNum: 0,
    })
  }

  // Couverture curriculum V2
  const curriculumCoverage = contenu?.curriculum_outcomes?.length
    ? getCurriculumCoverage(contenu, lessonStateMap)
    : undefined

  return {
    metrics,
    sequences,
    raList,
    priorityTasks,
    upcomingAssessments: [],
    currentSequence,
    curriculumCoverage,
    syllabusCompleteness,
    pacingIndicator,
    schoolYearElapsedPct,
    lessonStateMap,
  }
}


// ─── Inner page (lit useSearchParams — doit être dans Suspense) ───────────────

function MonAnneeInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [loading,        setLoading]        = useState(true)
  const [profil,         setProfil]         = useState<{ prenom: string; nom: string; langue: string } | null>(null)
  const [allClasses,     setAllClasses]     = useState<Classe[]>([])
  const [classeId,       setClasseId]       = useState<string | null>(null)
  const [classe,         setClasse]         = useState<Classe | null>(null)
  const [pack,           setPack]           = useState<TeachingPack | null>(null)
  const [programme,      setProgramme]      = useState<ProgrammeAnnuel | null>(null)
  const [teachingEvents, setTeachingEvents] = useState<TeachingEvent[]>([])
  const [loadingPack,    setLoadingPack]    = useState(false)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // classes.enseignant_id référence utilisateurs.id (pas auth.uid()) — charger le profil d'abord
    const { data: profilData } = await supabase
      .from('utilisateurs')
      .select('id, prenom, nom, langue')
      .eq('user_id', user.id)
      .single()

    if (!profilData) { setLoading(false); return }

    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .eq('enseignant_id', profilData.id)
      .order('created_at', { ascending: false })

    setProfil({ prenom: profilData.prenom, nom: profilData.nom, langue: profilData.langue })
    setAllClasses((classesData as Classe[] | null) ?? [])

    const qParam  = searchParams.get('classeId')
    const stored  = typeof window !== 'undefined' ? localStorage.getItem('klassia_active_classe') : null
    const initial = qParam ?? stored ?? classesData?.[0]?.id ?? null
    setClasseId(initial)
    setLoading(false)
  }, [router, searchParams])

  const loadPackData = useCallback(async (cid: string) => {
    setLoadingPack(true)
    const supabase = createClient()

    const [{ data: classeData }, { data: packData }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', cid).single(),
      // BUG-03 fix : .maybeSingle() pour éviter l'erreur si aucun pack existe
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

    // V5 : charger les events du pack (batch — un seul SELECT)
    if (tp?.id) {
      const { data: eventsData } = await supabase
        .from('teaching_events')
        .select('*')
        .eq('teaching_pack_id', tp.id)
        .order('occurred_at', { ascending: true })
      setTeachingEvents((eventsData as TeachingEvent[] | null) ?? [])
    } else {
      setTeachingEvents([])
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('klassia_active_classe', cid)
    }
    setLoadingPack(false)
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    if (classeId) loadPackData(classeId)
  }, [classeId, loadPackData])

  const handleClasseChange = (id: string) => {
    setClasseId(id)
    setClasse(null)
    setPack(null)
    setProgramme(null)
    setTeachingEvents([])
  }

  if (loading) return <LoadingScreen />

  const anneeScolaire = pack?.annee_scolaire ?? classe?.annee_scolaire ?? undefined
  const dashboardData = deriveData(pack, programme, teachingEvents, anneeScolaire)

  return (
    <SchoolYearDashboard
      profil={profil}
      allClasses={allClasses}
      classeId={classeId}
      classe={classe}
      pack={pack}
      programme={programme}
      dashboardData={dashboardData}
      loadingPack={loadingPack}
      onClasseChange={handleClasseChange}
      onTaughtUpdated={() => { if (classeId) loadPackData(classeId) }}
    />
  )
}

// ─── Page — wrap Suspense requis par useSearchParams ─────────────────────────

export default function MonAnneePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MonAnneeInner />
    </Suspense>
  )
}
