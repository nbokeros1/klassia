# SPIE-07 — StrategyBuilder

## Rôle

Synthétiser les sorties de SPIE-02 à SPIE-06 pour produire une `PedagogicalStrategy` cohérente. Déterministe, sans appels IA.

---

## Entrées : `StrategyBuilderInput`

| Champ | Source SPIE | Optionnel |
|-------|-------------|-----------|
| `outcomes` | SPIE-02 `NormalizedOutcome[]` | Non |
| `context` | SPIE-03 `PedagogicalContext` | Oui |
| `twin` | SPIE-04 `AcademicYearTwin` | Oui |
| `simulation` | SPIE-05 `PedagogicalSimulation` | Oui |
| `academicTime` | SPIE-06 `AcademicTime` | Oui |
| `approchePreferee` | Préférence enseignant | Oui |
| `niveauDifficulteVise` | Préférence enseignant | Oui |
| `differenciationPrioritaire` | Préférence enseignant | Oui |

Plus les entrées sont riches, plus la stratégie est précise.

---

## Algorithme : 7 décisions

### 1. Choix de l'approche

```
si approchePreferee → utiliser
sinon si differenciationPrioritaire → 'differentie'
sinon si simulation.statut = 'irrealisable' → 'enseignement_direct'
sinon si simulation.scoreViabilite ≥ 80 → 'apprentissage_actif'
sinon si outcomes.length > 50 → 'enseignement_direct'
sinon → 'mixte'
```

### 2. Niveau de difficulté

Dérivé de la distribution de la taxonomie de Bloom :
- >40% `evaluation/creation` → `exigeant`
- >60% `connaissance/comprehension` → `accessible`
- Sinon → `moyen`

### 3. Ordre des séquences

- Si twin disponible → ordonnées par `semaineDébut`
- Sinon → groupées par `parentId`, ordonnées par profondeur

### 4. Évaluations

- Formatives = `ceil(nbSequences × 0.7)`
- Sommatives = `ceil(nbSequences / 3)`

### 5. Différenciation

Activée si `differenciationPrioritaire = true` ou `approche = 'differentie'`.

### 6. Temps

```
minutesParSemaine × totalSemaines × (1 - tamponPercent) / 60
```

Tampon réduit à 5% si simulation irréalisable.

### 7. Risques

Extraits de `simulation.risques` + `academicTime.avanceRetardMinutes`.

---

## Sorties : `StrategyBuilderOutput`

```typescript
{
  strategy: PedagogicalStrategy   // La stratégie
  decisions: StrategyDecisionNode[] // Le log de décision (→ arbre)
}
```

---

## Règle

Chaque décision doit être enregistrée avec `facteursConsideres`, `reponse`, `rationale`, et `score` de confiance.
