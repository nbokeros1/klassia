# MON-ANNEE-V6 — School Year Workspace Architecture

**Version:** V6  
**Date:** 2026-08-17  
**Statut:** Livré

---

## Objectif

Transformer "Mon Année" en un cockpit pédagogique professionnel multi-classes :
1. Hub (`/dashboard/mon-annee`) — vue d'ensemble de toutes les classes
2. Workspace (`/dashboard/mon-annee/[classeId]`) — cockpit isolé par classe

---

## Architecture

### Niveaux

```
/dashboard/mon-annee             → Hub multi-classes (SchoolYearHub)
/dashboard/mon-annee/[classeId]  → Workspace par classe (SchoolYearWorkspace)
```

### Composants

| Composant | Rôle |
|---|---|
| `SchoolYearHub` | Grille de cartes par classe avec métriques réelles |
| `SchoolYearWorkspace` | Shell workspace : header, class selector, mini-nav, cockpit |
| `YearProgressHero` | Barres de progression enseignement/préparation/calendrier + indicateur de rythme |
| `NowSection` | Séquence en cours + Prochaine leçon + actions directes |
| `AnnualFlightPlan` | Roadmap interactive expandable : séquences + leçons + mark-taught |
| `CurriculumProgressSummary` | Couverture RA (V2 uniquement) + RA non planifiés |
| `QuickActions` | 1–4 actions prioritaires dérivées de `getNextTeachingAction()` |
| `MarkTaughtModal` | Modal V5 (inchangé) — POST teaching_events, append-only |

### Données

- Hub : batch `IN clause` (packs + programmes + events) — pas de N+1
- Workspace : séquentiel ciblé (classe → pack → programme → events)
- `deriveData()` : fonction pure partagée (`src/lib/spie/derive-dashboard-data.ts`)
- `lessonStateMap` : Record<"seqIdx:leconIdx", LessonTeachingState> — V5

---

## Mini-nav

| Tab | Statut | Destination |
|---|---|---|
| Aperçu | Migré (cockpit V6) | Dans le workspace |
| Curriculum | Lien | `/dashboard/classes/[id]/programme?tab=syllabus` |
| Syllabus | Lien | `/dashboard/classes/[id]/programme?tab=syllabus` |
| Plan Annuel | Lien | `/dashboard/classes/[id]/programme?tab=plan_annuel` |
| Séquences | Lien | `/dashboard/classes/[id]/programme?tab=sequences` |
| Plans de Leçon | Lien | `/dashboard/classes/[id]/lecons` |
| Évaluations | Lien | `/dashboard/classes/[id]/programme?tab=evaluations` |
| Ressources | Lien | `/dashboard/classes/[id]/ressources` |

---

## Sidebar

- "Mon Année" ouvre dans un **nouvel onglet** (`target="_blank" rel="noopener noreferrer"`)
- Propriété `newTab: true` dans la définition `NavItemDef`

---

## Règles respectées

- Aucune donnée fictive — état neutre si données absentes
- Aucune migration Supabase (V6 sans schéma changes)
- Backward compatibility V1–V5 intacte
- Mark-taught V5 accessible depuis NowSection + AnnualFlightPlan
- Indicateur de rythme basé sur `derivePacingIndicator()` (pur, sans side-effects)
- Titres réels V2 utilisés partout (pas de "Unité 1 / Leçon 1" par défaut)
- tsc = 0, build = succès

---

## Fichiers créés/modifiés (V6)

**Créés :**
- `src/components/mon-annee/SchoolYearHub.tsx`
- `src/components/mon-annee/SchoolYearWorkspace.tsx`
- `src/components/mon-annee/YearProgressHero.tsx`
- `src/components/mon-annee/NowSection.tsx`
- `src/components/mon-annee/AnnualFlightPlan.tsx`
- `src/components/mon-annee/CurriculumProgressSummary.tsx`
- `src/components/mon-annee/QuickActions.tsx`
- `src/app/dashboard/mon-annee/[classeId]/page.tsx`
- `src/lib/spie/derive-dashboard-data.ts`

**Modifiés :**
- `src/app/dashboard/mon-annee/page.tsx` — refactorisé en hub batch
- `src/components/Sidebar.tsx` — newTab support
