# SPIE Extraction Model

**SPIE-02 | Version 1.0 | 2026-08-04**

## Rôle

La couche d'extraction IA transforme le texte brut d'un curriculum en un objet structuré `CurriculumExtractionRaw`, qui est ensuite normalisé en `NormalizedOutcome[]`, `NormalizedConcept[]`, `NormalizedVocabularyItem[]`.

L'extraction est **province-aware** (adapte le vocabulaire de l'invite selon la province) mais **province-agnostique** dans sa sortie (tous les outcomes sont normalisés vers le vocabulaire SPIE).

## Flow

```
ParsedCurriculumDocument
        ↓
buildExtractionUserPrompt(texte, config)    ← province hints
        ↓
Claude claude-opus-4-5 (API Anthropic)
        ↓
JSON string (réponse IA)
        ↓
parseExtractionJson()                       ← strip markdown fences
        ↓
CurriculumExtractionRaw
        ↓
normalizeExtraction()
        ↓
{ outcomes, concepts, vocabulaire, warnings }
```

## CurriculumExtractionRaw

```typescript
interface CurriculumExtractionRaw {
  province?: string
  matiere?: string
  niveaux?: string[]
  langue?: 'fr' | 'en'
  titre?: string
  outcomesGeneraux: RawOutcome[]        // RAG / Overall Expectation / Compétence
  outcomesSpecifiques: RawOutcome[]     // RAS / Specific Expectation / Indicateur
  competences: RawOutcome[]
  bigIdeas: RawOutcome[]
  concepts: RawConcept[]
  vocabulaire: RawVocabularyItem[]
  contraintes: RawConstraint[]
  confidenceScore: number               // 0–100 (auto-évaluation IA)
  completenessScore: number             // 0–100 (auto-évaluation IA)
  warnings: string[]
}
```

## NormalizedOutcome

Après normalisation, chaque outcome a :
- `id` — identifiant stable (`outcome_A1`)
- `vocabulaireSpie` — l'une de : `rag_ras | expectations | competences | big_ideas | standards | objectives`
- `vocabulaireOriginal` — label exact du document source (`"RAG"`, `"Overall Expectation"`)
- `niveauBloom` — `memoriser | comprendre | appliquer | analyser | evaluer | creer`
- `parentId` — lie les spécifiques aux généraux

## Mapping vocabulaire

| Province | Général | Spécifique | SPIE |
|----------|---------|------------|------|
| Alberta | RAG | RAS | `rag_ras` |
| Ontario | Overall Expectation | Specific Expectation | `expectations` |
| Québec | Compétence disciplinaire | Indicateur | `competences` |
| BC | Big Idea | Curricular Competency | `big_ideas` |
| Saskatchewan | Outcome | Indicator | `standards` |
| Manitoba | Learning Outcome | Achievement Indicator | `standards` |
| Common Core | Standard | Sub-standard | `standards` |
| IB | Aim / Objective | Learning Outcome | `objectives` |
| France | Compétence du socle | Objectif de connaissance | `objectives` |

## Limites de l'extraction IA

| Limite | Mitigation |
|--------|------------|
| 12 000 caractères max de texte analysé | Documents longs : chunking (SPIE-02+) |
| Confiance variable selon la qualité du document | `confidenceScore` + QualityReport |
| Codes d'outcomes parfois manqués | Parser heuristique pré-détecte les codes |
| Bloom non détectable pour certains libellés | `niveauBloom` optionnel |

## Modèle IA utilisé

`claude-opus-4-5` — choix justifié par la nécessité d'une extraction structurée précise depuis des documents pédagogiques complexes. Max tokens : 4096 (suffisant pour la plupart des curricula de grade).
