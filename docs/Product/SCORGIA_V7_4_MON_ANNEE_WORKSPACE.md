# SCORGIA V7.4 — Mon Année : Workspace Unifié

**Date :** août 2026  
**Statut :** Commitée — en attente de validation Product Owner  
**Portée :** `/dashboard/mon-annee` + `/dashboard/mon-annee/[classeId]`

---

## Vue d'ensemble

V7.4 unifie les deux espaces séparés (GlobalTeacherCockpit + SchoolYearWorkspace) en un seul shell — `SchoolYearWorkspaceShell` — accessible via navigation verticale persistante.

L'enseignant n'est plus "téléporté" d'une interface à l'autre lorsqu'il sélectionne une classe. La session reste dans le même workspace, le contexte (onglet actif, filtre matière) est préservé.

---

## Ce qui change pour l'enseignant

### Avant V7.4

| Comportement | Problème |
|---|---|
| `/mon-annee` → GlobalTeacherCockpit (2 onglets) | Rupture UX à l'ouverture d'une classe |
| `/mon-annee/[classeId]` → SchoolYearWorkspace (10 onglets en scroll horizontal) | Onglets trop nombreux, débordement à 1366×768 |
| Évaluations → lien externe `/classes/[id]/programme?tab=evaluations` | Quitte Mon Année |
| Ressources → lien externe `/classes/[id]/ressources` | Quitte Mon Année |
| Aucun filtre matière | Impossible de se concentrer sur une discipline |
| Curriculum et Syllabus = vues par classe uniquement | Pas de vue d'ensemble portfolio |

### Après V7.4

| Comportement | Amélioration |
|---|---|
| Un seul workspace quelle que soit l'URL | Continuité totale |
| Navigation verticale gauche (220px) | Lisible sur toutes les résolutions |
| Évaluations = inline dans le workspace | Zéro sortie |
| Ressources = lien contextuel (Documents) avec explication | Transition explicite |
| Filtre Matière + Classe dans le header sticky | Contexte visible en permanence |
| Curriculum Portfolio = toutes classes en tableau | Vue d'ensemble + drill-down |
| Syllabus Portfolio = toutes classes avec score de complétude | Vue d'ensemble + drill-down |

---

## Navigation verticale

### Structure

```
PILOTAGE
  • Aperçu

PROGRAMME
  • Curriculum
  • Syllabus
  • Plan annuel
  • Unités & séquences
  • Plans de leçon
  • Leçons

SUIVI
  • Évaluations

ÉLÈVES
  • Élèves & soutien

RESSOURCES
  • Documents
```

### Comportement des onglets selon le contexte

| Onglet | Sans classe sélectionnée | Avec classe sélectionnée |
|--------|-------------------------|------------------------|
| Aperçu | Tableau KPI global + table des classes | Dashboard classe (YearProgressHero, NowSection, etc.) |
| Curriculum | Portfolio toutes classes | Portfolio + CurriculumView pour la classe |
| Syllabus | Portfolio toutes classes | Portfolio + SyllabusViewer pour la classe |
| Plan annuel | Prompt "sélectionnez une classe" (désactivé) | PlanAnnuelView |
| Unités & séquences | Idem | SequencesView |
| Plans de leçon | Idem | PlansLeconView |
| Leçons | Idem | LeconsWorkspace |
| Évaluations | Idem | EvaluationsView (inline) |
| Élèves & soutien | Liste globale | Filtrée sur la classe |
| Documents | Idem | Lien contextuel vers ressources classe |

---

## Filtre Matière + Classe

Le header sticky expose deux sélecteurs :
1. **Matière** (optionnel) — filtre les classes affichées dans le sélecteur de classe et les portfolios. Visible uniquement si l'enseignant a plusieurs matières différentes.
2. **Classe** (optionnel) — active le contexte classe. Sélectionne la classe active dans la nav, charge les données spécifiques.

Changement de matière : si la classe active ne correspond pas à la nouvelle matière, la classe est désélectionnée.

---

## Aperçu global — KPIs

Quand aucune classe n'est sélectionnée, l'Aperçu affiche 6 métriques calculées sur l'ensemble des classes :

- **Classes** : nombre de classes (filtré par matière si filtre actif)
- **Élèves** : total élèves DB ou `nombre_eleves` Classe
- **Leçons enseignées** : total enseignées / total planifiées + pourcentage
- **Couverture curriculum** : % moyen enseigné / planifié (leçons)
- **Plans de soutien** : plans actifs
- **À réviser** : plans avec `date_revision` dépassée

Le tableau des classes permet de cliquer sur une ligne pour activer directement le contexte de cette classe, avec indicateur de rythme (Dans le rythme / À surveiller / En retard) basé sur l'écart entre progression des leçons et avancement de l'année scolaire.

---

## Ce qui N'a PAS changé

- Aucun moteur SPIE modifié (`deriveData`, `buildLessonStateMap`, `getCurriculumCoverage`, etc.)
- Aucune migration base de données
- `GlobalTeacherCockpit.tsx` et `SchoolYearWorkspace.tsx` restent en place (non supprimés)
- Tous les composants V7.3 (`PlansLeconView`, `LeconsWorkspace`, `CurriculumView`, etc.) inchangés
- `MarkTaughtModal` fonctionne identiquement
- URL `/mon-annee/[classeId]` continue de précharger la classe via `initialClasseId`

---

## Périmètre technique V7.4

**Nouveaux fichiers :**
- `src/components/mon-annee/workspace/SchoolYearWorkspaceShell.tsx`
- `src/components/mon-annee/workspace/CurriculumPortfolio.tsx`
- `src/components/mon-annee/workspace/SyllabusPortfolio.tsx`
- `src/components/mon-annee/workspace/EvaluationsView.tsx`
- `docs/Architecture/SCORGIA_V7_4_WORKSPACE_AUDIT.md`

**Fichiers remplacés (wrappers fins) :**
- `src/app/dashboard/mon-annee/page.tsx` — 6 lignes, rend `<SchoolYearWorkspaceShell />`
- `src/app/dashboard/mon-annee/[classeId]/page.tsx` — 8 lignes, rend `<SchoolYearWorkspaceShell initialClasseId={classeId} />`

**Fichiers inchangés :** tous les autres.
