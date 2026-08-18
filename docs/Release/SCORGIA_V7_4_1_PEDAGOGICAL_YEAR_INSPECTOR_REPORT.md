# SCORGIA V7.4.1 — Pedagogical Year Inspector
**Date :** 2026-08-17  
**Branche :** main (commit local uniquement — NO PUSH)  
**Statut :** LIVRÉ · En attente validation Product Owner

---

## Objectif

Transformer les onglets académiques de Mon Année en un UX "Pedagogical Year Inspector" :
un système à deux volets avec un navigateur cool-grey/bleu-marine (LEFT 310px) et un panneau
inspecteur solide blanc (RIGHT). Hiérarchie canonique affichée partout : Programme → Unité → Leçon.

---

## Fichiers créés / modifiés

| Fichier | Action | Description |
|---|---|---|
| `src/lib/spie/pedagogical-year-tree.ts` | Créé (V7.4.1 prev.) | Modèle de vue canonique partagé |
| `src/components/mon-annee/academic/PlansLeconView.tsx` | **Réécrit** | Inspecteur deux-panes : plans de leçon |
| `src/components/mon-annee/academic/LeconsWorkspace.tsx` | **Réécrit** | Registre opérationnel deux-panes |
| `src/components/mon-annee/academic/SequencesView.tsx` | **Réécrit** | Inspecteur d'unité deux-panes |
| `src/components/mon-annee/workspace/SchoolYearWorkspaceShell.tsx` | Modifié | Label "Unités & séquences" → "Unités" |

**Fichiers inchangés :** `PlanAnnuelView.tsx` — terminologie déjà correcte.

---

## Architecture deux-panes

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LEFT (310px)                    │  RIGHT (flex: 1)                     │
│  background: rgba(13,30,58,0.95) │  background: rgba(255,255,255,0.95) │
│  backdrop-filter: blur(10px)     │  Pas de glassmorphism               │
│  Texte: blanc / muted blanc      │  Texte: #0F1B2D / #5B6B85 / #8B97AC │
│                                  │                                      │
│  Navigateur hiérarchique :        │  Sections de l'inspecteur :          │
│  Programme → Unité → Leçon       │  Header · Ancrage curriculaire       │
│  Filtres · Statut par dot-color  │  Statut · Lifecycle · Trace · Actions│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Modèle de vue canonique — `pedagogical-year-tree.ts`

```typescript
export type LessonStatus = 'enseignee' | 'a_reprendre' | 'preparee' | 'en_cours' | 'planifiee'

export function buildPedagogicalYearTree(
  contenu:        ContenuProgramme,
  leconDBList:    Lecon[],
  lessonStateMap: Record<string, LessonTeachingState> | undefined,
): PedagogicalYearTree

export function resolveLessonStatus(lecon, seqIdx, leconIdx, map?): LessonStatus
```

Les trois composants académiques utilisent `buildPedagogicalYearTree()` via `useMemo`
pour dériver l'arbre de vue depuis les mêmes données source.

---

## PlansLeconView — Plan Status Inspector

- **LEFT** : navigateur d'unités/leçons avec expand/collapse, barre de progression mini, dot-color par statut
- **RIGHT** : Breadcrumb · Titre · Méta-pills · Ancrage curriculaire · Statut du plan (checklist 10 sections) · Document · Trace d'enseignement · Actions
- Checklist de complétude (0–100%) pour les plans existants
- Vide sélection : empty state "Sélectionnez une leçon..."

## LeconsWorkspace — Registre Opérationnel

- **LEFT** : filtre chips (Toutes / Enseignées / À reprendre / Préparées / Non préparées) + arbre U→L
- Stats bar en haut : compteurs par statut (pills)
- **RIGHT** : Identité · Ancrage curriculaire · Cycle de vie (4 items condensés) · Trace d'enseignement · Actions
- Focus sur l'événement d'enseignement, pas sur le document

## SequencesView — Inspecteur d'Unité

- **LEFT** : liste d'unités avec badge U{n}, titre, semaine, leçons/enseignées, mini progress
- **RIGHT** : Objectifs · Justification pédagogique (V2) · Grandes idées (V2) · Concepts clés (V2) · Résultats d'apprentissage (V2) · Activité culminante + Évaluation · Leçons de l'unité (compact)

---

## Données inventées : AUCUNE

Aucune donnée fictive n'a été introduite. Les champs absents du schéma sont documentés
en bandeau informatif dans les composants :

| Champ manquant | Comportement |
|---|---|
| `question_directrice` | `ⓘ Question directrice — non disponible dans le schéma actuel (prévu V8)` |
| `CCHP` | `ⓘ CCHP — non disponible dans le schéma actuel (prévu V8)` |
| RA (programmes V1) | `ⓘ Résultats d'apprentissage disponibles avec les programmes V2` |

---

## Hiérarchie canonique actée

```
Programme → Unité → Leçon
```

L'ancienne terminologie "Séquence" pour désigner les Unités est abandonnée dans
tous les composants réécrits. Le label du tab navigateur est passé de
"Unités & séquences" à "Unités".

La hiérarchie sous-séquence n'existe pas dans le schéma de données KlassIA
(`Unite.lecons[]` directement, pas de sous-séquences). Les composants reflètent
fidèlement le modèle réel.

---

## Qualité

| Gate | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run build` | ✅ SUCCESS |
| Données fictives | ✅ Aucune |
| Migrations DB | ✅ Aucune |
| Push Git | ✅ Aucun push effectué |

---

## Décision technique : `SequencesView` sans leconDBList

`SequencesView` passe `leconDBList=[]` à `buildPedagogicalYearTree()` car la vue
inspecteur d'unité n'a pas besoin des enregistrements DB complets des leçons.
Le statut résolu reste correct (`resolveLessonStatus` prioritise `lessonStateMap`
puis `lecon.statut` puis `lecon.lecon_id` pour 'preparee'). Les liens directs vers
les leçons ne s'affichent pas dans cette vue (intentionnel — l'utilisateur navigue
vers LeconsWorkspace pour le détail opérationnel).
