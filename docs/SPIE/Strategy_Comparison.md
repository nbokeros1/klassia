# SPIE-07 — StrategyComparisonEngine

## Rôle

Construire et comparer trois variantes de stratégie (A/B/C) pour aider l'enseignant à choisir la meilleure option.

---

## Les trois stratégies

| Label | Description | Caractéristique |
|-------|-------------|-----------------|
| **A** | Stratégie principale | Telle que construite par le StrategyBuilder |
| **B** | Alternative | Approche différente (plus engageante), légèrement plus de temps |
| **C** | Conservatrice | Enseignement direct, niveau moyen, tampon 15% |

---

## Construction de B

L'approche alternative suit ces mappings :

| Approche A | Approche B |
|------------|------------|
| `enseignement_direct` | `apprentissage_actif` |
| `apprentissage_actif` | `collaboration` |
| `collaboration` | `apprentissage_actif` |
| `differentie` | `mixte` |
| `spirale` | `apprentissage_actif` |
| `par_projet` | `collaboration` |
| `mixte` | `apprentissage_actif` |

---

## Construction de C

Toujours : `enseignement_direct`, `moyen`, heures × 0.90, couverture − 10%.

---

## Table de comparaison (7 lignes)

| Dimension | A | B | C | Meilleur |
|-----------|---|---|---|---------- |
| Approche | ... | ... | ... | — |
| Niveau | ... | ... | ... | — |
| Heures planifiées | ... | ... | ... | ↓ |
| Couverture (%) | ... | ... | ... | ↑ |
| Nb risques | ... | ... | ... | ↓ |
| Charge hebdo (h/sem) | ... | ... | ... | ↓ |
| Score qualité | ... | ... | ... | ↑ |

---

## Recommandation

```
Exclure les stratégies avec nbRisques ≥ 5
→ Maximiser scoreQualite, puis coveragePercent
```

---

## Fichier source

`src/lib/spie/pse/comparison/strategy-comparison-engine.ts`
