# Quality Gate — Leçon détaillée

**Mission M10 | Statut : ✅ Implémenté**

Fonction : `verifierDetailedLesson(lecon: DetailedLesson): QualityGateResultat`  
Fichier : `src/lib/teaching-quality-gate.ts`

## Vue d'ensemble

Le Quality Gate de la leçon détaillée vérifie 13 conditions (DL-001→DL-013) après la génération complète (étape 12 du pipeline). Il n'attribue **pas de score arbitraire** — il vérifie des critères binaires objectifs.

`peut_marquer_pret = erreurs_bloquantes === 0`

## Vérifications

| Code | Niveau | Condition vérifiée |
|------|--------|--------------------|
| DL-001 | 🔴 bloquant | Titre non vide |
| DL-002 | 🔴 bloquant | Au moins 1 objectif avec énoncé non vide |
| DL-003 | 🟡 avertissement | Chaque activité liée à au moins un objectif |
| DL-004 | 🟡 avertissement | Chaque question de quiz liée à au moins un objectif |
| DL-005 | 🟡 avertissement | Au moins 2 activités avec critères de réussite |
| DL-006 | 🔴 bloquant | Durée totale ≥ 30 minutes |
| DL-007 | 🟡 avertissement | Au moins 2 activités avec consignes élèves non vides |
| DL-008 | 🟡 avertissement | Au moins 2 sections de contenu pédagogique |
| DL-009 | 🔴 bloquant | Au moins 3 questions dans le quiz |
| DL-010 | 🟡 avertissement | Corrigé présent avec au moins 1 item |
| DL-011 | 🟡 avertissement | Au moins 2 phases (avant/pendant/après) présentes |
| DL-012 | 💡 recommandation | Au moins 2 niveaux de différenciation présents |
| DL-013 | 💡 recommandation | Évaluation formative avec méthode non vide |

## Résultat

```typescript
type QualityGateResultat = {
  peut_marquer_pret: boolean
  erreurs_bloquantes: number
  avertissements: number
  recommandations: number
  elements_valides: number
  items: { code, niveau, message }[]
}
```

## Affichage dans l'interface

Le badge Quality Gate est visible dans `DetailedLessonView` :
- ✓ **Prête à enseigner** (fond vert) si `peut_marquer_pret = true`
- ⚠ **Leçon incomplète** (fond rouge) sinon, avec le décompte des erreurs

## Différence avec le Quality Gate du Teaching Pack

Le Quality Gate du Teaching Pack (`verifierQualityGate()`) analyse le plan annuel et le syllabus. Le Quality Gate de la leçon (`verifierDetailedLesson()`) analyse uniquement la `DetailedLesson`. Les deux coexistent dans `teaching-quality-gate.ts`.

---

*Voir aussi : [Pedagogical_Quality_Gate.md](Pedagogical_Quality_Gate.md) · [Detailed_Lesson.md](Detailed_Lesson.md)*
