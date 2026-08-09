# SPIE-04 — Impact Engine

## Rôle

L'`ImpactEngine` calcule les effets en cascade d'un changement dans l'`AcademicYearTwin`. Quand une séquence change, quelles leçons sont désalignées ? Quels quiz ? Quelles évaluations ?

## Principes

1. **Calcul avant application** : l'impact est calculé AVANT que le changement soit appliqué, pour permettre à l'enseignant de décider.
2. **Granularité** : l'analyse distingue les éléments à recalculer (`recalculer`), à vérifier (`verifier`), ou sans action (`aucune`).
3. **Sévérité** : l'analyse produit un niveau `mineure | moderee | majeure | critique` basé sur le nombre de leçons touchées.

## ImpactAnalysis

```typescript
{
  declencheur: { type, elementId, description }
  affecte: AffectedItem[]
  nbLeconsTouchees: number
  nbQuizTouches: number
  nbEvaluationsTouchees: number
  severite: 'mineure' | 'moderee' | 'majeure' | 'critique'
  autoFixable: boolean       // true si aucune leçon ne nécessite de régénération
  recommandations: string[]
}
```

## Déclencheurs

| Type | Description |
|---|---|
| `sequence_modifiee` | Séquence modifiée → leçons/quiz en aval |
| `calendrier_modifie` | Semaine(s) modifiée(s) → séquences décalées |

## Sévérité

| Sévérité | Condition |
|---|---|
| `mineure` | 0 leçons touchées |
| `moderee` | 1–5 leçons touchées |
| `majeure` | 6–10 leçons touchées |
| `critique` | > 10 leçons touchées |

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/impact.ts` | ImpactAnalysis, AffectedItem, ImpactAction |
| `impact/impact-engine.ts` | analyzeSequenceChange(), analyzeCalendarChange() |
| `services/impact-analysis.service.ts` | API haut niveau |
