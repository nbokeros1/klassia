'use client'

// SCAFFOLD — Zone de saisie riche d'un bloc. SC-02E.

interface BlockEditorProps {
  initialContent: string
  onSave:         (content: string) => void
  onCancel:       () => void
  onAIRequest?:   () => void
}

export function BlockEditor(_props: BlockEditorProps) {
  return null
}
