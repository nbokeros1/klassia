'use client'

import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react'
import type { WorkspaceState, WorkspaceAction, BlocPedagogique } from '@/lib/types/workspace'

// ─── État initial ─────────────────────────────────────────────────────────────

const initialState: WorkspaceState = {
  preparation:      null,
  blocs:            [],
  versions:         [],
  currentVersion:   null,
  conversations:    [],
  savingStatus:     'idle',
  aiStatus:         'idle',
  activeBlocId:     null,
  aiProposals:      new Map(),
  aiSuggestions:    [],
  aiPanelOpen:      false,
  navExpanded:      false,
  presentationMode: false,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_PREPARATION':
      return { ...state, preparation: action.payload }

    case 'UPDATE_BLOC': {
      const blocs = state.blocs.map(b =>
        b.id === action.id
          ? { ...b, contenu: action.contenu, dureeMinutes: action.duree ?? b.dureeMinutes, vide: action.contenu.trim() === '' }
          : b
      )
      return { ...state, blocs }
    }

    case 'REORDER_BLOCS': {
      const phase = action.phase
      const phaseBlocs = state.blocs.filter(b => b.phase === phase)
      const others     = state.blocs.filter(b => b.phase !== phase)
      const reordered  = [...phaseBlocs]
      const [moved]    = reordered.splice(action.from, 1)
      reordered.splice(action.to, 0, moved)
      const updated = reordered.map((b, i) => ({ ...b, ordre: i }))
      return { ...state, blocs: [...others, ...updated] }
    }

    case 'DUPLICATE_BLOC': {
      const original = state.blocs.find(b => b.id === action.id)
      if (!original) return state
      const copy: BlocPedagogique = { ...original, id: Math.random().toString(36).substring(2, 10), ordre: original.ordre + 0.5 }
      const blocs = [...state.blocs, copy].sort((a, b) => {
        const phaseOrder = { avant: 0, pendant: 1, apres: 2 }
        return phaseOrder[a.phase] - phaseOrder[b.phase] || a.ordre - b.ordre
      })
      return { ...state, blocs }
    }

    case 'DELETE_BLOC':
      return { ...state, blocs: state.blocs.filter(b => b.id !== action.id) }

    case 'ADD_BLOC': {
      const newBloc: BlocPedagogique = {
        id:           Math.random().toString(36).substring(2, 10),
        nom:          'Nouveau bloc',
        phase:        action.phase,
        contenu:      '',
        dureeMinutes: null,
        ordre:        state.blocs.filter(b => b.phase === action.phase).length,
        genereParIA:  false,
        vide:         true,
      }
      return { ...state, blocs: [...state.blocs, newBloc] }
    }

    case 'SET_AI_PROPOSAL': {
      const proposals = new Map(state.aiProposals)
      proposals.set(action.blocId, action.proposal)
      return { ...state, aiProposals: proposals }
    }

    case 'ACCEPT_AI_PROPOSAL': {
      const proposal = state.aiProposals.get(action.blocId)
      if (!proposal) return state
      const proposals = new Map(state.aiProposals)
      proposals.delete(action.blocId)
      const blocs = state.blocs.map(b =>
        b.id === action.blocId ? { ...b, contenu: proposal.contenu, vide: false, genereParIA: true } : b
      )
      return { ...state, blocs, aiProposals: proposals }
    }

    case 'DISMISS_AI_PROPOSAL': {
      const proposals = new Map(state.aiProposals)
      proposals.delete(action.blocId)
      return { ...state, aiProposals: proposals }
    }

    case 'SET_SAVING_STATUS':
      return { ...state, savingStatus: action.status }

    case 'SET_AI_STATUS':
      return { ...state, aiStatus: action.status }

    case 'SET_ACTIVE_BLOC':
      return { ...state, activeBlocId: action.id }

    case 'SET_PREPARATION_STATUS':
      return state.preparation
        ? { ...state, preparation: { ...state.preparation, statut: action.status } }
        : state

    case 'ADD_AI_SUGGESTION':
      return { ...state, aiSuggestions: [...state.aiSuggestions, action.suggestion] }

    case 'DISMISS_SUGGESTION':
      return { ...state, aiSuggestions: state.aiSuggestions.filter(s => s.id !== action.id) }

    case 'TOGGLE_AI_PANEL':
      return { ...state, aiPanelOpen: !state.aiPanelOpen }

    case 'TOGGLE_NAV':
      return { ...state, navExpanded: !state.navExpanded }

    case 'ENTER_PRESENTATION':
      return { ...state, presentationMode: true, aiPanelOpen: false }

    case 'EXIT_PRESENTATION':
      return { ...state, presentationMode: false }

    case 'SET_VERSIONS':
      return { ...state, versions: action.versions }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface WorkspaceContextValue {
  state:    WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface WorkspaceProviderProps {
  children:     ReactNode
  initialBlocs?: BlocPedagogique[]
}

export function WorkspaceProvider({ children, initialBlocs }: WorkspaceProviderProps) {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    initialBlocs ? { ...initialState, blocs: initialBlocs } : initialState,
  )

  const value = useMemo(() => ({ state, dispatch }), [state])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Hook d'accès direct (alias de useWorkspace pour usage interne au dossier)
export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspaceContext must be used inside WorkspaceProvider')
  return ctx
}
