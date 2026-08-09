'use client'

// SCAFFOLD — SC-02E implémentera le bloc pédagogique avec ses 3 états
// (lecture, édition, proposition IA).

import type { BlocPedagogique } from '@/lib/types/workspace'

interface PreparationBlockProps {
  bloc:         BlocPedagogique
  isEditing:    boolean
  isFocused:    boolean
  onEdit:       () => void
  onSave:       (contenu: string, duree?: number) => void
  onCancel:     () => void
  onAction:     (action: 'delete' | 'duplicate' | 'move_up' | 'move_down' | 'ai') => void
}

export function PreparationBlock(_props: PreparationBlockProps) {
  return null
}
