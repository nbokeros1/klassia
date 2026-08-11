'use client'

import type { ReactNode } from 'react'

interface WorkspaceLayoutProps {
  header:           ReactNode
  children:         ReactNode
  rightPanel?:      ReactNode
  inspectorPanel?:  ReactNode
  explorerOpen?:    boolean
  explorerWidth?:   number
  onOpenExplorer?:  () => void
  isFr?:            boolean
}

export function WorkspaceLayout({
  header,
  children,
  rightPanel,
  inspectorPanel,
  explorerOpen = true,
  onOpenExplorer,
  isFr = true,
}: WorkspaceLayoutProps) {
  return (
    <div style={{
      flex:          1,
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
      height:        '100vh',
    }}>

      {/* Explorer re-open button — visible only when explorer is collapsed */}
      {!explorerOpen && onOpenExplorer && (
        <button
          onClick={onOpenExplorer}
          title={isFr ? 'Ouvrir l\'explorateur' : 'Open explorer'}
          style={{
            position:       'fixed',
            left:           0,
            top:            '50%',
            transform:      'translateY(-50%)',
            zIndex:         99,
            width:          18,
            height:         52,
            borderRadius:   '0 8px 8px 0',
            border:         '1px solid rgba(108,92,231,0.3)',
            borderLeft:     'none',
            background:     'rgba(108,92,231,0.18)',
            color:          'rgba(196,181,253,0.7)',
            cursor:         'pointer',
            fontSize:       10,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            transition:     'all 0.15s',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.35)'
            ;(e.currentTarget as HTMLElement).style.color = '#c4b5fd'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.18)'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.7)'
          }}>
          ▷
        </button>
      )}

      {/* Header */}
      {header}

      {/* Main workspace — horizontal flex: document | inspector | copilot */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Document zone */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>

        {/* Inspector panel */}
        {inspectorPanel && (
          <aside aria-label="Inspecteur du document">
            {inspectorPanel}
          </aside>
        )}

        {/* Copilote IA */}
        {rightPanel && (
          <aside aria-label="Copilote IA">
            {rightPanel}
          </aside>
        )}

      </main>
    </div>
  )
}
