# SPIE-06 — Academic Time Model

## Principe

`AcademicTime` est le **compte de temps** d'un sujet pour une classe sur une année scolaire. Il décompose le budget en 4 grandeurs à chaque niveau.

## TimeBudget (à chaque niveau)

```typescript
interface TimeBudget {
  totalMinutes: number       // Budget planifié
  consommeMinutes: number    // Réellement enseigné
  perduMinutes: number       // Perdu (absences, annulations)
  restantMinutes: number     // total - consommé - perdu
  tamponMinutes: number      // 10% réservé pour imprévus
  tauxConsommation: number   // consommé / total × 100
  tauxPerte: number          // perdu / total × 100
}
```

## Granularités

| Niveau | Objet |
|---|---|
| Année | `AcademicTime.annee: TimeBudget` |
| Trimestre | `TrimesterTime[]` (3 trimestres) |
| Mois | `MonthTime[]` (Septembre → Juin) |
| Semaine | `WeekTime[]` (1 par semaine, 1-based) |
| Jour | `CalendarDay` dans chaque `WeekTime` |
| Cours | `TimeSlot` — une période d'enseignement |

## TimeSlot (période d'enseignement)

```typescript
interface TimeSlot {
  dureeMinutesPlanifiees: number
  dureeMinutesReelles?: number    // Rempli après le cours
  statut: 'planifie' | 'realise' | 'prolonge' | 'raccourci' | 'annule' | 'reporte'
  minutesPerdues: number
  minutesGagnees: number
}
```

## Métriques dérivées

- `avanceRetardMinutes` — `consomme_actuel - consomme_planifié_auj`
- `pacingRatio` — `consomme / planifié_auj` (1.0 = on track)

## Construction

```typescript
academicTimeBuilder.build({
  minutesParSemaine: 200,
  totalSemaines: 36,
  slots: [],               // Périodes enregistrées
  eventMinutesPerdus: 90,  // Depuis PTECalendarEngine
})
```
