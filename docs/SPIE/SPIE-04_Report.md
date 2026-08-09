# SPIE-04 — Academic Year Digital Twin Engine (AYDTE)
# Rapport d'implémentation

**Date** : 2026-08-04  
**Statut** : Complet ✅  
**TypeScript** : 0 erreurs

---

## Vue d'ensemble

SPIE-04 implémente le **jumeau numérique de l'année scolaire** : un objet vivant (pas un document) qui représente et suit l'ensemble de l'année scolaire d'un enseignant.

## Fichiers créés

### Types (6 fichiers)

| Fichier | Contenu |
|---|---|
| `src/lib/spie/aydte/types/twin.ts` | `AcademicYearTwin`, `SequenceBlock`, `AnnualPlanNode`, `AcademicYearStatus` |
| `src/lib/spie/aydte/types/calendar.ts` | `SchoolCalendar`, `CalendarWeek`, `CalendarDay`, `TeachingSession`, `TwinSchoolTerm`, `TwinTermType`, `CalendarStats` |
| `src/lib/spie/aydte/types/pacing.ts` | `AnnualPacingModel`, `SequencePacing`, `PaceStatus`, `PacingAdjustment`, `PacingImpact` |
| `src/lib/spie/aydte/types/versioning.ts` | `TwinVersion`, `VersionDiff`, `TwinSnapshot`, `TwinVersionHistory`, `ChangeType` (12 valeurs) |
| `src/lib/spie/aydte/types/impact.ts` | `ImpactAnalysis`, `AffectedItem`, `ImpactAction`, `RecalculationScope` |
| `src/lib/spie/aydte/types/planning.ts` | `AnnualPlanningInput`, `AnnualPlanningOutput`, `PlanningAlgorithmConfig` |
| `src/lib/spie/aydte/types/index.ts` | Barrel types |

### Moteurs (5 fichiers)

| Fichier | Classe | Méthodes clés |
|---|---|---|
| `calendar/calendar-engine.ts` | `CalendarEngine` | `buildFromParams()`, `calculateStats()`, `allocateSequence()` |
| `pacing/pacing-engine.ts` | `PacingEngine` | `buildPacingModel()`, `simulateAdjustment()` |
| `planning/annual-planning-engine.ts` | `AnnualPlanningEngine` | `plan()` |
| `versioning/version-history.ts` | `VersionHistoryManager` | `createInitialVersion()`, `recordChange()`, `buildHistory()` |
| `impact/impact-engine.ts` | `ImpactEngine` | `analyzeSequenceChange()`, `analyzeCalendarChange()` |

### Services (6 fichiers)

| Fichier | Service | Rôle |
|---|---|---|
| `services/academic-year.service.ts` | `AcademicYearService` | Orchestration, createTwin, addSequence, updateStatus |
| `services/calendar-engine.service.ts` | `CalendarEngineService` | Province defaults, create() |
| `services/pacing-engine.service.ts` | `PacingEngineService` | buildModel(), simulateAdjustment(), getStatusLabel() |
| `services/annual-planning.service.ts` | `AnnualPlanningService` | plan(), validate() |
| `services/impact-analysis.service.ts` | `ImpactAnalysisService` | onSequenceModified(), onCalendarModified() |
| `services/version-history.service.ts` | `VersionHistoryService` | record(), buildHistory(), getLastOfType() |

### Barrel et documentation

| Fichier | Rôle |
|---|---|
| `src/lib/spie/aydte/index.ts` | Export barrel SPIE-04 |
| `src/lib/spie/index.ts` | Ajout `export * from './aydte'` |
| `docs/SPIE/Academic_Year_Twin.md` | Architecture AYDTE |
| `docs/SPIE/Calendar_Engine.md` | CalendarEngine docs |
| `docs/SPIE/Pacing_Engine.md` | PacingEngine docs |
| `docs/SPIE/Impact_Engine.md` | ImpactEngine docs |
| `docs/SPIE/Versioning.md` | Versioning docs |

## Décisions techniques

### DEC-018 — Jumeau vivant, pas document
L'`AcademicYearTwin` est un objet mutable avec versioning intégré. Toute modification passe par un service qui enregistre la version et calcule l'impact.

### DEC-019 — Calendrier province-agnostique
Les calendriers provinciaux sont de la donnée (dates par province dans `CalendarEngineService`), pas du code. La structure `SchoolCalendar` est identique pour toutes les provinces.

### DEC-020 — TwinSchoolTerm vs SchoolTerm (SPIE-01)
Le type SPIE-01 `SchoolTerm` et le type SPIE-04 sont différents (champs distincts). Renommé en `TwinSchoolTerm` / `TwinTermType` dans le module AYDTE pour éviter la collision d'export dans le barrel SPIE.

### DEC-021 — Impact Engine synchrone
L'`ImpactEngine` est synchrone et déterministe — il ne fait aucun appel IA. Il calcule l'impact structurel basé sur les liens entre séquences, leçons, et quiz dans le twin.

### DEC-022 — Planning Engine groupement prerequis_first
Le groupement par défaut est `prerequis_first` : les outcomes généraux sont regroupés avec leurs outcomes spécifiques enfants. Les outcomes sans parent sont placés en fin de plan.

## Algorithmes clés

### Groupement des outcomes en séquences
```
pour chaque outcome général (sans parentId):
  regrouper avec ses enfants
  si > maxParSequence: diviser en chunks
orphelins (parentId introuvable): ajoutés en fin
```

### Allocation au calendrier
```
currentWeek = 1
pour chaque sequence:
  semainesNecessaires = ceil(heures × 60 / minutesParSemaine × 0.9)  // buffer 10%
  nodes.push({ sequenceId, semaine: currentWeek })
  currentWeek += semainesNecessaires
```

### Score de rythme (pacingScore)
```
pacingRatio = totalHeuresPlanifiees / heuresDisponibles
pacingScore = max(0, 100 - |pacingRatio - 0.85| × 200)
// Optimal: 85% du temps utilisé (15% de marge)
```
