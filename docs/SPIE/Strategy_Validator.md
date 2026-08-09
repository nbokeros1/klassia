# SPIE-07 — StrategyValidator

## Rôle

Évaluer la qualité d'une `PedagogicalStrategy` sur 7 dimensions. Produit un rapport avec un score global (0–100) et un signal `validePourGeneration`.

---

## 7 Dimensions de validation

| Dimension | Poids | Ce qui est vérifié |
|-----------|-------|--------------------|
| `coherence` | 15% | Cohérence approche ↔ difficulté |
| `couverture_curriculum` | 25% | % d'objectifs couverts |
| `equilibre` | 15% | Distribution T1/T2/T3 |
| `gestion_temps` | 20% | Heures prévues ≤ disponibles |
| `competences` | 10% | Cohérence progression Bloom |
| `evaluations` | 10% | Ratio formatives/sommatives |
| `contraintes` | 5% | Risques critiques de la simulation |

**Total : 100%**

---

## Seuils de couverture

| Couverture | Score | Statut |
|------------|-------|--------|
| ≥ 90% | 100 | ok |
| 80–90% | 75 | attention |
| 60–80% | 45 | attention → warning |
| < 60% | 20 | probleme → bloqueur |

---

## Seuils de temps

| Ratio heures prévues / disponibles | Score | Effet |
|--------------------------------------|-------|-------|
| ≤ 95% | 100 | ok |
| 96–100% | 80 | ok |
| 101–110% | 60 | warning |
| > 110% | 20 | **bloqueur** |

---

## Signal `validePourGeneration`

```
validePourGeneration = scoreGlobal >= 60 AND bloqueurs.length === 0
```

Si `validePourGeneration = false`, la génération de contenu ne doit pas démarrer.

---

## Statuts par dimension

| Score | Statut |
|-------|--------|
| ≥ 75 | `ok` |
| 50–74 | `attention` |
| < 50 | `probleme` |

---

## Fichier source

`src/lib/spie/pse/validation/strategy-validator.ts`
