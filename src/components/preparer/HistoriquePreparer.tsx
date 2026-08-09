'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScorgiaLogo } from '@/components/branding/scorgia-logo'
import type { ConversationIAResume } from '@/lib/types/database'

// ─── Type labels (icône + couleur) ───────────────────────────────────────────

const TYPE_META: Record<string, { emoji: string; labelFr: string; color: string }> = {
  curriculum:     { emoji: '📘', labelFr: 'Curriculum',       color: '#60A5FA' },
  plan_annuel:    { emoji: '📅', labelFr: 'Plan annuel',      color: '#A78BFA' },
  plan_lecon:     { emoji: '📝', labelFr: 'Plan de leçon',    color: '#34D399' },
  lecon_complete: { emoji: '📖', labelFr: 'Leçon complète',   color: '#FBC34A' },
  fiche_lecon:    { emoji: '📄', labelFr: 'Fiche de leçon',   color: '#FBC34A' },
  quiz:           { emoji: '🎮', labelFr: 'Quiz',             color: '#FB923C' },
  evaluation:     { emoji: '📊', labelFr: 'Évaluation',       color: '#F87171' },
  email_parents:  { emoji: '📧', labelFr: 'Email parents',    color: '#F472B6' },
  autre:          { emoji: '💬', labelFr: 'Conversation',     color: 'rgba(255,255,255,0.45)' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profil:               any
  classes:              any[]
  activeConversationId: string | null
  refreshKey:           number
  onSelectConversation: (conv: ConversationIAResume) => void
  onLogout?:            () => void
  notifCount?:          number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoriquePreparer({
  profil, classes, activeConversationId, refreshKey,
  onSelectConversation, onLogout,
}: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const isFr     = profil?.langue_interface !== 'en'

  const [conversations,   setConversations]   = useState<ConversationIAResume[]>([])
  const [loading,         setLoading]         = useState(true)
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())
  const [searchQuery,     setSearchQuery]     = useState('')

  // ── Charger les conversations ──────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!profil?.id) return
    try {
      const { data, error } = await supabase
        .from('conversations_ia')
        .select('id, enseignant_id, classe_id, type_contenu, titre, fichier_dossier_id, est_archivee, contexte_page, created_at, updated_at')
        .eq('enseignant_id', profil.id)
        .eq('est_archivee', false)
        .order('updated_at', { ascending: false })
        .limit(200)
      if (error) console.error('[SCORGIA][HISTORIQUE][LOAD]', error)
      const convs = (data || []) as ConversationIAResume[]
      setConversations(convs)
      const cids = new Set(convs.map(c => c.classe_id || 'none'))
      setExpandedClasses(cids)
    } finally {
      setLoading(false)
    }
  }, [profil?.id])

  useEffect(() => {
    loadConversations()
  }, [loadConversations, refreshKey])

  // ── Filtrage par recherche ─────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? conversations.filter(c => {
        const q = searchQuery.toLowerCase()
        const titre = (c.titre || '').toLowerCase()
        const typeLabel = (TYPE_META[c.type_contenu || '']?.labelFr || '').toLowerCase()
        const classe = classes.find(cl => cl.id === c.classe_id)
        const classeNom = (classe?.nom || '').toLowerCase()
        return titre.includes(q) || typeLabel.includes(q) || classeNom.includes(q)
      })
    : conversations

  // ── Grouper : classe_id → conversations[] (plus de type_contenu) ──────────
  const groupedByClass: Record<string, ConversationIAResume[]> = {}
  for (const conv of filtered) {
    const cid = conv.classe_id || 'none'
    if (!groupedByClass[cid]) groupedByClass[cid] = []
    groupedByClass[cid].push(conv)
  }

  // ── Date relative ─────────────────────────────────────────────────────────
  const formatRelative = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return isFr ? "Aujourd'hui" : 'Today'
    if (days === 1) return isFr ? 'Hier' : 'Yesterday'
    if (days < 7)   return isFr ? `il y a ${days} j` : `${days}d ago`
    return new Date(date).toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', { month: 'short', day: 'numeric' })
  }

  // ── Toggle expand ─────────────────────────────────────────────────────────
  const toggleClass = (cid: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minWidth: 'var(--sidebar-w)',
      height: '100vh',
      background: 'linear-gradient(160deg, #0f1b2d 0%, #1a0e3d 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* ── Logo / Retour dashboard ─────────────────────────────────────── */}
      <div
        onClick={() => router.push('/dashboard')}
        style={{
          padding: '14px 14px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        <ScorgiaLogo variant="icon" width={28} height={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>ScorgIA</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
            ← {isFr ? 'Tableau de bord' : 'Dashboard'}
          </div>
        </div>
      </div>

      {/* ── Barre de recherche ─────────────────────────────────────────────── */}
      <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '5px 10px',
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isFr ? 'Rechercher…' : 'Search…'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Titre section ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '4px 14px 6px',
        fontSize: 9, fontWeight: 700,
        color: 'rgba(255,255,255,0.28)',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {searchQuery
          ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`
          : (isFr ? 'Explorateur IA' : 'AI Explorer')
        }
      </div>

      {/* ── Arborescence ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 16px' }}>

        {loading ? (
          <div style={{ padding: '20px 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {isFr ? 'Chargement…' : 'Loading…'}
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6 }}>
            {searchQuery
              ? (isFr ? 'Aucun résultat pour cette recherche.' : 'No results for this search.')
              : (isFr
                  ? 'Vos documents apparaîtront ici dès votre première génération.'
                  : 'Your documents will appear here after your first generation.')
            }
          </div>

        ) : (
          <>
            {/* Classes avec conversations */}
            {classes
              .filter(c => groupedByClass[c.id])
              .map(classe => {
                const convs = groupedByClass[classe.id] || []
                const isExpanded = expandedClasses.has(classe.id)
                const matiere = classe.matiere || (Array.isArray(classe.matieres) && classe.matieres[0]) || ''

                return (
                  <div key={classe.id} style={{ marginBottom: 2 }}>

                    {/* Classe header */}
                    <div
                      onClick={() => toggleClass(classe.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 10px', borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        color: 'rgba(255,255,255,0.72)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>📁</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {classe.nom}
                        </div>
                        {matiere && (
                          <div style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {matiere}{classe.niveau ? ` · ${classe.niveau}` : ''}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 9, opacity: 0.4, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginRight: 4 }}>{convs.length}</span>
                        {isExpanded ? '▾' : '▸'}
                      </span>
                    </div>

                    {/* Conversations (flat — sans groupement par type) */}
                    {isExpanded && convs.map(conv => {
                      const isActive = conv.id === activeConversationId
                      const meta = TYPE_META[conv.type_contenu || ''] || TYPE_META.autre

                      return (
                        <div
                          key={conv.id}
                          onClick={() => onSelectConversation(conv)}
                          style={{
                            padding: '5px 10px 5px 22px',
                            borderRadius: '0 6px 6px 0',
                            borderLeft: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                            background: isActive ? 'rgba(108,92,231,0.18)' : 'transparent',
                            cursor: 'pointer',
                            marginBottom: 1,
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                          }}
                          onMouseLeave={e => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                          }}>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            {/* Icône type */}
                            <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1, opacity: 0.8 }}>{meta.emoji}</span>
                            {/* Titre */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 11,
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.62)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                lineHeight: 1.35,
                              }}>
                                {conv.titre || (isFr ? 'Sans titre' : 'Untitled')}
                              </div>
                              {/* Métadonnées inline */}
                              <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                                <span style={{ fontSize: 9, color: meta.color, fontWeight: 600, opacity: 0.8 }}>
                                  {meta.labelFr}
                                </span>
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>·</span>
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                                  {formatRelative(conv.updated_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            }

            {/* Conversations sans classe */}
            {groupedByClass['none'] && (
              <div style={{ marginTop: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px',
                  fontSize: 10, fontWeight: 600,
                  color: 'rgba(255,255,255,0.28)',
                  letterSpacing: '0.2px',
                }}>
                  <span style={{ fontSize: 11 }}>📋</span>
                  <span>{isFr ? 'Sans classe' : 'No class'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>{groupedByClass['none'].length}</span>
                </div>
                {groupedByClass['none'].map(conv => {
                  const isActive = conv.id === activeConversationId
                  const meta = TYPE_META[conv.type_contenu || ''] || TYPE_META.autre
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv)}
                      style={{
                        padding: '5px 10px 5px 20px',
                        borderRadius: '0 6px 6px 0',
                        borderLeft: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                        background: isActive ? 'rgba(108,92,231,0.18)' : 'transparent',
                        cursor: 'pointer', marginBottom: 1, transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1, opacity: 0.7 }}>{meta.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {conv.titre || (isFr ? 'Sans titre' : 'Untitled')}
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, color: meta.color, fontWeight: 600, opacity: 0.8 }}>{meta.labelFr}</span>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>·</span>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>{formatRelative(conv.updated_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── User card bas de page ────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 12px 12px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => router.push('/dashboard/profil')}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6B3FA0, #4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {profil?.prenom?.[0]?.toUpperCase()}{profil?.nom?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profil?.prenom} {profil?.nom}
          </div>
        </div>
        {onLogout && (
          <button
            onClick={e => { e.stopPropagation(); onLogout() }}
            title={isFr ? 'Déconnexion' : 'Logout'}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', transition: 'color 0.15s', lineHeight: 1 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
            ↩
          </button>
        )}
      </div>
    </aside>
  )
}
