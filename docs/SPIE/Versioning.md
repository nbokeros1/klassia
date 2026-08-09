# SPIE-04 — Versioning (Twin Version History)

## Rôle

Le système de versioning trace chaque modification de l'`AcademicYearTwin`. Chaque changement produit une `TwinVersion` qui capture l'état du twin à ce moment-là.

## Principes

1. **Immutable** : les versions ne sont jamais modifiées après création.
2. **Snapshot** : chaque version contient un instantané compact du twin.
3. **Diff** : chaque version décrit ce qui a changé depuis la précédente.
4. **Audit** : l'historique complet est conservé — pas de suppression.

## ChangeType (12 types)

| Type | Déclencheur |
|---|---|
| `creation` | Twin créé |
| `sequence_ajoutee` | Nouvelle séquence |
| `sequence_modifiee` | Séquence mise à jour |
| `sequence_supprimee` | Séquence retirée |
| `sequence_reordonnee` | Ordre des séquences changé |
| `statut_sequence_change` | Séquence → `en_cours`, `terminee`, etc. |
| `lecon_ajoutee` | Leçon ajoutée à une séquence |
| `lecon_modifiee` | Leçon modifiée |
| `calendrier_modifie` | Calendrier mis à jour |
| `curriculum_change` | Curriculum sous-jacent changé |
| `progression_update` | Progression mise à jour |
| `restauration` | Restauration d'une version précédente |

## TwinSnapshot (compact state)

```typescript
{
  statut: AcademicYearStatus
  nbSequences: number
  nbLecons: number
  coveragePercent: number
  pacingScore: number
  totalHeuresPlanifiees: number
}
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/versioning.ts` | TwinVersion, VersionDiff, TwinSnapshot, TwinVersionHistory |
| `versioning/version-history.ts` | VersionHistoryManager |
| `services/version-history.service.ts` | API haut niveau |
