'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useForfait } from '@/lib/hooks/useForfait'
import type {
  GroupeCommunaute, MessageCommunaute, PartageCommune,
  Classe, DossierClasse, ForfaitType,
} from '@/lib/types/database'

// ─── Types locaux ─────────────────────────────────────────────────────────────

type TabId       = 'chat' | 'partages' | 'populaires'
type PartageType = 'plan_lecon' | 'lecon_complete' | 'ressource' | 'progression' | 'activite'
type SortPop     = 'telechargements' | 'note' | 'recent' | 'matiere'

interface GroupeAvecNonLus extends GroupeCommunaute { nonLus: number }

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<PartageType, string> = {
  plan_lecon:     'Plan de leçon',
  lecon_complete: 'Leçon complète',
  ressource:      'Ressource',
  progression:    'Progression',
  activite:       'Activité',
}

const TYPE_COLORS: Record<PartageType, string> = {
  plan_lecon:     '#4f8ef7',
  lecon_complete: '#22c55e',
  ressource:      '#f59e0b',
  progression:    '#a855f7',
  activite:       '#ec4899',
}

const MATIERES = [
  'Mathématiques','Français','Sciences','Histoire','Géographie',
  'Arts','Éducation physique','Musique','Anglais','Autre',
]

const NIVEAUX = [
  'Maternelle','1re année','2e année','3e année','4e année',
  '5e année','6e année','Secondaire 1','Secondaire 2','Secondaire 3',
  'Secondaire 4','Secondaire 5','Cégep',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'maintenant'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `il y a ${hrs} h`
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

function noteEtoiles(note: number): string {
  const full  = Math.floor(note)
  const half  = note - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
}

// ─── Composant carte partage ──────────────────────────────────────────────────

function CartePartage({
  p, onApercu, onDownload,
}: {
  p: PartageCommune
  onApercu:   (p: PartageCommune) => void
  onDownload: (p: PartageCommune) => void
}) {
  const type  = p.type as PartageType
  const color = TYPE_COLORS[type] ?? '#888'
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '16px',
      border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{
          background: color + '20', color, fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
        }}>{TYPE_LABELS[type] ?? type}</span>
        {p.est_verifie && (
          <span style={{ fontSize: 11, color: '#22c55e', marginLeft: 'auto' }}>✓ Vérifié</span>
        )}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.3 }}>
        {p.titre}
      </div>
      {p.description && (
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
          {p.description.length > 100 ? p.description.slice(0, 100) + '…' : p.description}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {p.matiere  && <Tag>{p.matiere}</Tag>}
        {p.niveau   && <Tag>{p.niveau}</Tag>}
        {p.province && <Tag>{p.province}</Tag>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          <span style={{ color: '#f59e0b' }}>{noteEtoiles(p.note_moyenne)}</span>
          {'  '}
          {p.nb_telechargements} téléch.
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onApercu(p)} style={btnSecSm}>Aperçu</button>
          <button onClick={() => onDownload(p)} style={btnPriSm}>⬇ Télécharger</button>
        </div>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: '#f1f5f9', color: '#475569', fontSize: 11,
      padding: '2px 8px', borderRadius: 99,
    }}>{children}</span>
  )
}

// ─── Styles partagés ──────────────────────────────────────────────────────────

const btnPri: React.CSSProperties = {
  background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
}
const btnSec: React.CSSProperties = {
  background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8,
  padding: '9px 18px', cursor: 'pointer', fontWeight: 500, fontSize: 13,
}
const btnPriSm: React.CSSProperties = {
  ...btnPri, padding: '5px 12px', fontSize: 12, borderRadius: 6,
}
const btnSecSm: React.CSSProperties = {
  ...btnSec, padding: '5px 12px', fontSize: 12, borderRadius: 6,
}
const inputStyle: React.CSSProperties = {
  border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px',
  fontSize: 13, width: '100%', outline: 'none', background: '#fff',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block',
}

// ─── Overlay modal ────────────────────────────────────────────────────────────

function Modal({
  title, onClose, children, width = 520,
}: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 900, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280',
          }}>×</button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CommunautePage() {
  const { profil, loading } = useAuth()
  const { peutUtiliser, forfaitRequis } = useForfait((profil?.forfait || 'gratuit') as ForfaitType)
  const router = useRouter()
  const supabase = createClient()

  // ── Groupes
  const [mesGroupes,  setMesGroupes]  = useState<GroupeAvecNonLus[]>([])
  const [groupeActif, setGroupeActif] = useState<GroupeAvecNonLus | null>(null)
  const [groupesLoad, setGroupesLoad] = useState(true)

  // ── Onglets
  const [tab, setTab] = useState<TabId>('chat')

  // ── Chat
  const [messages,   setMessages]   = useState<MessageCommunaute[]>([])
  const [msgText,    setMsgText]    = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ── Partages
  const [partages,      setPartages]      = useState<PartageCommune[]>([])
  const [filtreMatiere, setFiltreMatiere] = useState('')
  const [filtreNiveau,  setFiltreNiveau]  = useState('')
  const [filtreType,    setFiltreType]    = useState<PartageType | ''>('')
  const [partagesLoad,  setPartagesLoad]  = useState(false)

  // ── Populaires
  const [populaires, setPopulaires] = useState<PartageCommune[]>([])
  const [sortPop,    setSortPop]    = useState<SortPop>('telechargements')
  const [popLoad,    setPopLoad]    = useState(false)

  // ── Modal Télécharger
  const [dlPartage,  setDlPartage]  = useState<PartageCommune | null>(null)
  const [dlClasses,  setDlClasses]  = useState<Classe[]>([])
  const [dlClasseId, setDlClasseId] = useState('')
  const [dlDossiers, setDlDossiers] = useState<DossierClasse[]>([])
  const [dlDossierId,setDlDossierId]= useState('')
  const [dlDoing,    setDlDoing]    = useState(false)
  const [dlDone,     setDlDone]     = useState(false)

  // ── Modal Aperçu
  const [previewPartage, setPreviewPartage] = useState<PartageCommune | null>(null)

  // ── Modal Partager
  const [showPartager, setShowPartager] = useState(false)
  const [pType,        setPType]        = useState<PartageType>('plan_lecon')
  const [pTitre,       setPTitre]       = useState('')
  const [pDesc,        setPDesc]        = useState('')
  const [pMatiere,     setPMatiere]     = useState('')
  const [pNiveau,      setPNiveau]      = useState('')
  const [pProvince,    setPProvince]    = useState(profil?.province ?? '')
  const [pPublic,      setPPublic]      = useState(true)
  const [pGroupeId,    setPGroupeId]    = useState('')
  const [partagerLoad, setPartagerLoad] = useState(false)

  // ── Modal Trouver groupes
  const [showTrouver, setShowTrouver] = useState(false)
  const [tousGroupes, setTousGroupes] = useState<GroupeCommunaute[]>([])
  const [joinLoad,    setJoinLoad]    = useState('')

  // ── Modal Créer groupe
  const [showCreer,    setShowCreer]    = useState(false)
  const [creerNom,     setCreerNom]     = useState('')
  const [creerDesc,    setCreerDesc]    = useState('')
  const [creerMatiere, setCreerMatiere] = useState('')
  const [creerNiveau,  setCreerNiveau]  = useState('')
  const [creerLoad,    setCreerLoad]    = useState(false)

  // ─── Charger mes groupes ───────────────────────────────────────────────────

  const loadGroupes = useCallback(async () => {
    if (!profil) return
    setGroupesLoad(true)
    const { data: membres } = await supabase
      .from('membres_groupes')
      .select('groupe_id')
      .eq('enseignant_id', profil.id)

    const ids = (membres ?? []).map((m: { groupe_id: string }) => m.groupe_id)
    if (!ids.length) { setMesGroupes([]); setGroupesLoad(false); return }

    const { data: groupes } = await supabase
      .from('groupes_communaute')
      .select('*')
      .in('id', ids)
      .order('nom')

    const enriched: GroupeAvecNonLus[] = (groupes ?? []).map((g: GroupeCommunaute) => ({
      ...g, nonLus: 0,
    }))
    setMesGroupes(enriched)
    if (!groupeActif && enriched.length) setGroupeActif(enriched[0])
    setGroupesLoad(false)
  }, [profil, supabase, groupeActif])

  useEffect(() => { if (profil) loadGroupes() }, [profil])

  // ─── Charger messages du groupe actif ─────────────────────────────────────

  const loadMessages = useCallback(async (groupeId: string) => {
    const { data } = await supabase
      .from('messages_communaute')
      .select('*, enseignant:utilisateurs(prenom, nom, ecole)')
      .eq('groupe_id', groupeId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages((data as MessageCommunaute[]) ?? [])
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [supabase])

  useEffect(() => {
    if (!groupeActif) return
    loadMessages(groupeActif.id)
  }, [groupeActif])

  // ─── Realtime chat ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!groupeActif) return
    const channel = supabase
      .channel(`chat_${groupeActif.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages_communaute',
        filter: `groupe_id=eq.${groupeActif.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as MessageCommunaute])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupeActif?.id, supabase])

  // ─── Charger partages ─────────────────────────────────────────────────────

  const loadPartages = useCallback(async (groupeId?: string) => {
    setPartagesLoad(true)
    let q = supabase.from('partages_communaute').select('*').order('created_at', { ascending: false }).limit(60)
    const { data } = await q
    setPartages((data as PartageCommune[]) ?? [])
    setPartagesLoad(false)
  }, [supabase])

  const loadPopulaires = useCallback(async () => {
    setPopLoad(true)
    let col = 'nb_telechargements'
    if (sortPop === 'note')   col = 'note_moyenne'
    if (sortPop === 'recent') col = 'created_at'
    if (sortPop === 'matiere') col = 'matiere'
    const { data } = await supabase
      .from('partages_communaute')
      .select('*')
      .order(col, { ascending: sortPop === 'matiere' })
      .limit(30)
    setPopulaires((data as PartageCommune[]) ?? [])
    setPopLoad(false)
  }, [supabase, sortPop])

  useEffect(() => { if (tab === 'partages')  loadPartages() },  [tab])
  useEffect(() => { if (tab === 'populaires') loadPopulaires() }, [tab, sortPop])

  // ─── Envoyer message ──────────────────────────────────────────────────────

  const handleSendMsg = async () => {
    if (!msgText.trim() || !groupeActif || !profil) return
    setSendingMsg(true)
    await supabase.from('messages_communaute').insert({
      groupe_id:    groupeActif.id,
      enseignant_id: profil.id,
      contenu:      msgText.trim(),
      type:         'texte',
    })
    setMsgText('')
    setSendingMsg(false)
  }

  // ─── Télécharger partage vers classe ─────────────────────────────────────

  const openDownload = async (p: PartageCommune) => {
    setDlPartage(p)
    setDlDone(false)
    setDlClasseId('')
    setDlDossierId('')
    if (!profil) return
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('enseignant_id', profil.id)
      .order('nom')
    setDlClasses((data as Classe[]) ?? [])
  }

  useEffect(() => {
    if (!dlClasseId) { setDlDossiers([]); setDlDossierId(''); return }
    supabase.from('dossiers_classe').select('*').eq('classe_id', dlClasseId).order('ordre').then(({ data }) => {
      setDlDossiers((data as DossierClasse[]) ?? [])
    })
  }, [dlClasseId, supabase])

  const handleDownload = async () => {
    if (!dlPartage || !dlClasseId || !profil) return
    setDlDoing(true)
    await supabase.from('fichiers_classe').insert({
      dossier_id:      dlDossierId || null,
      classe_id:       dlClasseId,
      enseignant_id:   profil.id,
      nom:             dlPartage.titre,
      type_fichier:    dlPartage.type,
      url:             dlPartage.fichier_url ?? null,
      indexe_studio_ia: true,
      classe_cible:    'specifique',
    })
    await supabase
      .from('partages_communaute')
      .update({ nb_telechargements: (dlPartage.nb_telechargements ?? 0) + 1 })
      .eq('id', dlPartage.id)
    setDlDoing(false)
    setDlDone(true)
  }

  // ─── Partager une ressource ───────────────────────────────────────────────

  const handlePartager = async () => {
    if (!pTitre.trim() || !profil) return
    setPartagerLoad(true)
    await supabase.from('partages_communaute').insert({
      enseignant_id: profil.id,
      type:          pType,
      titre:         pTitre.trim(),
      description:   pDesc.trim() || null,
      matiere:       pMatiere || null,
      niveau:        pNiveau || null,
      province:      pProvince || null,
    })
    setShowPartager(false)
    setPTitre(''); setPDesc(''); setPMatiere(''); setPNiveau('')
    setPartagerLoad(false)
    if (tab === 'partages') loadPartages()
  }

  // ─── Trouver / rejoindre groupe ───────────────────────────────────────────

  const openTrouver = async () => {
    setShowTrouver(true)
    const { data } = await supabase.from('groupes_communaute').select('*').order('nb_membres', { ascending: false })
    setTousGroupes((data as GroupeCommunaute[]) ?? [])
  }

  const handleJoindre = async (groupeId: string) => {
    if (!profil) return
    setJoinLoad(groupeId)
    await supabase.from('membres_groupes').insert({
      groupe_id:    groupeId,
      enseignant_id: profil.id,
      role:         'membre',
    })
    setJoinLoad('')
    await loadGroupes()
    setShowTrouver(false)
  }

  const estMembre = (groupeId: string) => mesGroupes.some(g => g.id === groupeId)

  // ─── Créer groupe ─────────────────────────────────────────────────────────

  const handleCreerGroupe = async () => {
    if (!creerNom.trim() || !profil) return
    setCreerLoad(true)
    const { data: g } = await supabase.from('groupes_communaute').insert({
      nom:         creerNom.trim(),
      description: creerDesc.trim() || null,
      matiere:     creerMatiere || null,
      niveau:      creerNiveau || null,
      province:    profil.province ?? null,
      type:        'manuel',
      nb_membres:  1,
    }).select().single()

    if (g) {
      await supabase.from('membres_groupes').insert({
        groupe_id:    g.id,
        enseignant_id: profil.id,
        role:         'admin',
      })
    }
    setShowCreer(false)
    setCreerNom(''); setCreerDesc(''); setCreerMatiere(''); setCreerNiveau('')
    setCreerLoad(false)
    loadGroupes()
  }

  // ─── Filtrage partages ────────────────────────────────────────────────────

  const partagesFiltres = partages.filter(p => {
    if (filtreMatiere && p.matiere !== filtreMatiere) return false
    if (filtreNiveau  && p.niveau  !== filtreNiveau)  return false
    if (filtreType    && p.type    !== filtreType)     return false
    return true
  })

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Chargement…</div>
      </div>
    )
  }

  if (!profil) return null

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>

      {/* ── Sidebar gauche ── */}
      <div style={{
        width: 240, minWidth: 240, background: '#fff', borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* En-tête */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
            💬 Communauté
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Vos groupes</div>
        </div>

        {/* Boutons action */}
        <div style={{ padding: '10px 12px', display: 'flex', gap: 6, borderBottom: '1px solid #f0f0f0' }}>
          <button onClick={() => setShowCreer(true)} style={{
            flex: 1, background: '#7c3aed', color: '#fff', border: 'none',
            borderRadius: 7, padding: '7px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>➕ Créer</button>
          <button onClick={openTrouver} style={{
            flex: 1, background: '#f1f5f9', color: '#374151', border: 'none',
            borderRadius: 7, padding: '7px 0', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>🔍 Trouver</button>
        </div>

        {/* Liste groupes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {groupesLoad && (
            <div style={{ padding: '16px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              Chargement…
            </div>
          )}
          {!groupesLoad && mesGroupes.length === 0 && (
            <div style={{ padding: '20px 16px', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
              Vous n'avez pas encore rejoint de groupe.<br />
              Cliquez <b>Trouver</b> pour en explorer.
            </div>
          )}
          {mesGroupes.map(g => (
            <button key={g.id} onClick={() => { setGroupeActif(g); setTab('chat') }} style={{
              width: '100%', textAlign: 'left', background: groupeActif?.id === g.id ? '#f5f3ff' : 'transparent',
              border: 'none', borderLeft: groupeActif?.id === g.id ? '3px solid #7c3aed' : '3px solid transparent',
              padding: '10px 14px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{g.nom}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{g.nb_membres} membre{g.nb_membres > 1 ? 's' : ''}</div>
              </div>
              {g.nonLus > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
                  borderRadius: 99, padding: '2px 6px', minWidth: 18, textAlign: 'center',
                }}>{g.nonLus}</span>
              )}
            </button>
          ))}
        </div>

        {/* Bouton Partager en bas */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #f0f0f0' }}>
          <button onClick={() => setShowPartager(true)} style={{
            width: '100%', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
            borderRadius: 8, padding: '9px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>📤 Partager une ressource</button>
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 24,
          flexShrink: 0,
        }}>
          {/* Nom du groupe actif */}
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', minWidth: 120 }}>
            {groupeActif ? groupeActif.nom : 'Communauté'}
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 0, marginLeft: 'auto' }}>
            {([
              { id: 'chat',       label: '💬 Chat'      },
              { id: 'partages',   label: '📤 Partages'  },
              { id: 'populaires', label: '⭐ Populaires' },
            ] as { id: TabId; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background:  'none', border: 'none', cursor: 'pointer',
                padding:     '0 18px', height: 56, fontSize: 13, fontWeight: 600,
                color:       tab === t.id ? '#7c3aed' : '#64748b',
                borderBottom: tab === t.id ? '2px solid #7c3aed' : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* ── Onglet Chat ── */}
        {tab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!groupeActif ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 40 }}>💬</div>
                <div style={{ fontSize: 14 }}>Sélectionnez un groupe pour commencer à discuter</div>
                <button onClick={openTrouver} style={btnPri}>🔍 Trouver des groupes</button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 40 }}>
                      Aucun message pour l'instant. Soyez le premier !
                    </div>
                  )}
                  {messages.map(msg => {
                    const isMine = msg.enseignant_id === profil.id
                    return (
                      <div key={msg.id} style={{
                        display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
                        alignItems: 'flex-end', gap: 8,
                      }}>
                        {/* Avatar */}
                        {!isMine && (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: '#7c3aed20', color: '#7c3aed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {msg.enseignant
                              ? (msg.enseignant as { prenom: string; nom: string }).prenom?.[0]?.toUpperCase()
                              : '?'}
                          </div>
                        )}
                        {/* Bulle */}
                        <div style={{ maxWidth: '65%' }}>
                          {!isMine && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3, paddingLeft: 2 }}>
                              {msg.enseignant
                                ? `${(msg.enseignant as { prenom: string; nom: string }).prenom} ${(msg.enseignant as { prenom: string; nom: string }).nom}`
                                : 'Enseignant'}
                            </div>
                          )}
                          {/* Carte plan/leçon */}
                          {(msg.type === 'plan_lecon' || msg.type === 'lecon') && msg.lecon_id ? (
                            <div style={{
                              background: '#f5f3ff', borderRadius: 10, padding: '12px 14px',
                              border: '1px solid #ddd6fe', cursor: 'pointer',
                            }}>
                              <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>
                                {msg.type === 'plan_lecon' ? '📋 Plan de leçon' : '📖 Leçon complète'}
                              </div>
                              {msg.contenu && <div style={{ fontSize: 13, color: '#1e293b' }}>{msg.contenu}</div>}
                            </div>
                          ) : (
                            <div style={{
                              background: isMine ? '#7c3aed' : '#fff',
                              color:      isMine ? '#fff' : '#1e293b',
                              borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
                              border: isMine ? 'none' : '1px solid #e2e8f0',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}>
                              {msg.contenu}
                            </div>
                          )}
                          <div style={{
                            fontSize: 10, color: '#94a3b8', marginTop: 3,
                            textAlign: isMine ? 'right' : 'left',
                          }}>
                            {relDate(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Zone de saisie */}
                <div style={{
                  background: '#fff', borderTop: '1px solid #e2e8f0',
                  padding: '14px 24px', display: 'flex', gap: 10,
                }}>
                  <input
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMsg() } }}
                    placeholder="Écrire un message…"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={handleSendMsg}
                    disabled={sendingMsg || !msgText.trim()}
                    style={{
                      ...btnPri,
                      opacity: (!msgText.trim() || sendingMsg) ? 0.5 : 1,
                      padding: '9px 20px',
                    }}>
                    Envoyer
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Onglet Partages ── */}
        {tab === 'partages' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {/* Filtres */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <select value={filtreMatiere} onChange={e => setFiltreMatiere(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                <option value=''>Toutes les matières</option>
                {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filtreNiveau} onChange={e => setFiltreNiveau(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                <option value=''>Tous les niveaux</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filtreType} onChange={e => setFiltreType(e.target.value as PartageType | '')} style={{ ...inputStyle, width: 'auto' }}>
                <option value=''>Tous les types</option>
                {(Object.entries(TYPE_LABELS) as [PartageType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {(filtreMatiere || filtreNiveau || filtreType) && (
                <button onClick={() => { setFiltreMatiere(''); setFiltreNiveau(''); setFiltreType('') }} style={btnSecSm}>
                  ✕ Effacer
                </button>
              )}
            </div>

            {partagesLoad && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chargement…</div>
            )}
            {!partagesLoad && partagesFiltres.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                Aucun partage trouvé.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {partagesFiltres.map(p => (
                <CartePartage
                  key={p.id} p={p}
                  onApercu={setPreviewPartage}
                  onDownload={openDownload}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Onglet Populaires ── */}
        {tab === 'populaires' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {/* Tri */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center' }}>Trier par :</span>
              {([
                ['telechargements', '⬇ Téléchargements'],
                ['note',            '★ Note'],
                ['recent',         '🕒 Récent'],
                ['matiere',        '📚 Matière'],
              ] as [SortPop, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setSortPop(v)} style={{
                  background: sortPop === v ? '#7c3aed' : '#f1f5f9',
                  color:      sortPop === v ? '#fff'    : '#374151',
                  border: 'none', borderRadius: 8, padding: '6px 14px',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}>{l}</button>
              ))}
            </div>

            {popLoad && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Chargement…</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {populaires.map(p => (
                <CartePartage
                  key={p.id} p={p}
                  onApercu={setPreviewPartage}
                  onDownload={openDownload}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══════════════════════════════════════════════════════════ */}

      {/* ── Modal Aperçu partage ── */}
      {previewPartage && (
        <Modal title={`Aperçu — ${previewPartage.titre}`} onClose={() => setPreviewPartage(null)} width={600}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: (TYPE_COLORS[previewPartage.type as PartageType] ?? '#888') + '20',
                color:      TYPE_COLORS[previewPartage.type as PartageType] ?? '#888',
                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              }}>{TYPE_LABELS[previewPartage.type as PartageType] ?? previewPartage.type}</span>
              {previewPartage.est_verifie && <span style={{ fontSize: 12, color: '#22c55e' }}>✓ Vérifié</span>}
            </div>
            {previewPartage.description && (
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                {previewPartage.description}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {previewPartage.matiere  && <Tag>{previewPartage.matiere}</Tag>}
              {previewPartage.niveau   && <Tag>{previewPartage.niveau}</Tag>}
              {previewPartage.province && <Tag>{previewPartage.province}</Tag>}
              {previewPartage.curriculum && <Tag>{previewPartage.curriculum}</Tag>}
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
              <strong>{previewPartage.nb_telechargements}</strong> téléchargements
              {'  ·  '}
              <span style={{ color: '#f59e0b' }}>{noteEtoiles(previewPartage.note_moyenne)}</span>
              {'  ·  Partagé le '}
              {new Date(previewPartage.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {previewPartage.contenu_json && (
              <details>
                <summary style={{ fontSize: 13, color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Voir le contenu JSON</summary>
                <pre style={{ fontSize: 11, background: '#f1f5f9', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 200, marginTop: 8 }}>
                  {JSON.stringify(previewPartage.contenu_json, null, 2)}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button onClick={() => setPreviewPartage(null)} style={btnSec}>Fermer</button>
              <button onClick={() => { setPreviewPartage(null); openDownload(previewPartage) }} style={btnPri}>
                ⬇ Télécharger vers ma classe
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Télécharger vers classe ── */}
      {dlPartage && (
        <Modal title='Télécharger vers ma classe' onClose={() => { setDlPartage(null); setDlDone(false) }} width={440}>
          {dlDone ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Ressource ajoutée !</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Elle est maintenant disponible dans vos fichiers de classe.
              </div>
              <button onClick={() => { setDlPartage(null); setDlDone(false) }} style={btnPri}>Fermer</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{dlPartage.titre}</div>
              <div>
                <label style={labelStyle}>Classe cible *</label>
                <select value={dlClasseId} onChange={e => setDlClasseId(e.target.value)} style={inputStyle}>
                  <option value=''>Sélectionner une classe…</option>
                  {dlClasses.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.matiere}</option>)}
                </select>
              </div>
              {dlClasseId && (
                <div>
                  <label style={labelStyle}>Dossier (optionnel)</label>
                  <select value={dlDossierId} onChange={e => setDlDossierId(e.target.value)} style={inputStyle}>
                    <option value=''>Racine de la classe</option>
                    {dlDossiers.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button onClick={() => setDlPartage(null)} style={btnSec}>Annuler</button>
                <button
                  onClick={handleDownload}
                  disabled={!dlClasseId || dlDoing}
                  style={{ ...btnPri, opacity: (!dlClasseId || dlDoing) ? 0.5 : 1 }}>
                  {dlDoing ? 'Ajout…' : 'Ajouter à la classe'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal Partager une ressource ── */}
      {showPartager && (
        <Modal title='📤 Partager une ressource' onClose={() => setShowPartager(false)} width={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Type de partage *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.entries(TYPE_LABELS) as [PartageType, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setPType(v)} style={{
                    background: pType === v ? TYPE_COLORS[v] + '20' : '#f1f5f9',
                    color:      pType === v ? TYPE_COLORS[v]        : '#374151',
                    border:     pType === v ? `1px solid ${TYPE_COLORS[v]}` : '1px solid #e2e8f0',
                    borderRadius: 99, padding: '5px 12px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={pTitre} onChange={e => setPTitre(e.target.value)} placeholder='Ex. Plan de leçon — Fractions' style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder='Décrivez brièvement cette ressource…' rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Matière</label>
                <select value={pMatiere} onChange={e => setPMatiere(e.target.value)} style={inputStyle}>
                  <option value=''>—</option>
                  {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select value={pNiveau} onChange={e => setPNiveau(e.target.value)} style={inputStyle}>
                  <option value=''>—</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Province</label>
              <input value={pProvince} onChange={e => setPProvince(e.target.value)} placeholder='Ex. Québec, Ontario…' style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type='checkbox' id='pPublic' checked={pPublic} onChange={e => setPPublic(e.target.checked)} style={{ cursor: 'pointer' }} />
              <label htmlFor='pPublic' style={{ fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                Partager publiquement (visible dans Partages & Populaires)
              </label>
            </div>
            {!pPublic && (
              <div>
                <label style={labelStyle}>Partager dans le groupe</label>
                <select value={pGroupeId} onChange={e => setPGroupeId(e.target.value)} style={inputStyle}>
                  <option value=''>Sélectionner un groupe…</option>
                  {mesGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowPartager(false)} style={btnSec}>Annuler</button>
              <button
                onClick={handlePartager}
                disabled={!pTitre.trim() || partagerLoad}
                style={{ ...btnPri, opacity: (!pTitre.trim() || partagerLoad) ? 0.5 : 1 }}>
                {partagerLoad ? 'Partage…' : '📤 Publier'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Trouver groupes ── */}
      {showTrouver && (
        <Modal title='🔍 Trouver des groupes' onClose={() => setShowTrouver(false)} width={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tousGroupes.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>Chargement…</div>
            )}
            {tousGroupes.map(g => (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10,
                background: estMembre(g.id) ? '#f5f3ff' : '#fff',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{g.nom}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {g.nb_membres} membre{g.nb_membres > 1 ? 's' : ''}
                    {g.matiere && ` · ${g.matiere}`}
                    {g.niveau  && ` · ${g.niveau}`}
                  </div>
                  {g.description && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{g.description}</div>
                  )}
                </div>
                {estMembre(g.id) ? (
                  <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>✓ Membre</span>
                ) : (
                  <button
                    onClick={() => handleJoindre(g.id)}
                    disabled={joinLoad === g.id}
                    style={{ ...btnPriSm, opacity: joinLoad === g.id ? 0.5 : 1 }}>
                    {joinLoad === g.id ? '…' : 'Rejoindre'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Modal Créer un groupe ── */}
      {showCreer && (
        <Modal title='➕ Créer un groupe' onClose={() => setShowCreer(false)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nom du groupe *</label>
              <input value={creerNom} onChange={e => setCreerNom(e.target.value)} placeholder='Ex. Enseignants de maths — Québec' style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={creerDesc} onChange={e => setCreerDesc(e.target.value)} rows={2} placeholder="Décrivez l'objectif de ce groupe…" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Matière</label>
                <select value={creerMatiere} onChange={e => setCreerMatiere(e.target.value)} style={inputStyle}>
                  <option value=''>—</option>
                  {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Niveau</label>
                <select value={creerNiveau} onChange={e => setCreerNiveau(e.target.value)} style={inputStyle}>
                  <option value=''>—</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowCreer(false)} style={btnSec}>Annuler</button>
              <button
                onClick={handleCreerGroupe}
                disabled={!creerNom.trim() || creerLoad}
                style={{ ...btnPri, opacity: (!creerNom.trim() || creerLoad) ? 0.5 : 1 }}>
                {creerLoad ? 'Création…' : 'Créer le groupe'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
