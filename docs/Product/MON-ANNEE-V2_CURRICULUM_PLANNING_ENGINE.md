# MON-ANNEE-V2 — Curriculum Planning Engine

**Statut :** Livré — en attente de validation Product Owner  
**Date :** 2026-08-14  
**Version :** V2.0.0  
**Dépendances :** MON-ANNEE-V1 (livré), SPIE-P0.4 (livré)

---

## 1. Vision

MON-ANNEE-V2 transforme le Teaching Pack en une **architecture pédagogique traçable** :

```
Curriculum officiel
  → Résultats d'apprentissage normalisés (CurriculumOutcome)
    → Séquences pédagogiques avec justification (Unite)
      → Plans de leçon structurés (LeconProgramme)
        → Preuves d'apprentissage observables
```

Chaque séquence et chaque leçon possède désormais une identité pédagogique réelle — jamais "Unité 1" ou "Contenu à définir".

---

## 2. Contrat de données V2

### 2.1 CurriculumOutcome (nouveau type)

```typescript
export type CurriculumOutcomeType =
  | 'resultat_apprentissage'
  | 'grande_idee'
  | 'competence'
  | 'connaissance'
  | 'standard'
  | 'attente'

export type CurriculumOutcome = {
  id: string          // e.g. "RA-1.1" — clé de référence stable
  code?: string       // code officiel du curriculum si applicable
  titre: string       // label court
  description: string // description complète
  type: CurriculumOutcomeType
  parentId?: string   // hiérarchie optionnelle
}
```

Stocké dans `programme_annuel.contenu_json.curriculum_outcomes[]`.  
Généré par l'IA lors du Build Year. Aucune migration DB requise (JSONB existant).

### 2.2 SequencePlan — Unite étendue

Nouveaux champs optionnels sur `Unite` :

| Champ | Type | Description |
|-------|------|-------------|
| `justification_pedagogique` | `string?` | Pourquoi cette séquence à ce moment |
| `curriculum_outcome_ids` | `string[]?` | Références aux RA couverts |
| `grandes_idees` | `string[]?` | Grandes idées de la séquence |
| `concepts_cles` | `string[]?` | Concepts à maîtriser |
| `prerequis` | `string[]?` | Prérequis de la séquence |
| `activite_culminante` | `string?` | Activité intégratrice de fin |
| `evaluation_prevue` | `string?` | Type et format d'évaluation |

Rétrocompatible : les anciens packs (sans ces champs) continuent de fonctionner.

### 2.3 LessonPlanSummary — LeconProgramme étendue

Nouveaux champs optionnels sur `LeconProgramme` :

| Champ | Type | Description |
|-------|------|-------------|
| `progression_role` | `enum?` | Rôle dans la progression didactique |
| `objectif_apprentissage` | `string?` | "L'élève peut..." — observable et mesurable |
| `curriculum_outcome_ids` | `string[]?` | RA couverts par cette leçon |
| `activite_principale` | `string?` | Description courte de l'activité |
| `preuve_apprentissage` | `string?` | Ce que l'élève produit |
| `justification` | `string?` | Pourquoi cette leçon ici |

### 2.4 Rôles de progression

```typescript
type ProgressionRole =
  | 'introduction'        // Activation des connaissances
  | 'acquisition'         // Enseignement / modélisation
  | 'pratique'            // Pratique guidée ou autonome
  | 'approfondissement'   // Approfondissement / transfert
  | 'integration'         // Synthèse / intégration
  | 'evaluation'          // Évaluation formative ou sommative
  | 'autre'
```

---

## 3. Nouvelles règles IA pour le Build Year

### 3.1 Prompt programme_annuel (ÉTAPE 2)

**Avant (V1) :** prompt minimal, fallback avec "Unité 1" / "Contenu à définir" sur parse failure  
**Après (V2) :** prompt structuré avec schéma complet, fail-fast sur parse failure

Règles encodées dans le prompt :
1. Titres réels pour séquences et leçons (jamais génériques)
2. `objectif_apprentissage` commençant par "L'élève peut..."
3. `justification_pedagogique` pour chaque séquence
4. 5 à 7 séquences × 4 à 6 leçons, distribuées sur `nb_semaines`
5. 4 à 6 `curriculum_outcomes` au niveau racine

**max_tokens :** 5000 (V1 : 4000)

### 3.2 Fail-fast curriculum

Si le parse du JSON échoue ou si `parsedProg.unites` est vide :
- `buildState.curriculum = stepError('...')`
- SSE : `erreur` sur curriculum, `bloque` sur les étapes en aval
- Update Supabase : `statut = 'erreur'`
- `controller.close(); return` — pipeline arrêté

Le fallback "Unité 1" / "Contenu à définir" est supprimé.

### 3.3 Quiz facultatif (ÉTAPE 7)

**Avant (V1) :** Quiz généré lors du Build Year si `entitlement.first_lesson_quiz`. Requis pour la complétude.  
**Après (V2) :** Quiz toujours ignoré pendant le Build Year. `buildState.quiz = stepSkipped()`.

Le quiz est généré séparément depuis la leçon ou depuis le module Évaluations.

**`verifyTeachingPackCompleteness` :** la section quiz ne remonte plus dans `missing[]`. Le pack peut atteindre `statut: 'pret'` sans quiz.

---

## 4. Impacts sur Mon Année (dashboard)

### 4.1 AnnualPlanOverview

- **Nouveau :** affichage de `justification_pedagogique` en sous-titre italique dans la colonne "Séquence"
- **Backward compat :** si le champ est absent (anciens packs), rien n'est affiché

### 4.2 CurriculumCoverage

- Affiche toujours les RA du syllabus (`resultats_apprentissage[]`)
- Le tracking (planifié/préparé/enseigné/évalué) reste `—` jusqu'à la table `ra_tracking` (dette technique V2)

### 4.3 Pas de modification de page.tsx, SchoolYearDashboard.tsx, SequenceProgress

La data flow existante est conservée. Les nouveaux champs V2 sont accessibles via `seq.uniteData.justification_pedagogique` etc. (déjà typé via `Unite`).

---

## 5. Backward compatibility

| Situation | Comportement |
|-----------|-------------|
| Ancien pack sans `justification_pedagogique` | Aucun affichage, aucune erreur |
| Ancien pack sans `curriculum_outcomes` | `raList` du syllabus utilisé dans CurriculumCoverage |
| Ancien pack avec `lecon.objectif_apprentissage` absent | Pas affiché dans Mon Année |
| Pack V2 avec `quiz.status = 'skipped'` | Complétude calculée sans quiz |

---

## 6. Migration DB

**Aucune migration requise pour V2.**

Toutes les nouvelles données (CurriculumOutcome, champs Unite/LeconProgramme) sont stockées dans les colonnes JSONB existantes :
- `programme_annuel.contenu_json` — `curriculum_outcomes[]` + champs V2 des unités et leçons
- `teaching_packs.contenu_json` — `build_state` inchangé

Les colonnes JSONB Supabase acceptent n'importe quelle forme sans migration.

---

## 7. Dette technique persistante

| Dette | Priorité | Description |
|-------|----------|-------------|
| Table `ra_tracking` | Haute | Suivi RA planifié/préparé/enseigné/évalué par classe |
| CurriculumCoverage interactif | Haute | Cliquer sur une ligne RA → séquences et leçons associées |
| Table `evaluations` | Haute | UpcomingAssessments avec dates réelles |
| Plans leçon V2 dans le wizard | Moyenne | Afficher `objectif_apprentissage`, `activite_principale`, `preuve_apprentissage` dans l'onglet Séquences |
| Quiz depuis leçon | Basse | Bouton "Générer quiz" depuis la vue leçon |

---

## 8. Règles invariantes

- **JAMAIS** de valeur générée : "Unité 1", "Leçon 1", "Objectif principal", "Contenu à définir"
- **TOUJOURS** `objectif_apprentissage` commençant par "L'élève peut..."
- **INTERDIT** de créer du contenu pédagogique factice pour remplir les champs
- **INTERDIT** de pousser en production sans validation Product Owner

---

*Document de produit — KlassIA+ MON-ANNEE-V2*  
*Ne pas push avant validation Product Owner*
