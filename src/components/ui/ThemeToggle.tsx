'use client'

import { useTheme, type Theme } from '@/lib/hooks/useTheme'

interface ThemeToggleProps {
  className?: string
  showLabels?: boolean
}

export default function ThemeToggle({ className, showLabels = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (showLabels) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontSize: 13, color: isDark ? 'var(--text-1)' : 'var(--text-3)',
          fontWeight: isDark ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          🌙 Sombre
        </span>
        <button
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          style={{
            width: 52, height: 28, borderRadius: 99,
            background: isDark ? '#7F77DD' : '#E5E7EB',
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'background 0.25s ease', flexShrink: 0, padding: 0,
          }}>
          <div style={{
            position: 'absolute', top: 4, left: isDark ? 28 : 4,
            width: 20, height: 20, borderRadius: '50%', background: 'white',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }} />
        </button>
        <span style={{
          fontSize: 13, color: !isDark ? 'var(--text-1)' : 'var(--text-3)',
          fontWeight: !isDark ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          ☀️ Clair
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label="Basculer le thème"
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--bg-hover)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
        width: '100%', transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-hover)')}>
      <span style={{ fontSize: 13 }}>{isDark ? '🌙' : '☀️'}</span>
      <div style={{
        width: 32, height: 18, borderRadius: 99,
        background: isDark ? '#7F77DD' : '#E5E7EB',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: isDark ? 17 : 3,
          width: 12, height: 12, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1, textAlign: 'left' }}>
        {isDark ? 'Mode sombre' : 'Mode clair'}
      </span>
    </button>
  )
}
