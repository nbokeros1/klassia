# SCORGIA V7.3 — Content Chain Architecture

**Version :** V7.3  
**Date :** août 2026

---

## La chaîne de contenu pédagogique

```
CURRICULUM OUTCOME
       │ curriculum_outcomes[].id
       ▼
    UNITÉ (= séquence)
       │ lecons[].curriculum_outcome_ids[]
       ▼
 LEÇON PROGRAMME (LeconProgramme)
       │ lecon_id FK → lecons.id
       ▼
  CONTENU LEÇON (ContenuLecon / Lecon DB row)
       │ teaching_events (seqIdx, leconIdx, event_type)
       ▼
ÉVÉNEMENT D'ENSEIGNEMENT (TeachingEvent)
       │ → lessonStateMap[seqIdx:leconIdx].isTaught
       ▼
      COCKPIT (métriques, couverture, alertes)
```

---

## Entités et types

### CurriculumOutcome
- Table : encodé dans `programme_annuel.contenu_json.curriculum_outcomes[]`
- Champs clés : `id`, `code`, `titre`, `description`, `type`, `parentId?`
- Absent en V1 (aucun `curriculum_outcomes` dans contenu_json)

### Unite (= Séquence)
- Table : encodé dans `programme_annuel.contenu_json.unites[]`
- Champs clés : `numero`, `titre`, `semaine_debut`, `semaine_fin`, `lecons[]`
- V2 : `curriculum_outcome_ids[]`, `justification_pedagogique`, `activite_culminante`, `evaluation_prevue`

### LeconProgramme
- Type : `LeconProgramme` — encodé dans `Unite.lecons[]`
- Champs clés : `numero`, `titre`, `duree_minutes`, `lecon_id?`
- V2 : `progression_role`, `objectif_apprentissage`, `curriculum_outcome_ids[]`, `preuve_apprentissage`, `justification`
- `lecon_id` FK → `lecons.id` : présent = leçon préparée dans Préparer

### Lecon (DB row)
- Table : `lecons`
- Champs : `id`, `classe_id`, `titre`, `statut`, `contenu_json: ContenuLecon`
- `contenu_json` contient le plan complet (3 moments + objectifs + différenciation)

### ContenuLecon
- Encodé dans `lecons.contenu_json`
- Format legacy : `avant_amorce`, `pendant_modelisation`, `pendant_pratique_guidee`, etc.
- Format structuré : `avant.amorce`, `pendant.modelisation`, `pendant.pratique_guidee`, etc.
- Tous les composants lisent les deux formats (legacy en fallback)

### TeachingEvent
- Table : `teaching_events`
- Clés : `teaching_pack_id`, `sequence_index`, `lecon_index`, `event_type`
- Agrégé par `buildLessonStateMap()` → `LessonTeachingState` keyed `"seqIdx:leconIdx"`

---

## Clé de liaison lessonStateMap

```typescript
// Clé : "${seqIdx}:${leconIdx}" — index 0-based dans unites[] / lecons[]
const key = `${seqIdx}:${leconIdx}`
const state: LessonTeachingState = lessonStateMap[key]
// state.isTaught, state.taughtAt
```

---

## Statut de leçon — règle de résolution

```typescript
function resolveStatus(lecon: LeconProgramme, si: number, li: number, map?): LeconStatus {
  if (map?.[`${si}:${li}`]?.isTaught ?? lecon.statut === 'enseignee') return 'enseignee'
  if (lecon.lecon_id) return 'preparee'
  return 'planifiee'
}
```

Priorité : événement d'enseignement > lecon_id présent > état par défaut planifié.

---

## CurriculumCoverageData

Calculé par `getCurriculumCoverage(contenu, lessonStateMap)`.

```typescript
type CurriculumCoverageData = {
  totalOutcomes:   number
  coveredOutcomes: number
  coveragePct:     number
  byOutcome: Record<string, {
    outcomeId:  string
    isCovered:  boolean
    confidence: 'high' | 'medium' | 'low'
    seqIndices: number[]
    leconKeys:  string[]
  }>
}
```

Disponible dans `SchoolYearDashboardData.curriculumCoverage` (V2 uniquement).

---

## Composants V7.3 et leurs sources

| Composant | Sources principales | Onglet |
|-----------|--------------------|----|
| `CurriculumView` | `curriculum_outcomes[]`, `curriculumCoverage`, `lessonStateMap` | Curriculum |
| `SyllabusTab` | `pack.contenu_json.syllabus`, `programme.syllabus_json` | Syllabus |
| `PlanAnnuelView` | `programme.contenu_json.unites[]`, `lessonStateMap` | Plan Annuel |
| `SequencesView` | `programme.contenu_json.unites[]`, `lessonStateMap` | Séquences |
| `PlansLeconView` | `unites[]`, `lecons[]` (DB), `lessonStateMap` | Plans de Leçon |
| `LeconsWorkspace` | `unites[]`, `lecons[]` (DB), `lessonStateMap` | Leçons |

---

## V1 vs V2 — backward compatibility

| Champ | V1 | V2 |
|-------|----|----|
| `curriculum_outcomes` | absent | présent |
| `Unite.curriculum_outcome_ids` | absent | présent |
| `LeconProgramme.objectif_apprentissage` | absent | présent |
| `LeconProgramme.curriculum_outcome_ids` | absent | présent |
| `Unite.justification_pedagogique` | absent | présent |

Tous les composants vérifient la présence avant rendu. Aucun n'invente de données.
