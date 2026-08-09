# SPIE-06 — Academic Clock

## Rôle

L'`AcademicClock` dit **où en est réellement la classe** à n'importe quel moment. Elle compare la progression réelle (temps consommé, outcomes couverts) avec ce qui était prévu à cette date.

## ClockStatus (5 niveaux)

| Statut | Condition |
|---|---|
| `en_avance` | avanceRetardSemaines > +1 |
| `dans_les_temps` | ±1 semaine |
| `leger_retard` | -1 à -2 semaines |
| `retard_modere` | -2 à -4 semaines |
| `retard_critique` | < -4 semaines |

## ClockSnapshot

```typescript
interface ClockSnapshot {
  capturedAt: string
  weekNumber: number
  semainesRestantes: number
  minutesConsommees: number
  minutesPerdues: number
  minutesRestantes: number
  sequenceEnCours?: string
  outcomesCouverts: number
  outcomesTotal: number
  coveragePercent: number
  avanceRetardSemaines: number
  statut: ClockStatus
  tendancePace: 'amelioration' | 'stable' | 'degradation' | 'insuffisant_donnees'
}
```

## AcademicClock

```typescript
interface AcademicClock {
  snapshot: ClockSnapshot         // Lecture actuelle
  historique: ClockSnapshot[]     // Derniers 10 snapshots (tendance)
  alertes: string[]               // Messages d'alerte
  messageActuel: string           // Message UI en une ligne
}
```

## Alertes automatiques

L'horloge génère des alertes automatiquement si :
- Statut `retard_critique`
- Couverture < 50% avec moins de 10 semaines
- Temps perdu > 30% du temps enseigné
- Moins de 3 semaines restantes

## Tendance

Calculée sur les 3 derniers snapshots :
- `amelioration` — avance/retard s'améliore (+0.3 sem.)
- `stable` — variation < 0.3 sem.
- `degradation` — avance/retard se dégrade (−0.3 sem.)
