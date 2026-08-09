# SPIE-04 — Calendar Engine

## Rôle

Le `CalendarEngine` génère et gère le calendrier scolaire d'une classe. Il modélise les semaines, les jours, les sessions d'enseignement et les jours de congé.

## Architecture province-agnostique

Les calendriers provinciaux sont de la **donnée**, pas du code. Le `CalendarEngineService` contient les dates de rentrée par défaut par province, mais la structure est identique pour toutes.

```typescript
PROVINCE_YEAR_DEFAULTS = {
  ON: { startMonth: 9, startDay: 5, endMonth: 6, endDay: 26 },
  QC: { startMonth: 8, startDay: 28, endMonth: 6, endDay: 20 },
  AB: { startMonth: 9, startDay: 3, endMonth: 6, endDay: 26 },
  // ...
}
```

## Structure principale

```
SchoolCalendar
├── id, classeId, province, academicYear
├── startDate / endDate
├── semaines: CalendarWeek[]
│   └── days: CalendarDay[]
│       └── sessions: TeachingSession[]
├── termes: TwinSchoolTerm[]
└── joursConge: string[]
```

## CalendarStats

Calculé dynamiquement depuis `CalendarEngine.calculateStats()`:
- `semainesRestantes` — semaines actives depuis aujourd'hui
- `minutesRestantes` — temps d'enseignement disponible
- `minutesParSemaineEnMoyenne` — densité hebdomadaire

## Construction automatique

`CalendarEngineService.create()` génère le calendrier entier à partir de:
1. `province` → dates de rentrée/fin d'année
2. `minutesParSemaine` → répartition par jour
3. `joursConge` → jours à exclure

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/calendar.ts` | CalendarWeek, CalendarDay, TeachingSession, SchoolCalendar |
| `calendar/calendar-engine.ts` | CalendarEngine (buildFromParams, calculateStats, allocateSequence) |
| `services/calendar-engine.service.ts` | Province defaults, API haut niveau |
