# SPIE-06 — Time Recommendation Engine

## Règle absolue

```typescript
autoApplicable: false  // TOUJOURS false — jamais auto-appliqué
```

Chaque recommandation inclut :
- `explication` — POURQUOI c'est recommandé
- `commentApplique` — COMMENT l'appliquer (étapes concrètes)
- `impactAttendu` — Ce que cela produit

## 6 types de recommandations

| Type | Déclencheur | Priorité |
|---|---|---|
| `supprimer` | Impact sévère ou critique | Critique |
| `recuperer` | ≥ 60 minutes perdues | Haute |
| `reduire` | Impact sévère ou modéré | Haute |
| `deplacer` | Impact modéré | Normale |
| `fusionner` | Séquences courtes (< 4h) | Normale |
| `etaler` | Impact faible ou négligeable | Faible |

## Sélection des recommandations par sévérité

| Sévérité impact | Recommandations proposées |
|---|---|
| `critique` | supprimer, récupérer, réduire, déplacer |
| `severe` | supprimer, récupérer, réduire, déplacer |
| `modere` | réduire, déplacer, fusionner, récupérer |
| `faible` | déplacer, fusionner, récupérer, étaler |
| `negligeable` | étaler |

## Exemple de recommandation

```typescript
{
  type: 'supprimer',
  priorite: 'critique',
  titre: 'Retirer les séquences de moindre priorité',
  explication: 'Le retard accumulé (2.0 semaine(s)) risque de compromettre...',
  commentApplique: '1. Identifiez les séquences...\n2. Supprimez-les...',
  impactAttendu: "Jusqu'à 480 minutes récupérées...",
  minutesRecuperees: 480,
  autoApplicable: false,
}
```
