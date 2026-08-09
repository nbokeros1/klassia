# SPIE-06 — Pedagogical Time Engine (PTE)

## Vision

> ScorgIA ne doit jamais raisonner uniquement en fonction du curriculum.
> Il doit raisonner en fonction du **temps disponible**.

Le temps est la ressource principale d'un enseignant. Le PTE le modélise à chaque granularité et suit en temps réel l'écart entre le plan et la réalité.

## Architecture globale

```
Événements runtime (absences, cours annulés...)
        │
        ▼
PTECalendarEngine.createEvent()
        │
        ▼
TimeImpactEngine.measureEvent()     ← impact immédiat
        │
        ├── RecalculationEngine.recalculate()    ← cascade sur le plan annuel
        ├── TimeRecommendationEngine.generate()  ← propositions (jamais auto)
        └── AcademicClockBuilder.build()         ← où en est réellement la classe
```

## 6 moteurs

| Moteur | Rôle |
|---|---|
| `AcademicTimeBuilder` | Construit le modèle de temps à toutes les granularités |
| `PTECalendarEngine` | Gère les événements qui altèrent le temps disponible |
| `RecalculationEngine` | Recalcul en cascade quand la réalité dévie du plan |
| `TimeImpactEngine` | Mesure l'impact pédagogique d'une perte de temps |
| `TimeRecommendationEngine` | Propose des stratégies (jamais auto) |
| `AcademicClockBuilder` | Construit l'horloge pédagogique en temps réel |

## Règle absolue

Toutes les `TimeRecommendation` ont `autoApplicable: false`. Le PTE **propose** — l'enseignant **décide**.

## Fichiers clés

| Fichier | Contenu |
|---|---|
| `types/academic-time.ts` | AcademicTime, TimeBudget, TimeSlot, WeekTime, MonthTime, TrimesterTime |
| `types/calendar-event.ts` | TimeEvent, PTEEventType (10 types), CalendarDelta |
| `types/recalculation.ts` | TimeRecalculationTrigger, TimeRecalculationResult, SequenceShift |
| `types/impact.ts` | TimeImpact, TimeImpactType, TimeImpactSeverity |
| `types/recommendation.ts` | TimeRecommendation, TimeRecommendationType (6 types) |
| `types/clock.ts` | AcademicClock, ClockSnapshot, ClockStatus |
