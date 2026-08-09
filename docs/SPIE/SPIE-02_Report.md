# SPIE-02 Report — Curriculum Intelligence Engine

**Date** : 2026-08-04
**Statut** : ✅ Complété

## Résumé exécutif

SPIE-02 implémente le Curriculum Intelligence Engine (CIE / CKG). Ce moteur permet à ScorgIA d'ingérer n'importe quel curriculum provincial canadien (et international), de l'extraire sémantiquement, et de construire un graphe de connaissances structuré réutilisable par tous les moteurs SPIE.

**Architecture province-agnostique** : le même pipeline fonctionne pour Alberta (RAG/RAS), Ontario (Expectations), Québec (Compétences), BC (Big Ideas), Saskatchewan, Manitoba, France, IB, Common Core.

## Fichiers créés

### TypeScript — Parser Layer
| Fichier | Rôle |
|---------|------|
| `src/lib/spie/curriculum/parsers/types.ts` | ParsedCurriculumDocument, ParsedSection, ICurriculumParser |
| `src/lib/spie/curriculum/parsers/base-parser.ts` | Heuristiques partagées (section detection, metadata) |
| `src/lib/spie/curriculum/parsers/pdf-parser.ts` | PDFCurriculumParser |
| `src/lib/spie/curriculum/parsers/docx-parser.ts` | DOCXCurriculumParser |
| `src/lib/spie/curriculum/parsers/markdown-parser.ts` | MarkdownCurriculumParser |
| `src/lib/spie/curriculum/parsers/text-parser.ts` | TextCurriculumParser |
| `src/lib/spie/curriculum/parsers/parser-factory.ts` | CurriculumParserFactory + singleton |

### TypeScript — Extraction Layer
| Fichier | Rôle |
|---------|------|
| `src/lib/spie/curriculum/extraction/types.ts` | CurriculumExtractionRaw, NormalizedOutcome, NormalizedConcept |
| `src/lib/spie/curriculum/extraction/extraction-prompt.ts` | Prompts AI (system + user, province-aware) |
| `src/lib/spie/curriculum/extraction/extraction-normalizer.ts` | Normalisation + résolution vocabulaire provincial |

### TypeScript — Graph Layer
| Fichier | Rôle |
|---------|------|
| `src/lib/spie/curriculum/graph/types.ts` | CurriculumGraph, GraphNode, GraphEdge (14 types + 13 types d'edges) |
| `src/lib/spie/curriculum/graph/graph-builder.ts` | CurriculumGraphBuilder + sérialisation |
| `src/lib/spie/curriculum/graph/graph-queries.ts` | Traversal, queries, summary |

### TypeScript — Constraint Engine
| Fichier | Rôle |
|---------|------|
| `src/lib/spie/curriculum/constraints/types.ts` | Constraint, ConstraintSet, CurriculumPacingModel |
| `src/lib/spie/curriculum/constraints/constraint-engine.ts` | ConstraintEngine + singleton |

### TypeScript — Validation
| Fichier | Rôle |
|---------|------|
| `src/lib/spie/curriculum/validation/types.ts` | DataQualityReport, DataQualityIssue (8 dimensions) |
| `src/lib/spie/curriculum/validation/curriculum-quality.ts` | CurriculumQualityValidator + singleton |

### TypeScript — Services
| Service | Responsabilité |
|---------|----------------|
| `curriculum-parser.service.ts` | Orchestration du parsing (API-safe) |
| `curriculum-extractor.service.ts` | Extraction IA via Anthropic API |
| `curriculum-graph.service.ts` | Construction + merge + sérialisation du graphe |
| `curriculum-validator.service.ts` | Rapport qualité + readiness check |
| `constraint-engine.service.ts` | Extraction + validation + pacing |
| `curriculum-cache.service.ts` | LRU cache (documents + graphes) |

### Tests unitaires
| Test | Couverture |
|------|-----------|
| `pdf-parser.test.ts` | canParse, parse success, province detection, failure handling |
| `extraction-normalizer.test.ts` | vocabulaire Alberta, parentId, concepts, cross-refs |
| `graph-builder.test.ts` | node count, BELONGS_TO, REQUIRES, queries, serialization |
| `constraint-engine.test.ts` | extraction, inférence, validation ordre, pacing model |
| `curriculum-quality.test.ts` | score, erreurs, orphelins, stats |

### Documentation
| Document | Description |
|----------|-------------|
| `docs/SPIE/Curriculum_Engine.md` | Architecture complète du CKG |
| `docs/SPIE/Parser.md` | Format ParsedCurriculumDocument + heuristiques |
| `docs/SPIE/Extraction_Model.md` | Modèle d'extraction IA + mapping vocabulaire |
| `docs/SPIE/Constraint_Engine.md` | Types de contraintes + pacing model |
| `docs/SPIE/Validation.md` | 8 dimensions qualité + seuils |

## Algorithmes clés

### Détection de province (heuristique)
Marqueurs textuels dans le document → code province. Pas fiable à 100% → confirmé par extraction IA.

### Normalisation vocabulaire
Résolution en 2 étapes : (1) label exact dans un dictionnaire, (2) fallback province-based. Si aucun des deux → `standards` (plus neutre).

### Inférence de durée (Bloom → minutes)
`memoriser:45 | comprendre:60 | appliquer:90 | analyser:90 | evaluer:120 | creer:150`

### Score qualité global
Moyenne des 8 scores de dimension. Penalités : erreur = -30pts, avertissement = -10pts.

## Décisions

| # | Décision | Motif |
|---|----------|-------|
| DEC-009 | `extraire-texte.ts` réutilisé sans modification | Code production-ready, aucune duplication |
| DEC-010 | Extraction IA province-aware mais sortie agnostique | Permettre n'importe quel curriculum futur |
| DEC-011 | CurriculumGraph en Map (pas Record) en mémoire | Performance traversal (O(1) lookups) |
| DEC-012 | Seuil `validPourGeneration` à 40 (pas 60) | Curricula partiels doivent rester utilisables |

## Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Extraction IA rate des outcomes dans de longs curricula | Moyen | Chunking prévu dans SPIE-02+ |
| Conflits de codes entre provinces (A1 en Alberta ≠ A1 en Ontario) | Élevé | Scoped par province+matière dans le graphe |
| Cache LRU invalidation sur modification de curriculum | Faible | `invalidateDocument()` + `invalidateGraph()` |

## Prochaine étape

**SPIE-03** — Pedagogical Context Engine (PCE) : collecte de toutes les sources contextuelles (classe, élèves, curriculum, calendrier, progression, historique, profil, ressources) et construction du `PedagogicalContext` — entrée obligatoire de toute génération IA.
