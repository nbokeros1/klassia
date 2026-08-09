# SPIE Context Score

**SPIE-03 | Version 1.0 | 2026-08-04**

## Rôle

Le Context Score mesure la qualité et la complétude du `PedagogicalContext` avant génération.

## Score global

**Formule** : somme pondérée des scores de chaque source

| Source | Poids |
|--------|-------|
| `curriculum` | 30% |
| `progression` | 20% |
| `calendar` | 15% |
| `historique` | 15% |
| `teacher_profile` | 10% |
| `class_profile` | 5% |
| `resources` | 3% |
| `contraintes` | 2% |

**Niveaux de qualité** :
- `excellent` : ≥ 85
- `bon` : ≥ 65
- `minimal` : ≥ 40
- `insuffisant` : < 40

## Score par source

Chaque source est évaluée indépendamment sur 100 points.

### Curriculum (source la plus critique)
| Condition | Pénalité |
|-----------|----------|
| Outcomes absents | -40 |
| Knowledge Graph absent | -20 |
| Pacing model absent | -15 |
| Province absente | -10 |
| Matière absente | -15 |

### Calendar
| Condition | Pénalité |
|-----------|----------|
| 0 sessions restantes | -30 |
| 0 minutes restantes | -30 |
| < 5 sessions → avertissement | 0 (warning) |

### Progression
- Score de base : 80
- Avertissements si retard > 1 semaine ou > 3 outcomes à renforcer

### Teacher Profile
- Score de base : 60
- +15 si style d'enseignement renseigné
- +15 si province renseignée
- +10 si préférences de différenciation

## Sources obsolètes (stale)

Une source est **stale** si sa date de chargement dépasse le seuil :

| Source | Seuil |
|--------|-------|
| `curriculum` | 7 jours |
| `calendar` | 1 jour |
| `progression` | 4 heures |
| `historique` | 4 heures |
| `teacher_profile` | 30 jours |
| `class_profile` | 7 jours |
| `resources` | 1 jour |
| `standards` | 30 jours |

Source stale → niveau `stale` → le ContextScore le signale mais ne bloque pas.

## readyForGeneration

```
readyForGeneration = true si :
  score.global ≥ 30
  ET aucune source obligatoire absente (curriculum)
```

Seuil volontairement bas (30) : un curriculum seul suffit pour générer. Les autres sources améliorent la qualité mais ne bloquent pas.
