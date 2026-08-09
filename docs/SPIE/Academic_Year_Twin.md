# SPIE-04 — Academic Year Digital Twin (AYDTE)

## Principe fondamental

L'`AcademicYearTwin` est un **objet vivant**, pas un document. Il représente une année scolaire complète pour un enseignant/classe/matière. Chaque modification peut déclencher un recalcul partiel de l'ensemble du plan — sans reconstruire l'année en entier.

```
AnnualPlanningInput
      │
      ▼
AnnualPlanningEngine.plan()
      │
      ▼
AnnualPlanningOutput (sequences + nodes)
      │
      ▼
AcademicYearService.createTwin()
      │
      ▼
AcademicYearTwin  ←──── vit toute l'année ────→  VersionHistory
```

## Structure

```typescript
interface AcademicYearTwin {
  id: string
  enseignantId: string
  classeId: string
  matiereId: string
  academicYear: string        // '2025-2026'
  curriculumId: string
  sequences: SequenceBlock[]  // Unités d'enseignement thématiques
  nodes: AnnualPlanNode[]     // Allocations semaine par semaine
  coveragePercent: number     // % du curriculum couvert
  pacingScore: number         // 0-100
  currentVersion: number
  statut: AcademicYearStatus
}
```

## Séquences (SequenceBlock)

Une séquence est un regroupement thématique d'outcomes curriculaires:
- `outcomeIds[]` — lien vers les outcomes normalisés (SPIE-02)
- `semaineDébut / semainesFin` — semaine de l'année scolaire (1-based)
- `dureeEstimeeHeures` — calculé depuis les outcomes
- `statut` — `planifiee | en_cours | terminee | reportee`
- `leconIds[] / quizIds[]` — lien vers les objets générés
- `needsRecalculation` — flag d'impact

## Noeuds (AnnualPlanNode)

Un noeud lie une séquence à une semaine spécifique:
- `sequenceId` + `semaine` + `dureeMinutes`
- `confirme` — l'enseignant a validé ce placement

## Cycle de vie

```
initialise → en_planification → actif → termine
                                  ↕
                               suspendu
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/twin.ts` | AcademicYearTwin, SequenceBlock, AnnualPlanNode |
| `types/planning.ts` | AnnualPlanningInput / Output |
| `services/academic-year.service.ts` | Orchestration complète |
| `planning/annual-planning-engine.ts` | Génère le plan initial |
