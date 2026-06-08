import type React from 'react'

export type SchemaConfig = {
  id: string
  nom: string
  categorie: 'biologie' | 'chimie' | 'physique' | 'maths'
  type: 'svg_editable' | 'image_statique'
  description: string
  tags: string[]
  matieres_liees: string[]
}

export type SchemaProps = {
  width?: number
  height?: number
  showLabels?: boolean
  couleurPrimaire?: string
  couleurSecondaire?: string
  onLabelClick?: (labelId: string, valeur: string) => void
  className?: string
}

export type SchemaEditable = SchemaConfig & {
  type: 'svg_editable'
  composant: React.ComponentType<SchemaProps>
}
