// SPIE-05 — Pedagogical Risk Service

import type { SimulationInput } from '../types/simulation'
import type { SimulationRisk, RiskLevel } from '../types/risk'
import { pedagogicalRiskEngine } from '../risk/pedagogical-risk-engine'

export class PedagogicalRiskService {
  detect(input: SimulationInput): SimulationRisk[] {
    return pedagogicalRiskEngine.detect(input)
  }

  hasCritical(risks: SimulationRisk[]): boolean {
    return risks.some(r => r.niveau === 'critique')
  }

  hasBlocking(risks: SimulationRisk[]): boolean {
    return risks.some(r => r.bloquant)
  }

  filterByLevel(risks: SimulationRisk[], niveau: RiskLevel): SimulationRisk[] {
    return risks.filter(r => r.niveau === niveau)
  }

  summarize(risks: SimulationRisk[]): string {
    const counts: Record<RiskLevel, number> = { critique: 0, majeur: 0, avertissement: 0, info: 0 }
    for (const r of risks) counts[r.niveau]++
    const parts = []
    if (counts.critique > 0) parts.push(`${counts.critique} critique(s)`)
    if (counts.majeur > 0) parts.push(`${counts.majeur} majeur(s)`)
    if (counts.avertissement > 0) parts.push(`${counts.avertissement} avertissement(s)`)
    return parts.length > 0 ? parts.join(', ') : 'Aucun risque détecté'
  }
}

export const pedagogicalRiskService = new PedagogicalRiskService()
