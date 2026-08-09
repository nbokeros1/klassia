# SPIE Parser Layer

**SPIE-02 | Version 1.0 | 2026-08-04**

## Principe

Le Parser Layer est **province-agnostique** et **déterministe** (sans IA). Son rôle est uniquement d'extraire le texte brut et d'identifier la structure de surface d'un document curriculaire.

## ParsedCurriculumDocument

Type de sortie commun à tous les parseurs.

```typescript
interface ParsedCurriculumDocument {
  id: string
  sourceName: string
  sourceType: 'pdf' | 'docx' | 'markdown' | 'text'
  texteExtrait: string          // Texte complet nettoyé
  nbPages?: number              // PDF seulement
  metadata: CurriculumDocumentMetadata
  sections: ParsedSection[]     // Sections détectées heuristiquement
  rawLines: string[]
  parserVersion: string
  parseResult: ParseResult      // success, error, durationMs
  parsedAt: string
}
```

## Métadonnées extraites

```typescript
interface CurriculumDocumentMetadata {
  province?: string             // 'alberta', 'ontario', etc. (détection par marqueurs)
  matiere?: string
  niveaux?: string[]
  anneePublication?: number
  langue?: 'fr' | 'en' | 'bilingual'
  autoriteEmettrice?: string
  nbMots: number
  nbLignes: number
  nbCaracteres: number
}
```

**Détection de province** : par présence de marqueurs textuels (`"alberta education"`, `"ministère de l'éducation"`, etc.). Non fiable à 100% — l'extraction IA confirme.

**Détection de langue** : heuristique par comptage de mots fonctionnels (le/la/les vs the/and/of). Bilingual si ratio < 2:1.

## Sections (ParsedSection)

```typescript
interface ParsedSection {
  id: string
  titre: string
  contenu: string
  type: SectionType        // outcome_general, outcome_specifique, competence, big_idea, vocabulaire, etc.
  code?: string            // 'A1', 'B2.1', 'MA-20-1'
  ordre: number
  profondeur: number       // 0 = top-level
  ligneDebut?: number
  ligneFin?: number
  subsections?: ParsedSection[]
}
```

**Types de sections détectés** :
- `outcome_general` — par présence de marqueurs RAG, Overall Expectation, etc.
- `outcome_specifique` — marqueurs RAS, Specific Expectation, Indicator
- `competence` — marqueurs transversale, cross-curricular
- `big_idea` — "big ideas?" (regex)
- `vocabulaire`, `glossaire`
- `evaluation`, `activite`, `ressource`
- `introduction`, `entete`
- `autre` (fallback)

## Codes d'outcomes détectés

| Pattern | Exemple | Province |
|---------|---------|---------|
| `[A-Z]\d+(\.\d+)?` | `A1`, `B2.1` | Alberta |
| `[A-Z]\d+\.\d+` | `B1.1`, `C2.3` | Ontario |
| `[A-Z]{2,4}\d+(\.\d+)?` | `SS7`, `MA10`, `ELA20` | Saskatchewan |

## Infrastructure réutilisée

Les parseurs PDF et DOCX délèguent entièrement l'extraction de texte à :
- `src/lib/documents/extraire-texte.ts` → `extraireTexte(buffer, mimeType, nom)`
- **Aucune duplication** de code d'extraction

Le Parser Layer ajoute uniquement : section detection, metadata extraction, outcome code detection.

## Limites

| Limite | Impact |
|--------|--------|
| Détection de sections par heuristiques | Peut rater des sections sans headers clairs |
| Province détectée par marqueurs textuels | Pas fiable pour documents non titrés |
| Codes d'outcomes : 3 patterns supportés | Codes exotiques non reconnus |
| Markdown uniquement via headers `#` | Documents MD sans headers = une seule section |

Toutes ces limites sont compensées par la couche d'extraction IA (SPIE-02 Extraction Layer) qui opère sur le `texteExtrait` complet.
