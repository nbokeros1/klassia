# SPIE-05 — Scenario Engine

## Rôle

Construit et compare 3 variantes du plan pédagogique (A/B/C) pour aider l'enseignant à choisir la meilleure approche.

## Scénarios générés

| Scénario | Description |
|---|---|
| **A** | Plan original — aucune modification |
| **B** | Plan compressé — les 40% de séquences les plus longues réduites de 20% |
| **C** | Plan priorisé — les séquences de moindre priorité supprimées |

## Sélection automatique du scénario recommandé

```
critères (par ordre de priorité) :
1. Exclure les plans "irrealisable"
2. Maximiser scoreViabilite
3. Maximiser coveragePercent en cas d'égalité
```

## ScenarioComparison

```typescript
{
  scenarios: Scenario[]
  scenarioRecommande: 'A' | 'B' | 'C'
  raisonRecommandation: string
  tableau: [{
    champ: string
    valeurs: { A: ..., B: ..., C: ... }
    meilleur?: 'A' | 'B' | 'C'
  }]
}
```

## Tableau de comparaison

Le tableau compare automatiquement:
- Score de viabilité
- Couverture curriculaire (%)
- Heures planifiées
- Risques critiques
- Risques totaux

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/scenario.ts` | Scenario, ScenarioLabel, ScenarioComparison |
| `scenarios/scenario-engine.ts` | ScenarioEngine.buildComparison() |
| `services/scenario-engine.service.ts` | getRecommended() |
