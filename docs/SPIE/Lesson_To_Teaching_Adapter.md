# Adaptateurs leçon → Enseigner / Quiz

**Missions M12+M13 | Statut : ✅ Implémenté**

## Vue d'ensemble

Deux routes permettent de transférer la `DetailedLesson` vers d'autres systèmes KlassIA+ :

| Route | Destination | Retour |
|-------|-------------|--------|
| `POST /api/spie/lesson-to-enseigner` | Table `lecons` (Enseigner) | `{ lecon_id }` |
| `POST /api/spie/lesson-to-quiz` | Tables `quiz` + `questions_quiz` | `{ quiz_id }` |

Corps commun : `{ fichier_id }`

## Adaptateur Enseigner (M12)

`DetailedLesson.phases` → `ContenuLecon` (format Enseigner)

```
avant.elements   → avant_amorce (HTML), avant_duree
pendant.elements[0] → pendant_modelisation
pendant.elements[1] → pendant_pratique_guidee
pendant.elements[2] → pendant_pratique_autonome
apres.elements   → apres_cloture, apres_billet
```

`DetailedLesson.objectifs` → `ContenuLecon.objectifs[]`  
`DetailedLesson.preparation.materiel` → `ContenuLecon.materiel[]`  
`DetailedLesson.differentiation` → `ContenuLecon.differentiation_universelle/ciblee/specialisee`  
`DetailedLesson.reflexion.notes_enseignant` → `ContenuLecon.notes_enseignant`

### Idempotence

Si une leçon Enseigner existe déjà pour ce `fichier_id` (`lecons.detailed_lesson_id = fichier.id`), la route met à jour la leçon existante plutôt qu'en créer une nouvelle.

### Champs ajoutés à la table `lecons` (migration 038)

- `detailed_lesson_id UUID` — FK vers `fichiers_dossier.id`
- `source_teaching_pack_id UUID` — FK vers `teaching_packs.id`

## Adaptateur Quiz (M13)

`DetailedLesson.quiz.questions` → `questions_quiz` rows

```
DetailedQuizQuestion.type → questions_quiz.type ('qcm'|'vrai_faux'|'reponse_courte')
DetailedQuizQuestion.options → questions_quiz.options (JSONB)
DetailedQuizQuestion.bonne_reponse → questions_quiz.bonne_reponse (STRING)
DetailedQuizQuestion.points → questions_quiz.points
DetailedQuizQuestion.duree_secondes → questions_quiz.duree_secondes
```

Le corrigé (`DetailedLesson.corrige`) n'est **pas** transféré vers la table `quiz`. Il reste dans `fichiers_dossier.contenu_json` uniquement.

### Comportement en cas d'erreur

Si l'insertion des questions échoue, la route supprime le quiz orphelin (`DELETE FROM quiz`) avant de retourner une erreur 500.

## Entitlements requis

| Route | Action SPIE | Forfait minimum |
|-------|------------|-----------------|
| lesson-to-enseigner | `send_to_enseigner` | Gratuit (bêta) |
| lesson-to-quiz | `create_quiz_from_lesson` | Gratuit (bêta) |

---

*Voir aussi : [Lesson_Entitlements.md](Lesson_Entitlements.md) · [Detailed_Lesson.md](Detailed_Lesson.md)*
