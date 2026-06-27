'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogoKlassIA from '@/components/ui/LogoKlassIA'
import type { ConversationIA } from '@/lib/types/database'

// ─── Type labels ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { emoji: string; labelFr: string; labelEn: string }> = {
  curriculum:     { emoji: '📘', labelFr: 'Curriculum',         labelEn: 'Curriculum'        },
  plan_annuel:    { emoji: '📅', labelFr: 'Plan annuel',        labelEn: 'Annual Plan'       },
  plan_lecon:     { emoji: '📝', labelFr: 'Plans de leçon',     labelEn: 'Lesson Plans'      },
  lecon_complete: { emoji: '📖', labelFr: 'Leçons complètes',   labelEn: 'Full Lessons'      },
  fiche_lecon:    { emoji: '📄', labelFr: 'Fiches de leçon',    labelEn: 'Lesson Sheets'     },
  quiz:           { emoji: '🎮', labelFr: 'Quiz',               labelEn: 'Quizzes'           },
  evaluation:     { emoji: '📊', labelFr: 'Évaluations',        labelEn: 'Assessments'       },
  email_parents:  { emoji: '📧', labelFr: 'Emails parents',     labelEn: 'Parent Emails'     },
  autre:          { emoji: '💬', labelFr: 'Autres',             labelEn: 'Other'             },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profil:               any
  classes:              any[]
  activeConversationId: string | null
  refreshKey:           number
  onSelectConversation: (conv: ConversationIA) => void
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

  const [conversations,    setConversations]    = useState<ConversationIA[]>([])
  const [loading,          setLoading]          = useState(true)
  const [expandedClasses,  setExpandedClasses]  = useState<Set<string>>(new Set())

  // ── Charger les conversations ──────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!profil?.id) return
    const { data } = await supabase
      .from('conversations_ia')
      .select('id, enseignant_id, classe_id, type_contenu, titre, fichier_dossier_id, est_archivee, contexte_page, created_at, updated_at')
      .eq('enseignant_id', profil.id)
      .eq('est_archivee', false)
      .order('updated_at', { ascending: false })
      .limit(200)
    const convs = (data || []) as ConversationIA[]
    setConversations(convs)
    // Expand classes that have conversations by default
    const cids = new Set(convs.map(c => c.classe_id || 'none'))
    setExpandedClasses(cids)
    setLoading(false)
  }, [profil?.id])

  useEffect(() => {
    loadConversations()
  }, [loadConversations, refreshKey])

  // ── Grouper : classe_id → type_contenu → conversations[] ─────────────────
  const grouped: Record<string, Record<string, ConversationIA[]>> = {}
  for (const conv of conversations) {
    const cid  = conv.classe_id || 'none'
    const type = conv.type_contenu || 'autre'
    if (!grouped[cid])       grouped[cid]       = {}
    if (!grouped[cid][type]) grouped[cid][type]  = []
    grouped[cid][type].push(conv)
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
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        <LogoKlassIA variant="icone" taille={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>KlassIA+</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
            ← {isFr ? 'Tableau de bord' : 'Dashboard'}
          </div>
        </div>
      </div>

      {/* ── Titre section ──────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px 6px',
        fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
      }}>
        {isFr ? 'Historique · Préparer' : 'History · Prepare'}
      </div>

      {/* ── Arborescence ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 16px' }}>

        {loading ? (
          <div style={{ padding: '20px 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {isFr ? 'Chargement…' : 'Loading…'}
          </div>

        ) : conversations.length === 0 ? (
          <div style={{ padding: '24px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.6 }}>
            {isFr
              ? 'Vos conversations apparaîtront ici dès votre première génération.'
              : 'Your conversations will appear here after your first generation.'}
          </div>

        ) : (
          <>
            {/* Classes avec conversations */}
            {classes
              .filter(c => grouped[c.id])
              .map(classe => (
                <div key={classe.id} style={{ marginBottom: 2 }}>

                  {/* Classe header */}
                  <div
                    onClick={() => toggleClass(classe.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 10px', borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                      color: 'rgba(255,255,255,0.7)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13 }}>📁</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {classe.nom}{classe.niveau ? ` · ${classe.niveau}` : ''}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.4, flexShrink: 0 }}>
                      {expandedClasses.has(classe.id) ? '▾' : '▸'}
                    </span>
                  </div>

                  {/* Types + conversations */}
                  {expandedClasses.has(classe.id) && Object.entries(grouped[classe.id] || {}).map(([type, convs]) => {
                    const info = TYPE_LABELS[type] || { emoji: '💬', labelFr: type, labelEn: type }
                    return (
                      <div key={type} style={{ marginLeft: 8 }}>

                        {/* Type header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px',
                          fontSize: 10, fontWeight: 600,
                          color: 'rgba(255,255,255,0.38)',
                          letterSpacing: '0.2px',
                        }}>
                          <span>{info.emoji}</span>
                          <span>{isFr ? info.labelFr : info.labelEn}</span>
                        </div>

                        {/* Conversations */}
                        {convs.map(conv => {
                          const isActive = conv.id === activeConversationId
                          return (
                            <div
                              key={conv.id}
                              title={formatRelative(conv.updated_at)}
                              onClick={() => onSelectConversation(conv)}
                              style={{
                                padding: '5px 10px 5px 24px',
                                borderRadius: '0 6px 6px 0',
                                borderLeft: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                                background: isActive ? 'rgba(108,92,231,0.18)' : 'transparent',
                                fontSize: 11,
                                color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.52)',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.12s',
                                marginBottom: 1,
                              }}
                              onMouseEnter={e => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.52)'
                                }
                              }}>
                              └ {conv.titre || (isFr ? 'Conversation' : 'Conversation')}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))
            }

            {/* Conversations sans classe */}
            {grouped['none'] && (
              <div style={{ marginTop: 4 }}>
                <div style={{ padding: '5px 10px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)' }}>
                  📋 {isFr ? 'Sans classe' : 'No class'}
                </div>
                {Object.values(grouped['none']).flat().map(conv => {
                  const isActive = conv.id === activeConversationId
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv)}
                      style={{
                        padding: '5px 10px 5px 20px',
                        fontSize: 11,
                        color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                        background: isActive ? 'rgba(108,92,231,0.18)' : 'transparent',
                        cursor: 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        borderRadius: 6, marginBottom: 1,
                        borderLeft: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                      }}>
                      └ {conv.titre || 'Conversation'}
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
