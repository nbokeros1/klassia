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
  explorerOpen  = true,
  explorerWidth = 272,
  onOpenExplorer,
  isFr = true,
}: WorkspaceLayoutProps) {
  return (
    <div style={{
      marginLeft:     explorerOpen ? explorerWidth : 0,
      flex:           1,
      display:        'flex',
      flexDirection:  'column',
      overflow:       'hidden',
      height:         '100vh',
      transition:     'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* Explorer re-open button — visible only when explorer is collapsed */}
      {!explorerOpen && onOpenExplorer && (
        <button
          onClick={onOpenExplorer}
          title={isFr ? 'Ouvrir l\'explorateur' : 'Open explorer'}
          style={{
            position:   'fixed',
            left:       0,
            top:        '50%',
            transform:  'translateY(-50%)',
            zIndex:     99,
            width:      18,
            height:     52,
            borderRadius: '0 8px 8px 0',
            border:     '1px solid rgba(108,92,231,0.3)',
            borderLeft: 'none',
            background: 'rgba(108,92,231,0.18)',
            color:      'rgba(196,181,253,0.7)',
            cursor:     'pointer',
            fontSize:   10,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.35)'
            ;(e.currentTarget as HTMLElement).style.color = '#c4b5fd'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(108,92,231,0.18)'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(196,181,253,0.7)'
          }}>
          ▷
        </button>
      )}
      {/* Header landmark — rendu par le composant enfant WorkspaceHeader */}
      {header}

      {/* Main workspace area */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Canvas / contenu principal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </div>

        {/* Panneau inspecteur */}
        {inspectorPanel && (
          <aside aria-label="Inspecteur du document">
            {inspectorPanel}
          </aside>
        )}

        {/* Panneau assistant IA */}
        {rightPanel && (
          <aside aria-label="Assistant IA">
            {rightPanel}
          </aside>
        )}

      </main>
    </div>
  )
}
