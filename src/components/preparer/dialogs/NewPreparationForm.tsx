'use client'

// SCAFFOLD — Formulaire guidé 3 étapes pour créer une nouvelle préparation. SC-02E.

interface NewPreparationFormProps {
  classes:   Array<{ id: string; nom: string; matiere?: string }>
  onSubmit:  (data: NewPreparationData) => void
  onCancel:  () => void
}

export interface NewPreparationData {
  classeId:    string
  matiere:     string
  titre:       string
  chapitre?:   string
  duree:       number
  objectif?:   string
  methode?:    string
  useAI:       boolean
}

export function NewPreparationForm(_props: NewPreparationFormProps) {
  return null
}
