# Génération du quiz — SPIE-BETA-03

**Mission M8+M9+M13 | Statut : ✅ Implémenté**

## Vue d'ensemble

Le quiz est généré à l'étape 8 du pipeline SSE, le corrigé à l'étape 9. Le quiz peut ensuite être transféré vers le système de quiz interactif via la route `POST /api/spie/lesson-to-quiz`.

## Structure

```typescript
type DetailedQuiz = {
  titre, objectif
  duree_estimee_minutes
  instructions
  questions: DetailedQuizQuestion[]
  bareme_total, criteres_reussite
}

type DetailedQuizQuestion = {
  id, ordre
  type: 'qcm' | 'vrai_faux' | 'reponse_courte'
  enonce
  options?                   // requis pour qcm
  bonne_reponse
  explication
  points, duree_secondes
  ras_lie?, difficulte?
}
```

## Corrigé (enseignant seulement)

```typescript
type AnswerKeyItem = {
  question_id
  reponse_attendue           // version complète (plus détaillée que bonne_reponse)
  justification
  erreurs_frequentes: string[]
  retroaction_courte
  piste_remediation?
}
```

Le corrigé **n'est jamais** :
- Transmis aux élèves (API ou interface)
- Projeté en mode présentation
- Inclus dans les exports sans mention "SECTION ENSEIGNANT SEULEMENT"

## Transfert vers le système quiz (M13)

Route : `POST /api/spie/lesson-to-quiz`  
Corps : `{ fichier_id }`  
Retour : `{ quiz_id }`

Le transfert crée :
1. Un enregistrement dans la table `quiz` (statut `brouillon`, mode `equipe`)
2. Des enregistrements dans `questions_quiz` pour chaque question
3. Redirige vers `/dashboard/outils/quiz/[id]` pour édition ou lancement

La table `quiz` utilise les champs `type: 'qcm'|'vrai_faux'|'reponse_courte'` — compatibles directement avec `DetailedQuizQuestion.type`. Aucun adaptateur de type nécessaire.

## Entitlements

| Action | Entitlement requis |
|--------|-------------------|
| Voir le quiz | `first_lesson_quiz` |
| Transférer vers quiz interactif | `first_lesson_quiz` |
| Exporter le corrigé | `all_lessons_complete` |

---

*Voir aussi : [Lesson_Generation_Pipeline.md](Lesson_Generation_Pipeline.md) · [Lesson_Entitlements.md](Lesson_Entitlements.md)*
