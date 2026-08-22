# Smart Syllabus Engine V3 — Spécification produit

**Version :** 3.0  
**Date :** 2026-08-15  
**Statut :** Livré

---

## Problème résolu

Le syllabus V1 générait 9 champs textuels compacts, insuffisants pour être utilisés comme document professionnel distribué aux élèves. Les politiques d'établissement étaient absentes, les modifications humaines risquaient d'être écrasées à chaque rebuild, et aucun score ne guidait l'enseignant vers la complétion.

---

## Solution V3

### Document professionnel

Le syllabus V3 est un document structuré en 7 sections éditables + 1 calendrier synchronisé automatiquement. Il couvre :
- La présentation pédagogique du cours (mission, objectifs, grandes idées)
- La méthodologie et les méthodes d'évaluation
- Les attentes comportementales
- Les politiques de cours (présence, retards, travaux) — avec placeholders à remplir
- Les coordonnées de l'enseignant — avec placeholders à préciser
- Un aperçu calendrier synchronisé depuis le plan annuel

### Score de complétude

Un score 0–100 déterministe guide l'enseignant :
- < 50 % → indicateur rouge, tâche prioritaire dans Mon Année
- 50–80 % → indicateur ambré, tâche prioritaire dans Mon Année
- ≥ 80 % → indicateur vert, syllabus considéré complet

### Aucune politique inventée

L'IA ne génère jamais de politiques institutionnelles. Les sections Politiques et Communication affichent des placeholders clairs ("À compléter par l'enseignant") jusqu'à ce que l'enseignant les remplisse manuellement.

### Protection des modifications humaines

Chaque section modifiée par l'enseignant est marquée dans `edited_sections[]`. La section affiche un badge "Modifié". En mode Reprendre, le syllabus entier est préservé (skipSyllabus=true).

---

## Expérience utilisateur

### Onglet Syllabus (page programme)
1. **Vue lecture** — document formaté, sections claires
2. **Modifier** par section → formulaire inline
3. **Sauvegarder** → auto-versionné dans `pack_versions`
4. **Annuler** → restaure l'état avant édition

### Mon Année
- Carte de complétude du syllabus avec barre de progression
- Tâche prioritaire "Compléter le syllabus" si score < 80 %
- Lien direct vers l'onglet Syllabus

---

## Contrat de données

`PackSyllabus` est backward compatible : les 9 champs V1 restent présents et fonctionnels. Les 20+ champs V3 sont tous optionnels.

L'`apercu_calendrier[]` est toujours dérivé des `programme.unites` — jamais généré par l'IA et jamais éditable directement (mis à jour lors d'un rebuild).

---

## Limites V3 (à documenter pour le PO)

- `evaluation.categories.poids` (pondération par catégorie) : jamais inventée par l'IA — à remplir manuellement par l'enseignant
- Les politiques institutionnelles (présence, retards) sont volontairement laissées vides — elles varient par établissement et ne peuvent être générées de façon fiable
- La section communication ne prépopule pas les coordonnées de l'enseignant (non disponibles dans le profil utilisateur à ce stade)
- Aucune synchronisation vers `fichiers_dossier` du syllabus mis à jour (les mises à jour manuelles ne déclenchent pas de re-binding — ce serait excessif)

---

## Décisions architecturales

| Décision | Raison |
|----------|--------|
| Phase 2 déterministe pour les politiques | Jamais inventer des règles institutionnelles |
| `apercu_calendrier` synchronisé depuis programme | Source de vérité unique : le plan annuel |
| `edited_sections[]` côté syllabus | Pas de colonne DB — portée par le document lui-même |
| SyllabusViewer remplace SyllabusEditor | UX lire-avant-modifier réduit les accidents d'édition |
| Score isFilled() rejette "À compléter" | Le score reflète la vraie utilité du document |
