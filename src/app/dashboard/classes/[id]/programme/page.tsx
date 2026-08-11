'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingScreen from '@/components/LoadingScreen'
import BuildMyYearWizard from '@/components/build-year/BuildMyYearWizard'
import TeachingPackCard from '@/components/build-year/TeachingPackCard'
import AnnualPlanTimeline from '@/components/build-year/AnnualPlanTimeline'
import SyllabusEditor from '@/components/build-year/SyllabusEditor'
import QualityReport from '@/components/build-year/QualityReport'
import TemplateMapping from '@/components/build-year/TemplateMapping'
import DetailedLessonView, { LessonEngineProgress } from '@/components/build-year/DetailedLessonView'
import { ALBERTA_PACK_METADATA } from '@/lib/alberta-teaching-pack'
import type { TeachingPack, PackSyllabus, QualityGateResultat } from '@/lib/types/teaching-pack'
import type { Classe, ProgrammeAnnuel, ContenuProgramme } from '@/lib/types/database'
import type { ForfaitType } from '@/lib/types/database'
import type { DetailedLesson, LessonGenerationEvent } from '@/lib/types/detailed-lesson'

type TabId = 'apercu' | 'curriculum' | 'syllabus' | 'plan_annuel' | 'sequences' | 'plans_lecon' | 'quiz' | 'gabarits' | 'qualite'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'apercu',      label: 'Vue d\'ensemble', icon: '🏠' },
  { id: 'curriculum',  label: 'Curriculum',      icon: '📄' },
  { id: 'syllabus',    label: 'Syllabus',         icon: '📋' },
  { id: 'plan_annuel', label: 'Plan annuel',      icon: '🗓️' },
  { id: 'sequences',   label: 'Séquences',        icon: '🗂️' },
  { id: 'plans_lecon', label: 'Plans de leçon',   icon: '📝' },
  { id: 'quiz',        label: 'Quiz',             icon: '🎮' },
  { id: 'gabarits',    label: 'Gabarits',         icon: '📐' },
  { id: 'qualite',     label: 'Qualité',          icon: '🔍' },
]

export default function ProgrammePage() {
  const { id }        = useParams<{ id: string }>()
  const router        = useRouter()
  const searchParams  = useSearchParams()

  const [loading,    setLoading]    = useState(true)
  const [classe,     setClasse]     = useState<Classe | null>(null)
  const [pack,       setPack]       = useState<TeachingPack | null>(null)
  const [programme,  setProgramme]  = useState<ProgrammeAnnuel | null>(null)
  const [forfait,    setForfait]    = useState<ForfaitType | undefined>()
  const [showWizard,          setShowWizard]          = useState(false)
  const [showRebuildConfirm, setShowRebuildConfirm]  = useState(false)
  // SPIE-PERSISTENCE-01 : reprendre = smart resume (skip étapes réussies)
  const [reprendreMode,      setReprendreMode]        = useState(false)
  const [activeTab,  setActiveTab]  = useState<TabId>((searchParams.get('tab') as TabId) ?? 'apercu')
  const [qualite,    setQualite]    = useState<QualityGateResultat | null>(null)
  const [qualLoading,setQualLoading]= useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [fichiersQuiz,  setFichiersQuiz]  = useState<{ id: string; nom: string; contenu_html: string | null; created_at: string }[]>([])
  // SPIE-BETA-03 — leçon détaillée
  const [leconDetaillee,      setLeconDetaillee]      = useState<DetailedLesson | null>(null)
  const [leconFichierId,      setLeconFichierId]       = useState<string | null>(null)
  const [generationEvents,    setGenerationEvents]     = useState<LessonGenerationEvent[]>([])
  const [generationEnCours,   setGenerationEnCours]    = useState(false)
  const generationAbort       = useRef<AbortController | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profil } = await supabase.from('utilisateurs').select('forfait').eq('user_id', user.id).single()
    setForfait(profil?.forfait as ForfaitType | undefined)

    const { data: classeData, error: classeErr } = await supabase
      .from('classes').select('*').eq('id', id).single()
    if (classeErr || !classeData) { router.push('/dashboard/classes'); return }
    setClasse(classeData as unknown as Classe)

    const { data: packData } = await supabase
      .from('teaching_packs').select('*').eq('classe_id', id).single()
    setPack(packData as TeachingPack | null)

    if (packData?.programme_annuel_id) {
      const { data: prog } = await supabase
        .from('programme_annuel').select('*').eq('id', packData.programme_annuel_id).single()
      setProgramme(prog as ProgrammeAnnuel | null)
    } else if (packData?.id) {
      // Fallback : programme_annuel_id non renseigné sur le pack — chercher par classe_id
      const { data: prog } = await supabase
        .from('programme_annuel').select('*').eq('classe_id', id)
        .order('created_at', { ascending: false }).limit(1).single()
      if (prog) {
        setProgramme(prog as ProgrammeAnnuel | null)
        // Réparer le FK silencieusement pour les prochains chargements
        await supabase.from('teaching_packs')
          .update({ programme_annuel_id: prog.id })
          .eq('id', packData.id)
      }
    }

    // Charger les quiz générés par le pipeline Construire
    if (packData) {
      const { data: quiz } = await supabase
        .from('fichiers_dossier')
        .select('id, nom, contenu_html, created_at')
        .eq('classe_id', id)
        .eq('type_fichier', 'quiz')
        .order('created_at', { ascending: false })
      setFichiersQuiz(quiz ?? [])
    }

    // Charger la leçon détaillée existante
    if (packData?.lecon_detaillee_id) {
      const { data: fichier } = await supabase
        .from('fichiers_dossier')
        .select('id, contenu_json')
        .eq('id', packData.lecon_detaillee_id)
        .single()
      if (fichier?.contenu_json) {
        setLeconDetaillee(fichier.contenu_json as DetailedLesson)
        setLeconFichierId(fichier.id)
      }
    }

    setLoading(false)
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  const handleWizardDone = useCallback(async (_teachingPackId: string, _progId: string) => {
    await loadData()
    // Wizard stays open — BuildProgressView shows success + "Ouvrir mon année"
  }, [loadData])

  const handleOpenWorkspace = useCallback(() => {
    setShowWizard(false)
    if (typeof window !== 'undefined') localStorage.setItem('klassia_active_classe', id)
    router.push('/dashboard/gerer/preparer')
  }, [id, router])

  const handleConstruireAnnee = useCallback(() => {
    if (pack) setShowRebuildConfirm(true)
    else { setReprendreMode(false); setShowWizard(true) }
  }, [pack])

  const handleReprendre = useCallback(() => {
    setReprendreMode(true)
    setShowWizard(true)
  }, [])

  const lancerQualite = useCallback(async (docType: string = 'plan_annuel') => {
    if (!pack?.id) return
    setQualLoading(true)
    try {
      const res = await fetch('/api/spie/quality-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teaching_pack_id: pack.id, document_type: docType }),
      })
      if (res.ok) {
        const data = await res.json()
        setQualite(data.resultat)
        setActiveTab('qualite')
      }
    } finally {
      setQualLoading(false)
    }
  }, [pack])

  const exporterDocx = useCallback(async (type: string, label: string, seqIdx?: number) => {
    if (!pack?.id) return
    setExportLoading(true)
    try {
      const body: Record<string, unknown> = { teaching_pack_id: pack.id, type }
      if (seqIdx !== undefined) body.sequence_index = seqIdx
      const res = await fetch('/api/spie/pack-export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { alert('Export indisponible pour le moment.'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${label}.docx`; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(false)
    }
  }, [pack])

  const genererLecon = useCallback(async (forcer = false) => {
    if (!pack?.id || generationEnCours) return
    setGenerationEnCours(true)
    setGenerationEvents([])
    const ctrl = new AbortController()
    generationAbort.current = ctrl

    try {
      const res = await fetch('/api/spie/lesson-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teaching_pack_id: pack.id, forcer_regeneration: forcer }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) {
        setGenerationEvents(prev => [...prev, { step: 'erreur', statut: 'erreur', message: 'Erreur serveur.', progress: 0 }])
        setGenerationEnCours(false)
        return
      }

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6)) as LessonGenerationEvent
            setGenerationEvents(prev => {
              const idx = prev.findIndex(e => e.step === evt.step)
              return idx >= 0 ? prev.map((e, i) => i === idx ? evt : e) : [...prev, evt]
            })
            if (evt.step === 'termine' && evt.fichier_id) {
              setLeconFichierId(evt.fichier_id)
              if (evt.data) setLeconDetaillee(evt.data as DetailedLesson)
              await loadData()
            }
            if (evt.step === 'erreur') {
              setGenerationEnCours(false)
              return
            }
          } catch { /* ligne malformée */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setGenerationEvents(prev => [...prev, { step: 'erreur', statut: 'erreur', message: 'Connexion interrompue.', progress: 0 }])
      }
    }
    setGenerationEnCours(false)
  }, [pack, generationEnCours, loadData])

  if (loading) return <LoadingScreen />
  if (!classe)  return null

  const contenu    = programme?.contenu_json as ContenuProgramme | undefined
  const syllabus   = programme?.syllabus_json as PackSyllabus | undefined
  const isAlberta  = pack?.province === 'alberta'
  const isReady    = pack?.statut === 'pret' || pack?.statut === 'partiellement_genere'
  const ctaLabel   = pack ? 'Reprendre la génération' : 'Construire mon année'
  // SPIE-PERSISTENCE-01 : éléments manquants depuis build_state persisté
  const buildState = pack?.contenu_json?.build_state as Record<string, { status: string }> | undefined
  const missing    = {
    syllabus:         !syllabus?.titre_cours,
    plan_annuel:      !contenu?.unites?.length,
    premiere_lecon:   buildState?.premiere_lecon?.status === 'error',
    quiz:             buildState?.quiz?.status === 'error',
  }
  const hasPartialBuild = isReady && (missing.syllabus || missing.plan_annuel || missing.premiere_lecon || missing.quiz)

  // ─── Wizard ────────────────────────────────────────────────────────────────
  if (showWizard || (!pack && !programme)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
          <button onClick={() => showWizard ? setShowWizard(false) : router.push(`/dashboard/classes/${id}`)}
            style={btnSecondaire}>← Retour</button>
          {isAlberta && !showWizard && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(127,119,221,.1)', color: 'var(--color-accent-violet)', fontSize: 11, fontWeight: 700 }}>
                ScorgIA Alberta Teaching Pack — Beta
              </span>
              <span>— {ALBERTA_PACK_METADATA.avertissement_legal.slice(0, 80)}…</span>
            </div>
          )}
        </div>
        <BuildMyYearWizard
          classeId={id} classeNom={classe.nom}
          niveauInitial={classe.niveau ?? undefined}
          matiereInitiale={classe.matiere ?? undefined}
          forfait={forfait}
          reprendre={reprendreMode}
          onDone={handleWizardDone}
          onOpenWorkspace={handleOpenWorkspace}
        />
      </div>
    )
  }

  // ─── En-tête commun ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push(`/dashboard/classes/${id}`)} style={btnSecondaire}>←</button>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{classe.nom}</div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Mon année scolaire
            </h1>
            {pack && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                <StatutBadge statut={pack.statut} />
                {pack.province && <Chip>{pack.province}</Chip>}
                {pack.annee_scolaire && <Chip>{pack.annee_scolaire}</Chip>}
                {pack.updated_at && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Mis à jour {new Date(pack.updated_at).toLocaleDateString('fr-CA')}</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isReady && (
            <>
              <button onClick={() => lancerQualite()} disabled={qualLoading} style={btnSecondaire}>
                {qualLoading ? '⏳' : '🔍'} Qualité
              </button>
              <button onClick={() => exporterDocx('pack_condense', `Teaching_Pack_${pack!.nom}`)} disabled={exportLoading} style={btnSecondaire}>
                {exportLoading ? '⏳' : '📦'} Exporter
              </button>
            </>
          )}
          <button onClick={() => pack ? setShowRebuildConfirm(true) : setShowWizard(true)} style={btnSecondaire}>🔄 Reconstruire</button>
        </div>
      </div>

      {/* Avertissement Alberta */}
      {isAlberta && (
        <div style={{ padding: '8px 28px', background: 'rgba(127,119,221,.06)', borderBottom: '1px solid rgba(127,119,221,.15)', fontSize: 11, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--color-accent-violet)' }}>ScorgIA Alberta Teaching Pack — Beta</strong> {ALBERTA_PACK_METADATA.avertissement_legal}
        </div>
      )}

      {/* Navigation tabs */}
      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 16px', border: 'none', background: 'transparent', color: activeTab === tab.id ? 'var(--color-accent-violet)' : 'var(--text-muted)', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-violet)' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Corps */}
      <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '28px 28px' }}>

        {/* ── Aperçu ─────────────────────────────────────────────── */}
        {activeTab === 'apercu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {pack ? (
              <TeachingPackCard pack={pack}
                onRestart={() => setShowWizard(true)}
                onViewPlan={() => setActiveTab('plan_annuel')}
              />
            ) : (
              <EmptyState icon="📦" titre="Aucun Teaching Pack" desc="Construisez votre année scolaire pour générer le pack." cta={ctaLabel} onCta={handleConstruireAnnee} />
            )}

            {/* Prochaines actions */}
            {isReady && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Prochaines actions</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <ActionCard icon="📋" label="Voir le syllabus" onClick={() => setActiveTab('syllabus')} />
                  <ActionCard icon="🗓️" label="Plan annuel" onClick={() => setActiveTab('plan_annuel')} />
                  <ActionCard icon="🔍" label="Contrôle qualité" onClick={() => lancerQualite()} />
                  {contenu && <ActionCard icon="📄" label="Exporter DOCX" onClick={() => exporterDocx('plan_annuel', 'plan_annuel')} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Curriculum ──────────────────────────────────────────── */}
        {activeTab === 'curriculum' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionHeader titre="Curriculum" icon="📄" />
            <SourceDisplay pack={pack} />
          </div>
        )}

        {/* ── Syllabus ───────────────────────────────────────────── */}
        {activeTab === 'syllabus' && (
          syllabus?.titre_cours ? (
            <SyllabusEditor
              syllabus={syllabus}
              teachingPackId={pack!.id}
              programmeAnnuelId={programme!.id}
              onSaved={s => {
                if (programme) setProgramme({ ...programme, syllabus_json: s as unknown as Record<string, unknown> })
              }}
            />
          ) : (
            <EmptyState
              icon="📋"
              titre="Syllabus non généré"
              desc={pack ? 'La génération du syllabus n\'a pas pu être finalisée. Utilisez « Reprendre la génération » pour relancer uniquement cette étape.' : 'Le syllabus sera disponible après la génération du Teaching Pack.'}
              cta={pack ? 'Reprendre la génération' : ctaLabel}
              onCta={pack ? handleReprendre : handleConstruireAnnee}
            />
          )
        )}

        {/* ── Plan annuel ─────────────────────────────────────────── */}
        {activeTab === 'plan_annuel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionHeader titre="Plan annuel" icon="🗓️" />
              {contenu && (
                <button onClick={() => exporterDocx('plan_annuel', 'Plan_annuel')} disabled={exportLoading} style={btnSecondaire}>
                  {exportLoading ? '⏳' : '📄'} Exporter DOCX
                </button>
              )}
            </div>
            {contenu
              ? <AnnualPlanTimeline programme={contenu} />
              : <EmptyState icon="🗓️" titre="Plan annuel non généré" desc="Construisez votre année scolaire." cta={ctaLabel} onCta={handleConstruireAnnee} />
            }
          </div>
        )}

        {/* ── Séquences ───────────────────────────────────────────── */}
        {activeTab === 'sequences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionHeader titre="Séquences" icon="🗂️" />
            {contenu?.unites?.length ? (
              contenu.unites.map((u, i) => (
                <SequenceCard key={i} unite={u} index={i}
                  onExport={() => exporterDocx('sequence', `sequence_${i + 1}`, i)}
                  exportLoading={exportLoading}
                />
              ))
            ) : (
              <EmptyState icon="🗂️" titre="Aucune séquence" desc="Le plan annuel n'a pas encore été généré." cta={ctaLabel} onCta={handleConstruireAnnee} />
            )}
          </div>
        )}

        {/* ── Plans de leçon ──────────────────────────────────────── */}
        {activeTab === 'plans_lecon' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <SectionHeader titre="Plans de leçon" icon="📝" />
              {isReady && !leconDetaillee && !generationEnCours && (
                <button
                  onClick={() => genererLecon()}
                  style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#7F77DD,#4F46E5)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✦ Générer la 1re leçon
                </button>
              )}
              {leconDetaillee && !generationEnCours && (
                <button
                  onClick={() => genererLecon(true)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↺ Régénérer
                </button>
              )}
            </div>

            {/* Génération en cours */}
            {generationEnCours && generationEvents.length > 0 && (
              <LessonEngineProgress
                events={generationEvents}
                onDone={(dl, fid) => {
                  setLeconDetaillee(dl)
                  setLeconFichierId(fid)
                  setGenerationEnCours(false)
                }}
              />
            )}

            {/* Leçon détaillée prête */}
            {leconDetaillee && leconFichierId && !generationEnCours && (
              <DetailedLessonView
                lecon={leconDetaillee}
                classeId={id}
                fichier_id={leconFichierId}
                onRestart={() => genererLecon(true)}
              />
            )}

            {/* Liste des leçons du pack (toujours visible) */}
            {!generationEnCours && contenu?.unites?.[0]?.lecons?.length ? (
              <div style={{ marginTop: leconDetaillee ? 28 : 0 }}>
                {!leconDetaillee && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Séquence 1 : <strong style={{ color: 'var(--text-primary)' }}>{contenu.unites[0].titre}</strong>
                    {' '}— Générez la 1re leçon pour l'accès complet au plan détaillé.
                  </div>
                )}
                {leconDetaillee && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
                    Toutes les leçons de la séquence
                  </div>
                )}
                {contenu.unites[0].lecons.map((l, li) => (
                  <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--color-border)', marginBottom: 8, background: li === 0 && leconDetaillee ? 'rgba(127,119,221,0.05)' : undefined }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${li === 0 && leconDetaillee ? '#34D399' : 'var(--color-accent-violet)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: li === 0 && leconDetaillee ? '#34D399' : 'var(--color-accent-violet)', flexShrink: 0 }}>{li + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{(l as Record<string,unknown>).titre as string}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(l as Record<string,unknown>).duree_minutes as number} min · {(l as Record<string,unknown>).type as string}</div>
                    </div>
                    {li === 0 && leconDetaillee && (
                      <span style={{ fontSize: 11, color: '#34D399', fontWeight: 700 }}>✅ Développée</span>
                    )}
                    {li > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 99, border: '1px solid var(--color-border)' }}>Plan de base</span>
                    )}
                  </div>
                ))}
                {contenu.unites.slice(1).length > 0 && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(148,163,184,.08)', border: '1px solid var(--color-border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    🔒 Les leçons des autres séquences seront développées selon votre forfait.
                  </div>
                )}
              </div>
            ) : (
              !generationEnCours && !leconDetaillee && !isReady && (
                <EmptyState icon="📝" titre="Aucun plan de leçon" desc="Construisez d'abord votre année scolaire." cta={ctaLabel} onCta={handleConstruireAnnee} />
              )
            )}
          </div>
        )}

        {/* ── Quiz ────────────────────────────────────────────────── */}
        {activeTab === 'quiz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <SectionHeader titre="Quiz" icon="🎮" />
              <button onClick={() => router.push(`/dashboard/classes/${id}`)} style={btnSecondaire}>
                📂 Voir dans la Bibliothèque
              </button>
            </div>

            {fichiersQuiz.length > 0 ? (
              fichiersQuiz.map(q => (
                <div key={q.id} style={{ borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🎮</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{q.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Généré le {new Date(q.created_at).toLocaleDateString('fr-CA')}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(52,211,153,.1)', color: '#34D399', fontWeight: 700 }}>✓ Prêt</span>
                  </div>
                  {q.contenu_html && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-primary)' }}>
                      <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {q.contenu_html}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            ) : pack ? (
              <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                Aucun quiz généré pour cette classe. Cliquez sur <strong>Régénérer</strong> pour relancer le pipeline avec la génération de quiz activée.
              </div>
            ) : (
              <EmptyState icon="🎮" titre="Aucun quiz" desc="Construisez votre année scolaire pour générer le quiz de la 1re leçon." cta={ctaLabel} onCta={handleConstruireAnnee} />
            )}
          </div>
        )}

        {/* ── Gabarits ────────────────────────────────────────────── */}
        {activeTab === 'gabarits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionHeader titre="Gabarits" icon="📐" />
            {isAlberta ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'plan_annuel',   label: 'Plan annuel',    desc: 'ScorgIA Alberta — Plan annuel v1.0' },
                  { id: 'plan_sequence', label: 'Séquence',       desc: 'ScorgIA Alberta — Plan de séquence v1.0' },
                  { id: 'plan_lecon',    label: 'Plan de leçon',  desc: 'ScorgIA Alberta — Plan de leçon v1.0' },
                ].map(g => (
                  <div key={g.id} style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.desc}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(52,211,153,.1)', color: '#34D399', fontSize: 11, fontWeight: 700 }}>Actif</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--text-muted)' }}>
                Gabarit générique ScorgIA utilisé pour cette province. Les gabarits provinciaux sont en cours de développement.
              </div>
            )}
            <TemplateMapping onReturnToDefault={() => {}} />
          </div>
        )}

        {/* ── Qualité ──────────────────────────────────────────────── */}
        {activeTab === 'qualite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionHeader titre="Contrôle qualité pédagogique" icon="🔍" />
              <div style={{ display: 'flex', gap: 8 }}>
                {['plan_annuel', 'syllabus'].map(t => (
                  <button key={t} onClick={() => lancerQualite(t)} disabled={qualLoading} style={btnSecondaire}>
                    {qualLoading ? '⏳' : '🔄'} {t === 'plan_annuel' ? 'Plan annuel' : 'Syllabus'}
                  </button>
                ))}
              </div>
            </div>
            {qualite ? (
              <QualityReport resultat={qualite} onDismiss={() => setQualite(null)} />
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                Lancez le contrôle qualité pour analyser votre plan annuel ou votre syllabus.
                <br /><br />
                <button onClick={() => lancerQualite()} disabled={qualLoading || !pack} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: pack ? 'linear-gradient(135deg,#7F77DD,#4F46E5)' : 'rgba(127,119,221,.3)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: pack ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {qualLoading ? '⏳ Analyse…' : '🔍 Lancer le contrôle'}
                </button>
              </div>
            )}
            {/* Normes professionnelles */}
            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(251,195,74,.06)', border: '1px solid rgba(251,195,74,.2)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <strong style={{ color: '#FBC34A' }}>Alignement indicatif Teaching Quality Standard (Alberta, 2019)</strong><br />
              Ce document est un outil de référence pédagogique. Il ne constitue pas une certification officielle et ne remplace pas l'évaluation professionnelle d'Alberta Education.
            </div>
          </div>
        )}
      </div>

      {/* ── Modal confirmation Reconstruire / Reprendre (Mission 12/17) ─────── */}
      {showRebuildConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="glass-light" style={{ maxWidth: 480, width: '100%', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🔄</div>
            <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
              Que souhaitez-vous faire ?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
              Un Teaching Pack existe déjà pour cette classe.
            </p>
            {hasPartialBuild && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,195,74,.08)', border: '1px solid rgba(251,195,74,.25)', marginBottom: 16, fontSize: 12, color: '#FBC34A', lineHeight: 1.6 }}>
                ⚠️ Construction partielle détectée — éléments manquants :
                {' '}{[missing.syllabus && 'Syllabus', missing.plan_annuel && 'Plan annuel', missing.premiere_lecon && '1re leçon', missing.quiz && 'Quiz'].filter(Boolean).join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Option 1 — Reprendre (smart resume) */}
              <button
                onClick={() => { setShowRebuildConfirm(false); handleReprendre() }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#7F77DD,#4F46E5)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <span>✦ Reprendre la génération</span>
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Continue uniquement les étapes manquantes. Conserve ce qui existe.</span>
              </button>
              {/* Option 2 — Reconstruire complètement */}
              <button
                onClick={() => { setShowRebuildConfirm(false); setReprendreMode(false); setShowWizard(true) }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 9, border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.08)', color: '#F87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <span>🔄 Reconstruire complètement</span>
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Régénère tout depuis le début. Remplace le contenu actuel.</span>
              </button>
              <button
                onClick={() => setShowRebuildConfirm(false)}
                style={{ width: '100%', padding: '10px 0', borderRadius: 9, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Composants locaux ────────────────────────────────────────────────────────

function SectionHeader({ titre, icon }: { titre: string; icon: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{icon}</span> {titre}
    </h2>
  )
}

function EmptyState({ icon, titre, desc, cta, onCta }: { icon: string; titre: string; desc: string; cta: string; onCta: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>{titre}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 auto 24px', maxWidth: 360 }}>{desc}</p>
      <button onClick={onCta} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#7F77DD,#4F46E5)', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        ✦ {cta}
      </button>
    </div>
  )
}

function ActionCard({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
      <span style={{ fontSize: 16 }}>{icon}</span> {label}
    </button>
  )
}

function SequenceCard({ unite, index, onExport, exportLoading }: { unite: { numero: number; titre: string; semaine_debut: number; semaine_fin: number; objectifs?: string[]; lecons?: unknown[] }; index: number; onExport: () => void; exportLoading: boolean }) {
  const nb = unite.semaine_fin - unite.semaine_debut + 1
  return (
    <details style={{ borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <summary style={{ padding: '14px 18px', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{unite.numero}. {unite.titre}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>sem. {unite.semaine_debut}–{unite.semaine_fin} ({nb} sem.) · {(unite.lecons?.length ?? 0)} leçons</span>
        <button onClick={e => { e.stopPropagation(); onExport() }} disabled={exportLoading} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
          {exportLoading ? '⏳' : '📄'} DOCX
        </button>
      </summary>
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-primary)' }}>
        {unite.objectifs?.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{unite.objectifs.map((o, i) => <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>{o}</li>)}</ul> : null}
      </div>
    </details>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pret:               { bg: 'rgba(52,211,153,.12)',   color: '#34D399', label: '🎉 Prêt' },
    partiellement_genere:{ bg: 'rgba(251,195,74,.12)',  color: '#FBC34A', label: '🔶 Partiel' },
    generation_en_cours: { bg: 'rgba(127,119,221,.12)', color: '#7F77DD', label: '⚙️ En génération' },
    erreur:              { bg: 'rgba(248,113,113,.12)', color: '#F87171', label: '❌ Erreur' },
    configuration:       { bg: 'rgba(148,163,184,.12)', color: '#94A3B8', label: '⚙️ Configuration' },
  }
  const c = cfg[statut] ?? cfg.configuration
  return <span style={{ padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, fontSize: 11, fontWeight: 700 }}>{c.label}</span>
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: 10, color: 'var(--text-muted)' }}>{children}</span>
}

function SourceDisplay({ pack }: { pack: TeachingPack | null }) {
  if (!pack) return <EmptyState icon="📄" titre="Aucun curriculum" desc="Aucun Teaching Pack n'est associé à cette classe." cta="Construire" onCta={() => {}} />
  const sourceStatutLabels: Record<string, string> = {
    televerse_utilisateur:            '📁 Téléversé par l\'enseignant',
    reference_officielle_verifiee:    '✅ Référence officielle vérifiée',
    reference_scorgia_en_validation:  '🔄 Référence ScorgIA en validation',
    donnee_non_verifiee:              '⚠️ Donnée non vérifiée',
    archivee:                         '📦 Archivée',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Source du curriculum</div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
          {pack.curriculum_source === 'televerse' ? '📁 Téléversé par l\'enseignant' : '🏛️ Curriculum officiel ScorgIA'}
        </div>
        {pack.curriculum_officiel && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Référence : {pack.curriculum_officiel}</div>}
        {pack.curriculum_contenu && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', maxHeight: 120, overflow: 'auto' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {pack.curriculum_contenu.slice(0, 600)}{pack.curriculum_contenu.length > 600 ? '…' : ''}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(251,195,74,.06)', borderRadius: 8 }}>
        ⚠ ScorgIA ne génère jamais de résultats d'apprentissage ou de normes provinciales de manière inventée. Le contenu généré est basé sur le curriculum fourni ou les références publiques disponibles.
      </div>
    </div>
  )
}

const btnSecondaire: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
  background: 'transparent', color: 'var(--text-secondary)', fontSize: 12,
  cursor: 'pointer', fontFamily: 'inherit',
}
