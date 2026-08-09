# SPIE-05 — Pedagogical Risk Engine

## Rôle

Détecte les risques pédagogiques dans un plan. Tous les algorithmes sont déterministes — aucun appel IA.

## 8 types de risque

| Type | Niveau max | Bloquant |
|---|---|---|
| `programme_irrealisable` | critique | Oui |
| `couverture_insuffisante` | critique | Oui (si < 60%) |
| `retard_critique` | critique | Non |
| `surcharge_hebdomadaire` | avertissement | Non |
| `sequence_trop_longue` | avertissement | Non |
| `sequence_trop_courte` | avertissement | Non |
| `trop_devaluations` | majeur | Non |
| `aucune_marge` | avertissement | Non |

## Niveaux de risque

| Niveau | Effet |
|---|---|
| `critique` | Bloquant — génération interdite |
| `majeur` | Non bloquant — ajustement requis |
| `avertissement` | Non bloquant — surveillance |
| `info` | Informatif |

## Algorithmes principaux

### Programme irréalisable
```
si totalHeuresPlanifiees > totalHeuresDisponibles × 1.15 → critique
si totalHeuresPlanifiees > totalHeuresDisponibles → majeur
```

### Couverture insuffisante
```
coverageActuelle = outcomesCouverts / outcomesTotaux × 100
si < 60% → critique
si < 75% → majeur
si < target (90%) → avertissement
```

### Surcharge hebdomadaire
```
heuresParSemaine = seq.dureeEstimeeHeures / (fin - début + 1)
si > minutesParSemaine / 60 × 1.5 → avertissement
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/risk.ts` | RiskType, RiskLevel, SimulationRisk |
| `risk/pedagogical-risk-engine.ts` | PedagogicalRiskEngine.detect() |
| `services/pedagogical-risk.service.ts` | hasCritical(), summarize() |
