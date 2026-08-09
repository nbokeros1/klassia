# SPIE Decision Engine

**SPIE-03 | Version 1.0 | 2026-08-04**

## Rôle

Le Decision Engine répond à des questions pédagogiques basées sur le `PedagogicalContext`. Il est **purement déterministe** — aucun appel IA, aucune asynchronicité.

**Il ne génère pas de contenu.** Il conseille et alerte.

## Décisions supportées

| Type | Question posée | Sortie |
|------|---------------|--------|
| `prochaine_lecon` | Sur quoi devrait porter la prochaine leçon ? | outcomeId |
| `peut_progresser` | La classe peut-elle avancer vers les prochains outcomes ? | boolean |
| `besoin_revision` | Y a-t-il des outcomes à réviser ? | boolean |
| `ralentir` | Devrait-on ralentir le rythme ? | boolean |
| `accelerer` | Peut-on accélérer le rythme ? | boolean (SPIE-04) |
| `proposer_activite` | Quel type d'activité recommander ? | string (SPIE-04) |
| `differencier` | Stratégies de différenciation recommandées ? | string[] (SPIE-04) |
| `alerter_retard` | Sommes-nous en retard critique ? | boolean |
| `curriculum_coverage` | Quel est notre taux de couverture ? | "xx%" |
| `prochaine_evaluation` | Est-il temps d'évaluer ? | boolean (SPIE-05) |

## Algorithme `prochaine_lecon`

```
1. Si memory.aRenforcer.length > 0
   → Recommander le premier outcome à renforcer (révision prioritaire)

2. Sinon si memory.restants.length > 0
   → Recommander le premier outcome non enseigné

3. Sinon
   → "curriculum_complet" — proposer enrichissement
```

## Algorithme `peut_progresser`

```
Blocage si :
  - aRenforcer > 2 outcomes  (trop de révisions en souffrance)
  - avanceRetardSemaines < -3  (plus de 3 semaines de retard)

Confidence : haute si memory présente, faible sinon
```

## Algorithme `alerter_retard`

```
Critique si :
  - avanceRetardSemaines < -4  (4+ semaines de retard)
  OU
  - sessionsRestantes < 10 ET progressPercent < 50%
```

## DecisionResult

```typescript
interface DecisionResult {
  type: DecisionType
  decision: boolean | string | null
  justification: string
  recommandations: string[]
  confidence: 'haute' | 'moyenne' | 'faible'
  donneesAppui: Record<string, unknown>
}
```

## DecisionReport

`generateReport()` calcule toutes les décisions en une passe et produit :
- `decisions[]` — tous les résultats
- `santePedagogique` (0–100) — santé globale de la progression
- `alertes[]` — alertes critiques et majeures

`santePedagogique = score_contexte_global - penalite_retard`

## Intégration

Le Decision Engine est appelé :
1. Par le **PCE** lors de la construction du contexte (rapport optionnel)
2. Par **PGE/AYDTE** pour valider les conditions de génération
3. Par l'**UI** pour afficher des recommandations à l'enseignant (SPIE-04+)

## Extension future

SPIE-04+ ajoutera : `proposer_activite`, `differencier`, `accelerer`, `prochaine_evaluation`.

Ces décisions nécessitent des données supplémentaires (style d'enseignant, ressources disponibles, profil d'élèves) qui seront intégrées dans AYDTE.
