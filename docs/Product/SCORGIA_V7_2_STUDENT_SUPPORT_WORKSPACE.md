# ScorgIA V7.2 — Student Support Workspace

**Statut :** Livré  
**Version :** 7.2.0  
**Audience :** PO, Développeurs  

---

## Vue d'ensemble

L'espace de travail Élèves & Soutien est accessible depuis :
1. Le cockpit global (`/dashboard/mon-annee`) → onglet "Élèves & Soutien"
2. L'espace classe (`/dashboard/mon-annee/[classeId]`) → onglet "Élèves & Soutien"
3. Le profil élève (`/dashboard/mon-annee/[classeId]/eleves/[eleveId]`)

---

## Composants créés

### ClassSupportSummary

**`src/components/mon-annee/student-support/ClassSupportSummary.tsx`**

Affiche un résumé **non-nominatif** de la classe. Utilise uniquement des agrégats.

**Métriques affichées :**
- Nombre total d'élèves dans la classe
- Nombre d'élèves avec besoins documentés (+ %)
- Plans actifs (0 si migration 042 non exécutée)
- Révisions dépassées (0 si migration 042 non exécutée)

**Besoins agrégés :** Distribution anonyme des `eleves.besoins[]` — top 8 besoins
avec comptage. Aucune donnée nominative. Conforme au principe de contexte collectif V7.1.

**Notice migration :** Affiche un message informatif si `student_support_plans` est vide.

---

### StudentSupportList

**`src/components/mon-annee/student-support/StudentSupportList.tsx`**

Liste d'élèves avec filtres, recherche, et actions.

**Filtres disponibles :**
- Tous (compte total)
- Plan actif (élèves avec plan statut='actif')
- À réviser (élèves avec plan dont date_revision < today)
- Avec besoins (eleve.besoins.length > 0)
- Sans plan (aucun plan associé)

**Colonnes :** Élève · (Classe si multi-classes) · Besoins · Plan de soutien · Révision prévue · Action

**Comportement :**
- Cliquer sur une ligne → `/dashboard/mon-annee/[classeId]/eleves/[eleveId]`
- `onSelectEleve` prop optionnel (callback alternatif à la navigation)
- `showClasseColumn` pour la vue multi-classes dans le cockpit global
- Recherche par prénom ou nom

**Pas de données fictives :** Si `eleves[]` est vide, affiche un état vide descriptif.

---

### Extension SchoolYearWorkspace

**`src/components/mon-annee/SchoolYearWorkspace.tsx`** — modifié

Ajouts :
- Nouvel onglet `eleves_soutien` (migrated=true) entre 'apercu' et 'curriculum'
- Props optionnelles : `eleves?: Eleve[]`, `supportPlans?: StudentSupportPlanRow[]`
- Tab `eleves_soutien` rend : `ClassSupportSummary` + `StudentSupportList`

---

## Profil élève

**`src/app/dashboard/mon-annee/[classeId]/eleves/[eleveId]/page.tsx`**

Route : `/dashboard/mon-annee/[classeId]/eleves/[eleveId]`

**Onglets :**

| Onglet | Contenu |
|--------|---------|
| Profil | Prénom, nom, besoins documentés, notes enseignant |
| Plan de soutien | Plans actifs, en brouillon, archivés avec métriques |
| Historique | Journal d'audit (`changes_log`) avec acteur et action |

**Données affichées :** Seulement ce qui existe dans la DB.
- `profil_type` : jamais affiché (dépréciée)
- Sexe/genre : jamais affiché (colonne inexistante)
- Plans de soutien : affiche message gracieux si migration 042 non exécutée

**Navigation :** Retour vers `[classeId]?tab=eleves_soutien` via lien en-tête.

---

## Flux de données

### Workspace page (`[classeId]/page.tsx`)

Requêtes parallèles dans `loadWorkspaceData` :
1. `teaching_events` — pour le pack de la classe
2. `eleves` — filtrés par `classe_id`
3. `student_support_plans` — filtrés par `classe_id` (graceful)

### Student detail page

Requêtes parallèles dans `load` :
1. `eleves` — par `id` (eleveId)
2. `classes` — par `id` (classeId)
3. `student_support_plans` — par `eleve_id`

---

## Contraintes respectées

| Contrainte | Appliquée |
|------------|-----------|
| Jamais de données fictives | ✓ |
| Jamais de diagnostic individuel dans le cockpit global | ✓ |
| Jamais sexe/genre (colonne inexistante) | ✓ |
| `profil_type` jamais lu | ✓ |
| `student_support_plans` graceful empty state | ✓ |
| `inscriptions` jamais référencée | ✓ |
| Besoins dans ClassSupportSummary = agrégats uniquement | ✓ |

---

## État vide global

Si `student_support_plans` est vide (migration 042 non exécutée) :
- ClassSupportSummary : affiche "—" pour les métriques de plans + notice
- StudentSupportList : filtre "Plan actif" → 0, "À réviser" → 0
- Page profil élève onglet Plan : message explicatif

L'interface reste entièrement fonctionnelle — aucune erreur, aucun crash.
