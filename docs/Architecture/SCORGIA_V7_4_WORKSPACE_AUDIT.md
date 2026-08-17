# SCORGIA V7.4 — Workspace Audit (Phase 0)

**Date :** août 2026  
**Portée :** Routes, composants, données, navigations, liens legacy, risques

---

## 1. Architecture actuelle

### Routes Mon Année

| Route | Fichier | Composant racine | Comportement |
|-------|---------|-----------------|--------------|
| `/dashboard/mon-annee` | `src/app/dashboard/mon-annee/page.tsx` | `GlobalTeacherCockpit` | 2 onglets horizontaux : Aperçu global / Élèves & Soutien |
| `/dashboard/mon-annee/[classeId]` | `src/app/dashboard/mon-annee/[classeId]/page.tsx` | `SchoolYearWorkspace` | 10 onglets horizontaux (8 migrated + 2 links externes) |
| `/dashboard/mon-annee/[classeId]/eleves/[eleveId]` | `src/app/dashboard/mon-annee/[classeId]/eleves/[eleveId]/page.tsx` | Page détail élève | 3 onglets : Profil / Plan soutien / Historique |

### Composants actifs Mon Année (V7.3)

#### Dossier `/global/`
- **`GlobalTeacherCockpit.tsx`** — Cockpit global (métriques, AttentionPanel, ClassTable). Actuellement la page d'entrée de `/dashboard/mon-annee`.

#### Dossier `/academic/`
- **`CurriculumView.tsx`** — Vue RA avec drill-down (V2) / fallback V1
- **`SyllabusTab.tsx`** — SyllabusViewer read-only avec lien édition
- **`PlanAnnuelView.tsx`** — Unités expand/collapse avec progression
- **`SequencesView.tsx`** — Détail séquences + leçons avec statuts
- **`PlansLeconView.tsx`** — Arbre sidebar + document plan collapsable
- **`LeconsWorkspace.tsx`** — Explorer filtrable + viewer ContenuLecon

#### Dossier `/student-support/`
- **`ClassSupportSummary.tsx`** — Agrégat non-nominatif classe
- **`StudentSupportList.tsx`** — Liste élèves avec filtres

#### Racine `/mon-annee/`
- **`SchoolYearWorkspace.tsx`** — Shell classe avec nav horizontale 10 onglets
- **`YearProgressHero.tsx`** — Hero métriques année (% avancement)
- **`NowSection.tsx`** — Séquence actuelle + leçon en cours
- **`AnnualFlightPlan.tsx`** — Plan de vol annuel
- **`CurriculumProgressSummary.tsx`** — Résumé couverture curriculum
- **`QuickActions.tsx`** — Actions prioritaires dérivées
- **`MarkTaughtModal.tsx`** — Modal marquage leçon enseignée

#### Composants legacy (non supprimés, potentiellement inutilisés)
- `SchoolYearHub.tsx` — Remplacé par GlobalTeacherCockpit. INUTILISÉ dans les routes actuelles.
- `SchoolYearDashboard.tsx` — Ancien dashboard classe. INUTILISÉ.
- `AnnualPlanOverview.tsx` — Ancienne vue plan. STATUT : vérifier usages.
- `CurriculumCoverage.tsx` — Composant standalone coverage. STATUT : vérifier usages.
- `PriorityTasks.tsx`, `UpcomingAssessments.tsx`, `YearMetricsRow.tsx`, `YearProgressCard.tsx` — Créés mais pas encore vérifiés si utilisés.

### Composants build-year réutilisables
- `SyllabusViewer.tsx` — **Réutilisé** dans SyllabusTab
- `SyllabusEditor.tsx` — Éditeur syllabus complet
- `AnnualPlanTimeline.tsx` — Timeline programme
- `DetailedLessonView.tsx` — Vue leçon détaillée
- `QualityReport.tsx`, `TeachingPackCard.tsx`, `TemplateMapping.tsx`

---

## 2. Problèmes identifiés

### P1 — Duplication globale/classe (CRITIQUE)
Deux espaces séparés avec leur propre navigation, leur propre fetch, leur propre design :
- `/dashboard/mon-annee` → GlobalTeacherCockpit (2 onglets)
- `/dashboard/mon-annee/[classeId]` → SchoolYearWorkspace (10 onglets)

Conséquence : l'utilisateur change de "peau" en naviguant vers une classe. Rupture UX.

### P2 — Navigation horizontale saturée (ÉLEVÉ)
SchoolYearWorkspace a 10 onglets en horizontal scroll. Sur 1366×768, beaucoup trop long.

### P3 — Répétition Plan annuel / Séquences (MOYEN)
PlanAnnuelView et SequencesView exposent des données très similaires.
- PlanAnnuelView = cartographie temporelle/macro
- SequencesView = architecture pédagogique détaillée
Ces deux vues doivent être différenciées clairement.

### P4 — Curriculum global absent (ÉLEVÉ)
En mode "toutes les classes", aucune vue Curriculum portfolio. L'onglet Curriculum n'existe que sur `/[classeId]`.

### P5 — Syllabus global absent (ÉLEVÉ)
Même problème. Le syllabus n'est accessible que par classe.

### P6 — Contexte classe/matière non uniforme (MOYEN)
- GlobalTeacherCockpit : ClassSelectorGlobal → navigue vers /[classeId] (changement de page)
- SchoolYearWorkspace : ClassSelector → navigue vers /[autreClasseId] (changement de page)
- Aucune persistence du contexte matière.

### P7 — Évaluations et Ressources quittent Mon Année (MOYEN)
- Onglet Évaluations → lien externe `/dashboard/classes/${classeId}/programme?tab=evaluations`
- Onglet Ressources → lien externe `/dashboard/classes/${classeId}/ressources`

### P8 — Loader (BAS)
LoadingScreen.tsx utilise déjà `ScorgiaLogo variant="icon"`. Aucun K visible dans le code. L'image `/branding/scorgia-icon.png` n'a pas été inspectée — pourrait être l'ancienne icône K côté asset.

### P9 — Plans de Leçon ≈ Leçons (MOYEN)
PlansLeconView et LeconsWorkspace sont visuellement très similaires (arbre gauche + panneau droit). Doivent être différenciés clairement.

---

## 3. Modèle de données réel

### Classe
```typescript
type Classe = {
  id: string
  enseignant_id: string
  nom: string         // ex. "8B", "Groupe A"
  niveau: string      // ex. "8e année"
  matiere: string     // CHAMP TEXTE LIBRE — pas de table séparée
  nombre_eleves: number
  couleur: string
  langue: Langue
  annee_scolaire: string
  curriculum_charge: boolean
  created_at: string
}
```

**Important :** `matiere` est un `string` libre, pas une foreign key. Le filtre Matière = déduplication des valeurs uniques de `allClasses.map(c => c.matiere)`.

### Sources de données par tab

| Onglet | Source principale |
|--------|------------------|
| Aperçu (global) | classes, packs, programmes (summary), eventCounts, eleves, supportPlans |
| Aperçu (classe) | pack, programme (contenu_json), teachingEvents, deriveData() |
| Curriculum | programme.contenu_json.curriculum_outcomes (V2) |
| Syllabus | pack.contenu_json.syllabus OU programme.syllabus_json |
| Plan annuel | programme.contenu_json.unites[], lessonStateMap |
| Séquences | programme.contenu_json.unites[], lessonStateMap |
| Plans de leçon | programme.contenu_json.unites[], lecons[] (DB), lessonStateMap |
| Leçons | programme.contenu_json.unites[], lecons[] (DB), lessonStateMap |
| Évaluations | programme.contenu_json.unites[].evaluation_prevue (V2 seulement) |
| Élèves & Soutien | eleves, supportPlans |
| Documents | class-folder binding (fichiers_dossier / future) |

---

## 4. Navigation existante qui quitte Mon Année

| Déclencheur | Destination | Criticité |
|------------|-------------|-----------|
| Onglet "Évaluations" (non-migrated) | `/dashboard/classes/${classeId}/programme?tab=evaluations` | P7 |
| Onglet "Ressources" (non-migrated) | `/dashboard/classes/${classeId}/ressources` | P7 |
| Lien "Construire mon année" (multiple) | `/dashboard/classes/${classeId}/programme` | Acceptable (action) |
| Lien "Gérer mes classes" dans ClassSelector | `/dashboard/classes` | Acceptable |
| Lien "← ScorgIA" dans les headers | `/dashboard` | Attendu |
| Lien "Ouvrir dans Préparer" (PlansLeconView, LeconsWorkspace) | `/dashboard/classes/${classeId}/lecons/${id}` | Acceptable (action) |
| Lien "Modifier le syllabus" (SyllabusTab) | `/dashboard/classes/${classeId}/programme?tab=syllabus` | Acceptable (action) |

---

## 5. Propagation du classeId

**Actuelle :**
- `/dashboard/mon-annee` : aucun classeId — GlobalTeacherCockpit
- `/dashboard/mon-annee/[classeId]` : `useParams<{ classeId: string }>()` dans [classeId]/page.tsx
- Changement de classe = navigation full page vers nouvelle URL

**V7.4 :**
- `SchoolYearWorkspaceShell` gère `classeId` comme state local
- `initialClasseId` passé en prop depuis les deux pages
- Changement de classe = mise à jour state (pas de navigation)
- localStorage `klassia_active_classe` maintenu pour rétrocompat

---

## 6. Composants conservés intacts

Ces composants ne seront PAS modifiés en V7.4 :
- Tout `src/components/mon-annee/academic/*.tsx`
- Tout `src/components/mon-annee/student-support/*.tsx`
- `MarkTaughtModal.tsx`, `YearProgressHero.tsx`, `NowSection.tsx`
- `AnnualFlightPlan.tsx`, `CurriculumProgressSummary.tsx`, `QuickActions.tsx`
- `src/components/build-year/SyllabusViewer.tsx`
- `src/lib/spie/derive-dashboard-data.ts` et engines

---

## 7. Composants remplacés/dépréciés (gardés, plus primaires)

Ces composants deviennent des dépendances secondaires ou legacy :
- `GlobalTeacherCockpit.tsx` — remplacé par WorkspaceApercu (mode global) dans le shell
- `SchoolYearWorkspace.tsx` — remplacé par SchoolYearWorkspaceShell

**IMPORTANT :** Ces fichiers NE SONT PAS SUPPRIMÉS. Ils restent en place pour rétrocompatibilité (d'autres parties du code pourraient les importer).

---

## 8. Plan d'implémentation V7.4

### Nouveaux fichiers

```
src/components/mon-annee/workspace/
  SchoolYearWorkspaceShell.tsx   ← NOUVEAU shell principal avec nav verticale
  CurriculumPortfolio.tsx        ← NOUVEAU portfolio curriculum global
  SyllabusPortfolio.tsx          ← NOUVEAU portfolio syllabus global
  EvaluationsView.tsx            ← NOUVEAU évaluations inline
```

### Fichiers modifiés

```
src/app/dashboard/mon-annee/page.tsx              ← wrapper fin → SchoolYearWorkspaceShell
src/app/dashboard/mon-annee/[classeId]/page.tsx   ← wrapper fin → SchoolYearWorkspaceShell
```

### Fichiers NON modifiés
Tous les autres.

---

## 9. Risques

| Risque | Probabilité | Mitigation |
|--------|-------------|-----------|
| Régression MarkTaughtModal | Faible | Conservé via prop onMarkTaught dans le shell |
| LocalOverrides dans le shell (optimistic UI) | Faible | Géré dans state shell |
| Performance (contenu_json tous programmes) | Moyen | Déjà fait dans page.tsx actuelle — maintenu |
| TypeScript strict (nouveau shell) | Faible | tsc --noEmit obligatoire avant commit |
| Mobile (non prioritaire) | Bas | Nav gauche se cache en ≤768px |

---

## 10. Ce que V7.4 NE fait PAS

- Pas d'éditeur Google Docs pour les leçons
- Pas de refonte des moteurs SPIE
- Pas de migrations distantes
- Pas de suppression des composants legacy
- Pas de nouveaux modèles DB
- Pas de redesign radical du plan annuel / séquences / plans de leçon / leçons (V7.3 est suffisant)
