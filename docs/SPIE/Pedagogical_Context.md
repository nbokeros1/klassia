# SPIE Pedagogical Context Engine (PCE)

**SPIE-03 | Version 1.0 | 2026-08-04**

## Règle absolue

> **Aucune génération IA dans ScorgIA ne peut s'exécuter sans un `PedagogicalContext`.**
>
> Pas de plan annuel, pas de séquence, pas de leçon, pas de quiz — sans contexte pédagogique.

Le PCE est le 7e moteur SPIE. Il est positionné entre CKG/PPE et PGE.

## Architecture

```
9 sources contextuelles (indépendantes, fusionnables)
       ↓
PedagogicalContextBuilder.build(input, sources)
       ↓
  ContextScore (per-source + global, 0–100)
  ContextMemory (état de l'année scolaire)
       ↓
PedagogicalContext  ← objet unique, fortement typé
       ↓
  PGE / AYDTE / TQE / LCE  ← tous reçoivent ce contexte
```

## Les 9 sources contextuelles

| Source | Type | Obligatoire | Poids |
|--------|------|-------------|-------|
| `curriculum` | Graphe de connaissances curriculaires | **Oui** | 30% |
| `calendar` | Calendrier scolaire (sessions, temps) | Non | 15% |
| `progression` | Ce qui a été enseigné/sauté/raté | Non | 20% |
| `historique` | Dernières leçons et quiz | Non | 15% |
| `teacher_profile` | Profil et préférences de l'enseignant | Non | 10% |
| `class_profile` | Profil de la classe (élèves, besoins) | Non | 5% |
| `resources` | Documents disponibles en bibliothèque | Non | 3% |
| `contraintes` | Contraintes environnementales | Non | 2% |
| `standards` | Standards professionnels provinciaux | Non | 0% |

## PedagogicalContext

```typescript
interface PedagogicalContext {
  id: string
  enseignantId?: string
  classeId?: string
  matiereId?: string
  province?: string
  niveaux?: string[]
  langue: 'fr' | 'en'
  academicYear: string
  sources: ContextSourcesMap     // All 9 sources
  score: ContextScore            // Quality of each source
  memory?: ContextMemory         // Pedagogical state this year
  promptSummary?: ContextPromptSummary  // Pre-computed text for AI prompts
  builtAt: string
  builderVersion: string
}
```

## ContextScore

Mesure la qualité et complétude de chaque source.

- **Score global** : moyenne pondérée (0–100)
- **readyForGeneration** : score ≥ 30 + aucune source obligatoire manquante
- **Niveaux** : `excellent` (≥85), `bon` (≥60), `incomplet` (>0), `absent`, `stale`
- **Stale** : source chargée il y a trop longtemps (ex: curriculum > 7 jours)

## ContextMemory

Représente l'état pédagogique de la classe pour l'année courante.

Pour chaque outcome du curriculum :
- `enseigne` — enseigné et validé
- `enseigne_partiel` — partiellement couvert
- `a_renforcer` — enseigné mais à réviser
- `saute` — intentionnellement ignoré
- `en_retard` — pas enseigné mais passé la date prévue
- `planifie` — prévu pour une session future
- `non_planifie` — dans le curriculum, non encore planifié

Statistiques : `progressPercent`, `avanceRetardSemaines`, `onTrack`.

## promptSummary

Bloc de texte pré-calculé pour l'injection dans les prompts IA.

```
CURRICULUM : Mathématiques — Province alberta — Niveaux grade 4
Outcomes : 48 au total
PROGRESSION : 42% du curriculum couvert (20 enseignés, 3 à renforcer)
CALENDRIER : 25 sessions restantes (31h disponibles)
CLASSE : 4A — 28 élèves — Niveau grade 4
```

Deux versions : `bloc` (complet) et `blocCourt` (compact, ~100 tokens).

## Fichiers TypeScript

```
src/lib/spie/pce/
├── types/
│   ├── sources.ts      — 9 types de sources (CurriculumContextSource, etc.)
│   ├── score.ts        — ContextScore, SourceScore, SOURCE_WEIGHTS
│   ├── memory.ts       — ContextMemory, MemoryEntry, MemoryEntryStatus
│   ├── decisions.ts    — DecisionQuery, DecisionResult, DecisionReport
│   ├── context.ts      — PedagogicalContext, PedagogicalContextInput
│   └── index.ts
├── score/
│   └── context-score.ts   — calculateContextScore()
├── memory/
│   └── context-memory.ts  — buildContextMemory(), getNextRecommendedOutcomes()
├── builder/
│   └── pedagogical-context-builder.ts  — PedagogicalContextBuilder
├── decisions/
│   └── decision-engine.ts   — DecisionEngine (deterministe, sans IA)
├── services/
│   ├── pedagogical-context-builder.service.ts
│   ├── context-score.service.ts
│   ├── context-memory.service.ts
│   ├── decision-engine.service.ts
│   ├── context-validator.service.ts
│   └── index.ts
└── index.ts
```
