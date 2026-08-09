'use client'

// SCAFFOLD — Panneau Paramètres de la préparation. SC-02E.

import type { Preparation } from '@/lib/types/workspace'

interface SettingsPanelProps {
  preparation: Preparation | null
  onUpdate:    (patch: Partial<Pick<Preparation, 'dureeMinutes' | 'objectif' | 'methode' | 'gabarit'>>) => void
}

export function SettingsPanel(_props: SettingsPanelProps) {
  return null
}
