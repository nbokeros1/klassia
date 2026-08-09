# SPIE-06 — PTE Calendar Engine

## Distinction avec SPIE-04 CalendarEngine

| | SPIE-04 CalendarEngine | SPIE-06 PTECalendarEngine |
|---|---|---|
| Rôle | Construit le plan | Suit ce qui arrive en réalité |
| Données | Planifiées à l'avance | Événements runtime |
| Niveau | Semaine | Période individuelle |

## 10 types d'événements (PTEEventType)

| Type | Minutes perdues par défaut | Cascade |
|---|---|---|
| `jour_ferie` | 60 | Oui |
| `vacances` | 0 (niveau semaine) | Non |
| `examen` | 60 | Oui |
| `journee_pedagogique` | 60 | Oui |
| `absence_enseignant` | 60 | Oui |
| `cours_annule` | 60 | Oui |
| `cours_prolonge` | 0 (gains) | Non |
| `activite_speciale` | 30 | Non |
| `retard_debut` | 15 | Non |
| `fin_anticipee` | 15 | Non |

## CalendarDelta

Quand on applique un lot d'événements sur une période, `computeDelta()` produit le bilan net:

```typescript
{
  minutesPerdues: number
  minutesGagnees: number
  netMinutes: number           // = gains - pertes
  eventsAppliques: string[]
  semainesTouchees: number[]
}
```

## Cascade

Un événement avec `dureeMinutesPerdues >= 60` a `impacteLesPrecedentes = true` et doit déclencher `RecalculationEngine.recalculate()`.
