'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Z } from '@/lib/constants/z-index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoursDetecte {
  jour: string; heure_debut: string; heure_fin: string; salle?: string
}
interface ClasseDetectee {
  nom: string; matiere: string; niveau: string; nb_eleves: number; cours: CoursDetecte[]
}
interface LigneComparaison {
  id:          string
  etat:        'nouveau' | 'modifie' | 'identique'
  detectee:    ClasseDetectee
  existante?:  any
  coursBefore?: CoursDetecte[]
  selected:    boolean
}

type Etape = 'upload' | 'analyse_en_cours' | 'confirmation_nouveau' | 'confirmation_existant' | 'generation' | 'complet' | 'erreur'

interface Props {
  profil:    any
  classes:   any[]
  cours:     any[]
  onClose:   () => void
  onSuccess: (nouvellesClasses: any[], nouveauxCours: any[]) => void
}

// ─── Utilitaire de correspondance approximative ───────────────────────────────

function trouverClasseExistante(detectee: ClasseDetectee, existantes: any[]): any | null {
  const nomDet = detectee.nom.toLowerCase().trim()
  const matDet = (detectee.matiere || '').toLowerCase().trim()
  const niv    = (detectee.niveau || '').toLowerCase().trim()

  const exact = existantes.find(e => e.nom.toLowerCase().trim() === nomDet)
  if (exact) return exact

  const parMatNiv = existantes.find(e =>
    (e.matiere || '').toLowerCase().trim() === matDet &&
    (e.niveau  || '').toLowerCase().trim() === niv &&
    matDet !== ''
  )
  return parMatNiv || null
}

function coursDifferents(a: CoursDetecte[], b: CoursDetecte[]): boolean {
  if (a.length !== b.length) return true
  const key = (c: CoursDetecte) => `${c.jour}|${c.heure_debut}|${c.heure_fin}`
  const setA = new Set(a.map(key))
  return b.some(c => !setA.has(key(c)))
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ModalUploadEmploiDuTemps({ profil, classes, cours, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [etape,           setEtape]           = useState<Etape>('upload')
  const [texteLibre,      setTexteLibre]       = useState('')
  const [classesDetect,   setClassesDetect]    = useState<ClasseDetectee[]>([])
  const [lignes,          setLignes]           = useState<LigneComparaison[]>([])
  const [progressEvents,  setProgressEvents]   = useState<any[]>([])
  const [erreurMsg,       setErreurMsg]        = useState('')
  const [quotaEpuise,     setQuotaEpuise]      = useState(false)
  const [quotaMsg,        setQuotaMsg]         = useState('')

  const aClassesExistantes = classes.length > 0

  // ── Analyse du fichier / texte ─────────────────────────────────────────────

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

      const resp = await fetch('/api/ia/analyser-emploi-du-temps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erreur analyse')

      const cls: ClasseDetectee[] = data.classes_detectees || []
      setClassesDetect(cls)

      if (!aClassesExistantes) {
        setEtape('confirmation_nouveau')
      } else {
        // Construire les lignes de comparaison
        const coursSemaineParClasse: Record<string, CoursDetecte[]> = {}
        for (const c of classes) {
          coursSemaineParClasse[c.id] = cours
            .filter((cs: any) => cs.classe_id === c.id)
            .map((cs: any) => ({ jour: cs.jour, heure_debut: cs.heure_debut, heure_fin: cs.heure_fin, salle: cs.salle }))
        }

        const rows: LigneComparaison[] = cls.map((det, i) => {
          const existante = trouverClasseExistante(det, classes)
          const coursBefore = existante ? (coursSemaineParClasse[existante.id] || []) : []
          let etat: 'nouveau' | 'modifie' | 'identique' = 'nouveau'
          if (existante) {
            etat = coursDifferents(coursBefore, det.cours) ? 'modifie' : 'identique'
          }
          return { id: `row-${i}`, etat, detectee: det, existante, coursBefore, selected: etat !== 'identique' }
        })
        setLignes(rows)
        setEtape('confirmation_existant')
      }
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

  // ── Lancement cascade (Scénario A : aucune classe existante) ──────────────

  const lancerCascadeNouveaux = async (emploiDuTemps: ClasseDetectee[]) => {
    setEtape('generation')
    setProgressEvents([])

    const res = await fetch('/api/ia/importer-emploi-du-temps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emploi_du_temps:  emploiDuTemps,
        annee_debut:      `${new Date().getFullYear()}-09-01`,
        annee_fin:        `${new Date().getFullYear() + 1}-06-30`,
      }),
    })
    if (!res.body) { setErreurMsg('Pas de réponse'); setEtape('erreur'); return }

    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
    const evts: any[] = []
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const ev = JSON.parse(line)
          evts.push(ev); setProgressEvents([...evts])
          if (ev.etape === 'complete') { onSuccess([], []); setEtape('complet') }
          if (ev.etape === 'quota_epuise') { setQuotaEpuise(true); setQuotaMsg(ev.message); setEtape('complet') }
          if (ev.etape === 'erreur') { setErreurMsg(ev.message); setEtape('erreur') }
        } catch { /* ignore */ }
      }
    }
  }

  // ── Application Scénario B (classes existantes + modifications) ───────────

  const appliquerModifications = async () => {
    const selectionnees = lignes.filter(l => l.selected)
    if (selectionnees.length === 0) { onClose(); return }

    setEtape('generation')
    setProgressEvents([{ etape: 1, progression: 10, message: 'Application des modifications…' }])

    const nouvelles = selectionnees.filter(l => l.etat === 'nouveau').map(l => l.detectee)
    const modifiees = selectionnees.filter(l => l.etat === 'modifie')

    // Mettre à jour les horaires des classes modifiées
    for (const ligne of modifiees) {
      if (!ligne.existante) continue
      // Supprimer les anciens cours_semaine
      await supabase.from('cours_semaine').delete().eq('classe_id', ligne.existante.id).eq('enseignant_id', profil.id)
      // Insérer les nouveaux
      for (const c of ligne.detectee.cours) {
        await supabase.from('cours_semaine').insert({
          enseignant_id: profil.id,
          classe_id:     ligne.existante.id,
          nom_classe:    ligne.existante.nom,
          couleur:       ligne.existante.couleur || '#7F77DD',
          jour:          c.jour,
          heure_debut:   c.heure_debut,
          heure_fin:     c.heure_fin,
          salle:         c.salle || null,
          recurrent:     true,
        } as any)
      }
      setProgressEvents(prev => [...prev, { etape: 1, progression: 40, message: `✓ Horaire mis à jour : ${ligne.existante.nom}` }])
    }

    // Créer les nouvelles classes via la cascade
    if (nouvelles.length > 0) {
      await lancerCascadeNouveaux(nouvelles)
    } else {
      setProgressEvents(prev => [...prev, { etape: 'complete', progression: 100, message: '✓ Modifications appliquées' }])
      setEtape('complet')
      onSuccess([], [])
    }
  }

  // ── Rendus ────────────────────────────────────────────────────────────────

  const baseOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: Z.modal_overlay, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  }
  const baseCard: React.CSSProperties = {
    width: '100%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto',
    zIndex: Z.modal_contenu,
    background: 'var(--bg-elevated, #1a1a2e)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '24px 28px',
  }

  const lastEvent = progressEvents[progressEvents.length - 1]

  return (
    <div style={baseOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={baseCard}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>📤 Importer un emploi du temps</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
              {aClassesExistantes ? 'Vous avez déjà des classes — vos modifications seront proposées avant application.' : 'Vos classes seront créées automatiquement.'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-4)', cursor: 'pointer' }}>✕</button>
        </div>

        {/* ── UPLOAD ── */}
        {etape === 'upload' && (
          <div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Glisser-déposer ou cliquer</div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>PDF, image (JPG, PNG) ou document Word</div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt" onChange={handleFile} style={{ display: 'none' }} />
            </div>

            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', marginBottom: 12 }}>— ou décrire en texte —</div>

            <textarea value={texteLibre} onChange={e => setTexteLibre(e.target.value)} rows={5}
              placeholder="Exemple : Lundi 8h-9h Mathématiques 4B, Mardi 10h-11h Français 5A..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'var(--text-1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (texteLibre.trim()) analyser(undefined, texteLibre) }} disabled={!texteLibre.trim()}
                className="btn-primary" style={{ flex: 1, opacity: texteLibre.trim() ? 1 : 0.4 }}>
                Analyser le texte →
              </button>
              <button onClick={onClose} className="btn-ghost">Annuler</button>
            </div>
          </div>
        )}

        {/* ── ANALYSE EN COURS ── */}
        {etape === 'analyse_en_cours' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Analyse en cours…</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>L'IA détecte vos classes et horaires</div>
          </div>
        )}

        {/* ── CONFIRMATION NOUVEAU (Scénario A) ── */}
        {etape === 'confirmation_nouveau' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                ✓ J'ai détecté {classesDetect.length} classe{classesDetect.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                Je vais créer leurs dossiers, horaires et plans de leçons automatiquement.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {classesDetect.map((cls, i) => (
                <div key={i} style={{ padding: '12px 14px', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, background: 'rgba(96,165,250,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>📚</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{cls.nom}</span>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: 'rgba(96,165,250,0.15)', color: '#60A5FA', fontWeight: 600 }}>{cls.matiere}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{cls.niveau}</span>
                  </div>
                  {cls.cours.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 22 }}>
                      {cls.cours.map((c, j) => <span key={j} style={{ marginRight: 10 }}>{c.jour} {c.heure_debut}–{c.heure_fin}{c.salle ? ` (${c.salle})` : ''}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, fontSize: 11, color: '#A78BFA', marginBottom: 20 }}>
              ✦ Cette action consomme votre quota de générations IA.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => lancerCascadeNouveaux(classesDetect)} className="btn-primary" style={{ flex: 1 }}>
                ✓ Tout créer ({classesDetect.length} classe{classesDetect.length > 1 ? 's' : ''})
              </button>
              <button onClick={() => setEtape('upload')} className="btn-ghost">← Modifier</button>
            </div>
          </div>
        )}

        {/* ── CONFIRMATION EXISTANT (Scénario B) ── */}
        {etape === 'confirmation_existant' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                Proposition de mise à jour
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                J'ai comparé votre emploi du temps avec vos classes existantes. Cochez les changements à appliquer.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {lignes.map(ligne => (
                <div key={ligne.id} style={{ padding: '12px 14px', border: `1px solid ${ligne.etat === 'identique' ? 'rgba(255,255,255,0.06)' : ligne.etat === 'nouveau' ? 'rgba(96,165,250,0.3)' : 'rgba(251,191,36,0.3)'}`, borderRadius: 10, background: ligne.etat === 'identique' ? 'transparent' : ligne.etat === 'nouveau' ? 'rgba(96,165,250,0.05)' : 'rgba(251,191,36,0.05)', opacity: ligne.etat === 'identique' ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {ligne.etat !== 'identique' && (
                      <input type="checkbox" checked={ligne.selected}
                        onChange={() => setLignes(prev => prev.map(l => l.id === ligne.id ? { ...l, selected: !l.selected } : l))}
                        style={{ marginTop: 3, cursor: 'pointer' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: ligne.etat === 'identique' ? 'rgba(255,255,255,0.08)' : ligne.etat === 'nouveau' ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.15)', color: ligne.etat === 'identique' ? 'var(--text-4)' : ligne.etat === 'nouveau' ? '#60A5FA' : '#FBBF24' }}>
                          {ligne.etat === 'identique' ? '✓ à jour' : ligne.etat === 'nouveau' ? '+ nouvelle' : '🔄 horaire modifié'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{ligne.detectee.nom}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{ligne.detectee.matiere} · {ligne.detectee.niveau}</span>
                      </div>
                      {ligne.etat === 'modifie' && ligne.coursBefore && ligne.coursBefore.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 3 }}>
                          <span style={{ textDecoration: 'line-through', marginRight: 6 }}>
                            {ligne.coursBefore.map(c => `${c.jour} ${c.heure_debut}–${c.heure_fin}`).join(', ')}
                          </span>
                        </div>
                      )}
                      {ligne.detectee.cours.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                          {ligne.detectee.cours.map((c, j) => <span key={j} style={{ marginRight: 8 }}>{c.jour} {c.heure_debut}–{c.heure_fin}{c.salle ? ` (${c.salle})` : ''}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {lignes.some(l => l.etat === 'nouveau' && l.selected) && (
              <div style={{ padding: '10px 14px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, fontSize: 11, color: '#A78BFA', marginBottom: 16 }}>
                ✦ La création des nouvelles classes consomme votre quota de générations IA.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={appliquerModifications}
                disabled={!lignes.some(l => l.selected)}
                className="btn-primary" style={{ flex: 1, opacity: lignes.some(l => l.selected) ? 1 : 0.4 }}>
                ✓ Confirmer ces changements
              </button>
              <button onClick={() => setEtape('upload')} className="btn-ghost">← Modifier</button>
            </div>
          </div>
        )}

        {/* ── GÉNÉRATION EN COURS ── */}
        {etape === 'generation' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                {lastEvent?.etape === 'complete' || lastEvent?.etape === 'quota_epuise' ? '✓ Terminé !' : '⚙️ Préparation de votre espace…'}
              </div>
              {lastEvent && (
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #7F77DD, #9B5DE5)', width: `${Math.max(0, lastEvent.progression ?? 0)}%`, transition: 'width .4s ease' }} />
                </div>
              )}
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {progressEvents.slice(-10).map((ev, i) => (
                <div key={i} style={{ fontSize: 12, color: ev.etape === 'complete' ? '#34D399' : 'var(--text-3)', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#6C5CE7', fontSize: 10, marginTop: 2 }}>●</span>
                  {ev.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPLET ── */}
        {etape === 'complet' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{quotaEpuise ? 'ℹ️' : '🎉'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
              {quotaEpuise ? 'Structure créée' : 'Import terminé !'}
            </div>
            {quotaEpuise ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 20, textAlign: 'left', padding: '12px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8 }}>
                {quotaMsg}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>
                Vos classes et horaires ont été créés avec succès.
              </div>
            )}
            <button onClick={onClose} className="btn-primary">Fermer et actualiser</button>
          </div>
        )}

        {/* ── ERREUR ── */}
        {etape === 'erreur' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
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
