# SPIE-06 — Recalculation Engine

## Rôle

Quand une leçon prend plus de temps que prévu → les séquences suivantes se décalent → la couverture curriculaire peut diminuer. Le `RecalculationEngine` calcule ces effets en cascade.

## Déclencheurs (TimeRecalculationTriggerType)

| Type | Description |
|---|---|
| `lecon_prolongee` | Une leçon a duré plus longtemps que prévu |
| `lecon_raccourcie` | Une leçon a été écourtée |
| `cours_annule` | Un cours entier est annulé |
| `absence_enseignant` | L'enseignant était absent |
| `evaluation_ajoutee` | Une évaluation supplémentaire est insérée |
| `activite_ajoutee` | Une activité supplémentaire s'intercale |
| `sequence_modifiee` | La durée d'une séquence change |
| `calendrier_modifie` | Le calendrier scolaire est modifié |

## Algorithme

```
decalageSemaines = minutesImpactees / minutesParSemaine

pour chaque séquence après l'affectée:
  nouvelleSemaineDebut = ceil(ancienneDebut + decalageSemaines)
  estHorsCalendrier = nouvelleSemaineFin > totalSemaines
  heursPerdues = (si hors calendrier) × part en dehors

coverageDelta = −outcomesHorsCalendrier / outcomesTotal × 100
```

## Conditions de cascade

```typescript
cascadeToAnnualPlan = minutesImpactees >= 30
```

Les impacts < 30 minutes sont absorbés par le tampon — pas de cascade.

## SequenceShift

```typescript
{
  sequenceId: string
  ancienneSemaineDebut: number
  nouvelleSemaineDebut: number
  decalageSemaines: number
  heursPerdues: number
  estHorsCalendrier: boolean   // ⚠ Contenu non enseignable
}
```
