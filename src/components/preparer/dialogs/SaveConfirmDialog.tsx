'use client'

// SCAFFOLD — Modal de sauvegarde (sélection du dossier). SC-02E.
// Remplacera le saveModal inline de PreparerPageInner.

interface SaveConfirmDialogProps {
  open:            boolean
  titre:           string
  dossiers:        Array<{ id: string; nom: string }>
  selectedDossier: string
  loading:         boolean
  onSelect:        (dossierId: string) => void
  onConfirm:       () => void
  onClose:         () => void
}

export function SaveConfirmDialog(_props: SaveConfirmDialogProps) {
  return null
}
