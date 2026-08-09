# SPIE-07 — Pedagogical Strategy Engine (PSE)

## Vue d'ensemble

La **PedagogicalStrategy** est la décision pédagogique principale : **comment** enseigner, pas **quoi** générer. C'est la synthèse de tous les moteurs SPIE précédents en une intention pédagogique cohérente.

---

## Modèle central : `PedagogicalStrategy`

```typescript
interface PedagogicalStrategy {
  id: string
  nom: string
  description: string
  
  enseignantId: string
  classeId: string
  matiereId: string
  academicYear: string
  langue: 'fr' | 'en'
  
  // Objectifs
  objectifsGeneraux: string[]
  outcomesCouverts: string[]       // IDs des objectifs du curriculum
  
  // Approche pédagogique
  approche: StrategyApproach
  justificationApproche: string
  
  // Ordre recommandé
  ordreSequences: string[]         // IDs dans l'ordre recommandé
  rationaleOrdre: string
  
  // Niveau de difficulté
  niveauDifficulte: DifficultyLevel
  progressionDifficulte: ProgressionType
  
  // Progression
  nbSequences: number
  sequencesParTrimestre: [number, number, number]
  
  // Évaluations
  nbEvaluationsFormatives: number
  nbEvaluationsSommatives: number
  momentEvaluations: EvaluationTiming
  rationaleEvaluations: string
  
  // Différenciation
  differenciationPrevue: boolean
  strategiesDifferentiation: DifferentiationStrategy[]
  rationaleDifferentiation: string
  
  // Gestion du temps
  minutesParSemaine: number
  heuresTotalesPrevues: number
  reserveTamponPercent: number     // 0.05–0.20
  rationaleTemps: string
  
  // Gestion des risques
  risquesPrincipaux: string[]
  strategiesAttenuation: string[]
  
  // Qualité
  scoreQualite?: number            // 0–100, rempli par StrategyValidator
  
  createdAt: string
}
```

---

## Types fondamentaux

### StrategyApproach (7 valeurs)

| Valeur | Description |
|--------|-------------|
| `enseignement_direct` | Structuré, efficace — maximise la couverture |
| `apprentissage_actif` | Exploration par l'élève |
| `collaboration` | Apprentissage coopératif |
| `differentie` | Adapté aux différents profils |
| `spirale` | Retour progressif sur les concepts |
| `par_projet` | Apprentissage par la création |
| `mixte` | Combinaison selon le contexte |

### DifficultyLevel (4 valeurs)

`accessible` → `moyen` → `exigeant` → `tres_exigeant`

### ProgressionType (4 valeurs)

`lineaire` | `spirale` | `escalier` | `differentie`

---

## Fichiers

| Fichier | Rôle |
|---------|------|
| `types/strategy.ts` | Modèle principal PedagogicalStrategy |
| `types/validation.ts` | StrategyValidationReport (7 dimensions) |
| `types/comparison.ts` | StrategyComparison A/B/C |
| `types/recommendation.ts` | StrategyRecommendation (pourquoi/avantages/risques) |
| `types/decision-tree.ts` | PedagogicalDecisionTree (traçabilité) |

---

## Règles invariantes

1. **La stratégie ne génère rien** — elle prépare la génération (PSE → génération de leçons)
2. **0 appel IA** — tous les algorithmes sont déterministes
3. **La traçabilité est obligatoire** — chaque décision est enregistrée dans le `PedagogicalDecisionTree`
4. **Les recommandations ne s'auto-appliquent jamais** — l'enseignant reste maître
