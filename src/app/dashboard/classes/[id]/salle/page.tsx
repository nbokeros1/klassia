'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import LoadingScreen from '@/components/LoadingScreen'
import { TOUS_SCHEMAS } from '@/components/editor/SchemasSVG/index'

// ─── Affiches prédéfinies par matière ─────────────────────────────────────────

type AffichePredefinie = {
  id: string
  titre: string
  icon: string
  matiere: string[]
  schemaId?: string   // si lié à un SchemaItem existant
  description: string
}

const AFFICHES: AffichePredefinie[] = [
  // Biologie
  { id:'bio-corps-humain',    titre:'Corps humain',                icon:'🧬', matiere:['biologie','sciences'],  schemaId:'bio-corps-humain',            description:'Vue frontale avec organes principaux' },
  { id:'bio-cellule-animale', titre:'Cellule animale',             icon:'🔬', matiere:['biologie'],             schemaId:'bio-cellule-animale',         description:'Organites et membrane cellulaire' },
  { id:'bio-vivant',          titre:'Classification du vivant',    icon:'🌳', matiere:['biologie','sciences'],  schemaId:undefined,                     description:'Règnes et domaines du vivant' },
  { id:'bio-labo',            titre:'Règles du laboratoire',       icon:'⚠️', matiere:['biologie','chimie','physique'], schemaId:undefined,            description:'Sécurité et bonnes pratiques' },
  { id:'bio-vie',             titre:'Cycle de la vie',             icon:'♻️', matiere:['biologie'],             schemaId:undefined,                     description:'Naissance, croissance, reproduction' },
  // Chimie
  { id:'chi-tableau',         titre:'Tableau périodique géant',    icon:'⚗️', matiere:['chimie'],               schemaId:'chi-tableau-periodique',      description:'20 premiers éléments colorés' },
  { id:'chi-securite',        titre:'Sécurité au laboratoire',     icon:'🦺', matiere:['chimie','physique'],    schemaId:undefined,                     description:'Règles de sécurité labo' },
  { id:'chi-pictogrammes',    titre:'Pictogrammes de danger',      icon:'☣️', matiere:['chimie'],               schemaId:undefined,                     description:'GHS — 9 symboles danger' },
  { id:'chi-etats',           titre:'États de la matière',         icon:'💧', matiere:['chimie','physique'],    schemaId:undefined,                     description:'Solide, liquide, gaz, plasma' },
  // Physique
  { id:'phy-formules',        titre:'Formules clés',               icon:'⚡', matiere:['physique'],             schemaId:undefined,                     description:'Forces, énergie, optique, électricité' },
  { id:'phy-spectre',         titre:'Spectre électromagnétique',   icon:'🌈', matiere:['physique'],             schemaId:'phy-spectre',                 description:'Du radio aux rayons gamma' },
  { id:'phy-symboles',        titre:'Symboles électriques',        icon:'🔌', matiere:['physique'],             schemaId:'phy-circuit',                 description:'Composants IEC normalisés' },
  { id:'phy-si',              titre:'Unités SI',                   icon:'📏', matiere:['physique','sciences'],  schemaId:undefined,                     description:'Système international d\'unités' },
  // Maths
  { id:'mat-geo',             titre:'Formules géométriques',       icon:'📐', matiere:['maths'],                schemaId:'mat-figures',                 description:'Aires, périmètres, volumes' },
  { id:'mat-multi',           titre:'Table de multiplication',     icon:'✖️', matiere:['maths'],                schemaId:undefined,                     description:'Tables de 1 à 12' },
  { id:'mat-algebre',         titre:'Règles d\'algèbre',           icon:'🔢', matiere:['maths'],                schemaId:undefined,                     description:'Propriétés, factorisation, identités' },
  { id:'mat-nombres',         titre:'Nombres remarquables',        icon:'π',  matiere:['maths'],                schemaId:undefined,                     description:'π, e, φ, √2 et leurs propriétés' },
]

const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  biologie: { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  chimie:   { color: '#FBC34A', bg: 'rgba(251,195,74,0.1)' },
  physique: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  maths:    { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  sciences: { color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
}

function getMatiereCouleur(matieres: string[]) {
  for (const m of matieres) {
    const key = Object.keys(CAT_COLORS).find(k => m.includes(k) || k.includes(m))
    if (key) return CAT_COLORS[key]
  }
  return { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' }
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadSvgAsFile(svgStr: string, filename: string) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

async function downloadSvgAsPng(svgStr: string, filename: string) {
  const img = new Image()
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200; canvas.height = 900
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0D1526'; ctx.fillRect(0, 0, 1200, 900)
    ctx.drawImage(img, 0, 0, 1200, 900)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png'); a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SallePage() {
  const params    = useParams()
  const classeId  = params.id as string
  const router    = useRouter()
  const supabase  = createClient()

  const [profil,     setProfil]     = useState<any>(null)
  const [classe,     setClasse]     = useState<any>(null)
  const [loading,    setLoading]    = useState(true)

  // Génération IA affiche
  const [aiSujet,    setAiSujet]    = useState('')
  const [aiFormat,   setAiFormat]   = useState<'A4'|'A3'>('A4')
  const [aiStyle,    setAiStyle]    = useState<'colore'|'epure'|'sombre'>('colore')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiResult,   setAiResult]   = useState('')
  const [aiError,    setAiError]    = useState('')

  // Filtre affiches
  const [filtre,     setFiltre]     = useState<string>('toutes')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await supabase.from('utilisateurs').select('*').eq('user_id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setProfil(p)
      const { data: cls } = await supabase.from('classes').select('*').eq('id', classeId).single()
      setClasse(cls)
      setLoading(false)
    }
    init()
  }, [classeId])

  const handleLogout = async () => {
    await supabase.auth.signOut(); router.push('/login')
  }

  const handleGenerateAffiche = async () => {
    if (!aiSujet.trim()) return
    setAiLoading(true); setAiResult(''); setAiError('')
    try {
      const res = await fetch('/api/ia/generer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_contenu: 'affiche_pedagogique',
          sujet: aiSujet,
          instructions: `Génère le contenu HTML d'une affiche pédagogique ${aiFormat} style "${aiStyle}" sur : "${aiSujet}".
Contexte classe : ${classe?.nom} (${classe?.niveau}, ${classe?.matiere}).
L'affiche doit contenir : un grand titre, les concepts clés avec définitions courtes, des exemples visuels (décrits en texte), et un pied de page ScorgIA.
Format HTML propre, utilisable directement. Pas de markdown.`,
          contexte: { classe: { nom: classe?.nom, niveau: classe?.niveau, matiere: classe?.matiere } },
          langue: 'fr',
          profil_ia: profil?.profil_ia || {},
        }),
      })
      const data = await res.json()
      if (data.contenu && !data.contenu.startsWith('⚠')) {
        setAiResult(data.contenu)
      } else {
        setAiError(data.contenu || 'Erreur lors de la génération')
      }
    } catch {
      setAiError('Erreur réseau')
    }
    setAiLoading(false)
  }

  if (loading) return <LoadingScreen />

  // Affiches filtrées selon la matière de la classe
  const matiereClasse = (classe?.matiere || '').toLowerCase()
  const affichesRelevantes = AFFICHES.filter(a =>
    filtre === 'toutes'
    || a.matiere.some(m => filtre === m)
  )
  const affichesTop = AFFICHES.filter(a =>
    a.matiere.some(m => matiereClasse.includes(m) || m.includes(matiereClasse))
  )

  const FILTRES = [
    { id: 'toutes',   label: 'Toutes',    color: 'var(--text-2)' },
    { id: 'biologie', label: 'Biologie',  color: '#34D399' },
    { id: 'chimie',   label: 'Chimie',    color: '#FBC34A' },
    { id: 'physique', label: 'Physique',  color: '#60A5FA' },
    { id: 'maths',    label: 'Maths',     color: '#A78BFA' },
  ]

  return (
    <div className="app-layout">
      <Sidebar profil={profil} activeHref="/dashboard/classes" onLogout={handleLogout} />

      <div className="main-content">
        <div className="topbar">
          <div>
            <button
              className="btn-ghost btn-sm"
              onClick={() => router.push(`/dashboard/classes/${classeId}`)}
              style={{ marginBottom: '4px', fontSize: '12px' }}
            >
              ← {classe?.nom || 'Classe'}
            </button>
            <div className="topbar-title">🏫 Salle de classe</div>
            <div className="topbar-sub">Affiches pédagogiques · {classe?.matiere || ''} · {classe?.niveau || ''}</div>
          </div>
        </div>

        <div className="page-content fade-in">

          {/* ── Section 1 : Affiches suggérées ── */}
          {affichesTop.length > 0 && filtre === 'toutes' && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '12px' }}>
                ⭐ Suggérées pour {classe?.matiere}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {affichesTop.map(affiche => <AfficheCard key={affiche.id} affiche={affiche} />)}
              </div>
            </div>
          )}

          {/* ── Filtres ── */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {FILTRES.map(f => (
              <button key={f.id} onClick={() => setFiltre(f.id)}
                style={{
                  padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${filtre === f.id ? f.color : 'var(--border)'}`,
                  background: filtre === f.id ? `${f.color}20` : 'transparent',
                  color: filtre === f.id ? f.color : 'var(--text-3)',
                  cursor: 'pointer',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Grille affiches ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '36px' }}>
            {affichesRelevantes.map(affiche => <AfficheCard key={affiche.id} affiche={affiche} />)}
          </div>

          {/* ── Section 2 : Génération IA ── */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '22px' }}>✦</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Générer une affiche personnalisée</div>
                <div style={{ fontSize: '11px', color: 'var(--text-4)' }}>L'IA crée une affiche pédagogique sur mesure pour ta classe</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', marginBottom: '14px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Sujet de l'affiche *</label>
                <input
                  value={aiSujet}
                  onChange={e => setAiSujet(e.target.value)}
                  placeholder={`ex. ${classe?.matiere ? `Les phases de la mitose en ${classe.matiere}` : 'Photosynthèse'}`}
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '13px', color: 'white', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Format</label>
                <select value={aiFormat} onChange={e => setAiFormat(e.target.value as 'A4'|'A3')}
                  style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px', color: 'white', cursor: 'pointer' }}>
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>Style</label>
                <select value={aiStyle} onChange={e => setAiStyle(e.target.value as 'colore'|'epure'|'sombre')}
                  style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px', color: 'white', cursor: 'pointer' }}>
                  <option value="colore">Coloré</option>
                  <option value="epure">Épuré</option>
                  <option value="sombre">Sombre</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAffiche}
              disabled={aiLoading || !aiSujet.trim()}
              style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700,
                background: aiLoading || !aiSujet.trim() ? 'rgba(124,58,237,0.2)' : 'linear-gradient(135deg,#6B3FA0,#A78BFA)',
                color: aiLoading || !aiSujet.trim() ? '#A78BFA' : 'white',
                cursor: aiLoading || !aiSujet.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {aiLoading ? '✦ Génération en cours…' : '✦ Générer avec l\'IA'}
            </button>

            {/* Résultat */}
            {aiError && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', fontSize: '12px', color: '#F87171' }}>
                {aiError}
              </div>
            )}

            {aiResult && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '10px' }}>
                  ✓ Affiche générée
                </div>
                {/* Aperçu */}
                <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '12px', maxHeight: '400px', overflowY: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: aiResult }} />
                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const blob = new Blob([aiResult], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url; a.download = `affiche-${aiSujet.slice(0,30).replace(/\s/g,'-')}.html`
                      document.body.appendChild(a); a.click(); a.remove()
                      URL.revokeObjectURL(url)
                    }}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60A5FA', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    ⬇ Télécharger HTML
                  </button>
                  <button
                    onClick={() => { window.print() }}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    🖨️ Imprimer
                  </button>
                  <button
                    onClick={() => { setAiResult(''); setAiSujet('') }}
                    style={{ padding: '8px 14px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-4)', fontSize: '12px', cursor: 'pointer' }}>
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AfficheCard ──────────────────────────────────────────────────────────────

function AfficheCard({ affiche }: { affiche: AffichePredefinie }) {
  const { color, bg } = getMatiereCouleur(affiche.matiere)
  const schema = affiche.schemaId ? TOUS_SCHEMAS.find(s => s.id === affiche.schemaId) : undefined
  const previewSvg = schema ? schema.toSvg() : null

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden', cursor: 'default', border: `1px solid ${color}25` }}
    >
      {/* Preview */}
      <div style={{ height: '100px', background: '#080E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6px' }}>
        {previewSvg ? (
          <div
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        ) : (
          <span style={{ fontSize: '36px' }}>{affiche.icon}</span>
        )}
      </div>

      {/* Infos */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {affiche.titre}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-4)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {affiche.description}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {schema ? (
            <>
              <button
                onClick={() => downloadSvgAsFile(schema.toSvg(), `${affiche.id}.svg`)}
                style={{ flex: 1, padding: '5px 0', borderRadius: '6px', background: bg, color, border: `1px solid ${color}40`, fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                ⬇ SVG
              </button>
              <button
                onClick={() => downloadSvgAsPng(schema.toSvg(), `${affiche.id}.png`)}
                style={{ flex: 1, padding: '5px 0', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: '10px', cursor: 'pointer' }}>
                🖼 PNG
              </button>
            </>
          ) : (
            <button
              onClick={() => alert(`Affiche "${affiche.titre}" — génération PDF bientôt disponible`)}
              style={{ width: '100%', padding: '5px 0', borderRadius: '6px', background: bg, color, border: `1px solid ${color}40`, fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
              Bientôt disponible
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
