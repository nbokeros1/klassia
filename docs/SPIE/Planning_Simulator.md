# SPIE-05 — Pedagogical Planning Simulator (PPS)

## Principe fondamental

Le PPS **simule la faisabilité avant toute génération**. Il ne génère aucun document. Il analyse le plan pédagogique et produit un verdict sur sa viabilité.

```
AcademicYearTwin (sequences + calendar)
      │
      ▼
PlanningSimulator.simulate()
      │
      ├── PedagogicalRiskEngine.detect()       → SimulationRisk[]
      ├── PlanningRecommendationEngine.generate() → SimulationRecommendation[]
      └── scoreViabilite + statut
      │
      ▼
PedagogicalSimulation
      │
      ├── ScenarioEngine.buildComparison()     → ScenarioComparison (A/B/C)
      └── SimulationReportService.build()      → SimulationReport
```

## Statuts de simulation (4)

| Statut | Score | Description |
|---|---|---|
| `realisable` | ≥ 75 | Plan viable — procéder |
| `realisable_risques` | 50–74 | Viable avec des points d'attention |
| `difficile` | 20–49 | Ajustements significatifs requis |
| `irrealisable` | < 20 | Révision obligatoire avant génération |

## Score de viabilité (0–100)

```
score = 100
  - penalité ratio temps (si totalPlanifié > disponible)
  - penalité couverture (si < 90%)
  - -10 par risque majeur
  - 20-30 si risques critiques → score max 30
```

## PedagogicalSimulation

```typescript
{
  statut: SimulationStatus
  scoreViabilite: number          // 0–100
  totalHeuresPlanifiees: number
  totalHeuresDisponibles: number
  deficitHeures: number
  coveragePercent: number
  risques: SimulationRisk[]
  recommandations: SimulationRecommendation[]
  resume: string                  // 1 phrase
  messageEnseignant: string       // Message actionnable
}
```

## Règle absolue : jamais d'auto-application

Toutes les `SimulationRecommendation` ont `autoApplicable: false`. Le simulateur PROPOSE — l'enseignant décide.

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/simulation.ts` | PedagogicalSimulation, SimulationInput, SimulationStatus |
| `simulator/planning-simulator.ts` | PlanningSimulator (orchestration) |
| `services/planning-simulator.service.ts` | API haut niveau, simulateFromTwin() |
