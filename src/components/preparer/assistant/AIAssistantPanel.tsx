'use client'

import { useState } from 'react'
import type { ChatMessage } from '@/lib/types/workspace'

// ─── Types locaux ─────────────────────────────────────────────────────────────
interface ContextFile {
  id:  string
  nom: string
}

export interface IaTimestamp {
  id:    string
  time:  Date
  label: string
}

interface QuickAction {
  id:      string
  emoji:   string
  labelFr: string
  labelEn: string
  promptFr: string
  promptEn: string
  primary?: boolean
}

// ─── Actions par contexte ─────────────────────────────────────────────────────

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: 'plan_lecon', emoji: '📝', primary: true,  labelFr: 'Plan de leçon',  labelEn: 'Lesson Plan',    promptFr: 'Crée un plan de leçon détaillé pour ma prochaine leçon.',    promptEn: 'Create a detailed lesson plan for my next lesson.'           },
  { id: 'lecon',      emoji: '✦',  primary: true,  labelFr: 'Leçon complète', labelEn: 'Full Lesson',    promptFr: 'Génère une leçon complète avec activités et évaluation.',     promptEn: 'Generate a complete lesson with activities and assessment.'  },
  { id: 'quiz',       emoji: '🎮', primary: true,  labelFr: 'Quiz formatif',  labelEn: 'Formative Quiz', promptFr: 'Crée un quiz formatif de 5 questions sur la matière actuelle.', promptEn: 'Create a 5-question formative quiz on the current topic.'   },
  { id: 'evaluation', emoji: '📊', primary: false, labelFr: 'Évaluation',     labelEn: 'Assessment',     promptFr: 'Crée une évaluation sommative avec grille de correction.',    promptEn: 'Create a summative assessment with a marking grid.'         },
  { id: 'activite',   emoji: '🏗️', primary: false, labelFr: 'Créer activité', labelEn: 'Activity',       promptFr: 'Crée une activité pédagogique engageante pour ma classe.',    promptEn: 'Create an engaging classroom activity.'                     },
  { id: 'devoir',     emoji: '📋', primary: false, labelFr: 'Créer devoir',   labelEn: 'Homework',       promptFr: 'Crée un devoir adapté à mes élèves.',                         promptEn: 'Create homework suitable for my students.'                  },
  { id: 'grille',     emoji: '📐', primary: false, labelFr: 'Créer grille',   labelEn: 'Rubric',         promptFr: 'Génère une grille d\'évaluation détaillée.',                  promptEn: 'Generate a detailed assessment rubric.'                     },
]

const CONTEXTUAL_ACTIONS: Record<string, QuickAction[]> = {
  plan_lecon: [
    { id: 'develop', emoji: '✦',  primary: true,  labelFr: 'Développer en leçon', labelEn: 'Expand to lesson', promptFr: 'Développe ce plan en une leçon complète avec activités et exemples concrets.', promptEn: 'Expand this plan into a full lesson with activities and concrete examples.' },
    { id: 'diff',    emoji: '🌈', primary: true,  labelFr: 'Différencier',         labelEn: 'Differentiate',    promptFr: 'Propose des adaptations différenciées pour les élèves à besoins particuliers.', promptEn: 'Suggest differentiated adaptations for students with special needs.'         },
    { id: 'quiz',    emoji: '🎮', primary: true,  labelFr: 'Quiz formatif',        labelEn: 'Formative quiz',   promptFr: 'Crée un quiz formatif de 5 questions basé sur ce plan de leçon.',              promptEn: 'Create a 5-question formative quiz based on this lesson plan.'              },
    { id: 'eval',    emoji: '📊', primary: false, labelFr: 'Évaluation',           labelEn: 'Assessment',       promptFr: 'Crée une évaluation sommative alignée sur ce plan de leçon.',                  promptEn: 'Create a summative assessment aligned with this lesson plan.'               },
    { id: 'ehdaa',   emoji: '♿', primary: false, labelFr: 'Adapter EHDAA',        labelEn: 'Adapt SSEND',      promptFr: 'Adapte cette leçon pour les élèves EHDAA.',                                    promptEn: 'Adapt this lesson for students with special needs.'                         },
    { id: 'simplif', emoji: '🔽', primary: false, labelFr: 'Simplifier',           labelEn: 'Simplify',         promptFr: 'Simplifie le contenu pour les élèves en difficulté.',                          promptEn: 'Simplify the content for struggling students.'                              },
  ],
  fiche_lecon: [
    { id: 'diff',    emoji: '🌈', primary: true,  labelFr: 'Différencier',     labelEn: 'Differentiate',  promptFr: 'Propose des activités différenciées pour les élèves à besoins particuliers.',   promptEn: 'Suggest differentiated activities for students with special needs.'    },
    { id: 'quiz',    emoji: '🎮', primary: true,  labelFr: 'Quiz formatif',    labelEn: 'Formative quiz', promptFr: 'Crée un quiz formatif de 5 questions basé sur cette leçon.',                   promptEn: 'Create a 5-question formative quiz based on this lesson.'             },
    { id: 'improve', emoji: '🔍', primary: true,  labelFr: 'Améliorer',        labelEn: 'Improve',        promptFr: 'Améliore et enrichis cette leçon avec plus de détails et d\'exemples concrets.', promptEn: 'Improve and enrich this lesson with more details and concrete examples.' },
    { id: 'eval',    emoji: '📊', primary: false, labelFr: 'Évaluation',       labelEn: 'Assessment',     promptFr: 'Crée une évaluation sommative alignée sur les objectifs de cette leçon.',       promptEn: 'Create a summative assessment aligned to this lesson\'s objectives.'   },
    { id: 'ehdaa',   emoji: '♿', primary: false, labelFr: 'Adapter EHDAA',    labelEn: 'Adapt SSEND',    promptFr: 'Adapte cette leçon pour les élèves EHDAA.',                                    promptEn: 'Adapt this lesson for students with special needs.'                   },
  ],
  quiz: [
    { id: 'improve', emoji: '🔍', primary: true,  labelFr: 'Améliorer le quiz', labelEn: 'Improve quiz',    promptFr: 'Améliore ce quiz — diversifie les types de questions et reformule si nécessaire.', promptEn: 'Improve this quiz — diversify question types and rephrase where needed.' },
    { id: 'diff',    emoji: '🌈', primary: true,  labelFr: 'Adapter pour tous', labelEn: 'Adapt for all',   promptFr: 'Adapte ce quiz pour les élèves à besoins particuliers.',                          promptEn: 'Adapt this quiz for students with special needs.'                       },
    { id: 'eval',    emoji: '📊', primary: false, labelFr: 'Évaluation',         labelEn: 'Assessment',      promptFr: 'Crée une évaluation sommative complémentaire à ce quiz.',                          promptEn: 'Create a summative assessment complementing this quiz.'                 },
    { id: 'lecon',   emoji: '✦',  primary: false, labelFr: 'Leçon de révision',  labelEn: 'Review lesson',   promptFr: 'Crée une leçon de révision basée sur les concepts évalués dans ce quiz.',          promptEn: 'Create a review lesson based on the concepts assessed in this quiz.'    },
  ],
  evaluation: [
    { id: 'rubric',  emoji: '📐', primary: true,  labelFr: 'Grille de correction', labelEn: 'Rubric',      promptFr: 'Génère une grille de correction détaillée pour cette évaluation.',              promptEn: 'Generate a detailed rubric for this assessment.'                       },
    { id: 'improve', emoji: '🔍', primary: true,  labelFr: 'Améliorer',            labelEn: 'Improve',     promptFr: 'Améliore cette évaluation — clarté, pertinence et alignement curriculaire.',      promptEn: 'Improve this assessment — clarity, relevance and curricular alignment.' },
    { id: 'diff',    emoji: '🌈', primary: false, labelFr: 'Différencier',         labelEn: 'Differentiate', promptFr: 'Adapte cette évaluation pour les élèves à besoins particuliers.',                promptEn: 'Adapt this assessment for students with special needs.'                 },
    { id: 'quiz',    emoji: '🎮', primary: false, labelFr: 'Quiz préparatoire',    labelEn: 'Prep quiz',   promptFr: 'Crée un quiz de préparation basé sur cette évaluation.',                          promptEn: 'Create a preparation quiz based on this assessment.'                   },
  ],
}
CONTEXTUAL_ACTIONS['lecon_complete']   = CONTEXTUAL_ACTIONS['fiche_lecon']
CONTEXTUAL_ACTIONS['lecon_developpee'] = CONTEXTUAL_ACTIONS['fiche_lecon']
CONTEXTUAL_ACTIONS['activite']         = CONTEXTUAL_ACTIONS['fiche_lecon']

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AIAssistantPanelProps {
  messages:        ChatMessage[]
  contextFiles:    ContextFile[]
  isFr:            boolean
  isStreaming:     boolean
  docType?:        string | null
  iaTimestamps?:   IaTimestamp[]
  onQuickAction:   (prompt: string) => void
  onClose:         () => void
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AIAssistantPanel({
  messages, contextFiles, isFr, isStreaming, docType,
  iaTimestamps = [], onQuickAction, onClose,
}: AIAssistantPanelProps) {
  const [showMore, setShowMore] = useState(false)

  const allActions  = (docType && CONTEXTUAL_ACTIONS[docType]) ? CONTEXTUAL_ACTIONS[docType] : DEFAULT_ACTIONS
  const primary     = allActions.filter(a => a.primary !== false)
  const secondary   = allActions.filter(a => a.primary === false)
  const visiblePrimary = showMore ? allActions : primary.slice(0, 3)

  const lastGenerated = [...messages].reverse().find(m => m.role === 'ia' && m.action_sug)

  return (
    <div className="c14-copilot-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="c14-copilot-hd">
        <span style={{ fontSize: 12, color: '#6D5DF6' }}>✦</span>
        <span className="c14-copilot-name">ScorgIA</span>
        <button
          onClick={onClose}
          aria-label={isFr ? 'Réduire' : 'Collapse'}
          style={{
            width: 24, height: 24, borderRadius: 5,
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, color: '#94A3B8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(15,35,65,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
          ✕
        </button>
      </div>

      <div className="c14-copilot-scroll">

        {/* ── Badge document généré ────────────────────────────────────── */}
        {lastGenerated?.action_sug && (
          <div style={{ padding: '8px 14px 0' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 9px', borderRadius: 6,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              fontSize: 10, fontWeight: 700, color: '#15803D',
            }}>
              ✓ {lastGenerated.action_sug.titre || (isFr ? 'Document' : 'Document')}
            </div>
          </div>
        )}

        {/* ── Suggestions ─────────────────────────────────────────────── */}
        <div className="c14-section-lbl">
          {isFr ? 'Suggestions' : 'Suggestions'}
        </div>

        {visiblePrimary.map(action => (
          <button
            key={action.id}
            className="c14-action-btn"
            onClick={() => !isStreaming && onQuickAction(isFr ? action.promptFr : action.promptEn)}
            disabled={isStreaming}>
            <span className="c14-action-btn-icon">{action.emoji}</span>
            <span className="c14-action-btn-label">{isFr ? action.labelFr : action.labelEn}</span>
          </button>
        ))}

        {/* Voir plus / moins */}
        {(secondary.length > 0 || primary.length > 3) && (
          <button className="c14-voir-plus" onClick={() => setShowMore(v => !v)}>
            <span className="c14-voir-plus-icon">{showMore ? '▴' : '▾'}</span>
            <span>{showMore ? (isFr ? 'Voir moins' : 'Show less') : (isFr ? 'Voir plus' : 'More actions')}</span>
          </button>
        )}

        {/* ── Contexte fichiers ────────────────────────────────────────── */}
        {contextFiles.length > 0 && (
          <>
            <div className="c14-divider" />
            <div className="c14-section-lbl">
              {isFr ? `Contexte (${contextFiles.length})` : `Context (${contextFiles.length})`}
            </div>
            {contextFiles.map(f => (
              <div key={f.id} className="c14-ctx-file">
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6D5DF6', flexShrink: 0 }}>✦</span>
                <span className="c14-ctx-name">{f.nom}</span>
              </div>
            ))}
          </>
        )}

        {/* ── Historique ───────────────────────────────────────────────── */}
        {iaTimestamps.length > 0 && (
          <>
            <div className="c14-divider" />
            <div className="c14-section-lbl">
              {isFr ? 'Historique' : 'History'}
            </div>
            {iaTimestamps.map((ts, i) => (
              <div key={ts.id} className="c14-tl-item">
                <div className={`c14-tl-dot${i === iaTimestamps.length - 1 ? ' c14-tl-dot-last' : ''}`} />
                <span className="c14-tl-time">{fmtTime(ts.time)}</span>
                <span className="c14-tl-label">{ts.label}</span>
              </div>
            ))}
          </>
        )}

        {/* ── Versioning — reporté post-bêta ───────────────────────────── */}
        {lastGenerated && (
          <>
            <div className="c14-divider" />
            <div className="c14-section-lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{isFr ? 'Versions' : 'Versions'}</span>
              <span className="c14-todo-badge">POST-BÊTA</span>
            </div>
            <div className="c14-copilot-empty" style={{ padding: '8px 14px', textAlign: 'left' }}>
              {isFr
                ? 'Le versioning réel sera disponible après la bêta.'
                : 'Full versioning will be available after beta.'}
            </div>
          </>
        )}

        {/* ── État vide ────────────────────────────────────────────────── */}
        {messages.length === 0 && contextFiles.length === 0 && (
          <div className="c14-copilot-empty">
            {isFr
              ? 'Choisissez une suggestion pour générer un document.'
              : 'Choose a suggestion to generate a document.'}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}
