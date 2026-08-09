# Curriculum Intelligence Engine (CKG)

**SPIE-02 | Version 1.0 | 2026-08-04**

## Vision

Le CKG (Curriculum Knowledge Graph Engine) est le moteur qui transforme un document curriculaire brut (PDF, DOCX, Markdown, texte) en une représentation sémantique structurée — le Curriculum Knowledge Graph — utilisable par tous les autres moteurs SPIE.

```
Document PDF/DOCX/MD
        ↓
   Parser Layer          ← parsers/
        ↓
ParsedCurriculumDocument
        ↓
   AI Extraction Layer   ← extraction/
        ↓
CurriculumExtractionRaw
        ↓
   Normalizer           ← extraction-normalizer.ts
        ↓
   Normalized Outcomes
   Normalized Concepts
   Vocabulary Items
        ↓
   Graph Builder        ← graph/
        ↓
CurriculumKnowledgeGraph ← Utilisé par PPE, PGE, PCE, AYDTE
        +
   Constraint Engine    ← constraints/
        +
   Quality Validator    ← validation/
```

## Architecture

### Couche 1 — Parser Layer
`src/lib/spie/curriculum/parsers/`

Province-agnostique. Tous les parseurs produisent le même `ParsedCurriculumDocument`.

| Parseur | Mime Type | Extension | Notes |
|---------|-----------|-----------|-------|
| `PDFCurriculumParser` | `application/pdf` | `.pdf` | Délègue à `extraire-texte.ts` (pdf-parse) |
| `DOCXCurriculumParser` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` | Délègue à `extraire-texte.ts` (mammoth) |
| `MarkdownCurriculumParser` | `text/markdown` | `.md` | Parsing natif (headers `#`) |
| `TextCurriculumParser` | `text/plain` | `.txt` | UTF-8 decode + heuristiques |

Factory : `curriculumParserFactory.parse(buffer, filename, mimeType)`

### Couche 2 — Extraction Layer
`src/lib/spie/curriculum/extraction/`

Utilise l'API Anthropic (claude-opus-4-5) pour extraire les éléments pédagogiques structurés.

Éléments extraits :
- **Outcomes généraux** (RAG / Overall Expectations / Compétences disciplinaires / Big Ideas)
- **Outcomes spécifiques** (RAS / Specific Expectations / Indicateurs)
- **Compétences**
- **Concepts**
- **Vocabulaire** (avec définitions et niveau de difficulté)
- **Contraintes** (temporelles, prérequis, co-requis)

### Couche 3 — Normalization
`src/lib/spie/curriculum/extraction/extraction-normalizer.ts`

Mappe le vocabulaire provincial → vocabulaire SPIE universel :

| Province | Vocabulaire provincial | SPIE |
|----------|----------------------|------|
| Alberta | RAG, RAS | `rag_ras` |
| Ontario | Overall/Specific Expectations | `expectations` |
| Québec | Compétences disciplinaires | `competences` |
| BC | Big Ideas | `big_ideas` |
| SK/MB | Outcomes, Indicators | `standards` |
| IB/France | Aims, Objectives | `objectives` |

### Couche 4 — Graph Builder
`src/lib/spie/curriculum/graph/`

Construit un graphe orienté de type `CurriculumGraph` (Map de nodes + edges).

**Types de nodes** : province, programme, niveau, matière, outcome_general, outcome_specifique, competency, big_idea, concept, vocabulary

**Types d'edges** : CONTAINS, BELONGS_TO, REQUIRES, INVOLVES, USES, EXPRESSES, COVERS, PRECEDES, GROUPED_IN, TARGETS, ASSESSES, PREREQUISITE, ALIGNED_WITH

### Couche 5 — Constraint Engine
`src/lib/spie/curriculum/constraints/`

Extrait et valide les contraintes curriculaires :
- Temps minimum/maximum/recommandé par outcome
- Prérequis (A doit précéder B)
- Co-requis (A et B doivent être enseignés ensemble)
- Séquences obligatoires

Produit un `CurriculumPacingModel` (modèle de rythme) utilisé par l'AYDTE.

### Couche 6 — Quality Validator
`src/lib/spie/curriculum/validation/`

8 dimensions de qualité évaluées 0–100 :

| Dimension | Description |
|-----------|-------------|
| `completude` | Champs requis présents (province, matière, outcomes) |
| `coherence` | Parents/enfants cohérents, codes valides |
| `hierarchie` | Structure général→spécifique respectée |
| `vocabulaire` | Items de vocabulaire définis et liés |
| `bloom` | Niveaux Bloom taggés |
| `contraintes` | Contraintes temporelles présentes |
| `multilinguisme` | Langue cohérente dans le document |
| `couverture` | Outcomes liés à des concepts |

Score ≥ 40 + aucune erreur critique → `validPourGeneration = true`

## Services

| Service | Responsabilité |
|---------|----------------|
| `curriculumParserService` | Orchestrate le parsing d'un buffer |
| `curriculumExtractorService` | Extraction IA via API Anthropic |
| `curriculumGraphService` | Construction + sérialisation du graphe |
| `curriculumValidatorService` | Rapport de qualité + readiness check |
| `constraintEngineService` | Extraction + validation des contraintes |
| `curriculumCacheService` | Cache LRU des documents parsés et graphes |

## Règles de non-modification

- DEC-005 : Ne jamais modifier `build-system-prompt.ts` via ce moteur
- DEC-006 : `CurriculumId` de `src/lib/constants/curricula.ts` est réutilisé tel quel
- Le `CurriculumParser` existant (`src/lib/pedagogy/curriculum/curriculum-parser.ts`) est préservé intact — il est utilisé par les fonctionnalités pédagogiques existantes. Le SPIE CKG est une couche additionnelle, non un remplacement.

## Fichiers TypeScript

```
src/lib/spie/curriculum/
├── parsers/
│   ├── types.ts               — ParsedCurriculumDocument, ParsedSection, ICurriculumParser
│   ├── base-parser.ts         — Heuristiques partagées
│   ├── pdf-parser.ts
│   ├── docx-parser.ts
│   ├── markdown-parser.ts
│   ├── text-parser.ts
│   ├── parser-factory.ts      — CurriculumParserFactory
│   └── index.ts
├── extraction/
│   ├── types.ts               — CurriculumExtractionRaw, NormalizedOutcome, etc.
│   ├── extraction-prompt.ts   — Prompt AI (system + user)
│   ├── extraction-normalizer.ts — Normalisation + résolution vocabulaire
│   └── index.ts
├── graph/
│   ├── types.ts               — GraphNode, GraphEdge, CurriculumGraph
│   ├── graph-builder.ts       — CurriculumGraphBuilder
│   ├── graph-queries.ts       — Fonctions de traversal
│   └── index.ts
├── constraints/
│   ├── types.ts               — Constraint, ConstraintSet, OutcomePacing
│   ├── constraint-engine.ts   — ConstraintEngine
│   └── index.ts
├── validation/
│   ├── types.ts               — DataQualityReport, DataQualityIssue
│   ├── curriculum-quality.ts  — CurriculumQualityValidator
│   └── index.ts
├── services/
│   ├── curriculum-parser.service.ts
│   ├── curriculum-extractor.service.ts
│   ├── curriculum-graph.service.ts
│   ├── curriculum-validator.service.ts
│   ├── constraint-engine.service.ts
│   ├── curriculum-cache.service.ts
│   └── index.ts
└── index.ts                   — Barrel export
```

## Voir aussi

- [Parser.md](Parser.md) — Détails du format ParsedCurriculumDocument
- [Extraction_Model.md](Extraction_Model.md) — Modèle d'extraction IA
- [Constraint_Engine.md](Constraint_Engine.md) — Contraintes et rythme
- [Validation.md](Validation.md) — Dimensions de qualité
- [SPIE_Blueprint.md](SPIE_Blueprint.md) — Architecture globale SPIE
