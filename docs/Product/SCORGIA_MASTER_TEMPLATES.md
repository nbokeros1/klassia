# ScorgIA — Master Templates V7.0

> **Statut :** Document produit — V7.0  
> **Date :** 2026-08-17  
> **Référence code :** `src/lib/pedagogy/templates/registry.ts`

---

## 1. Vue d'ensemble

ScorgIA dispose de 7 templates maîtres pour la juridiction Alberta (FR). Chaque template définit :
- Les champs requis et optionnels
- Les provenances attendues par champ
- Les règles de qualité spécifiques au type de document
- Les champs jamais générés par l'IA (`never_ai_generated`)

---

## 2. Template — Plan de leçon (`LESSON_PLAN`)

**ID :** `scorgia-lesson-plan-alberta-fr-v7`  
**Niveau :** Primaire + Secondaire | **Matières :** Toutes | **Langue :** Français

### Section A — Identité

| Champ | Requis | Provenance | Notes |
|-------|--------|-----------|-------|
| `titre` | Oui | `TEACHER_INPUT` | |
| `classe_id` | Oui | `SYSTEM_DERIVED` | |
| `matiere` | Oui | `TEACHER_INPUT` | |
| `duree_minutes` | Oui | `TEACHER_INPUT` | |
| `date_prevue` | Non | `CALENDAR_DERIVED` | |

### Section B — Curriculum

| Champ | Requis | Provenance | Notes |
|-------|--------|-----------|-------|
| `curriculum_outcome_ids` | **Oui** | `OFFICIAL_CURRICULUM` | **Au moins 1 obligatoire** |
| `grandes_idees_liees` | Non | `CURRICULUM_DERIVED` | |
| `competences_transversales` | Non | `AI_GENERATED` | Doit inclure `justification` et `manifestation_observable` |

### Section C — Intention d'apprentissage

| Champ | Requis | Provenance | Notes |
|-------|--------|-----------|-------|
| `objectif_eleve` | **Oui** | `AI_GENERATED` | Formulé du point de vue de l'élève — doit contenir un verbe d'action observable |
| `criteres_reussite` | **Oui** | `TEACHER_INPUT` | Au moins 2 critères attendus |

### Section D — Anticipation pédagogique

| Champ | Requis | Provenance | Notes |
|-------|--------|-----------|-------|
| `acquis_prealables` | Non | `AI_GENERATED` | |
| `misconceptions_anticipees` | Non | `AI_GENERATED` | |

### Section E — Matériel et ressources

| Champ | Requis | Provenance | Notes |
|-------|--------|-----------|-------|
| `materiel_requis` | Non | `AI_GENERATED` | |
| `ressources` | Non | `AI_GENERATED` ou `EXTERNAL_RESOURCE` | |

### Section F — Phases d'enseignement

Chaque phase (`activation`, `enseignement_explicite`, `pratique_guidee`, `collaboration`, `pratique_autonome`, `consolidation`) suit cette structure :

```typescript
LessonPhase {
  titre        : string
  duree_minutes: number
  description  : string   // Ce que l'enseignant fait
  role_eleve   : string   // Ce que l'élève fait
  materiaux    : string[]
  questions_cles: string[]
}
```

### Section G — Différenciation et inclusion

| Sous-section | Requis | Notes |
|-------------|--------|-------|
| `supports_universels` | **Oui (au moins 1)** | Pour tous les élèves — intégré à la conception |
| `supports_cibles` | Non | Pour sous-groupes temporaires — non nominatifs |
| `supports_specialises` | Non | Référence aux PEI — NON générés par ScorgIA |
| `extensions` | Non | Pour les élèves avancés |

### Section H — Évaluation

| Champ | Requis | Notes |
|-------|--------|-------|
| `formative.strategie` | **Oui** | Ex. : tour de réflexion, journal d'apprentissage |
| `formative.indice_comprehension` | Non | |
| `sommative` | Non | Lié à la séquence ou l'unité |
| `preuves_apprentissage` | Non | Traces que les élèves produiront |

### Section I — Post-leçon (remplie après l'enseignement)

| Champ | Requis | Provenance | Notes |
|-------|--------|-----------|-------|
| `reflexion_enseignant` | Non | `TEACHER_INPUT` | **Jamais pré-rempli par l'IA** |
| `ajustement_prochaine` | Non | `TEACHER_INPUT` | Suggestion possible si l'enseignant initie |

### Règles de qualité — Plan de leçon

| Dimension | Poids | Règle |
|----------|-------|-------|
| `CURRICULUM_ALIGNMENT` | 0.20 | Au moins 1 RA → score 1.0 ; 0 RA → score 0 |
| `OBJECTIVE_QUALITY` | 0.15 | Verbe d'action observable → 1.0 ; formulé vaguement → 0.5 ; absent → 0 |
| `PEDAGOGICAL_COHERENCE` | 0.15 | Au moins 3 phases présentes → 1.0 ; 2 → 0.6 ; 1 → 0.3 |
| `ASSESSMENT_ALIGNMENT` | 0.15 | Évaluation formative présente → 1.0 ; absente → 0 |
| `INCLUSION` | 0.10 | Supports universels présents → 1.0 ; absents → 0 |
| `DIFFERENTIATION` | 0.05 | Supports ciblés présents → 1.0 ; absent → 0.5 |
| `LEARNER_ENGAGEMENT` | 0.08 | Phase d'activation présente → 1.0 ; absente → 0.4 |
| `EVIDENCE_OF_LEARNING` | 0.07 | Preuves d'apprentissage identifiées → 1.0 |
| `CONTEXTUALIZATION` | 0.05 | Contexte classe/matière présent → 1.0 |
| `DOCUMENT_COMPLETENESS` | 0.00 | Métadonnées — n'affecte pas le score global |

---

## 3. Template — Plan de séquence (`SEQUENCE_PLAN`)

**ID :** `scorgia-sequence-plan-alberta-fr-v7`

### Champs requis

| Champ | Provenance | Notes |
|-------|-----------|-------|
| `titre` | `TEACHER_INPUT` | |
| `objectif_sequence` | `AI_GENERATED` | Objectif global de la séquence |
| `curriculum_outcome_ids` | `OFFICIAL_CURRICULUM` | RA couverts par cette séquence |
| `justification_pedagogique` | `AI_GENERATED` | **Obligatoire — pourquoi ce regroupement de leçons existe** |

### Champs optionnels importants

| Champ | Notes |
|-------|-------|
| `question_essentielle` | La grande question qui guide la séquence |
| `acquis_prealables` | Ce que les élèves doivent savoir avant |
| `misconceptions_anticipees` | Idées fausses courantes à déconstruire |
| `progression` | Comment la complexité augmente au fil des leçons |
| `evaluation_formative` | Stratégies de suivi tout au long de la séquence |
| `evaluation_sommative` | Tâche finale d'évaluation |
| `criteres_reussite` | Critères pour l'évaluation sommative |
| `supports_universels` | Supports UDL pour toute la séquence |

### Règles de qualité — Plan de séquence

| Dimension | Poids | Règle |
|----------|-------|-------|
| `CURRICULUM_ALIGNMENT` | 0.25 | Au moins 1 RA → 1.0 |
| `PEDAGOGICAL_COHERENCE` | 0.25 | Justification pédagogique présente → 1.0 |
| `OBJECTIVE_QUALITY` | 0.15 | Objectif séquence défini → 1.0 |
| `ASSESSMENT_ALIGNMENT` | 0.15 | Évaluation sommative ou formative → 1.0 |
| `INCLUSION` | 0.10 | Supports universels → 1.0 |
| `LEARNER_ENGAGEMENT` | 0.10 | Question essentielle présente → 1.0 |

---

## 4. Template — Plan d'unité (`UNIT_PLAN`)

**ID :** `scorgia-unit-plan-alberta-fr-v7`

### Structure

```
UnitPlanV7
├── titre                          [REQUIS — TEACHER_INPUT]
├── curriculum_outcome_ids         [REQUIS — OFFICIAL_CURRICULUM]
├── semaine_debut / semaine_fin    [REQUIS — CALENDAR_DERIVED]
├── questions_directrices          [optionnel — CURRICULUM_DERIVED]
├── grandes_idees                  [optionnel — OFFICIAL_CURRICULUM]
├── connaissances                  [optionnel — CURRICULUM_DERIVED]
├── habiletes                      [optionnel — CURRICULUM_DERIVED]
├── competences_transversales      [optionnel — AI_GENERATED]
├── justification_pedagogique      [optionnel — AI_GENERATED]
├── preuves_apprentissage_attendues [optionnel — AI_GENERATED]
├── evaluations_majeures_prevues   [optionnel — TEACHER_INPUT]
├── considerations_inclusion       [optionnel — AI_GENERATED]
└── ressources_principales         [optionnel — TEACHER_INPUT]
```

**Anti-pattern :** ScorgIA ne crée pas automatiquement 1 unité par RA. Les unités regroupent des RA par cohérence conceptuelle.

---

## 5. Template — Syllabus (`SYLLABUS`)

**ID :** `scorgia-syllabus-alberta-fr-v7`

### Champs requis

| Champ | Provenance | Notes |
|-------|-----------|-------|
| `identite_cours.titre` | `TEACHER_INPUT` | |
| `curriculum_applicable` | `OFFICIAL_CURRICULUM` | |
| `resultats_majeurs` | `CURRICULUM_DERIVED` | Synthèse des RA du programme |

### Champs jamais générés par l'IA (`never_ai_generated`)

Ces champs affichent `[À compléter par l'enseignant — politique du district]` si absents :

| Champ | Raison |
|-------|--------|
| `politique_absences` | Politique scolaire officielle |
| `politique_retards` | Politique scolaire officielle |
| `politique_remise_tardive` | Politique scolaire officielle |
| `integrite_academique` | Politique scolaire officielle |
| `utilisation_ia` | Politique scolaire officielle |
| `politique_discipline` | Politique scolaire officielle |
| `coordonnees_urgence` | Données personnelles de l'enseignant |
| `courriel_enseignant` | Données personnelles de l'enseignant |

### Champs que ScorgIA peut générer (indicatif)

| Champ | Provenance | Notes |
|-------|-----------|-------|
| `description_cours` | `AI_GENERATED` | À valider par l'enseignant |
| `grandes_idees` | `CURRICULUM_DERIVED` | Basé sur le curriculum chargé |
| `resultats_apprentissage` | `CURRICULUM_DERIVED` | Synthèse du programme |
| `approches_pedagogiques` | `AI_GENERATED` | Suggestions — enseignant décide |
| `apercu_calendrier` | `CALENDAR_DERIVED` | Basé sur le calendrier confirmé |
| `note_flexibilite` | `AI_GENERATED` | Clause standard — à adapter |

### Règle de validation du syllabus

```typescript
validateSyllabusProvenance(syllabus) → {
  fields_missing:          string[]   // champs requis absents
  school_policy_required:  string[]   // champs politiques sans contenu
  never_ai_generated:      string[]   // champs illégalement marqués AI_GENERATED
  warnings:                string[]   // avertissements non bloquants
}
```

---

## 6. Template — Dossier de soutien pédagogique (`STUDENT_SUPPORT_PLAN`)

**ID :** `scorgia-student-support-alberta-fr-v7`

> Voir `docs/Product/SCORGIA_STUDENT_SUPPORT_MODEL.md` pour le modèle complet.

### Règles spéciales

| Règle | Description |
|-------|-------------|
| `eleve_id` | Jamais transmis brut à l'IA — pseudonymisé |
| `niveau_confidentialite` | Requis avant toute autre action |
| `designation_officielle` | Jamais `AI_GENERATED` — `OFFICIAL_STANDARD` ou `MISSING` |
| `besoins_observes` | Toujours `TEACHER_INPUT` — jamais pré-rempli |
| Plan dans contexte collectif | Jamais nominatif — données agrégées uniquement |

---

## 7. Template — Évaluation (`ASSESSMENT`)

**ID :** `scorgia-assessment-alberta-fr-v7`

### Structure minimale

```
AssessmentV7
├── titre                   [REQUIS — TEACHER_INPUT]
├── curriculum_outcome_ids  [REQUIS — OFFICIAL_CURRICULUM]
├── type                    [REQUIS — 'formative' | 'sommative' | 'diagnostique']
├── criteres_reussite        [optionnel — TEACHER_INPUT]
├── rubrique                [optionnel — AI_GENERATED à valider]
└── duree_minutes           [optionnel — TEACHER_INPUT]
```

**Note :** ScorgIA ne génère pas la valeur en points ou en pourcentage — c'est une politique scolaire.

---

## 8. Template — Réflexion pédagogique (`REFLECTION`)

**ID :** `scorgia-reflection-alberta-fr-v7`

Ce template est entièrement `TEACHER_INPUT`. ScorgIA ne pré-remplit jamais les réflexions. Elle peut proposer des questions de réflexion guidée si l'enseignant le demande.

### Champs

| Champ | Notes |
|-------|-------|
| `ce_qui_a_bien_fonctionne` | Observation libre |
| `ce_qui_a_ete_difficile` | Observation libre |
| `ajustements_prochaine` | Peut être assisté par IA si l'enseignant demande |
| `eleves_necessitant_soutien` | Jamais nominatif — ex. "3 élèves en difficulté avec la notion X" |

---

## 9. API du registre

```typescript
import {
  SCORGIA_TEMPLATES,
  getTemplate,
  getTemplatesByType,
  getTemplatesByJurisdiction,
  getTemplatesByLangue,
  getNeverAiGeneratedFields,
} from '@/lib/pedagogy/templates/registry'

// Obtenir un template par ID
const template = getTemplate('scorgia-lesson-plan-alberta-fr-v7')

// Tous les templates de type LESSON_PLAN
const lessonTemplates = getTemplatesByType('LESSON_PLAN')

// Tous les templates pour l'Alberta
const albertaTemplates = getTemplatesByJurisdiction('Alberta')

// Champs jamais générés par l'IA pour un template
const forbidden = getNeverAiGeneratedFields(syllabusTemplate)
```

---

## 10. Évolution des templates

| Version | Principe |
|---------|----------|
| Chaque template a une version sémantique | `version: '7.0'` |
| Les templates sont rétrocompatibles | Un template V7 peut ouvrir un document V6 |
| Les champs ajoutés sont optionnels | Jamais de champs requis ajoutés sans migration |
| La suppression d'un champ est interdite | Marquage `@deprecated` uniquement |

---

*Document maintenu par l'équipe produit KlassIA+. Dernière révision : 2026-08-17.*
