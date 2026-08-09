# Génération des activités — SPIE-BETA-03

**Mission M5 | Statut : ✅ Implémenté**

## Vue d'ensemble

Les activités sont générées à l'étape 5 du pipeline SSE (`/api/spie/lesson-engine`). Elles sont les seuls éléments du pipeline à utiliser **claude-sonnet-4-6** (2500 tokens max) plutôt que Haiku, car elles nécessitent des consignes complètes et contextualisées.

## Structure d'une activité

```typescript
type DetailedActivity = {
  id, titre, intention_pedagogique
  type: ActivityType            // 11 types (activation, pratique_guidee, etc.)
  duree_minutes, taille_groupe
  materiel?: string[]
  consignes_enseignant          // Jamais visible des élèves
  consignes_eleves
  etapes: string[]
  resultat_attendu
  differentiation?: {
    soutien?: string
    enrichissement?: string
  }
  criteres_reussite: string[]
  methode_verification
  alternative_courte?           // Variante si le temps manque
  alternative_sans_tech?        // Variante sans équipement numérique
  statut: 'disponible' | 'optionnelle'
  lien_objectif_id?, ras_lie?
}
```

## Types d'activités supportés

`activation` · `demonstration` · `pratique_guidee` · `pratique_autonome` · `dyade` · `equipe` · `discussion` · `manipulation` · `resolution_probleme` · `mini_evaluation` · `synthese`

## Règles pédagogiques

- Chaque leçon génère **exactement 3 activités**
- La progression suit le modèle I/We/You (modélisation → pratique guidée → autonome)
- Chaque activité est liée à au moins un objectif (`lien_objectif_id`)
- La différenciation est intégrée à chaque activité (soutien + enrichissement)
- Les consignes enseignant ne sont jamais projetées ni transmises aux élèves

## Prompt système (étape 5)

```
Tu es un expert en pédagogie active. Crée des activités prêtes à utiliser en classe,
avec consignes complètes. Réponds UNIQUEMENT en JSON valide.
```

Le prompt utilisateur inclut : contexte curriculaire complet + objectifs générés à l'étape 3.

## Différenciation intégrée

Chaque activité inclut :
- **`soutien`** : version simplifiée pour les élèves qui ont besoin d'aide
- **`enrichissement`** : extension pour les élèves avancés
- **`alternative_courte`** : variante si le temps manque (< 10 min restantes)
- **`alternative_sans_tech`** : variante si pas d'équipement numérique disponible

Ces variantes sont distinctes des `DifferentiationLevel` globaux de la leçon (étape 10).

---

*Voir aussi : [Lesson_Generation_Pipeline.md](Lesson_Generation_Pipeline.md) · [Detailed_Lesson.md](Detailed_Lesson.md)*
