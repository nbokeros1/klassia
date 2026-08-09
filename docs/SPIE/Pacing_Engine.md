# SPIE-04 — Pacing Engine

## Rôle

Le `PacingEngine` calcule le rythme d'enseignement : avance/retard par séquence, couverture curriculaire projetée, marge de temps restante.

## PaceStatus (5 niveaux)

| Statut | Condition |
|---|---|
| `en_avance` | > +1 semaine d'avance |
| `dans_les_temps` | ±1 semaine |
| `leger_retard` | 1–2 semaines de retard |
| `retard_modere` | 2–4 semaines de retard |
| `retard_critique` | > 4 semaines de retard |

## AnnualPacingModel

```typescript
{
  semaineActuelle: number
  semainesRestantes: number
  minutesRestantes: number
  sequences: SequencePacing[]        // avance/retard par séquence
  statutGlobal: PaceStatus
  avanceRetardSemainesGlobal: number
  coverageAttenduePercent: number    // projection fin d'année
  coverageActuellePercent: number    // aujourd'hui
  bufferSemainesRestant: number      // marge disponible
  recommandations: string[]
}
```

## Algorithme de retard

Pour une séquence `en_cours`:
```
semainesPrevues = ceil(heuresPrevues × 60 / minutesParSemaine)
avanceRetard = semainesPrevues - (semaineActuelle - semaineDébut)
```

Pour une séquence `terminee`:
```
avanceRetard = plannedDuration - realDuration (en semaines)
```

## Ajustements de rythme

`simulateAdjustment()` calcule l'impact avant application:
- `compresser` → -20% de temps (risque pédagogique)
- `supprimer` → -X outcomes du curriculum
- `fusionner` → économie de transition

## Fichiers

| Fichier | Rôle |
|---|---|
| `types/pacing.ts` | PaceStatus, SequencePacing, AnnualPacingModel |
| `pacing/pacing-engine.ts` | buildPacingModel(), simulateAdjustment() |
| `services/pacing-engine.service.ts` | API haut niveau |
