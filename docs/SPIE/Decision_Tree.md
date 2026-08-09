# SPIE-07 — PedagogicalDecisionTree

## Rôle

Rendre traçables **toutes les décisions** prises par le `StrategyBuilder`. Chaque décision pédagogique doit pouvoir être expliquée, auditée, et questionnée par l'enseignant.

---

## Structure

```typescript
interface PedagogicalDecisionTree {
  id: string
  strategyId: string
  classeId: string
  enseignantId: string
  trace: StrategyDecisionTrace
  resumeDecisions: string[]      // Une ligne par décision
  createdAt: string
}

interface StrategyDecisionTrace {
  strategyId: string
  decisions: StrategyDecisionNode[]
  conclusion: string             // Synthèse lisible
  factorsGlobaux: string[]       // Top 5 facteurs globaux
}

interface StrategyDecisionNode {
  id: string
  type: StrategyDecisionType
  question: string               // La question posée
  facteursConsideres: string[]   // Inputs qui ont influencé
  reponse: string                // La décision prise
  rationale: string              // Pourquoi
  score: number                  // Confiance 0–100
  timestamp: string
}
```

---

## 7 types de décision

| Type | Question |
|------|----------|
| `choix_approche` | Quelle approche pédagogique adopter? |
| `niveau_difficulte` | Quel niveau de difficulté viser? |
| `ordre_sequences` | Dans quel ordre planifier les séquences? |
| `planification_evals` | Comment répartir les évaluations? |
| `differentiation` | Doit-on prévoir de la différenciation? |
| `gestion_temps` | Comment gérer le temps disponible? |
| `gestion_risques` | Quels risques anticiper? |

---

## Principe de traçabilité

Toute décision doit avoir :
- Un **score de confiance** (0–100)
- Les **facteurs considérés** (inputs SPIE utilisés)
- La **justification** (`rationale`)

Un arbre sans traçabilité complète est un arbre incomplet.

---

## Fichier source

`src/lib/spie/pse/decision-tree/pedagogical-decision-tree.ts`
