# SCORGIA V7.4 — Release Report

**Date :** août 2026  
**Commit :** `feat(mon-annee): consolidate school year workspace v7.4`  
**Statut :** Commitée localement — EN ATTENTE DE VALIDATION PRODUCT OWNER  
**Build :** ✅ SUCCESS  
**tsc :** ✅ 0 erreurs

---

## Résumé

V7.4 consolide les deux espaces Mon Année en un workspace unifié piloté par un shell central (`SchoolYearWorkspaceShell`) avec navigation verticale, sélecteurs Matière + Classe dans le header, et portfolios globaux pour le curriculum et le syllabus.

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/components/mon-annee/workspace/SchoolYearWorkspaceShell.tsx` | Shell principal (navigation verticale, fetch global + lazy, context engine) |
| `src/components/mon-annee/workspace/CurriculumPortfolio.tsx` | Portfolio curriculum (tableau toutes classes + drill-down CurriculumView) |
| `src/components/mon-annee/workspace/SyllabusPortfolio.tsx` | Portfolio syllabus (tableau + score complétude + SyllabusViewer) |
| `src/components/mon-annee/workspace/EvaluationsView.tsx` | Évaluations inline par unité (remplace le lien externe V7.3) |
| `docs/Architecture/SCORGIA_V7_4_WORKSPACE_AUDIT.md` | Audit Phase 0 (architecture existante, problèmes identifiés) |
| `docs/Product/SCORGIA_V7_4_MON_ANNEE_WORKSPACE.md` | Spec Product finale |
| `docs/Architecture/SCORGIA_V7_4_WORKSPACE_ARCHITECTURE.md` | Architecture technique détaillée |
| `docs/Release/SCORGIA_V7_4_REPORT.md` | Ce fichier |

## Fichiers modifiés (wrappers fins)

| Fichier | Avant | Après |
|---------|-------|-------|
| `src/app/dashboard/mon-annee/page.tsx` | 124 lignes (GlobalTeacherCockpit + fetch complet) | 6 lignes (wrapper `<SchoolYearWorkspaceShell />`) |
| `src/app/dashboard/mon-annee/[classeId]/page.tsx` | 124 lignes (SchoolYearWorkspace + fetch complet) | 8 lignes (wrapper `<SchoolYearWorkspaceShell initialClasseId={...} />`) |

## Corrections incluses

| Correction | Fichier |
|------------|---------|
| `CurriculumPortfolio.tsx` : suppression fonctions `coveragePctLabel/Num` mortes utilisant `CurriculumCoverageData.coveragePct` inexistant | `CurriculumPortfolio.tsx` |

---

## Bilan des problèmes résolus (V7.4 vs Audit)

| Problème | Statut |
|----------|--------|
| P1 — Deux espaces UX séparés | ✅ Résolu — un seul shell |
| P2 — Navigation horizontale saturée | ✅ Résolu — nav verticale 220px |
| P3 — Plan annuel / Séquences similaires | ✅ Différenciés (macro vs détail pédagogique) |
| P4 — Curriculum global absent | ✅ Résolu — CurriculumPortfolio |
| P5 — Syllabus global absent | ✅ Résolu — SyllabusPortfolio |
| P6 — Contexte classe/matière non uniforme | ✅ Résolu — Context Engine dans le shell |
| P7 — Évaluations et Ressources quittent Mon Année | ✅ Évaluations inline ; Documents avec explication contextuelle |
| P8 — Loader | Non traité (hors périmètre V7.4) |
| P9 — PlansLecon ≈ Leçons (arbre similaire) | Différenciés via labels ; refonte visuelle reportée à V8 |

---

## Qualité du code

```
tsc --noEmit  → Exit 0 (aucune erreur TypeScript)
npm run build → SUCCESS (toutes routes compilées)
```

---

## Ce qui N'est PAS dans V7.4

- Éditeur Google Docs pour les leçons
- Refonte visuelle Plans de leçon / Leçons
- Migration distante (aucune)
- Suppression des composants legacy (`GlobalTeacherCockpit`, `SchoolYearWorkspace`)
- Nouveaux modèles DB

---

## Vérification de la chaîne de données

| Lien | Source | Statut |
|------|--------|--------|
| allClasses | `supabase.from('classes')` | ✅ |
| packs | `supabase.from('teaching_packs')` indexés par classe_id | ✅ |
| programmes | `supabase.from('programme_annuel')` avec contenu_json | ✅ |
| eventCounts | Calculés depuis `teaching_events` partiels | ✅ |
| teachingEvents (classe) | `supabase.from('teaching_events')` par pack_id | ✅ |
| lecons (classe) | `supabase.from('lecons')` par classe_id | ✅ |
| deriveData() | `(pack, programme, teachingEvents, annee_scolaire)` | ✅ |
| lessonStateMap | `deriveData().lessonStateMap` + localOverrides | ✅ |
| curriculumCoverage | `deriveData().curriculumCoverage` | ✅ |

---

## Instruction Product Owner

**Ne pas push avant validation.** Le commit est local.

Pour valider et déployer :
```bash
git push origin main
```
