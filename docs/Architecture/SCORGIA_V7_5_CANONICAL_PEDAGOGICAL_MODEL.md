# SCORGIA V7.5 — Canonical Pedagogical Model
**Date :** 2026-08-18  
**Version :** V7.5 — Canonical Unit/Sequence/Lesson Hierarchy  
**Statut :** Architecture de référence

---

## 1. Hiérarchie canonique V3

```
CURRICULUM
  └── UNITÉ (macro-groupement, ex. "Bloc A : Communication orale")
        └── SÉQUENCE (= actuelle "unité" JSON, avec stable UUID)
              └── LEÇON (= actuel "leçon programme", avec stable UUID)
```

### Mapping générationnel

| V1 (legacy) | V2 (pre-V7.5) | V3 (SCORGIA V7.5+) |
|-------------|---------------|---------------------|
| `unites[]` (JSON blob) | `unites[]` + `curriculum_outcomes[]` | `unites[]` + `sequence_id` + `units[]` |
| No UUID on sequences | No UUID on sequences | `sequence_id` AYDTE stable UUID |
| `schema_version` absent | `schema_version: 'v2'` | `schema_version: 'v3'` |
| SPIE-02 not used | SPIE-02 active | SPIE-02 → AYDTE → SequenceBlock |

---

## 2. Flux de génération V3

```
Teacher uploads curriculum PDF/DOCX
    ↓
POST /api/import/docx
    → extraireTexte() (DCE-02)
    → returns { texte: "..." }
    ↓
POST /api/spie/build-year
    ↓
SPIE-02 (CurriculumExtractorService)
    → AI extracts NormalizedOutcome[] from text
    → RAG/RAS → NormalizedOutcome { id, code, texte, parentId, niveauBloom }
    ↓
AYDTE Bridge (AydtePlanningBridge)
    → synthesizePacingModel(outcomes, totalSemaines, minutesParSemaine)
    → AnnualPlanningEngine.plan(input)
    → groupByPrerequisFirst() → groups by parentId
    → buildSequence() × N → SequenceBlock[] { id (stable), outcomeIds[], semaineDébut, semainesFin }
    → returns scaffoldPrompt (for Claude)
    ↓
Claude claude-sonnet-4-6 (programme generation)
    → Receives SPIE-02 outcomes + AYDTE scaffold
    → Generates thematic titles, lessons, justifications
    → Returns ContenuProgramme JSON
    ↓
Validator (validatePedagogicalProgramme)
    → Blocks placeholder data
    ↓
Stamping (positional match)
    → unite[i].sequence_id = sequences[i].id
    ↓
programme_annuel.contenu_json.schema_version = 'v3'
    ↓
INSERT programme_annuel
```

---

## 3. Types V3 clés

### `Unite` (étendu)
```typescript
type Unite = {
  // ... champs V1/V2 inchangés ...
  sequence_id?: string  // stable AYDTE SequenceBlock.id
  unit_id?: string      // macro-unit ID (V7.5+)
}
```

### `UnitV3` (nouveau)
```typescript
type UnitV3 = {
  id: string              // stable UUID
  numero: number
  titre: string
  sequence_ids: string[]  // SequenceBlock.id references
  outcome_ids: string[]   // NormalizedOutcome IDs
}
```

### `ContenuProgramme` (étendu)
```typescript
type ContenuProgramme = {
  // ... champs V1/V2 inchangés ...
  schema_version?: 'v1' | 'v2' | 'v3'
  units?: UnitV3[]         // absent on V1/V2
}
```

---

## 4. Modèle de données DB proposé (migration 044)

### Tables canoniques (PROPOSED — non appliquées)

```
pedagogical_sequences
  id UUID PK
  teaching_pack_id FK → teaching_packs
  programme_annuel_id FK → programme_annuel
  enseignant_id FK → utilisateurs
  classe_id FK → classes
  numero INTEGER (1-based)
  titre TEXT
  semaine_debut INTEGER
  semaine_fin INTEGER
  curriculum_outcome_ids TEXT[]
  aydte_sequence_id TEXT   ← SequenceBlock.id
  statut TEXT
  ...

pedagogical_lessons
  id UUID PK
  sequence_id FK → pedagogical_sequences
  teaching_pack_id FK → teaching_packs
  lecon_id FK → lecons (nullable)
  numero INTEGER
  titre TEXT
  statut TEXT
  date_enseignee DATE
  ...
```

### FK optionnelles sur tables existantes

```
teaching_events.pedagogical_lesson_id UUID → pedagogical_lessons(id) (nullable)
fichiers_dossier.pedagogical_sequence_id UUID → pedagogical_sequences(id) (nullable)
fichiers_dossier.pedagogical_lesson_id UUID → pedagogical_lessons(id) (nullable)
```

---

## 5. Adapter de compatibilité — `getCanonicalPedagogicalYear()`

`src/lib/spie/canonical-year-reader.ts`

```typescript
getCanonicalPedagogicalYear(contenu: ContenuProgramme | null) → CanonicalYear
```

### Priorité de lecture

```
1. canonical DB tables (pedagogical_sequences) — NOT YET POPULATED
   ↓ fallback
2. schema_version = 'v3' + units[] in contenu_json
   ↓ fallback  
3. schema_version = 'v2' — flat sequences, no unit level
   ↓ fallback
4. legacy/v1 — minimal structure
```

### Sortie normalisée

```typescript
type CanonicalYear = {
  schemaVersion: 'v1' | 'v2' | 'v3' | 'legacy'
  contenu: ContenuProgramme
  canonicalUnits: CanonicalUnit[]     // always non-empty
  sequences: CanonicalSequence[]      // always flat list
  hasCanonicalIds: boolean
  hasUnitLevel: boolean
}
```

Les composants UI consomment `CanonicalYear` et n'ont pas besoin de distinguer les générations de schéma.

---

## 6. Invariants de backward-compatibilité

1. `Unite.sequence_id` absent → ignoré dans tout le code existant
2. `ContenuProgramme.units` absent → `getCanonicalPedagogicalYear()` crée une unité virtuelle
3. `PedagogicalYearTree.hasV3Data = false` pour V1/V2 → composants Mon Année non affectés
4. `UnitNode.sequenceId = undefined` pour V1/V2 → aucune régression d'affichage
5. Indices positionnels (`sequence_index`, `lecon_index`) conservés → `teaching_events` non impactés

---

## 7. Dette technique documentée (DEC-V75)

| Code | Description | Priorité | Prérequis |
|------|-------------|----------|-----------|
| DEC-V75-01 | PGE stub — génération de leçons détaillées jamais implémentée | Haute | PO decision |
| DEC-V75-02 | Migration positionnels → UUIDs stables pour `teaching_events` | Haute | migration 044 GO |
| DEC-V75-03 | Table ghost `unites` — DROP ou réutiliser comme `pedagogical_sequences` | Moyenne | migration 044 |
| DEC-V75-04 | SPIE-05 non implémenté — contraintes curriculaires (ConstraintSet vide) | Moyenne | SPIE-05 spec |
| DEC-V75-05 | Adapter canonical reader vers DB tables (vs JSON blobs) | Basse | migration 044 GO |
| DEC-V75-06 | Banner "Régénérer" Mon Année pour programmes V1/V2 avec placeholders | Basse | V8 |
