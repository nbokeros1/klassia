# SPIE-03 Report — Pedagogical Context Engine (PCE)

**Date** : 2026-08-04
**Statut** : ✅ Complété

## Résumé exécutif

SPIE-03 implémente le Pedagogical Context Engine (PCE), le 7e moteur SPIE. Le PCE est le **point d'entrée obligatoire** de toute génération IA dans ScorgIA. Il agrège 9 sources contextuelles indépendantes en un seul objet `PedagogicalContext` fortement typé.

**Règle fondamentale** : Aucune génération (plan, séquence, leçon) ne peut se déclencher sans `PedagogicalContext`.

## Fichiers créés

### TypeScript — Types
| Fichier | Contenu |
|---------|---------|
| `src/lib/spie/pce/types/sources.ts` | 9 types de sources (CurriculumContextSource, CalendarContextSource, etc.) |
| `src/lib/spie/pce/types/score.ts` | ContextScore, SourceScore, SOURCE_WEIGHTS, MANDATORY_SOURCES |
| `src/lib/spie/pce/types/memory.ts` | ContextMemory, MemoryEntry, 7 statuts, ContextMemoryStats |
| `src/lib/spie/pce/types/decisions.ts` | DecisionQuery, DecisionResult, DecisionReport, 10 types de décision |
| `src/lib/spie/pce/types/context.ts` | PedagogicalContext (objet principal), ContextPromptSummary |

### TypeScript — Core
| Fichier | Rôle |
|---------|------|
| `src/lib/spie/pce/score/context-score.ts` | `calculateContextScore()` — 9 scoreurs par source + score pondéré |
| `src/lib/spie/pce/memory/context-memory.ts` | `buildContextMemory()` + `getNextRecommendedOutcomes()` |
| `src/lib/spie/pce/builder/pedagogical-context-builder.ts` | `PedagogicalContextBuilder` — orchestre la construction complète |
| `src/lib/spie/pce/decisions/decision-engine.ts` | `DecisionEngine` — 6 décisions déterministes + `generateReport()` |

### TypeScript — Services
| Service | Responsabilité |
|---------|----------------|
| `pedagogical-context-builder.service.ts` | Build + validation + extraction bloc prompt |
| `context-score.service.ts` | Calcul + résumé lisible |
| `context-memory.service.ts` | Build + mise à jour immutable |
| `decision-engine.service.ts` | Décisions + rapport + shortcuts |
| `context-validator.service.ts` | Validation avant génération |

### Tests unitaires
| Test | Couverture |
|------|-----------|
| `context-score.test.ts` | Sources vides, minimales, complètes, stale, avertissements |
| `context-memory.test.ts` | Statuts, progressPercent, historique, sans progression |
| `decision-engine.test.ts` | prochaine_lecon, peut_progresser, alerter_retard, generateReport |
| `context-builder.test.ts` | Build minimal, partiel, score, memory, promptSummary |

### Documentation
| Document | Description |
|----------|-------------|
| `docs/SPIE/Pedagogical_Context.md` | Architecture PCE, sources, PedagogicalContext |
| `docs/SPIE/Decision_Engine.md` | 10 types de décisions, algorithmes, intégration |
| `docs/SPIE/Context_Score.md` | Formule pondérée, seuils, sources stale |
| `docs/SPIE/Context_Memory.md` | 7 statuts, ContextMemoryStats, mise à jour |

## Décisions architecturales

| # | Décision | Motif |
|---|----------|-------|
| DEC-013 | PCE est le 7e moteur SPIE | Fondamentalement distinct des 6 moteurs originaux |
| DEC-015 | Decision Engine déterministe (sans IA) | Performance, testabilité, coût API |
| DEC-016 | readyForGeneration seuil à 30 (pas 60) | Curriculum seul = suffisant pour générer |
| DEC-017 | ContextMemory immuable (update retourne nouvelle instance) | Prévisibilité, debugging, audit |

## Intégration dans la pipeline SPIE

```
SPIE-02 CKG
    ↓ CurriculumGraph + PacingModel + Outcomes
SPIE-03 PCE
    ↓ PedagogicalContext (mandatory)
SPIE-04 AYDTE  ← Plan annuel vivant
SPIE-04 PGE    ← Génération séquences + leçons
SPIE-05 TQE    ← Validation qualité
```

Le `PedagogicalContext.promptSummary.bloc` est directement injecteable dans les prompts de génération IA pour contextualiser chaque génération sans surcharge de tokens.

## Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Sources non encore intégrées à Supabase | Élevé | Collecteurs par source à implémenter dans les routes API |
| Context Memory désynchronisée de la DB | Moyen | Invalider le cache après chaque fin de leçon |
| Décisions trop conservatrices (peut_progresser = false trop souvent) | Faible | Seuils ajustables, feedback utilisateur prévu |

## Prochaine étape

**SPIE-04** — Academic Year Digital Twin Engine (AYDTE) : l'année scolaire comme objet vivant avec versionnement, recalcul partiel des échéances, moteur de rythme (pacing), moteur d'impact des modifications, planification annuelle automatique.
