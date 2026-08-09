'use client'

import type { ChatMessage } from '@/lib/types/workspace'

// ─── Types locaux ─────────────────────────────────────────────────────────────
interface ContextFile {
  id:  string
  nom: string
}

interface QuickAction {
  id:      string
  emoji:   string
  labelFr: string
  labelEn: string
  promptFr: string
  promptEn: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'curriculum', emoji: '📘', labelFr: 'Curriculum',     labelEn: 'Curriculum',   promptFr: 'Génère le curriculum pour ma classe cette année.',           promptEn: 'Generate the curriculum for my class this year.'            },
  { id: 'plan_lecon', emoji: '📝', labelFr: 'Plan de leçon',  labelEn: 'Lesson Plan',  promptFr: 'Crée un plan de leçon détaillé pour ma prochaine leçon.',    promptEn: 'Create a detailed lesson plan for my next lesson.'           },
  { id: 'lecon',      emoji: '✨', labelFr: 'Leçon complète', labelEn: 'Full Lesson',  promptFr: 'Génère une leçon complète avec activités et évaluation.',     promptEn: 'Generate a complete lesson with activities and assessment.'  },
  { id: 'quiz',       emoji: '🎮', labelFr: 'Quiz',           labelEn: 'Quiz',         promptFr: 'Crée un quiz formatif sur la matière actuelle.',              promptEn: 'Create a formative quiz on the current topic.'              },
  { id: 'evaluation', emoji: '📊', labelFr: 'Évaluation',     labelEn: 'Assessment',   promptFr: 'Crée une évaluation sommative avec grille de correction.',    promptEn: 'Create a summative assessment with a marking grid.'         },
  { id: 'email',      emoji: '📧', labelFr: 'Email parents',  labelEn: 'Parent Email', promptFr: 'Rédige un email professionnel destiné aux parents d\'élèves.', promptEn: 'Write a professional email for parents.'                    },
]

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AIAssistantPanelProps {
  messages:        ChatMessage[]
  contextFiles:    ContextFile[]
  isFr:            boolean
  isStreaming:     boolean
  onQuickAction:   (prompt: string) => void
  onClose:         () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AIAssistantPanel({
  messages, contextFiles, isFr, isStreaming, onQuickAction, onClose,
}: AIAssistantPanelProps) {
  const lastIaMsg = [...messages].reverse().find(m => m.role === 'ia' && !m.isStreaming && m.content.length > 0)
  const lastGenerated = [...messages].reverse().find(m => m.role === 'ia' && m.action_sug)

  const summaryPreview = lastIaMsg
    ? lastIaMsg.content.replace(/[#*`]/g, '').slice(0, 180).trim() + (lastIaMsg.content.length > 180 ? '…' : '')
    : null

  return (
    <aside style={{
      width: 300,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid rgba(15,35,65,0.07)',
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0,
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(15,35,65,0.07)',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 8,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 14 }}>✦</span>
        <span style={{
          flex: 1,
          fontFamily: 'var(--font-display, "Lexend", sans-serif)',
          fontSize: 13, fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          {isFr ? 'Assistant IA' : 'AI Assistant'}
        </span>
        <button
          onClick={onClose}
          aria-label={isFr ? 'Fermer l\'assistant' : 'Close assistant'}
          style={{
            width: 26, height: 26, borderRadius: 6,
            border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 14,
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
          ✕
        </button>
      </div>

      {/* ── Actions rapides ─────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 12px 8px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          {isFr ? 'Actions rapides' : 'Quick actions'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => !isStreaming && onQuickAction(isFr ? action.promptFr : action.promptEn)}
              disabled={isStreaming}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 12px',
                borderRadius: 10,
                border: '1.5px solid rgba(108,92,231,0.1)',
                background: 'rgba(255,255,255,0.85)',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
                transition: 'all 0.12s',
                opacity: isStreaming ? 0.5 : 1,
                boxShadow: '0 1px 4px rgba(15,35,65,0.04)',
              }}
              onMouseEnter={e => { if (!isStreaming) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet)'; (e.currentTarget as HTMLElement).style.background = 'var(--violet-soft, #EDE9FE)' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,92,231,0.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{action.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                {isFr ? action.labelFr : action.labelEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(15,35,65,0.06)', margin: '4px 12px' }} />

      {/* ── Améliorer la préparation ────────────────────────────────────────── */}
      {messages.length > 0 && (
        <div style={{ padding: '10px 12px 8px' }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            {isFr ? 'Réviser le contenu' : 'Revise content'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { emoji: '🔍', labelFr: 'Améliorer', labelEn: 'Improve', promptFr: 'Améliore et enrichis ce contenu avec plus de détails et d\'exemples concrets pour mes élèves.', promptEn: 'Improve and enrich this content with more details and concrete examples for my students.' },
              { emoji: '🎯', labelFr: 'Adapter',   labelEn: 'Adapt',   promptFr: 'Adapte ce contenu à différents niveaux d\'élèves dans ma classe.',                              promptEn: 'Adapt this content for different student levels in my class.'                          },
              { emoji: '🌈', labelFr: 'Différencier', labelEn: 'Differentiate', promptFr: 'Propose des activités différenciées pour les élèves à besoins particuliers.',           promptEn: 'Suggest differentiated activities for students with special needs.'                   },
            ].map(item => (
              <button
                key={item.labelFr}
                onClick={() => !isStreaming && onQuickAction(isFr ? item.promptFr : item.promptEn)}
                disabled={isStreaming}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(15,35,65,0.08)',
                  background: 'transparent',
                  cursor: isStreaming ? 'not-allowed' : 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                  transition: 'all 0.12s',
                  opacity: isStreaming ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!isStreaming) (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span style={{ fontSize: 13 }}>{item.emoji}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {isFr ? item.labelFr : item.labelEn}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Fichiers en contexte ────────────────────────────────────────────── */}
      {contextFiles.length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(15,35,65,0.06)', margin: '4px 12px' }} />
          <div style={{ padding: '10px 12px 8px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {isFr ? 'Fichiers en contexte' : 'Files in context'} ({contextFiles.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {contextFiles.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 8px', borderRadius: 6,
                  background: 'rgba(108,92,231,0.06)',
                  border: '1px solid rgba(108,92,231,0.15)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--violet)', flexShrink: 0 }}>✦</span>
                  <span style={{
                    fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {f.nom}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Dernier résumé ──────────────────────────────────────────────────── */}
      {summaryPreview && (
        <>
          <div style={{ height: 1, background: 'rgba(15,35,65,0.06)', margin: '4px 12px' }} />
          <div style={{ padding: '10px 12px 14px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {isFr ? 'Dernière réponse' : 'Last response'}
            </div>
            {lastGenerated?.action_sug && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginBottom: 6,
                padding: '2px 8px', borderRadius: 6,
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                fontSize: 10, fontWeight: 700, color: '#16a34a',
              }}>
                ✓ {lastGenerated.action_sug.titre || (isFr ? 'Contenu généré' : 'Generated content')}
              </div>
            )}
            <p style={{
              margin: 0,
              fontSize: 11,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              {summaryPreview}
            </p>
          </div>
        </>
      )}

      {/* ── État vide ───────────────────────────────────────────────────────── */}
      {messages.length === 0 && (
        <div style={{
          padding: '20px 16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          {isFr
            ? 'Choisissez une action rapide ou posez une question pour démarrer.'
            : 'Choose a quick action or ask a question to get started.'}
        </div>
      )}

    </aside>
  )
}
