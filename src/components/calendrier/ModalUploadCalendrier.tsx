'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Z } from '@/lib/constants/z-index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvenementCalendrierScolaire { date: string; description: string }
interface PlageCalendrierScolaire     { debut: string; fin: string; description: string }

interface CalendrierAnalyse {
  journees_pedagogiques: EvenementCalendrierScolaire[]
  semaines_relache:      PlageCalendrierScolaire[]
  dates_bulletins:       EvenementCalendrierScolaire[]
  autres_evenements:     EvenementCalendrierScolaire[]
  apercu_texte:          string
}

interface PropositionPlan {
  classe:       any
  planAvant:    string
  planApres:    string | null
  generating:   boolean
  applied:      boolean
  skipped:      boolean
  erreur:       string | null
}

type Etape = 'upload' | 'analyse_en_cours' | 'preview_evenements' | 'insertion_en_cours' | 'propositions_plans' | 'termine' | 'erreur'

interface Props {
  profil:    any
  classes:   any[]
  onClose:   () => void
  onSuccess: () => void
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ModalUploadCalendrier({ profil, classes, onClose, onSuccess }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [etape,        setEtape]        = useState<Etape>('upload')
  const [texteLibre,   setTexteLibre]   = useState('')
  const [analyse,      setAnalyse]      = useState<CalendrierAnalyse | null>(null)
  const [propositions, setPropositions] = useState<PropositionPlan[]>([])
  const [erreurMsg,    setErreurMsg]    = useState('')
  const [nbInseres,    setNbInseres]    = useState(0)

  const totalEvenements = analyse
    ? analyse.journees_pedagogiques.length + analyse.semaines_relache.length + analyse.dates_bulletins.length + analyse.autres_evenements.length
    : 0

  // ── Analyse ───────────────────────────────────────────────────────────────

  const analyser = async (file?: File, texte?: string) => {
    setEtape('analyse_en_cours')
    try {
      let payload: any = {}
      if (file) {
        const b64 = await new Promise<string>((res, rej) => {
          const fr = new FileReader()
          fr.onload  = () => res((fr.result as string).split(',')[1])
          fr.onerror = rej
          fr.readAsDataURL(file)
        })
        payload = file.type.startsWith('image/')
          ? { image_base64: b64, media_type: file.type }
          : { pdf_base64: b64 }
      } else {
        payload = { texte }
      }

      const resp = await fetch('/api/ia/analyser-calendrier-scolaire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erreur analyse')
      setAnalyse(data)
      setEtape('preview_evenements')
    } catch (err: any) {
      setErreurMsg(err.message || 'Erreur lors de l\'analyse')
      setEtape('erreur')
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) analyser(file)
    e.target.value = ''
  }

  // ── Insertion des événements + lancement des propositions ──────────────────

  const confirmerEtInserer = async () => {
    if (!analyse) return
    setEtape('insertion_en_cours')

    // Insérer tous les événements extraits dans evenements_calendrier
    const inserts: any[] = []

    for (const ev of analyse.journees_pedagogiques) {
      inserts.push({ enseignant_id: profil.id, titre: ev.description, type: 'calendrier_scolaire', date_debut: `${ev.date}T09:00:00`, couleur: '#818CF8', recurrence: 'aucune' })
    }
    for (const rel of analyse.semaines_relache) {
      inserts.push({ enseignant_id: profil.id, titre: rel.description, type: 'calendrier_scolaire', date_debut: `${rel.debut}T00:00:00`, date_fin: `${rel.fin}T23:59:00`, couleur: '#34D399', recurrence: 'aucune' })
    }
    for (const bul of analyse.dates_bulletins) {
      inserts.push({ enseignant_id: profil.id, titre: bul.description, type: 'calendrier_scolaire', date_debut: `${bul.date}T08:00:00`, couleur: '#FB923C', recurrence: 'aucune' })
    }
    for (const aut of analyse.autres_evenements) {
      inserts.push({ enseignant_id: profil.id, titre: aut.description, type: 'calendrier_scolaire', date_debut: `${aut.date}T09:00:00`, couleur: '#94A3B8', recurrence: 'aucune' })
    }

    let inserted = 0
    for (let b = 0; b < inserts.length; b += 50) {
      const { count } = await supabase.from('evenements_calendrier').insert(inserts.slice(b, b + 50) as any, { count: 'exact' })
      inserted += count || inserts.slice(b, b + 50).length
    }
    setNbInseres(inserted)

    // Trouver les classes qui ont déjà un plan annuel
    if (classes.length === 0) { setEtape('termine'); onSuccess(); return }

    const classesAvecPlan: { classe: any; planAvant: string }[] = []
    for (const cls of classes) {
      const { data: fichiers } = await supabase
        .from('fichiers_dossier')
        .select('contenu_html, nom, created_at')
        .eq('classe_id', cls.id)
        .eq('type_fichier', 'plan_annuel')
        .order('created_at', { ascending: false })
        .limit(1)
      if (fichiers?.[0]?.contenu_html) {
        classesAvecPlan.push({ classe: cls, planAvant: fichiers[0].contenu_html })
      }
    }

    if (classesAvecPlan.length === 0) {
      setEtape('termine'); onSuccess(); return
    }

    // Initialiser les propositions
    const props: PropositionPlan[] = classesAvecPlan.map(({ classe, planAvant }) => ({
      classe, planAvant, planApres: null, generating: true, applied: false, skipped: false, erreur: null,
    }))
    setPropositions(props)
    setEtape('propositions_plans')

    // Générer tous les plans en parallèle (une seule fois — spec BLOC 5)
    await Promise.all(props.map(async (prop, idx) => {
      try {
        const resp = await fetch('/api/ia/regenerer-plan-annuel', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action:                'generer',
            classe_id:             prop.classe.id,
            journees_pedagogiques: analyse.journees_pedagogiques,
            semaines_relache:      analyse.semaines_relache,
            dates_bulletins:       analyse.dates_bulletins,
            autres_evenements:     analyse.autres_evenements,
          }),
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Erreur génération')
        setPropositions(prev => prev.map((p, i) => i === idx ? { ...p, planApres: data.plan_html, generating: false } : p))
      } catch (err: any) {
        setPropositions(prev => prev.map((p, i) => i === idx ? { ...p, generating: false, erreur: err.message } : p))
      }
    }))
  }

  // ── Appliquer un plan ──────────────────────────────────────────────────────

  const appliquerPlan = async (idx: number) => {
    const prop = propositions[idx]
    if (!prop.planApres) return

    try {
      const resp = await fetch('/api/ia/regenerer-plan-annuel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'appliquer', classe_id: prop.classe.id, plan_html: prop.planApres }),
      })
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error) }
      setPropositions(prev => prev.map((p, i) => i === idx ? { ...p, applied: true } : p))
    } catch (err: any) {
      setPropositions(prev => prev.map((p, i) => i === idx ? { ...p, erreur: err.message } : p))
    }
  }

  const ignorerPlan = (idx: number) =>
    setPropositions(prev => prev.map((p, i) => i === idx ? { ...p, skipped: true } : p))

  const toutTermine = () => {
    setEtape('termine')
    onSuccess()
  }

  // ── Styles partagés ───────────────────────────────────────────────────────

  const baseOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: Z.modal_overlay, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  }
  const baseCard: React.CSSProperties = {
    width: '100%', maxWidth: etape === 'propositions_plans' ? 800 : 560,
    maxHeight: '90vh', overflowY: 'auto',
    zIndex: Z.modal_contenu,
    background: 'var(--bg-elevated, #1a1a2e)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '24px 28px',
  }

  const toutDecide = propositions.length > 0 && propositions.every(p => p.applied || p.skipped || !!p.erreur)

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={baseOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={baseCard}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>📅 Importer le calendrier scolaire</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
              Journées pédag., semaines de relâche, bulletins… ajoutés à votre agenda
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
        </div>

        {/* ── UPLOAD ── */}
        {etape === 'upload' && (
          <div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '24px 20px', textAlign: 'center', marginBottom: 14, cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>PDF, image ou document</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Calendrier scolaire officiel de votre commission scolaire</div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', marginBottom: 10 }}>— ou coller le texte —</div>

            <textarea value={texteLibre} onChange={e => setTexteLibre(e.target.value)} rows={5}
              placeholder="Collez les dates du calendrier scolaire (rentrée, congés, journées pédagogiques, bulletins…)"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (texteLibre.trim()) analyser(undefined, texteLibre) }} disabled={!texteLibre.trim()}
                className="btn-primary" style={{ flex: 1, opacity: texteLibre.trim() ? 1 : 0.4 }}>
                Analyser →
              </button>
              <button onClick={onClose} className="btn-ghost">Annuler</button>
            </div>
          </div>
        )}

        {/* ── ANALYSE EN COURS ── */}
        {etape === 'analyse_en_cours' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Lecture du calendrier…</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>L'IA extrait les dates importantes</div>
          </div>
        )}

        {/* ── INSERTION EN COURS ── */}
        {etape === 'insertion_en_cours' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💾</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Ajout dans votre agenda…</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>Enregistrement des {totalEvenements} événement(s) scolaire(s)</div>
          </div>
        )}

        {/* ── APERÇU ÉVÉNEMENTS ── */}
        {etape === 'preview_evenements' && analyse && (
          <div>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 8, fontSize: 12, color: '#A5B4FC' }}>
              {analyse.apercu_texte}
            </div>

            {analyse.journees_pedagogiques.length > 0 && (
              <Section titre={`🎓 Journées pédagogiques (${analyse.journees_pedagogiques.length})`} couleur="#818CF8">
                {analyse.journees_pedagogiques.map((ev, i) => <LigneEv key={i} date={ev.date} desc={ev.description} />)}
              </Section>
            )}
            {analyse.semaines_relache.length > 0 && (
              <Section titre={`🌿 Semaines de relâche (${analyse.semaines_relache.length})`} couleur="#34D399">
                {analyse.semaines_relache.map((r, i) => <LigneEv key={i} date={`${r.debut} → ${r.fin}`} desc={r.description} />)}
              </Section>
            )}
            {analyse.dates_bulletins.length > 0 && (
              <Section titre={`📋 Bulletins (${analyse.dates_bulletins.length})`} couleur="#FB923C">
                {analyse.dates_bulletins.map((ev, i) => <LigneEv key={i} date={ev.date} desc={ev.description} />)}
              </Section>
            )}
            {analyse.autres_evenements.length > 0 && (
              <Section titre={`📌 Autres événements (${analyse.autres_evenements.length})`} couleur="#94A3B8">
                {analyse.autres_evenements.map((ev, i) => <LigneEv key={i} date={ev.date} desc={ev.description} />)}
              </Section>
            )}

            {totalEvenements === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-4)' }}>
                Aucun événement détecté. Essayez avec un autre format.
              </div>
            )}

            {classes.length > 0 && totalEvenements > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, fontSize: 11, color: '#FBBF24' }}>
                ✦ Après confirmation, KlassIA+ proposera une révision de vos plans annuels tenant compte de ces dates.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={confirmerEtInserer} disabled={totalEvenements === 0}
                className="btn-primary" style={{ flex: 1, opacity: totalEvenements > 0 ? 1 : 0.4 }}>
                ✓ Importer {totalEvenements} événement{totalEvenements > 1 ? 's' : ''}
              </button>
              <button onClick={() => setEtape('upload')} className="btn-ghost">← Modifier</button>
            </div>
          </div>
        )}

        {/* ── PROPOSITIONS PLANS ── */}
        {etape === 'propositions_plans' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                ✓ {nbInseres} événement{nbInseres > 1 ? 's' : ''} ajouté{nbInseres > 1 ? 's' : ''} à l'agenda
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                Voici des révisions proposées de vos plans annuels tenant compte des nouvelles dates scolaires.
                Vous pouvez les appliquer ou les ignorer individuellement.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {propositions.map((prop, idx) => (
                <PropPlanCard key={idx} prop={prop} idx={idx} onApply={() => appliquerPlan(idx)} onSkip={() => ignorerPlan(idx)} />
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={toutTermine} className={toutDecide ? 'btn-primary' : 'btn-ghost'}>
                {toutDecide ? '✓ Terminer' : 'Ignorer le reste et terminer'}
              </button>
            </div>
          </div>
        )}

        {/* ── TERMINÉ ── */}
        {etape === 'termine' && (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Calendrier importé !</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>
              {nbInseres} événement{nbInseres > 1 ? 's' : ''} ajouté{nbInseres > 1 ? 's' : ''} à votre agenda.
              {propositions.filter(p => p.applied).length > 0 && ` ${propositions.filter(p => p.applied).length} plan(s) révisé(s).`}
            </div>
            <button onClick={onClose} className="btn-primary">Fermer et actualiser</button>
          </div>
        )}

        {/* ── ERREUR ── */}
        {etape === 'erreur' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 13, color: '#F87171', marginBottom: 16 }}>{erreurMsg}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setEtape('upload')} className="btn-primary">Réessayer</button>
              <button onClick={onClose} className="btn-ghost">Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ titre, couleur, children }: { titre: string; couleur: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: couleur, marginBottom: 4, letterSpacing: 0.5 }}>{titre}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  )
}

function LigneEv({ date, desc }: { date: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
      <span style={{ color: 'var(--text-4)', whiteSpace: 'nowrap', minWidth: 110, fontVariantNumeric: 'tabular-nums' }}>{date}</span>
      <span style={{ color: 'var(--text-2)' }}>{desc}</span>
    </div>
  )
}

function PropPlanCard({ prop, idx, onApply, onSkip }: { prop: PropositionPlan; idx: number; onApply: () => void; onSkip: () => void }) {
  const [previewOuvert, setPreviewOuvert] = useState(false)

  const fait = prop.applied || prop.skipped || !!prop.erreur

  return (
    <div style={{ border: `1px solid ${fait ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', opacity: fait ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{prop.classe.nom}</span>
        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{prop.classe.matiere} · {prop.classe.niveau}</span>
        {prop.applied  && <span style={{ fontSize: 11, color: '#34D399', marginLeft: 'auto' }}>✓ Appliqué</span>}
        {prop.skipped  && <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>Ignoré</span>}
        {prop.erreur   && <span style={{ fontSize: 11, color: '#F87171', marginLeft: 'auto' }}>⚠ {prop.erreur}</span>}
        {prop.generating && <span style={{ fontSize: 11, color: '#818CF8', marginLeft: 'auto' }}>⏳ Génération…</span>}
      </div>

      {!prop.generating && !fait && prop.planApres && (
        <div>
          <button onClick={() => setPreviewOuvert(v => !v)}
            style={{ background: 'none', border: 'none', fontSize: 11, color: '#818CF8', cursor: 'pointer', padding: 0, marginBottom: 8, textDecoration: 'underline' }}>
            {previewOuvert ? '▲ Masquer l\'aperçu' : '▼ Voir avant/après'}
          </button>

          {previewOuvert && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4 }}>AVANT</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 6, maxHeight: 180, overflowY: 'auto', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: prop.planAvant.substring(0, 1500) + (prop.planAvant.length > 1500 ? '…' : '') }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', marginBottom: 4 }}>APRÈS (proposé)</div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.2)', padding: '8px 10px', borderRadius: 6, maxHeight: 180, overflowY: 'auto', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: prop.planApres.substring(0, 1500) + (prop.planApres.length > 1500 ? '…' : '') }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onApply} className="btn-primary" style={{ fontSize: 11, padding: '5px 14px' }}>Appliquer ce plan</button>
            <button onClick={onSkip}  className="btn-ghost"   style={{ fontSize: 11, padding: '5px 14px' }}>Ignorer</button>
          </div>
        </div>
      )}
    </div>
  )
}
