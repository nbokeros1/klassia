# SPIE-07 — Pedagogical Strategy Engine (PSE)
## Rapport d'implémentation

**Date** : 2026-08-04  
**Statut** : ✅ Complet  
**Fichiers créés** : 22  
**Fichiers modifiés** : 2  
**TypeScript errors** : 0

---

## Mission accomplie

SPIE-07 est le **moteur de synthèse** : il intègre les sorties de SPIE-02 à SPIE-06 pour produire une `PedagogicalStrategy` cohérente — la décision pédagogique qui précède toute génération de contenu.

---

## Architecture

### Types (`src/lib/spie/pse/types/`)

| Fichier | Types exportés | Rôle |
|---------|----------------|------|
| `strategy.ts` | `PedagogicalStrategy`, `StrategyApproach` (7), `DifficultyLevel` (4), `ProgressionType` (4), `DifferentiationStrategy` (4), `EvaluationTiming` (4) | Modèle principal |
| `validation.ts` | `StrategyValidationReport`, `StrategyValidationDimension`, `StrategyValidationDimensionName` (7), `ValidationStatut` | Rapport qualité |
| `comparison.ts` | `StrategyComparison`, `StrategySnapshot`, `StrategyComparisonRow`, `StrategyComparisonLabel` | Comparaison A/B/C |
| `recommendation.ts` | `StrategyRecommendation`, `StrategyAlternative` | Justification |
| `decision-tree.ts` | `PedagogicalDecisionTree`, `StrategyDecisionTrace`, `StrategyDecisionNode`, `StrategyDecisionType` (7) | Traçabilité |

### Moteurs (`src/lib/spie/pse/`)

| Moteur | Fichier | Responsabilité |
|--------|---------|----------------|
| `StrategyBuilder` | `builder/strategy-builder.ts` | 7 décisions → PedagogicalStrategy |
| `StrategyValidator` | `validation/strategy-validator.ts` | 7 dimensions → score 0–100 |
| `StrategyComparisonEngine` | `comparison/strategy-comparison-engine.ts` | A/B/C → recommandation |
| `StrategyRecommendationEngine` | `recommendations/strategy-recommendation-engine.ts` | Explications enseignant |
| `PedagogicalDecisionTreeBuilder` | `decision-tree/pedagogical-decision-tree.ts` | Traçabilité des décisions |

### Services (`src/lib/spie/pse/services/`)

| Service | Rôle |
|---------|------|
| `strategy-builder.service.ts` | Interface haut niveau pour la construction |
| `strategy-validator.service.ts` | Validation + annotation du score qualité |
| `strategy-comparison.service.ts` | Accès et queries sur les comparaisons |
| `strategy-recommendation.service.ts` | Formatage pour l'interface enseignant |
| `decision-tree.service.ts` | Accès au journal de décision |

---

## Décisions d'architecture

| DEC | Décision |
|-----|----------|
| DEC-019 | PSE synthétise tous les moteurs SPIE (inputs optionnels, dégradation gracieuse) |
| DEC-020 | Traçabilité obligatoire de toutes les décisions dans `PedagogicalDecisionTree` |
| DEC-021 | 7 dimensions pondérées (couverture=25%, temps=20%...) ; génération bloquée si score<60 |
| DEC-022 | Comparaison A/B/C déterministe ; C toujours conservatrice ; recommandation = max(score) |

---

## Tests (`src/lib/spie/pse/__tests__/`)

| Fichier | Couverture |
|---------|------------|
| `strategy-builder.test.ts` | Préférences, simulation irréalisable, log décisions |
| `strategy-validator.test.ts` | Coverage, temps, cohérence, évaluations, bloqueurs |
| `strategy-comparison.test.ts` | 3 snapshots, snapshots A/C, recommandation |
| `strategy-recommendation.test.ts` | Confidence levels, bloqueurs, avantages |
| `decision-tree.test.ts` | Traçabilité, facteurs globaux, résumé |

---

## Documentation (`docs/SPIE/`)

| Document | Contenu |
|----------|---------|
| `Pedagogical_Strategy.md` | Modèle principal et types |
| `Strategy_Builder.md` | Algorithme et 7 décisions |
| `Strategy_Validator.md` | 7 dimensions, seuils, signal validePourGeneration |
| `Strategy_Comparison.md` | A/B/C, table de comparaison |
| `Decision_Tree.md` | Traçabilité et 7 types de décision |
| `SPIE-07_Report.md` | Ce rapport |

---

## Intégration SPIE

```typescript
// src/lib/spie/index.ts — nouvelle ligne :
export * from './pse'
```

PSE est maintenant accessible depuis le barrel SPIE central.

---

## Flux d'utilisation typique

```typescript
import {
  strategyBuilderService,
  strategyValidatorService,
  strategyComparisonService,
  strategyRecommendationService,
  decisionTreeService,
} from '@/lib/spie/pse'

// 1. Construire la stratégie
const { strategy, decisions } = strategyBuilderService.build({
  outcomes,
  context,
  twin,
  simulation,
  academicTime,
})

// 2. Valider
const { strategy: annotated, report } = strategyValidatorService.validateAndAnnotate(
  strategy, totalOutcomes, heuresDisponibles
)

// 3. Comparer les alternatives
const comparison = strategyComparisonService.compare(annotated, simulation)

// 4. Générer la recommandation
const recommendation = strategyRecommendationService.generate(annotated, report, comparison)

// 5. Construire l'arbre de décision
const tree = decisionTreeService.build(annotated, decisions)

// 6. La stratégie est prête pour la génération
if (report.validePourGeneration) {
  // → passer à la génération de leçons
}
```

---

## Règles invariantes

1. **0 appel IA** — tout est déterministe
2. **Traçabilité complète** — chaque décision dans le `PedagogicalDecisionTree`
3. **validePourGeneration** — jamais ignoré en amont
4. **autoApplicable jamais** — PSE explique, l'enseignant décide
5. **Dégradation gracieuse** — fonctionne sans twin, simulation, ou time engine
