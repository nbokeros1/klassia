# SPIE-06 — Time Impact Engine

## Rôle

Mesure l'impact pédagogique d'une perte de temps. Produit un `TimeImpact` avec : sévérité, décalage cumulé, séquences affectées, message pour l'enseignant.

## 6 types d'impact

| Type | Déclencheur |
|---|---|
| `absence_enseignant` | L'enseignant était absent |
| `cours_annule` | Cours annulé |
| `lecon_prolongee` | Leçon trop longue |
| `activite_supplementaire` | Activité imprévue |
| `evaluation_supplementaire` | Évaluation supplémentaire |
| `retard_global` | Accumulation de plusieurs impacts |

## Sévérité (basée sur le cumul en minutes)

| Sévérité | Condition |
|---|---|
| `negligeable` | ≤ 15 min |
| `faible` | 16–60 min |
| `modere` | 61–180 min |
| `severe` | 181–360 min |
| `critique` | > 360 min |

## TimeImpact

```typescript
{
  type: TimeImpactType
  severity: TimeImpactSeverity
  minutesPerdues: number
  minutesDecalageCumul: number      // Running total
  semainesDecalageCumul: number     // Converted (decimal)
  sequencesDecalees: string[]
  coverageRiskPercent: number
  messageEnseignant: string         // Toujours en français, toujours actionnable
}
```

## Messages enseignant

Chaque type d'impact génère un message naturel en français qui indique :
1. Ce qui s'est passé
2. Le temps perdu
3. Le décalage en semaines
4. L'action recommandée

**Exemple :** *« Votre absence a entraîné la perte de 60 minutes d'enseignement. Le plan pédagogique accuse un retard de 0.3 semaine(s). »*
