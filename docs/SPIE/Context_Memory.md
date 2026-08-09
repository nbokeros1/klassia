# SPIE Context Memory

**SPIE-03 | Version 1.0 | 2026-08-04**

## Rôle

La `ContextMemory` représente l'état pédagogique d'une classe pour une année scolaire. Elle permet à SPIE de savoir :

- Ce qui a déjà été enseigné
- Ce qui a été ignoré ou sauté
- Ce qui doit être révisé
- Ce qui est en retard
- Quel est le taux de progression

## Construction

La `ContextMemory` est construite par `buildContextMemory()` à partir de :
- **Outcomes** du curriculum (source CKG)
- **Progression** (source PCE : outcomesEnseignes, outcomesARenforcer, etc.)
- **Historique** (leçons récentes pour enrichissement — engagement, dates)

## MemoryEntry

Pour chaque outcome curriculaire, une entrée dans la mémoire :

```typescript
interface MemoryEntry {
  outcomeId: string
  outcomeCode?: string
  outcomeTitre: string
  status: MemoryEntryStatus  // voir ci-dessous
  dateStatut: string
  dateEnseignement?: string  // quand enseigné
  leconId?: string
  leconTitre?: string
  tauxEngagement?: number    // 0–100 si historique disponible
  scoresMoyen?: number       // 0–100 si évalué
  commentaire?: string
}
```

## Statuts

| Statut | Signification |
|--------|---------------|
| `enseigne` | Enseigné et validé |
| `enseigne_partiel` | Partiellement couvert |
| `a_renforcer` | Enseigné mais nécessite révision |
| `saute` | Intentionnellement ignoré |
| `en_retard` | Pas enseigné, passé la date prévue |
| `planifie` | Prévu pour une session future |
| `non_planifie` | Dans le curriculum, non encore planifié |

## ContextMemoryStats

```typescript
interface ContextMemoryStats {
  total: number
  enseigne: number
  enseignePartiel: number
  aRenforcer: number
  saute: number
  enRetard: number
  planifie: number
  nonPlanifie: number
  progressPercent: number        // (enseigne / total) * 100
  onTrack: boolean               // avanceRetardSemaines >= -1
  avanceRetardSemaines: number   // négatif = retard
}
```

## Mise à jour de la mémoire

`contextMemoryService.updateEntryStatus(memory, outcomeId, newStatus)` retourne une nouvelle `ContextMemory` immuable.

## Intégration

La `ContextMemory` est utilisée par :
- **Decision Engine** → pour recommander la prochaine leçon
- **PGE** → pour éviter de régénérer du contenu déjà enseigné
- **AYDTE** → pour recalculer le rythme en cours d'année
- **TQE** → pour valider la couverture curriculaire
- **UI** → pour afficher le tableau de bord de progression
