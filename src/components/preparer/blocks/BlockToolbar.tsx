'use client'

// SCAFFOLD — Menu contextuel ⋮ d'un bloc. SC-02E.

interface BlockToolbarProps {
  blocId:   string
  onAction: (action: 'edit' | 'duplicate' | 'move_up' | 'move_down' | 'ai' | 'delete') => void
  onClose:  () => void
}

export function BlockToolbar(_props: BlockToolbarProps) {
  return null
}
