# SPIE-05 — Simulation Model

## PedagogicalSimulation

Sortie principale du simulateur.

```typescript
interface PedagogicalSimulation {
  id: string
  twinId?: string
  enseignantId: string
  classeId: string
  academicYear: string

  // Verdict
  statut: 'realisable' | 'realisable_risques' | 'difficile' | 'irrealisable'
  scoreViabilite: number           // 0–100

  // Analyse temporelle
  totalHeuresPlanifiees: number
  totalHeuresDisponibles: number
  deficitHeures: number            // > 0 = buffer; < 0 = overplan

  // Couverture
  coveragePercent: number

  // Risques et recommandations
  risques: SimulationRisk[]
  nbRisquesCritiques: number
  nbRisquesMajeurs: number
  recommandations: SimulationRecommendation[]

  // Messages enseignant
  resume: string
  messageEnseignant: string

  simulatedAt: string
  durationMs: number
}
```

## SimulationReport

Rapport final incluant simulation + comparaison de scénarios.

```typescript
interface SimulationReport {
  simulation: PedagogicalSimulation
  scenarioComparison?: ScenarioComparison
  verdict: string
  nextSteps: string[]
  bloquerGeneration: boolean    // true si statut === 'irrealisable'
  raisonBlocage?: string
}
```

## SimulationInput

```typescript
interface SimulationInput {
  sequences: SequenceBlock[]
  totalSemaines: number
  minutesParSemaine: number
  semainesRestantes: number
  minutesRestantes: number
  curriculumOutcomesTotal: number
  coverageTargetPercent?: number    // Défaut: 90%
  pacingModel?: AnnualPacingModel   // Optionnel — enrichit la simulation
  maxEvaluationsParMois?: number    // Défaut: 2
  minJoursEntreEvaluations?: number // Défaut: 7
}
```
