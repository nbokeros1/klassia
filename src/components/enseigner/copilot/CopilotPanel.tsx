'use client'

import { useState, useRef, useEffect } from 'react'
import { useTeachingCopilot } from '@/hooks/enseigner/useTeachingCopilot'
import { QUICK_ACTIONS } from '@/types/enseigner/copilot'
import type { QuickActionType } from '@/types/enseigner/copilot'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  onClose: () => void
}

// Mission 7 winner: Floating panel (right side, 320px, toggled from toolbar)
// Justification: accessible, non-blocking, combines quick actions + compact chat,
// doesn't compete with the 260px storyboard panel on the left.

export function CopilotPanel({ onClose }: Props) {
  const {
    messages, streamingText, isStreaming, error,
    sendMessage, quickAction, stopStreaming, clearMemory, context,
  } = useTeachingCopilot()

  const [input, setInput]   = useState('')
  const [tab, setTab]       = useState<'actions' | 'chat'>('actions')
  const messagesEndRef       = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText])

  // Switch to chat when first message sent
  const handleQuickAction = (type: QuickActionType) => {
    quickAction(type)
    setTab('chat')
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage(text)
    setInput('')
    setTab('chat')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 320, zIndex: 45,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(108,92,231,0.15)',
      boxShadow: '-8px 0 32px rgba(15,35,65,0.1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(15,35,65,0.06)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, rgba(108,92,231,0.06), rgba(139,92,246,0.04))',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 700, color: '#0F1B2D',
            fontFamily: 'var(--font-display, Lexend), sans-serif',
          }}>
            ScorgIA Copilot
          </p>
          <p style={{
            margin: 0, fontSize: 10, color: '#8B97AC',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          }}>
            {context.current_activity_titre || context.lecon_titre}
          </p>
        </div>
        <button onClick={clearMemory} title="Effacer la conversation" style={iconBtn}>🗑</button>
        <button onClick={onClose} title="Fermer" style={iconBtn}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '6px 10px 0', gap: 2, borderBottom: '1px solid rgba(15,35,65,0.06)', flexShrink: 0 }}>
        {(['actions', 'chat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '5px 8px', border: 'none', borderRadius: '8px 8px 0 0',
            background: tab === t ? 'rgba(108,92,231,0.1)' : 'transparent',
            color: tab === t ? '#6C5CE7' : '#8B97AC',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
          }}>
            {t === 'actions' ? '⚡ Actions rapides' : `💬 Chat (${messages.length})`}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Quick Actions grid (Mission 3) */}
        {tab === 'actions' && (
          <div style={{ padding: 12 }}>
            <p style={{
              margin: '0 0 10px', fontSize: 11, color: '#8B97AC',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              fontStyle: 'italic',
            }}>
              Contexte : {context.current_activity_titre || context.lecon_titre}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.type}
                  onClick={() => handleQuickAction(action.type as QuickActionType)}
                  disabled={isStreaming}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 2,
                    padding: '8px 10px', borderRadius: 10,
                    border: '1px solid rgba(15,35,65,0.08)',
                    background: 'rgba(108,92,231,0.04)',
                    cursor: isStreaming ? 'default' : 'pointer',
                    opacity: isStreaming ? 0.5 : 1,
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isStreaming) (e.currentTarget.style.background = 'rgba(108,92,231,0.1)') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(108,92,231,0.04)') }}
                  title={action.label}
                >
                  <span style={{ fontSize: 16 }}>{action.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0F1B2D', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat thread (Mission 5) */}
        {tab === 'chat' && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && !streamingText && (
              <p style={{
                margin: '20px 0', textAlign: 'center', fontSize: 12, color: '#8B97AC',
                fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif', fontStyle: 'italic',
              }}>
                Posez une question ou utilisez les actions rapides.
              </p>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: 6,
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, marginTop: 2,
                  }}>
                    🤖
                  </div>
                )}
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 12px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #6C5CE7, #8B5CF6)' : 'rgba(15,35,65,0.05)',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(15,35,65,0.08)',
                }}>
                  {/* Mission 8: suggestion label */}
                  {msg.is_suggestion && msg.role === 'assistant' && (
                    <p style={{
                      margin: '0 0 4px', fontSize: 9, fontWeight: 700,
                      color: '#8B97AC', textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                    }}>
                      Suggestion
                    </p>
                  )}
                  <div style={{
                    fontSize: 12, lineHeight: 1.5,
                    color: msg.role === 'user' ? '#fff' : '#0F1B2D',
                    fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                  }}>
                    {msg.role === 'assistant' ? (
                      <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                    ) : msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming in progress */}
            {isStreaming && (
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6C5CE7, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, marginTop: 2, animation: 'klassia-pulse 1.5s infinite',
                }}>
                  🤖
                </div>
                <div style={{
                  flex: 1, padding: '8px 12px', borderRadius: '12px 12px 12px 4px',
                  background: 'rgba(15,35,65,0.05)', border: '1px solid rgba(15,35,65,0.08)',
                  fontSize: 12, color: '#0F1B2D', lineHeight: 1.5,
                  fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
                }}>
                  {streamingText || (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#8B97AC', fontStyle: 'italic' }}>
                      Réflexion en cours…
                    </span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p style={{ margin: 0, fontSize: 11, color: '#EF4444', textAlign: 'center', fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif' }}>
                {error}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area (Mission 6 — keyboard, click) */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(15,35,65,0.06)',
        background: 'rgba(255,255,255,0.95)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez une question… (Entrée pour envoyer)"
            rows={2}
            disabled={isStreaming}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 10,
              border: '1px solid rgba(15,35,65,0.12)',
              background: 'rgba(15,35,65,0.03)',
              fontSize: 12, color: '#0F1B2D', resize: 'none',
              fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
              outline: 'none', lineHeight: 1.4,
            }}
          />
          {isStreaming ? (
            <button onClick={stopStreaming} style={{
              ...sendBtn,
              background: 'rgba(239,68,68,0.1)', color: '#EF4444',
            }}>
              ⏹
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                ...sendBtn,
                background: input.trim() ? 'linear-gradient(135deg, #6C5CE7, #8B5CF6)' : 'rgba(139,151,172,0.2)',
                color: input.trim() ? '#fff' : '#8B97AC',
                cursor: input.trim() ? 'pointer' : 'default',
              }}
            >
              ↑
            </button>
          )}
        </div>

        {/* Mission 8: guardrail disclaimer */}
        <p style={{
          margin: '6px 0 0', fontSize: 9, color: '#8B97AC', textAlign: 'center',
          fontFamily: 'var(--font-body, "Plus Jakarta Sans"), sans-serif',
        }}>
          Les réponses sont des suggestions — vous gardez le contrôle total.
        </p>
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  background: 'rgba(15,35,65,0.06)', border: 'none', borderRadius: 8,
  width: 28, height: 28, cursor: 'pointer', color: '#5B6B85', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

const sendBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: 'none',
  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'all 0.15s',
}
