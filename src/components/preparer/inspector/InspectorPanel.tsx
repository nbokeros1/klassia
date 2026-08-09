'use client'

import type { ReactNode } from 'react'
import type { ChatMessage } from '@/lib/types/workspace'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { emoji: string; labelFr: string; labelEn: string }> = {
  curriculum:         { emoji: '📘', labelFr: 'Curriculum',        labelEn: 'Curriculum'        },
  plan_annuel:        { emoji: '📅', labelFr: 'Plan annuel',       labelEn: 'Annual Plan'       },
  plan_lecon:         { emoji: '📝', labelFr: 'Plan de leçon',     labelEn: 'Lesson Plan'       },
  plan_de_lecon:      { emoji: '📝', labelFr: 'Plan de leçon',     labelEn: 'Lesson Plan'       },
  fiche_lecon:        { emoji: '📄', labelFr: 'Fiche de leçon',    labelEn: 'Lesson Sheet'      },
  lecon_complete:     { emoji: '📖', labelFr: 'Leçon complète',    labelEn: 'Full Lesson'       },
  lecon_developpee:   { emoji: '📖', labelFr: 'Leçon développée',  labelEn: 'Detailed Lesson'   },
  activite:           { emoji: '🎯', labelFr: 'Activité',          labelEn: 'Activity'          },
  quiz:               { emoji: '🎮', labelFr: 'Quiz',              labelEn: 'Quiz'              },
  evaluation:         { emoji: '📊', labelFr: 'Évaluation',        labelEn: 'Assessment'        },
  email_parents:      { emoji: '📧', labelFr: 'Email parents',     labelEn: 'Parent Email'      },
  autre:              { emoji: '💬', labelFr: 'Autre',             labelEn: 'Other'             },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function countSections(text: string): number {
  return (text.match(/^#{1,3}\s/gm) || []).length
}

function extractObjectifs(text: string): string[] {
  const lines = text.split('\n')
  const results: string[] = []
  let inObjectifBlock = false
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (/^#{1,3}\s.*objectif/i.test(line)) { inObjectifBlock = true; continue }
    if (/^#{1,3}\s/.test(line) && inObjectifBlock) { inObjectifBlock = false; continue }
    if (inObjectifBlock && line.trim().startsWith('-')) {
      const txt = line.replace(/^[-*]\s*/, '').trim()
      if (txt) results.push(txt)
      if (results.length >= 3) break
    }
  }
  return results
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(15,35,65,0.06)' }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InspectorPanelProps {
  lastGenerated:   ChatMessage | null
  classe:          { nom: string; niveau?: string } | null
  matiere:         string | null
  conversationId:  string | null
  messageCount:    number
  isFr:            boolean
  onClose:         () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InspectorPanel({
  lastGenerated, classe, matiere,
  conversationId, messageCount,
  isFr, onClose,
}: InspectorPanelProps) {

  const actionSug  = lastGenerated?.action_sug ?? null
  const typeInfo   = actionSug ? (TYPE_LABELS[actionSug.type_contenu] ?? TYPE_LABELS.autre) : null
  const wordCount  = actionSug ? countWords(actionSug.contenu)    : 0
  const sectionCnt = actionSug ? countSections(actionSug.contenu) : 0
  const objectifs  = actionSug ? extractObjectifs(actionSug.contenu) : []

  return (
    <aside style={{
      width:            280,
      flexShrink:       0,
      display:          'flex',
      flexDirection:    'column',
      borderLeft:       '1px solid rgba(15,35,65,0.07)',
      background:       'rgba(255,255,255,0.94)',
      backdropFilter:   'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      overflowY:        'auto',
      overflowX:        'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        position:     'sticky', top: 0,
        padding:      '13px 14px 11px',
        borderBottom: '1px solid rgba(15,35,65,0.07)',
        background:   'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display:      'flex', alignItems: 'center', gap: 8,
        zIndex:       10,
      }}>
        <span style={{ fontSize: 14, color: 'var(--violet)' }}>⊞</span>
        <span style={{
          flex:       1,
          fontFamily: 'var(--font-display, "Lexend", sans-serif)',
          fontSize:   13, fontWeight: 700,
          color:      'var(--text-primary)',
        }}>
          {isFr ? 'Inspecteur' : 'Inspector'}
        </span>
        <button
          onClick={onClose}
          aria-label={isFr ? 'Fermer l\'inspecteur' : 'Close inspector'}
          style={{
            width:  26, height: 26, borderRadius: 6,
            border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 14,
            color:  'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
          ✕
        </button>
      </div>

      {/* ── Empty state ── */}
      {!actionSug && (
        <div style={{
          flex:      1,
          display:   'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding:   '32px 20px', textAlign: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 32, opacity: 0.35 }}>⊞</span>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {isFr
              ? 'Générez du contenu pour voir les informations sur votre document.'
              : 'Generate content to see document information.'}
          </div>
        </div>
      )}

      {/* ── Document info ── */}
      {actionSug && (
        <>
          {/* Titre + type */}
          <Section title={isFr ? 'Document' : 'Document'}>
            <div style={{
              fontSize:   13, fontWeight: 700,
              color:      'var(--text-primary)',
              lineHeight: 1.3, marginBottom: 8,
              wordBreak:  'break-word',
            }}>
              {actionSug.titre || (isFr ? 'Document sans titre' : 'Untitled document')}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {typeInfo && (
                <span style={{
                  display:    'inline-flex', alignItems: 'center', gap: 4,
                  padding:    '2px 9px', borderRadius: 99,
                  background: 'var(--violet-soft, #EDE9FE)',
                  border:     '1px solid rgba(108,92,231,0.2)',
                  fontSize:   11, fontWeight: 600, color: 'var(--violet)',
                }}>
                  <span>{typeInfo.emoji}</span>
                  <span>{isFr ? typeInfo.labelFr : typeInfo.labelEn}</span>
                </span>
              )}
              <span style={{
                display:    'inline-flex', alignItems: 'center', gap: 4,
                padding:    '2px 9px', borderRadius: 99,
                background: lastGenerated?.is_saved ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                border:     `1px solid ${lastGenerated?.is_saved ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                fontSize:   11, fontWeight: 600,
                color:      lastGenerated?.is_saved ? '#16a34a' : '#D97706',
              }}>
                {lastGenerated?.is_saved
                  ? (isFr ? '✓ Sauvegardé' : '✓ Saved')
                  : (isFr ? '○ Brouillon' : '○ Draft')}
              </span>
            </div>
          </Section>

          {/* Métadonnées */}
          <Section title={isFr ? 'Métadonnées' : 'Metadata'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {classe && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, minWidth: 70 }}>
                    {isFr ? 'Classe' : 'Class'}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {classe.nom}{classe.niveau ? ` · ${classe.niveau}` : ''}
                  </span>
                </div>
              )}
              {matiere && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, minWidth: 70 }}>
                    {isFr ? 'Matière' : 'Subject'}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{matiere}</span>
                </div>
              )}
              {conversationId && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, minWidth: 70 }}>
                    {isFr ? 'Échanges' : 'Exchanges'}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {Math.ceil(messageCount / 2)}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Statistiques */}
          <Section title={isFr ? 'Statistiques' : 'Statistics'}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{
                padding:    '10px 12px', borderRadius: 10,
                background: 'rgba(108,92,231,0.05)',
                border:     '1px solid rgba(108,92,231,0.1)',
                textAlign:  'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display, "Lexend", sans-serif)',
                  fontSize:   18, fontWeight: 800,
                  color:      'var(--violet)', lineHeight: 1,
                }}>
                  {wordCount.toLocaleString('fr-CA')}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                  {isFr ? 'mots' : 'words'}
                </div>
              </div>
              <div style={{
                padding:    '10px 12px', borderRadius: 10,
                background: 'rgba(108,92,231,0.05)',
                border:     '1px solid rgba(108,92,231,0.1)',
                textAlign:  'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display, "Lexend", sans-serif)',
                  fontSize:   18, fontWeight: 800,
                  color:      'var(--violet)', lineHeight: 1,
                }}>
                  {sectionCnt}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                  {isFr ? 'sections' : 'sections'}
                </div>
              </div>
            </div>
          </Section>

          {/* Objectifs */}
          {objectifs.length > 0 && (
            <Section title={isFr ? 'Objectifs détectés' : 'Detected objectives'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {objectifs.map((obj, i) => (
                  <div key={i} style={{
                    display:   'flex', alignItems: 'flex-start', gap: 7,
                    fontSize:  12, color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}>
                    <span style={{
                      width:       16, height: 16,
                      borderRadius: '50%',
                      background:  'var(--violet-soft, #EDE9FE)',
                      color:       'var(--violet)',
                      fontSize:    9, fontWeight: 800,
                      display:     'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink:  0, marginTop: 2,
                    }}>
                      {i + 1}
                    </span>
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Version */}
          <Section title={isFr ? 'Version' : 'Version'}>
            <div style={{
              display:    'flex', alignItems: 'center', gap: 8,
              padding:    '8px 10px', borderRadius: 8,
              background: 'rgba(15,35,65,0.03)',
              border:     '1px solid rgba(15,35,65,0.07)',
              fontSize:   12,
            }}>
              <span style={{ fontSize: 14 }}>🕐</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>
                  {isFr ? 'Version actuelle' : 'Current version'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {isFr ? 'Session en cours' : 'Current session'}
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

    </aside>
  )
}
