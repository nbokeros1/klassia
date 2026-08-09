# Leçon Détaillée — Modèle de données

**SPIE-BETA-03 | Statut : ✅ Implémenté**

## Vue d'ensemble

La `DetailedLesson` est l'objet pédagogique central de SPIE-BETA-03. Elle représente la première leçon d'un Teaching Pack développée en profondeur, avec tout le matériel nécessaire pour enseigner sans préparation supplémentaire.

Une `DetailedLesson` est stockée dans `fichiers_dossier` avec `type_fichier = 'lecon_detaillee'`.

## Structure de l'objet

```typescript
type DetailedLesson = {
  id, titre, classe_id, teaching_pack_id
  niveau, matiere, langue, province?
  duree_minutes, position_sequence, position_annuel
  version, statut: DetailedLessonStatut, generated_at

  alignment: CurriculumAlignment   // RAG, RAS, compétences
  objectifs: LessonObjective[]     // 3 objectifs observables (taxonomie de Bloom)
  preparation: LessonPreparation   // matériel, prérequis, vocabulaire

  phases: TeachingPhase[]          // avant / pendant / après
  sections_contenu: LessonContentSection[]
  activites: DetailedActivity[]    // 3 activités prêtes à utiliser

  quiz: DetailedQuiz
  corrige: AnswerKeyItem[]         // ENSEIGNANT SEULEMENT
  evaluation_formative: FormativeEvaluation
  differentiation: DifferentiationLevel[]
  time_verification: TimeVerification

  reflexion?: LessonReflection     // Notes privées — jamais exportées
  qualite_json?: QualityGateResultat
}
```

## Règles de sécurit��

| Champ | Visible élèves | Projetable | Exportable |
|-------|----------------|------------|------------|
| `objectifs` | ✅ | ✅ | ✅ |
| `phases` | ✅ | ✅ | ✅ |
| `activites.consignes_eleves` | ✅ | ✅ | ✅ |
| `activites.consignes_enseignant` | ❌ | ❌ | ✅ (mode enseignant) |
| `corrige` | ❌ | ❌ | ✅ (section protégée) |
| `reflexion` | ❌ | ❌ | ❌ |
| `qualite_json` | ❌ | ❌ | ❌ |

## Statuts

| Statut | Signification |
|--------|--------------|
| `generation` | Pipeline SSE en cours |
| `brouillon` | Générée, non révisée |
| `revise` | Révisée par l'enseignant |
| `pret` | Validée par le Quality Gate |
| `enseigne` | Utilisée en classe |

## Stockage (migration 038)

- `fichiers_dossier.contenu_json` (JSONB) — objet `DetailedLesson` complet
- `fichiers_dossier.contenu_html` (TEXT) — `JSON.stringify(lecon)` (compatibilité)
- `fichiers_dossier.type_fichier = 'lecon_detaillee'`
- `teaching_packs.lecon_detaillee_id` — UUID FK vers `fichiers_dossier`
- `teaching_packs.lecon_detaillee_statut` — état de la génération

## Versionnement

Avant toute régénération ciblée (M16), la version précédente est archivée dans `pack_versions` avec `type_version = 'avant_regen_section'`. Le champ `version` est incrémenté à chaque modification.

---

*Voir aussi : [Lesson_Generation_Pipeline.md](Lesson_Generation_Pipeline.md) · [Lesson_Quality_Gate.md](Lesson_Quality_Gate.md)*
