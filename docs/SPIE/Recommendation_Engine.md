# SPIE-05 — Planning Recommendation Engine

## Rôle

Génère des recommandations actionnables basées sur les risques détectés. **Ne jamais auto-appliquer** — toutes les recommandations requièrent une validation explicite de l'enseignant.

## 9 types de recommandations

| Type | Description |
|---|---|
| `compresser_sequence` | Réduire la durée d'une ou plusieurs séquences |
| `supprimer_sequence` | Retirer une séquence du plan |
| `fusionner_sequences` | Regrouper deux séquences |
| `reordonner_sequences` | Changer l'ordre des séquences |
| `reduire_contenu` | Diviser une séquence trop longue |
| `prioriser_outcomes` | Se concentrer sur les outcomes essentiels |
| `etaler_evaluations` | Redistribuer les évaluations dans le temps |
| `ajouter_session` | Ajouter une session d'enseignement |
| `reduire_evaluations` | Réduire le nombre d'évaluations sommatives |

## Priorités

| Priorité | Risque adressé |
|---|---|
| `critique` | `programme_irrealisable`, `retard_critique` |
| `haute` | `couverture_insuffisante`, surcharge majeure |
| `normale` | `sequence_trop_longue`, `surcharge_hebdomadaire` |
| `faible` | `trop_devaluations`, `aucune_marge` |

## Règle absolue

```typescript
autoApplicable: false  // TOUJOURS false — jamais auto-appliqué
```

## Impact estimé

Chaque recommandation inclut `impactEstime`:
- `heuresSauvegardees` — temps récupéré si appliquée
- `coverageChangement` — variation de la couverture curriculaire
- `risquesResolus` — risques que cela résoudrait

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/recommendation.ts` | RecommendationType, SimulationRecommendation, RecommendationImpact |
| `recommendations/planning-recommendation-engine.ts` | PlanningRecommendationEngine.generate() |
| `services/planning-recommendation.service.ts` | getCritical(), getTopN() |
