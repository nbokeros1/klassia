# SPIE Constraint Engine

**SPIE-02 | Version 1.0 | 2026-08-04**

## Rôle

Le Constraint Engine extrait, stocke et valide les contraintes pédagogiques d'un curriculum. Il est la source de vérité pour le rythme (pacing) et les prérequis lors de la planification annuelle.

## Types de contraintes

| Type | Obligatoire | Description |
|------|-------------|-------------|
| `temps_minimum` | Non | Minimum d'heures/semaines pour un outcome |
| `temps_maximum` | Non | Maximum d'heures/semaines |
| `temps_recommande` | Non | Durée recommandée (inférée si absente) |
| `prerequis` | Oui | Outcome B nécessite Outcome A |
| `corequis` | Non | A et B doivent être enseignés ensemble |
| `sequence` | Oui | A doit précéder B |
| `grouper` | Non | Outcomes à regrouper dans la même unité |
| `evaluer_avant` | Non | Évaluation obligatoire avant de continuer |
| `rapport_couverture` | Non | % minimum de couverture curriculaire |

## Inférence automatique

Quand le curriculum ne spécifie pas de durée explicite pour un outcome, le Constraint Engine infère une durée basée sur le niveau Bloom :

| Bloom | Durée estimée |
|-------|--------------|
| `memoriser` | 45 min |
| `comprendre` | 60 min |
| `appliquer` | 90 min |
| `analyser` | 90 min |
| `evaluer` | 120 min |
| `creer` | 150 min |

## ConstraintSet

```typescript
interface ConstraintSet {
  id: string
  curriculumId: string
  province?: string
  matiere?: string
  niveaux?: string[]
  constraints: Constraint[]
  createdAt: string
}
```

## CurriculumPacingModel

Produit par `constraintEngine.buildPacingModel()`. Utilisé directement par l'AYDTE (SPIE-04) pour construire le calendrier annuel.

```typescript
interface CurriculumPacingModel {
  totalHeuresEstimees: number      // Total hours needed for this curriculum
  totalSemainesRequises: number    // At given minutesPerWeek
  outcomes: OutcomePacing[]        // Per-outcome time + prereqs
  contraintes: ConstraintSet       // All constraints for this curriculum
}
```

## Validation

`constraintEngine.validate(plannedOrder, constraints)` vérifie :
- Prérequis respectés (A enseigné avant B)
- Séquences obligatoires respectées

Produit un `ConstraintValidationResult` :
```typescript
{
  valid: boolean                    // Aucune violation critique
  violations: ConstraintViolation[]
  score: number                     // 0–100
}
```

Les violations ont une sévérité : `critique | majeur | mineur | avertissement`.

## Intégration

Le Constraint Engine est appelé par :
- **SPIE-02** : extraction des contraintes du curriculum
- **SPIE-03 (PCE)** : vérification du contexte pédagogique
- **SPIE-04 (AYDTE)** : construction du plan annuel + validation du rythme
- **SPIE-05 (TQE)** : validation de la qualité du plan généré
