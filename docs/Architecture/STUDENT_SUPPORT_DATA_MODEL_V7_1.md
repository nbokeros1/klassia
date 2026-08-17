# Student Support Data Model — V7.1

**Statut :** Livré  
**Version :** 7.1.0  
**Audience :** Architecte, Développeurs  

---

## Vue d'ensemble du modèle

Le modèle de données de soutien V7.1 est organisé autour du `SupportPlanV71` —
un agrégat qui regroupe toutes les informations pédagogiques d'un élève dans un
contexte de soutien, sans dupliquer son identité (toujours lue depuis `eleves`).

---

## Structure TypeScript

### SupportPlanV71 (agrégat principal)

```
SupportPlanV71
├── Identification
│   ├── student_id       → eleves.id (FK, source de vérité)
│   ├── classe_id        → classes.id (FK)
│   ├── enseignant_id    → utilisateurs.id (FK)
│   └── annee_scolaire
│
├── [B] profil?          → StudentPedagogicalProfile
│   ├── forces           → StudentStrength[]
│   ├── interets         → string[]
│   ├── voix_eleve?      → string (avec consentement)
│   ├── besoins          → StudentNeed[]
│   └── preferences_apprentissage → LearningPreferenceContext[]
│
├── [C] support_data?    → StudentSupportData
│   ├── designations     → StudentDesignation[]   (jamais IA)
│   ├── accommodations   → Accommodation[]
│   ├── modifications    → Modification[]          (requiert désignation)
│   └── technologie_assistance → AssistiveTechnology[]
│
├── baseline?            → string
├── sources_baseline?    → string[]
│
├── objectifs            → MeasurableGoal[]
│   └── id, domaine, formulation, comportement, condition, critere, echeance, statut
│
├── interventions        → Intervention[]
│   ├── objectif_id      → MeasurableGoal.id (lien obligatoire)
│   ├── besoin_id        → StudentNeed.id (lien obligatoire)
│   ├── strategie        → InterventionStrategy (avec justification)
│   ├── frequence        → InterventionFrequency
│   ├── observations     → InterventionObservation[]
│   ├── preuves          → InterventionEvidence[]
│   └── decisions        → InterventionDecision[]
│
├── [E] ai_suggestions?  → AISuggestion[]
│   └── source_type: 'AI_SUGGESTION' — toujours
│
└── changes_log          → PlanChangeEntry[]
```

---

## Règles de données critiques

### Désignations (Catégorie C)

```typescript
type DesignationSource = 
  | 'TEACHER_ENTERED'    // Enseignant, sans validation externe
  | 'SCHOOL_IMPORTED'    // Système de l'école
  | 'AUTHORIZED_SOURCE'  // Alberta Education, équipe-école

// INVARIANT : source_type !== 'AI_SUGGESTION' pour StudentDesignation
// ScorgIA ne peut jamais créer une désignation.
```

### Provenance des objectifs

```typescript
// MeasurableGoal.provenance
type GoalProvenance = 'TEACHER_INPUT' | 'EQUIPE_ECOLE'
// Jamais 'AI_SUGGESTION' seul — l'IA peut suggérer, l'enseignant confirme
```

### Interventions — liens obligatoires

Chaque `Intervention` doit lier :
- `objectif_id` → un `MeasurableGoal.id` actif
- `besoin_id` → un `StudentNeed.id`

Le Quality Scorer vérifie ces liens (`STRATEGY_LINKED_TO_GOAL`).

---

## Base de données

### Table `student_support_plans`

```sql
-- Colonnes JSONB (structure définie dans types.ts)
profil_pedagogique   JSONB    -- StudentPedagogicalProfile
support_data         JSONB    -- StudentSupportData  
objectifs            JSONB    -- MeasurableGoal[]
interventions        JSONB    -- Intervention[]
review_entries       JSONB    -- PlanReviewEntry[]
ai_suggestions       JSONB    -- AISuggestion[]
changes_log          JSONB    -- PlanChangeEntry[]
```

### Décisions d'architecture DB

| Décision | Raison |
|----------|--------|
| `lesson_plans_v7` REJETÉE | Double source de vérité avec `lecons.contenu_json` |
| `eleves.profil_type` dépréciée silencieusement | Rétrocompatibilité — migration V7.2 |
| Pseudonymisation à la couche app | Lookups impossibles si hash en DB |
| Pas de DELETE sur plans de soutien | Conformité FOIP |

---

## Quality Scorer

Le `scoreSupportPlan` évalue 11 dimensions du plan de soutien :

| Dimension | Poids | Description |
|-----------|-------|-------------|
| MEASURABLE_GOAL | 20% | Objectifs SMART validés |
| NEED_DEFINED | 15% | Besoins pédagogiques documentés |
| STRATEGY_LINKED_TO_GOAL | 15% | Interventions liées aux objectifs |
| BASELINE_PRESENT | 10% | Point de départ documenté |
| INTERVENTION_FREQUENCY | 10% | Fréquence et durée définies |
| MONITORING_METHOD | 10% | Observations documentées |
| RESPONSIBLE_DEFINED | 8% | Rôle responsable par intervention |
| STRENGTHS_PRESENT | 5% | Forces documentées |
| REVIEW_DATE_DEFINED | 5% | Date de révision planifiée |
| PROVENANCE_VALID | 2% | Suggestions IA traitées |
| PROTECTED_FIELDS_VERIFIED | 0% | Métadonnées de sécurité (non scorée) |

Niveaux : `NOT_READY` < `NEEDS_REVIEW` < `READY` < `STRONG`

**Avertissement :** Le score reflète la complétude, pas la qualité pédagogique.
Le jugement professionnel de l'enseignant reste souverain.

---

## ViewModels (V7.2 UI)

`buildSupportPlanViewModel` transforme `SupportPlanV71` pour l'UI :
- `SupportPlanViewModel` — vue détaillée d'un plan
- `SupportPlanListItemViewModel` — vue résumée pour le tableau de bord
- `ObjectifViewModel` — objectif avec état de validation
- `InterventionViewModel` — intervention avec indicateur d'attention
- `AISuggestionViewModel` — suggestion avec état d'expiration
- `QualityIndicator` — indicateur visuel du score (couleur + label + étape suivante)
