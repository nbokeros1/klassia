# SPIE-06 — Pedagogical Time Engine (PTE)
# Rapport d'implémentation

**Date** : 2026-08-04  
**Statut** : Complet ✅  
**TypeScript** : 0 erreurs

---

## Vision

> ScorgIA ne doit jamais raisonner uniquement en fonction du curriculum.
> Il doit raisonner en fonction du **temps disponible**.

Le PTE est le moteur de gestion du temps pédagogique. Il modélise le temps à 6 granularités (année → période) et suit en temps réel l'écart entre le plan et la réalité.

---

## Fichiers créés

### Types (7 fichiers)

| Fichier | Contenu |
|---|---|
| `types/academic-time.ts` | `AcademicTime`, `TimeBudget`, `TimeSlot` (6 statuts), `WeekTime`, `MonthTime`, `TrimesterTime`, `TimeGranularity` |
| `types/calendar-event.ts` | `TimeEvent`, `PTEEventType` (10 types), `PTEEventSeverity`, `CalendarDelta` |
| `types/recalculation.ts` | `TimeRecalculationTrigger`, `TimeRecalculationResult`, `SequenceShift`, `TimeRecalculationTriggerType` (8 types) |
| `types/impact.ts` | `TimeImpact`, `TimeImpactType` (6 types), `TimeImpactSeverity` (5 niveaux) |
| `types/recommendation.ts` | `TimeRecommendation`, `TimeRecommendationType` (6 types) |
| `types/clock.ts` | `AcademicClock`, `ClockSnapshot`, `ClockStatus` (5 niveaux) |
| `types/index.ts` | Barrel |

### Moteurs (6 fichiers)

| Fichier | Classe | Responsabilités clés |
|---|---|---|
| `time/academic-time-builder.ts` | `AcademicTimeBuilder` | Construit `AcademicTime` à toutes les granularités, calcule avance/retard, `summarize()` |
| `calendar/pte-calendar-engine.ts` | `PTECalendarEngine` | `createEvent()`, `computeDelta()`, `getImpactingEvents()` — 10 types d'événements |
| `recalculation/recalculation-engine.ts` | `RecalculationEngine` | Cascade leçon prolongée → séquences décalées → couverture réduite |
| `impact/time-impact-engine.ts` | `TimeImpactEngine` | `measureEvent()`, `measureBatch()`, `measureLeconProlongee()` — 5 seuils de sévérité |
| `recommendations/time-recommendation-engine.ts` | `TimeRecommendationEngine` | `generate()` — 6 types, explication + commentApplique + impactAttendu, `autoApplicable: false` |
| `clock/academic-clock.ts` | `AcademicClockBuilder` | `build()` — snapshot, historique (max 10), alertes, tendance |

### Services (6 fichiers)

| Fichier | Service |
|---|---|
| `services/academic-time.service.ts` | `AcademicTimeService` — `build()`, `summarize()`, `recordSlot()`, `getStatusLabel()` |
| `services/pte-calendar.service.ts` | `PTECalendarService` — `recordEvent()`, `computeDelta()`, `upcoming()` |
| `services/recalculation.service.ts` | `RecalculationService` — `onLeconProlongee()`, `onCoursAnnule()`, `recalculate()` |
| `services/time-impact.service.ts` | `TimeImpactService` — `measureEvent()`, `isCritical()`, `totalMinutesPerdus()` |
| `services/time-recommendation.service.ts` | `TimeRecommendationService` — `generate()`, `getCritical()`, `getTopN()` |
| `services/academic-clock.service.ts` | `AcademicClockService` — `build()`, `refresh()`, `isOnTrack()`, `isAtRisk()` |

### Tests (6 fichiers — `__tests__/`)

| Fichier | Cas de test |
|---|---|
| `academic-time.test.ts` | Budget annuel, temps consommé depuis slots, taux calcul |
| `pte-calendar.test.ts` | Création d'événements, computeDelta, filtrage impactants |
| `recalculation.test.ts` | Pas de cascade < 30 min, cascade en cascade, hors calendrier |
| `time-impact.test.ts` | Sévérités, cumulatif, leçon prolongée |
| `time-recommendation.test.ts` | autoApplicable=false, impact sévère→supprimer, étaler|
| `academic-clock.test.ts` | Snapshot valide, statut, historique max 10 |

### Barrel et intégration

| Fichier | Modification |
|---|---|
| `src/lib/spie/pte/index.ts` | Barrel export SPIE-06 |
| `src/lib/spie/index.ts` | Ajout `export * from './pte'` |

### Documentation (8 fichiers)

| Fichier | Contenu |
|---|---|
| `docs/SPIE/Pedagogical_Time_Engine.md` | Architecture PTE, 6 moteurs, règle |
| `docs/SPIE/Academic_Time.md` | AcademicTime, TimeBudget, TimeSlot |
| `docs/SPIE/PTE_Calendar.md` | 10 types d'événements, CalendarDelta, cascade |
| `docs/SPIE/Recalculation_Engine.md` | 8 déclencheurs, algorithme de cascade, SequenceShift |
| `docs/SPIE/Time_Impact_Engine.md` | 6 types, 5 sévérités, messages enseignant |
| `docs/SPIE/Time_Recommendation_Engine.md` | 6 types, sélection par sévérité, exemple |
| `docs/SPIE/Academic_Clock.md` | ClockStatus, ClockSnapshot, tendance, alertes |
| `docs/SPIE/SPIE-06_Report.md` | Ce rapport |

---

## Décisions techniques

### DEC-019 — PTE distinct de SPIE-04 CalendarEngine

**Contexte** : SPIE-04 construit le plan. SPIE-06 suit l'exécution.  
**Décision** : `PTECalendarEngine` (SPIE-06) gère les événements runtime. `CalendarEngine` (SPIE-04) gère la planification initiale. Les deux sont complémentaires.  
**Raison** : Séparation des responsabilités. Le plan ne change pas à chaque absence — la réalité est suivie séparément.

### DEC-020 — PTEEventType préfixé pour éviter collision

**Contexte** : SPIE-01 exporte `CalendarEventType` et `CalendarEvent`.  
**Décision** : PTE utilise `PTEEventType` et `TimeEvent` — noms distincts.  
**Raison** : Les deux modèles sont différents (SPIE-01 = métadonnées calendar ; PTE = événements runtime d'impact temps).

### DEC-021 — Seuil de cascade à 30 minutes

**Contexte** : Tous les événements ne justifient pas un recalcul du plan annuel.  
**Décision** : `cascadeToAnnualPlan = minutesImpactees >= 30`. Les impacts < 30 min sont absorbés par le tampon (10% réservé).  
**Raison** : Éviter les recalculs inutiles pour de petits retards. Le tampon est conçu pour absorber ces variations.

### DEC-022 — AcademicClock historique max 10 snapshots

**Contexte** : Historique illimité serait trop lourd pour calculer la tendance.  
**Décision** : `historique = [...prev, nouveau].slice(-10)` — garde les 10 derniers.  
**Raison** : La tendance pertinente est sur les dernières semaines, pas tout le passé.

---

## Algorithmes clés

### Sévérité de l'impact temporel

```
≤ 15 min  → negligeable
16–60     → faible
61–180    → modere
181–360   → severe
> 360     → critique
```

La sévérité est calculée sur le **cumul** (minutesDecalageCumul), pas uniquement l'événement isolé.

### Recalcul en cascade

```
decalageSemaines = minutesImpactees / minutesParSemaine

pour chaque séquence après l'affectée:
  nouveauDebut = ceil(ancienDebut + decalage)
  nouvelleFin  = ceil(ancienneFin + decalage)
  si nouvelleFin > totalSemaines → hors calendrier

coverageDelta = −(nbOutcomesHorsCalendrier / outcomesTotal × 100)
```

### Score de retard pour l'horloge

```
avanceRetardMinutes = consommeActuel - consommePlanifiéAujd'hui
avanceRetardSemaines = avanceRetardMinutes / minutesParSemaine

en_avance        si > +1 sem
dans_les_temps   si ±1 sem
leger_retard     si -1 à -2
retard_modere    si -2 à -4
retard_critique  si < -4
```
