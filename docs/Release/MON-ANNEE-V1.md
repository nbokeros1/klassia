# MON-ANNEE-V1 — Cockpit pédagogique annuel

**Statut :** Livré — en attente de validation Product Owner  
**Date :** 2026-08-14  
**Priorité :** Feature — UX Dashboard  

---

## 1. Audit initial

### A. Routes concernées

| Route | Type | Impact |
|-------|------|--------|
| `/dashboard/mon-annee` | **CRÉÉE** | Nouvelle route principale |
| `/dashboard/classes/[id]/programme` | Inchangée | 9 onglets existants conservés |
| `/dashboard/classes` | Inchangée | Liste des classes |
| `Sidebar.tsx` | **MODIFIÉE** | `Mon Année` → `/dashboard/mon-annee` |

### B. Composants existants réutilisés

Aucun composant existant n'a été réutilisé directement dans le dashboard (pour éviter les couplages). Les composants `build-year/` restent accessibles via les CTAs "Voir le détail" qui pointent vers `/dashboard/classes/[id]/programme`.

Types réutilisés : `Classe`, `ProgrammeAnnuel`, `ContenuProgramme`, `Unite`, `LeconProgramme`, `TeachingPack`, `PackSyllabus`.

### C. Tables / colonnes disponibles par métrique

| Métrique | Source DB |
|----------|-----------|
| Séquences totales | `programme_annuel.nb_unites` OU `contenu_json.unites.length` |
| Leçons totales | `programme_annuel.nb_lecons_total` OU somme des `unites[].lecons.length` |
| Leçons préparées | `teaching_packs.contenu_json.nb_lecons_generees` |
| Leçons enseignées | `unites[].lecons[].statut === 'enseignee'` |
| Résultats d'apprentissage | `programme_annuel.syllabus_json.resultats_apprentissage[]` |
| Titre du cours | `programme_annuel.syllabus_json.titre_cours` |
| Titre des séquences | `contenu_json.unites[].titre` |
| Objectifs séquence | `contenu_json.unites[].objectifs[0]` |
| Statut pack | `teaching_packs.statut` |
| Année scolaire | `teaching_packs.annee_scolaire` OU `classes.annee_scolaire` |
| Province | `teaching_packs.province` |

### D. Métriques calculables aujourd'hui

- Nombre de séquences total et terminées
- Nombre de leçons total, préparées (générées), enseignées
- Progression par séquence (% leçons enseignées)
- Séquence en cours (première non terminée)
- Statut de chaque séquence (`a_venir`, `en_cours`, `terminee`)
- Liste des résultats d'apprentissage (syllabus)
- Tâches prioritaires dérivées des leçons sans `lecon_id` dans la séquence en cours

### E. Métriques impossibles aujourd'hui (états vides propres)

| Métrique | Raison | État affiché |
|----------|--------|--------------|
| % de curriculum couvert par RA | Pas de table de suivi RA | `—` |
| RA planifié / préparé / enseigné / évalué | Pas de tracking | `—` (colonnes prêtes) |
| Évaluations à venir avec dates | Pas de table `evaluations` | Empty state propre |
| Nombre d'évaluations à corriger | Pas de table | `—` |

### F. Risques de régression

| Risque | Mitigation |
|--------|-----------|
| Sidebar : smart routing `programmeNav` supprimé | La page `/dashboard/mon-annee` lit elle-même `localStorage.klassia_active_classe` |
| Les 9 onglets du programme | Route `classes/[id]/programme` **non modifiée** |
| `localStorage.klassia_active_classe` | Toujours écrit lors du changement de classe dans le dashboard |
| Build SSR / Suspense | `useSearchParams` isolé dans `MonAnneeInner` + `<Suspense>` wrapping |

---

## 2. Architecture retenue

### Principe
Le dashboard est une **projection** de l'état pédagogique réel. Aucune donnée n'est dupliquée ou inventée.

```
ACTION (enseigner une leçon)
  → lecon.statut = 'enseignee' en DB
  → Mon Année recalcule automatiquement
```

### Flux de données
```
Page /dashboard/mon-annee
  → loadClasses()    → Supabase: utilisateurs + classes
  → loadPackData()   → Supabase: teaching_packs + programme_annuel
  → deriveData()     → calcul déterministe, aucune valeur inventée
  → SchoolYearDashboard (props)
      → YearProgressCard
      → YearMetricsRow
      → CurrentSequenceCard
      → AnnualPlanOverview
      → CurriculumCoverage
      → PriorityTasks
      → UpcomingAssessments
```

---

## 3. Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/lib/types/school-year-dashboard.ts` | Types ViewModel : `SchoolYearMetrics`, `SequenceProgress`, `PriorityTask`, `UpcomingAssessment`, `SchoolYearDashboardData` |
| `src/app/dashboard/mon-annee/page.tsx` | Page Next.js — auth, chargement, `deriveData()`, Suspense boundary |
| `src/components/mon-annee/SchoolYearDashboard.tsx` | Container principal — sélecteur de classe, layout, header |
| `src/components/mon-annee/YearProgressCard.tsx` | Carte progression globale — barre, %, métriques |
| `src/components/mon-annee/YearMetricsRow.tsx` | 4 KPI cards — séquences, leçons enseignées, préparées, évaluations |
| `src/components/mon-annee/CurrentSequenceCard.tsx` | Séquence en cours — titre, semaines, objectif, progression |
| `src/components/mon-annee/AnnualPlanOverview.tsx` | Tableau plan annuel — toutes les séquences avec statut, barre, CTA |
| `src/components/mon-annee/CurriculumCoverage.tsx` | Tableau RA — colonnes prêtes pour tracking futur |
| `src/components/mon-annee/PriorityTasks.tsx` | À faire en priorité — dérivé des données réelles |
| `src/components/mon-annee/UpcomingAssessments.tsx` | Prochaines évaluations — empty state propre |

---

## 4. Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/components/Sidebar.tsx` | `Mon Année` : `href: '/dashboard/classes', programmeNav: true` → `href: '/dashboard/mon-annee'` |

---

## 5. Sources DB utilisées

- `utilisateurs` : `prenom`, `nom`, `langue`
- `classes` : `id`, `nom`, `matiere`, `niveau`, `annee_scolaire`, `enseignant_id`
- `teaching_packs` : `statut`, `province`, `annee_scolaire`, `programme_annuel_id`, `contenu_json.nb_lecons_generees`
- `programme_annuel` : `nb_unites`, `nb_lecons_total`, `contenu_json` (unites + lecons + statuts), `syllabus_json` (resultats_apprentissage, titre_cours, description)

---

## 6. Métriques réellement calculées

| KPI | Formule |
|-----|---------|
| Séquences terminées | `unites.filter(u => u.lecons.every(l => l.statut === 'enseignee')).length` |
| Leçons enseignées | `unites.flatMap(u => u.lecons).filter(l => l.statut === 'enseignee').length` |
| Leçons préparées | `teaching_packs.contenu_json.nb_lecons_generees` |
| Progression séquence | `(taughtLecons / totalLecons) * 100` |
| Statut séquence | `terminee` si toutes enseignées, `en_cours` si au moins 1, `a_venir` sinon |
| Séquence en cours | Première séquence avec `statut !== 'terminee'` |
| Tâches prioritaires | Leçons sans `lecon_id` dans la séquence en cours (max 3) |

---

## 7. Métriques encore indisponibles

| Métrique | Manque DB | Recommandation future |
|----------|-----------|----------------------|
| % de curriculum couvert | Table tracking RA | `ra_tracking (ra_text, enseignee, evaluee)` |
| RA planifié / enseigné / évalué | Idem | Colonne statut par RA |
| Évaluations avec dates | Table `evaluations` | `evaluations (titre, date, sequence_id, statut)` |
| Évaluations à corriger | Idem | Champ `nb_copies_corrigees` |
| Progression curriculum % | Idem | Dérivé de `ra_tracking` |

---

## 8. Navigation ajoutée

| Item | Avant | Après |
|------|-------|-------|
| Sidebar "Mon Année" | Alias smart → `localStorage` → `classes/[id]/programme` | Route dédiée `/dashboard/mon-annee` |
| `/dashboard/mon-annee` | N'existait pas | Page cockpit avec sélecteur de classe |
| `classes/[id]/programme` | Inchangé | 9 onglets toujours accessibles via CTAs |

---

## 9. États vides créés

| Composant | État vide |
|-----------|-----------|
| Aucune classe | Page vide avec CTA "Créer une classe" |
| Classe sans pack | Bandeau + CTA "Construire mon année →" |
| Pack sans contenu généré | Métriques `—`, barres à 0 % |
| Séquence en cours absente | Message "Toutes les séquences sont terminées ou aucune n'a débuté" |
| Plan annuel vide | "Aucune séquence disponible — construisez votre année" |
| RA vides | "Le syllabus doit d'abord être généré" |
| Tâches vides | "Aucune tâche détectée" avec explication |
| Évaluations vides | "Prochainement disponible" |

---

## 10. Responsive

- Layout principal : `flexbox` + `grid` avec `minmax(300px, 1fr)` 
- Desktop (prioritaire) : layout 2 colonnes pour progression + métriques
- Tablette : colonnes réduites via `flex-wrap: 'wrap'` et `flex: '1 1 Xpx'`
- Tableaux : `overflow-x: auto` sur leurs conteneurs
- Sélecteur de classe : dropdown natif React (pas de composant externe)

---

## 11. Tests recommandés

| Scénario | Attendu |
|----------|---------|
| Compte neuf (0 classe) | EmptyClassState — CTA "Créer une classe" |
| Compte avec classe, sans pack | Bandeau "Construire mon année" |
| Compte avec Teaching Pack `erreur` | Statut badge "Erreur", métriques `—` |
| Compte avec pack `partiellement_genere` | Séquences et leçons affichées |
| Compte avec pack `pret` + leçons enseignées | Progression calculée, séquences classées |
| Multi-classes | Sélecteur affiche toutes les classes, changement recharge |
| Query param `?classeId=xxx` | Classe pré-sélectionnée |

---

## 12. Résultat tsc

```
npx tsc --noEmit → 0 erreurs
```

---

## 13. Résultat build

```
npm run build → Succès (120 pages)
/dashboard/mon-annee → ○ (Static, Suspense shell)
Aucune régression sur les routes existantes
```

---

## 14. Dette technique restante

| Dette | Priorité | Description |
|-------|----------|-------------|
| Tracking RA | Haute | Ajouter une table de suivi pour que CurriculumCoverage devienne fonctionnel |
| Évaluations | Haute | Table `evaluations` avec dates pour `UpcomingAssessments` |
| Refresh temps réel | Moyenne | Écouter les changements Supabase via `supabase.channel()` |
| Navigation "Planification" | Basse | Regrouper `Séquences + Leçons` sous un seul onglet dans le programme |
| `Quiz` hors section structurelle | Basse | À migrer vers "Ressources" selon spec navigation mission 11 |

---

## 15. Recommandation pour la mission suivante

**MON-ANNEE-V2 : Interactivité et tracking RA**

1. Créer une table `ra_tracking (enseignant_id, classe_id, ra_text, statut, updated_at)` — migration idempotente
2. Activer les colonnes `CurriculumCoverage` (Planifié / Préparé / Enseigné / Évalué)
3. Rendre les lignes de `CurriculumCoverage` cliquables → panneau latéral montrant les séquences et leçons associées
4. Permettre de marquer une leçon "Enseignée" directement depuis Mon Année → mise à jour `LeconProgramme.statut`
5. Activer `UpcomingAssessments` via une table `evaluations`

---

*Document généré dans le cadre de MON-ANNEE-V1 — Cockpit pédagogique annuel*  
*Ne pas push avant validation Product Owner*
