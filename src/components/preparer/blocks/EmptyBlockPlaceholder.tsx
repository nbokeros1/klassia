'use client'

// SCAFFOLD — Rendu alternatif d'un bloc vide. SC-02E.

interface EmptyBlockPlaceholderProps {
  blocNom:    string
  onWrite:    () => void
  onGenerate: () => void
}

export function EmptyBlockPlaceholder(_props: EmptyBlockPlaceholderProps) {
  return null
}
