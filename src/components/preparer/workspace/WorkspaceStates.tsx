'use client'

import { ScorgiaLogo } from '@/components/branding/scorgia-logo'

// ─── NoClasses ────────────────────────────────────────────────────────────────

interface NoClassesStateProps {
  isFr:          boolean
  onCreateClass: () => void
}

export function NoClassesState({ isFr, onCreateClass }: NoClassesStateProps) {
  return (
    <div style={{
      flex: 1, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="glass-strong" style={{
        padding: '48px 44px', borderRadius: 'var(--radius-lg)',
        maxWidth: 480, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20,
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8,
        }}>
          {isFr ? 'Créez d\'abord une classe' : 'Create a class first'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {isFr
            ? 'Vous pourrez ensuite préparer des leçons pour vos élèves.'
            : 'You\'ll then be able to prepare lessons for your students.'}
        </div>
        <button
          onClick={onCreateClass}
          style={{
            padding: '10px 24px', fontSize: 13, fontWeight: 600,
            background: 'var(--violet)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 12px var(--violet-glow, rgba(108,92,231,0.3))',
          }}>
          {isFr ? '+ Créer ma première classe' : '+ Create my first class'}
        </button>
      </div>
    </div>
  )
}

// ─── ClassPicker ──────────────────────────────────────────────────────────────

interface ClassPickerStateProps {
  isFr:            boolean
  classes:         Array<{ id: string; nom: string; niveau?: string; couleur?: string }>
  onSelectClasse:  (id: string) => void
}

export function ClassPickerState({ isFr, classes, onSelectClasse }: ClassPickerStateProps) {
  return (
    <div style={{
      flex: 1, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="glass-strong" style={{
        padding: '40px 44px', borderRadius: 'var(--radius-lg)',
        maxWidth: 540, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🎓</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20,
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3,
        }}>
          {isFr ? 'Pour quelle classe préparez-vous du contenu ?' : 'Which class are you preparing content for?'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          {isFr ? 'Choisissez une classe pour ouvrir ScorgIA' : 'Choose a class to open ScorgIA'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10, justifyContent: 'center' }}>
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectClasse(c.id)}
              style={{
                padding: '10px 22px', borderRadius: 'var(--radius-md)',
                border: `2px solid ${c.couleur || 'var(--violet)'}`,
                background: 'transparent', color: 'var(--text-primary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = c.couleur || 'var(--violet)'
                ;(e.currentTarget as HTMLElement).style.color = '#fff'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
              }}>
              {c.nom}{c.niveau ? ` · ${c.niveau}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── LoadingConversation ──────────────────────────────────────────────────────

interface LoadingConversationStateProps {
  isFr: boolean
}

export function LoadingConversationState({ isFr }: LoadingConversationStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', paddingTop: 80, gap: 16,
    }}>
      <ScorgiaLogo variant="icon" width={48} height={48} />
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {isFr ? 'Chargement de la conversation…' : 'Loading conversation…'}
      </div>
    </div>
  )
}

// ─── Welcome (état vide) ──────────────────────────────────────────────────────

interface WelcomeStateProps {
  isFr:          boolean
  prenom:        string
  classe:        { nom: string; niveau?: string } | null
  matiere:       string
  suggestions:   Array<{ id: string; emoji: string; label: string; prompt: string }>
  onSend:        (prompt: string) => void
}

export function WelcomeState({
  isFr, prenom, classe, matiere, suggestions, onSend,
}: WelcomeStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', paddingTop: 56, gap: 20,
      maxWidth: 680, margin: '0 auto',
    }}>
      <ScorgiaLogo variant="icon" width={60} height={60} />
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 22,
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6,
        }}>
          {isFr
            ? `Bonjour${prenom ? ` ${prenom}` : ''} ! Que préparez-vous aujourd'hui ?`
            : `Hello${prenom ? ` ${prenom}` : ''}! What are you preparing today?`}
        </div>
        {classe && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {classe.nom}{classe.niveau ? ` · ${classe.niveau}` : ''}{matiere ? ` · ${matiere}` : ''}
          </div>
        )}
      </div>
      <div className="prep-suggestion-grid" style={{ width: '100%', marginTop: 8 }}>
        {suggestions.map(s => (
          <button
            key={s.id}
            onClick={() => onSend(s.prompt)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              gap: 6, padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid rgba(108,92,231,0.12)',
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              boxShadow: '0 2px 8px rgba(15,35,65,0.05)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(108,92,231,0.12)'
              ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,92,231,0.12)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,35,65,0.05)'
              ;(e.currentTarget as HTMLElement).style.transform = 'none'
            }}>
            <span style={{ fontSize: 20 }}>{s.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── StreamingIndicator (intégré dans CanvasBlock et messages, mais utile séparément) ──

interface StreamingIndicatorProps {
  isFr: boolean
}

export function StreamingIndicator({ isFr }: StreamingIndicatorProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 14,
    }}>
      <ScorgiaLogo variant="icon" width={44} height={44} />
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--text-muted)',
      }}>
        <span style={{ fontStyle: 'italic' }}>
          ScorgIA {isFr ? 'rédige votre contenu' : 'is writing your content'}
        </span>
        <span className="prep-dot" />
        <span className="prep-dot" />
        <span className="prep-dot" />
      </span>
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  isFr:    boolean
  message: string
  onRetry?: () => void
}

export function ErrorState({ isFr, message, onRetry }: ErrorStateProps) {
  return (
    <div style={{
      flex: 1, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="glass-strong" style={{
        padding: '36px 40px', borderRadius: 'var(--radius-lg)',
        maxWidth: 440, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16,
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8,
        }}>
          {isFr ? 'Une erreur s\'est produite' : 'An error occurred'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          {message}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600,
              background: 'var(--violet)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {isFr ? 'Réessayer' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ReadOnlyBanner ───────────────────────────────────────────────────────────

interface ReadOnlyBannerProps {
  isFr:       boolean
  onDismiss?: () => void
}

export function ReadOnlyBanner({ isFr, onDismiss }: ReadOnlyBannerProps) {
  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 20px',
      background: 'rgba(245,158,11,0.07)',
      borderBottom: '1px solid rgba(245,158,11,0.2)',
      fontSize: 12,
    }}>
      <span style={{ color: '#D97706', fontSize: 14 }}>🔒</span>
      <span style={{ flex: 1, color: '#92400E', fontWeight: 600 }}>
        {isFr
          ? 'Version archivée — lecture seule. Créez une nouvelle conversation pour modifier.'
          : 'Archived version — read only. Start a new conversation to edit.'}
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#92400E', fontFamily: 'inherit', opacity: 0.7,
          }}>
          {isFr ? 'Ignorer' : 'Dismiss'}
        </button>
      )}
    </div>
  )
}
