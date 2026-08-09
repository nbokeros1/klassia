# SPIE-05 — Pedagogical Planning Simulator (PPS)
# Rapport d'implémentation

**Date** : 2026-08-04  
**Statut** : Complet ✅  
**TypeScript** : 0 erreurs

---

## Vue d'ensemble

SPIE-05 implémente le simulateur de planification pédagogique : il analyse la faisabilité d'un plan **avant** toute génération de contenu. Aucune IA n'est invoquée — tous les algorithmes sont déterministes.

## Fichiers créés

### Types (6 fichiers)

| Fichier | Contenu |
|---|---|
| `types/simulation.ts` | `PedagogicalSimulation`, `SimulationInput`, `SimulationStatus` (4 valeurs) |
| `types/risk.ts` | `SimulationRisk`, `RiskType` (8 valeurs), `RiskLevel` (4 valeurs) |
| `types/recommendation.ts` | `SimulationRecommendation`, `RecommendationType` (9 valeurs), `RecommendationImpact` |
| `types/scenario.ts` | `Scenario`, `ScenarioLabel` (A/B/C), `ScenarioComparison` |
| `types/report.ts` | `SimulationReport` |
| `types/index.ts` | Barrel |

### Moteurs (4 fichiers)

| Fichier | Classe | Responsabilité |
|---|---|---|
| `simulator/planning-simulator.ts` | `PlanningSimulator` | Orchestration complète, score, statut, messages |
| `risk/pedagogical-risk-engine.ts` | `PedagogicalRiskEngine` | Détection de 8 types de risques |
| `recommendations/planning-recommendation-engine.ts` | `PlanningRecommendationEngine` | Génération de recommandations par risque |
| `scenarios/scenario-engine.ts` | `ScenarioEngine` | Comparaison A/B/C |

### Services (5 fichiers)

| Fichier | Service | API |
|---|---|---|
| `services/planning-simulator.service.ts` | `PlanningSimulatorService` | `simulate()`, `simulateFromTwin()`, `canProceedToGeneration()` |
| `services/pedagogical-risk.service.ts` | `PedagogicalRiskService` | `detect()`, `hasCritical()`, `summarize()` |
| `services/planning-recommendation.service.ts` | `PlanningRecommendationService` | `generate()`, `getCritical()`, `getTopN()` |
| `services/scenario-engine.service.ts` | `ScenarioEngineService` | `buildComparison()`, `getRecommended()` |
| `services/simulation-report.service.ts` | `SimulationReportService` | `build()` → `SimulationReport` |

### Barrel et intégration

| Fichier | Modification |
|---|---|
| `src/lib/spie/pps/index.ts` | Barrel export SPIE-05 |
| `src/lib/spie/index.ts` | Ajout `export * from './pps'` |

### Documentation

| Fichier | Contenu |
|---|---|
| `docs/SPIE/Planning_Simulator.md` | Architecture PPS, statuts, score |
| `docs/SPIE/Risk_Engine.md` | 8 types de risques, algorithmes |
| `docs/SPIE/Recommendation_Engine.md` | 9 types, priorités, règle autoApplicable=false |
| `docs/SPIE/Scenario_Engine.md` | Scénarios A/B/C, sélection automatique |
| `docs/SPIE/Simulation_Model.md` | Schémas PedagogicalSimulation, SimulationReport |

## Décisions techniques

### DEC-023 — Jamais d'auto-application
Toutes les `SimulationRecommendation` ont `autoApplicable: false` encodé dans le type lui-même (pas une valeur optionnelle). Cela garantit statiquement qu'aucun code ne peut tenter d'auto-appliquer une recommandation.

### DEC-024 — Pas d'IA dans le PPS
Le simulateur est 100% déterministe. Les risques sont calculés à partir de ratios temps/heures, comparaisons de couverture, et seuils codifiés. Aucun appel à Claude.

### DEC-025 — Scénario C basé sur le nombre d'outcomes
Pour choisir quelle(s) séquence(s) supprimer dans le scénario C, l'algorithme trie par nombre d'outcomes croissant : supprimer d'abord celles qui couvrent le moins d'outcomes (impact curriculaire minimal).

### DEC-026 — Score de viabilité cible 0.85
Le `pacingScore` optimal vise 85% du temps utilisé (15% de marge). La formule `max(0, 100 - |ratio - 0.85| × 200)` pénalise aussi bien la sous-utilisation que la surcharge.

## Algorithme de score de viabilité

```
score = 100

# Temps
ratio = totalHeuresPlanifiees / totalHeuresDisponibles
si ratio > 1 → score -= min(40, (ratio - 1) × 100)

# Couverture
si coveragePercent < 90 → score -= (90 - coverage) × 0.5

# Risques majeurs
score -= nbRisquesMajeurs × 10

# Risques critiques → plafond brutal
si nbRisquesCritiques > 0 → score = min(score, 30 - critiques × 10)

score = clamp(0, 100, round(score))
```

## Statuts de simulation

| Score | Bloquant | Statut |
|---|---|---|
| hasBlockingRisk | - | `irrealisable` |
| < 20 | - | `irrealisable` |
| 20–49 | - | `difficile` |
| 50–74 | - | `realisable_risques` |
| ≥ 75 | - | `realisable` |
