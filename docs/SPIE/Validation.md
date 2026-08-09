# SPIE Validation Layer

**SPIE-02 | Version 1.0 | 2026-08-04**

## Deux types de validation dans SPIE-02

### 1. Curriculum Quality Validator
`src/lib/spie/curriculum/validation/curriculum-quality.ts`

Évalue la qualité des données extraites d'un curriculum.

### 2. Constraint Validator
`src/lib/spie/curriculum/constraints/constraint-engine.ts`

Valide qu'un plan de cours respecte les contraintes curriculaires.

## DataQualityReport

```typescript
interface DataQualityReport {
  score: number                          // 0–100 global
  dimensions: Record<DataQualityDimension, number>
  issues: DataQualityIssue[]
  stats: { ... }                         // Counts
  validPourGeneration: boolean           // score ≥ 40 + aucune erreur critique
  createdAt: string
}
```

## 8 dimensions de qualité

| Dimension | 100 = parfait | Erreur si... |
|-----------|---------------|--------------|
| `completude` | Province, matière, niveaux, outcomes présents | Matière absente (-30), outcomes vides (-30) |
| `coherence` | Tous parents/enfants valides | Orphelin spécifique (-30 par occurrence) |
| `hierarchie` | ≥1 spécifique par général | Ratio < 1 (-10) |
| `vocabulaire` | Vocabulaire présent | Absent : 60 (info) |
| `bloom` | ≥50% des outcomes ont Bloom | < 50% : info |
| `contraintes` | Contraintes explicites | Absentes pour >5 outcomes : info |
| `multilinguisme` | Langue cohérente | À implémenter en SPIE-05 |
| `couverture` | ≥30% outcomes liés à concepts | < 30% : info |

## Seuils

| Score | Signification |
|-------|--------------|
| ≥ 80 | Excellent |
| 60–79 | Bon |
| 40–59 | Acceptable (génération possible avec avertissements) |
| < 40 | Insuffisant — génération bloquée |

## DataQualityIssue

```typescript
interface DataQualityIssue {
  id: string
  dimension: DataQualityDimension
  severity: 'erreur' | 'avertissement' | 'info'
  message: string
  elementId?: string
  suggestion?: string
}
```

## Intégration dans le pipeline SPIE

```
Extraction → validate() → DataQualityReport
                              ↓
                    validPourGeneration?
                         /        \
                        OUI       NON
                         ↓         ↓
                    GraphBuilder  Erreur UI
                                  + suggestions
```

La validation est **non-bloquante au niveau de la donnée** — le rapport est produit mais la décision de bloquer ou non appartient à l'appelant (PCE/PGE).
