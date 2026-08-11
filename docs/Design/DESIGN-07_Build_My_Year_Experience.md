# DESIGN-07 — Build My Year Experience 2.0
## Transformer « Construire mon année » en expérience signature

**Date :** 2026-08-10
**Référence :** DS 2.0 Phase 1 — après DESIGN-06

---

## Philosophie

> « Votre année prend forme. »

Le parcours ne doit pas ressembler à un formulaire administratif. Il doit raconter une progression. L'enseignant configure une fois, et son année s'organise devant lui.

---

## Missions implémentées

| Mission | Titre | Statut |
|---------|-------|--------|
| M1  | Entry Screen | ✅ — "Commencer" / "Reprendre" selon état réel |
| M2  | Step Navigation | ✅ — dots discrets, label actif en violet |
| M3  | Context Step | ✅ — 5 champs primaires, options avancées masquées |
| M5  | Template Step | existant — 3 gabarits, choix clair |
| M6  | Calendar Step | existant — champs essentiels |
| M7  | Review Step | ✅ — résumé minimal (matière · niveau, province, calendrier) |
| M8  | Build Screen | ✅ — `BuildProgressView` avec timeline, 0 spinner |
| M9  | Live Year Preview | ✅ — chips verts si séquences/plans détectés dans events |
| M10 | No Full-Screen Spinner | ✅ — supprimé |
| M11 | Resume Experience | existant — reprendre depuis checkpoint exact |
| M12 | Error Experience | ✅ — description claire, ce qui est prêt visible |
| M13 | Final Success | ✅ — "Votre année est prête." + liste discrète + "Ouvrir mon année" |
| M14 | Direct Workspace Handoff | ✅ — navigate vers `/dashboard/gerer/preparer` avec classe active |
| M15 | Reopen Behaviour | existant — wizard ne s'ouvre plus automatiquement après construction |
| M16 | Progressive Disclosure | ✅ — "Options avancées" masquées dans `<details>` |
| M17 | Copywriting | ✅ — phrases courtes, 0 jargon |
| M21 | Qualité | ✅ — `npx tsc --noEmit` → 0 erreur |

---

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `src/app/globals.css` | Ajout section DESIGN-07 — CSS `d7-*` classes |
| `src/components/build-year/BuildMyYearWizard.tsx` | StepIndicator, StepContexte, StepResume, BuildProgressView |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | `handleWizardDone`, `handleOpenWorkspace`, `onOpenWorkspace` prop |

---

## Nouvelle logique — handoff workspace (M14)

```
Build terminé
  → handleWizardDone()  [charge les données, ne cache pas le wizard]
  → BuildProgressView shows "Votre année est prête."
  → CTA "Ouvrir mon année →"
  → handleOpenWorkspace()
      → localStorage.setItem('klassia_active_classe', id)
      → router.push('/dashboard/gerer/preparer')
      → setShowWizard(false)
```

---

## Voir aussi

- [Build_Progress_Experience.md](Build_Progress_Experience.md)
- [Build_Error_States.md](Build_Error_States.md)
- [Build_to_Workspace_Handoff.md](Build_to_Workspace_Handoff.md)
- [DESIGN-07_Report.md](DESIGN-07_Report.md)
