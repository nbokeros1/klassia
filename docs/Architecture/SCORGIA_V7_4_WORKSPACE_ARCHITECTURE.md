# SCORGIA V7.4 — Architecture Workspace Unifié

**Date :** août 2026  
**Composant central :** `SchoolYearWorkspaceShell`  
**Portée :** `src/components/mon-annee/workspace/`

---

## Arbre des composants

```
SchoolYearWorkspaceShell
│
├── [Header sticky 56px]
│   ├── ScorgiaLogo (← /dashboard)
│   ├── MatiereSelector (inline dropdown)
│   └── ClassSelector (inline dropdown)
│
├── [Left nav 220px sticky]
│   ├── WorkspaceNav (sections + items)
│   └── Classe active pill (si classeId)
│
└── [Content area flex:1]
    │
    ├── apercu (global)   → MetricCard × 6 + classes table
    ├── apercu (classe)   → YearProgressHero + QuickActions + NowSection + AnnualFlightPlan + CurriculumProgressSummary
    ├── curriculum        → CurriculumPortfolio → CurriculumView (drill-down)
    ├── syllabus          → SyllabusPortfolio → SyllabusViewer (drill-down)
    ├── plan_annuel       → PlanAnnuelView
    ├── sequences         → SequencesView
    ├── plans_lecon       → PlansLeconView
    ├── lecons            → LeconsWorkspace
    ├── evaluations       → EvaluationsView
    ├── eleves_soutien    → ClassSupportSummary + StudentSupportList
    └── documents         → empty state + lien contextuel
```

---

## Stratégie de fetch

### Fetch global (mount)

Déclenché une seule fois au montage du shell. Charge tout ce qui est nécessaire pour l'aperçu global et les portfolios.

```
supabase.from('utilisateurs') → profil
supabase.from('classes')      → allClasses (triées par created_at DESC)
supabase.from('teaching_packs')    → packs (Record<classeId, TeachingPack>)
supabase.from('programme_annuel')  → programmes (Record<classeId, ProgrammeAnnuel> avec contenu_json)
supabase.from('teaching_events')   → événements partiels (teaching_pack_id, indices, event_type, occurred_at)
supabase.from('eleves')            → tous les élèves de l'enseignant
supabase.from('student_support_plans') → tous les plans (graceful — table peut ne pas exister)
```

Event counts (leçons enseignées par pack) : calculés en mémoire à partir des événements partiels.

### Fetch classe-spécifique (loadClassData)

Déclenché à chaque changement de `classeId`. Charge les données nécessaires pour les onglets Programme et Aperçu classe.

```
supabase.from('teaching_events') → tous les events du pack (SELECT *)
supabase.from('lecons')          → leçons de la classe
```

Puis : `deriveData(pack, programme, teachingEvents, annee_scolaire)` → `SchoolYearDashboardData`

**Optimisation :** `packs[classeId]` et `programmes[classeId]` sont déjà en mémoire depuis le fetch global. Seuls les events complets + leçons sont re-fetchés.

---

## État du shell

```typescript
// Global (immuable après mount)
profil:       { id, prenom, nom, langue } | null
allClasses:   Classe[]
packs:        Record<classeId, TeachingPack>
programmes:   Record<classeId, ProgrammeAnnuel>
eventCounts:  Record<packId, number>          // nombre leçons enseignées
eleves:       Eleve[]
supportPlans: StudentSupportPlanRow[]

// Contexte (mutable par l'utilisateur)
activeTab:     WorkspaceTab
classeId:      string | null
matiereFilter: string | null

// Classe-spécifique (chargé lazily)
classData: {
  teachingEvents:  TeachingEvent[]
  lecons:          Lecon[]
  dashboardData:   SchoolYearDashboardData
  localOverrides:  Record<string, LessonTeachingState>  // optimistic UI
} | null

// UI
loadingGlobal: boolean
loadingClass:  boolean
modalTarget:   ModalTarget | null
```

---

## Context Engine

### Règles de conservation du contexte

| Action | Effet sur activeTab | Effet sur classeId | Effet sur matiereFilter |
|--------|--------------------|--------------------|------------------------|
| Sélectionner une classe | Conservé | Mis à jour | Conservé |
| Désélectionner la classe | Si onglet classe-requis → 'apercu' | null | Conservé |
| Changer de matière | Conservé | Effacé si classe ne correspond pas | Mis à jour |
| Changer d'onglet | Mis à jour | Conservé | Conservé |

### Onglets classe-requis

`plan_annuel`, `sequences`, `plans_lecon`, `lecons`, `evaluations`, `documents`

Ces onglets sont visuellement désactivés (opacity 0.4, cursor not-allowed) si `classeId` est null. Sélectionner ces onglets sans classe affiche un `SelectClassePrompt`.

### LocalStorage

`localStorage.setItem('klassia_active_classe', classeId)` maintenu lors du chargement de la classe pour rétrocompatibilité avec d'autres composants du dashboard.

---

## MarkTaughtModal

Le modal est géré directement dans le shell via `modalTarget: ModalTarget | null`.

```typescript
interface ModalTarget {
  lecon:    LeconProgramme
  seqIdx:   number
  leconIdx: number
}
```

`NowSection` et `AnnualFlightPlan` reçoivent `onMarkTaught` prop qui met `modalTarget`. À la confirmation (`onDone`), le shell :
1. Met à jour `classData.localOverrides` (optimistic update immédiat)
2. Re-fetch les données de la classe (`loadClassData(classeId)`)

---

## Nouveaux composants V7.4

### `CurriculumPortfolio`

Tableau portfolio des curricula par classe + drill-down vers `CurriculumView`.

- Mode global (aucune classe) : tableau avec colonnes Classe, Province, Curriculum, RA totaux, RA planifiés, RA enseignés, Statut
- Mode classe : même tableau + `CurriculumView` en dessous
- Statut V1 vs V2 : badge amber si pas de `curriculum_outcomes` (pack V1)

### `SyllabusPortfolio`

Tableau portfolio des syllabus + drill-down vers `SyllabusViewer`.

- Complétude : `getSyllabusCompleteness(syllabus).score` → barre de progression 72px
- Labels : Prêt ≥80% / À compléter ≥50% / À revoir <50%
- Mode classe : `SyllabusViewer` read-only + lien "Modifier →"

### `EvaluationsView`

Vue inline des évaluations planifiées par unité.

- Vide si pas de `contenu` → lien "Construire mon année"
- Vide si pas d'`evaluation_prevue` ni `activite_culminante` → message format V1
- Sinon : cartes par unité avec activité culminante (violet), évaluation sommative (amber), preuves par leçon

### `SchoolYearWorkspaceShell`

Shell principal. Voir la section "État du shell" ci-dessus.

---

## URLs et rétrocompatibilité

| URL | Comportement V7.4 |
|-----|------------------|
| `/dashboard/mon-annee` | Shell sans initialClasseId |
| `/dashboard/mon-annee/[classeId]` | Shell avec `initialClasseId={classeId}` (classe pré-sélectionnée) |
| `/dashboard/mon-annee/[classeId]/eleves/[eleveId]` | Page détail élève — INCHANGÉE |

Les deeplinks vers `/mon-annee/[classeId]` continuent de fonctionner et pré-sélectionnent la classe.

---

## Contraintes respectées

- Zéro migration DB en V7.4
- Zéro modification des moteurs SPIE (derive-dashboard-data, curriculum-coverage, etc.)
- Zéro suppression de composants existants
- `tsc --noEmit` = 0 erreurs
- `npm run build` = SUCCESS
