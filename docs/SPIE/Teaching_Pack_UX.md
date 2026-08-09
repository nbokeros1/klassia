# Teaching Pack UX — Interface utilisateur

**Statut :** SPIE-BETA-02 · Actif  
**Page :** `src/app/dashboard/classes/[id]/programme/page.tsx`

---

## Navigation

La page `/dashboard/classes/[id]/programme` utilise une navigation en onglets :

| Onglet | Contenu |
|--------|---------|
| 🏠 Vue d'ensemble | TeachingPackCard, métriques, prochaines actions |
| 📄 Curriculum | Source du curriculum, traçabilité |
| 📋 Syllabus | SyllabusEditor (éditable, autosauvegarde) |
| 🗓️ Plan annuel | AnnualPlanTimeline + export DOCX |
| 🗂️ Séquences | Liste dépliante par séquence + export individuel |
| 📝 Plans de leçon | Plans de la 1re séquence + indicateur de développement |
| 🎮 Quiz | Lien vers la Bibliothèque |
| 📐 Gabarits | Gabarits actifs + TemplateMapping |
| 🔍 Qualité | QualityReport interactif |

## Entrée depuis la classe

Bouton "🗓️ Mon année" dans la page classe, juste avant "✦ Préparer".

## États principaux

| État | Affichage |
|------|-----------|
| Aucun pack | EmptyState + bouton "Construire" |
| Wizard actif | BuildMyYearWizard |
| Pack généré | Navigation complète par onglets |
| Erreur pack | Badge rouge + bouton "Relancer" |

## Règles d'affichage (M16 — Pas de placeholders trompeurs)

- Les données réelles sont affichées telles quelles
- Les données non disponibles produisent un état vide honnête
- Un lock `🔒` indique les éléments verrouillés (forfait)
- "Powered by Claude" n'apparaît JAMAIS dans l'interface
- L'avertissement Alberta est affiché sur toutes les pages si `province = 'alberta'`

## Entitlements côté client

Les boutons verrouillés sont masqués côté client **en complément** de la vérification serveur, jamais à la place.
