'use client'

// STUB — Raccourcis clavier globaux du workspace.
// S'active uniquement quand aucun champ de texte n'est en focus.

export interface ShortcutHandlers {
  onSave?:       () => void
  onPresent?:    () => void
  onToggleAI?:   () => void
  onNextBloc?:   () => void
  onPrevBloc?:   () => void
  onEscape?:     () => void
}

export function useKeyboardShortcuts(_handlers: ShortcutHandlers): void {
  // STUB — implémenté via useEffect + addEventListener('keydown') dans SC-02E
}
