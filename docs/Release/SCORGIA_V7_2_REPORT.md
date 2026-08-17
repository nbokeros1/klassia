# ScorgIA V7.2 — PO Release Report

**Date :** 2026-08-17  
**Version :** 7.2.0 — Global Teacher Cockpit + Student Support Workspace  
**Commit :** feat: SCORGIA-V7.2 — global teacher cockpit and student support workspace  
**Build :** `tsc = 0` / `npm run build` = SUCCESS  
**Audit Privacy :** PASS  

---

## Livraisons

### Composants créés

| Fichier | Description |
|---------|-------------|
| `src/components/mon-annee/global/GlobalTeacherCockpit.tsx` | Cockpit multi-classes — remplace SchoolYearHub |
| `src/components/mon-annee/student-support/ClassSupportSummary.tsx` | Résumé non-nominatif de classe |
| `src/components/mon-annee/student-support/StudentSupportList.tsx` | Liste élèves avec filtres + recherche |
| `src/app/dashboard/mon-annee/[classeId]/eleves/[eleveId]/page.tsx` | Page de profil élève |

### Composants modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/mon-annee/SchoolYearWorkspace.tsx` | Onglet `eleves_soutien` + props `eleves` + `supportPlans` |
| `src/app/dashboard/mon-annee/page.tsx` | Remplace SchoolYearHub par GlobalTeacherCockpit + fetch élèves |
| `src/app/dashboard/mon-annee/[classeId]/page.tsx` | Fetch élèves + support plans + nouveau props workspace |

### Types ajoutés (session précédente V7.1)

| Fichier | Modification |
|---------|-------------|
| `src/lib/types/database.ts` | `StudentSupportPlanRow`, `SupportPlanStatut`, `SupportPlanConfidentialite` |

### Documentation créée

| Fichier | Type |
|---------|------|
| `docs/Product/SCORGIA_V7_2_GLOBAL_COCKPIT.md` | Guide produit — Cockpit |
| `docs/Product/SCORGIA_V7_2_STUDENT_SUPPORT_WORKSPACE.md` | Guide produit — Élèves & Soutien |
| `docs/Release/SCORGIA_V7_2_REPORT.md` | Ce rapport |

---

## Nouvelles routes

| Route | Description |
|-------|-------------|
| `/dashboard/mon-annee` | Cockpit global (remplacé — était hub avec cartes) |
| `/dashboard/mon-annee/[classeId]` | Workspace classe — 2 nouveaux onglets |
| `/dashboard/mon-annee/[classeId]/eleves/[eleveId]` | Profil élève **NEW** |

---

## Métriques globales dans le Cockpit

Les métriques affichées utilisent **uniquement des données réelles** :
- Classes : `classes.length`
- Élèves : `eleves.length` (ou `SUM(nombre_eleves)` si aucun élève chargé)
- Leçons : `SUM(eventCounts)` / total depuis `contenu_json`
- Couverture : calcul sur leçons réelles
- Plans actifs : filtre `statut='actif'` sur `student_support_plans`
- À réviser : filtre `date_revision < now()`

---

## Données exclues — conformité

| Donnée | Décision |
|--------|---------|
| `sexe` / `genre` sur élèves | Colonne inexistante en DB → jamais affichée |
| `eleves.profil_type` | Dépréciée → jamais lue dans V7.2 |
| `inscriptions` | Table inexistante → jamais référencée |
| Diagnostic individuel dans le cockpit global | Principe V7.1 → toujours respecté |

---

## État graceful — migration 042

La table `student_support_plans` est **PROPOSÉE** (migration 042 non exécutée en production).

Comportement en l'absence de la table :
- Toutes les requêtes `student_support_plans` retournent `[]` sans erreur
- Métriques affichent "—" au lieu de 0
- ClassSupportSummary affiche une notice explicative
- Onglet Plan dans le profil élève affiche un message informatif
- Aucune route ne crash — 100% graceful

---

## Gates de qualité

| Gate | Résultat |
|------|----------|
| `npx tsc --noEmit` | 0 erreur |
| `npm run build` | SUCCESS — 121 routes générées |
| Audit Privacy | PASS |
| Données fictives | AUCUNE |
| Migration distante exécutée | NON |
| Moteurs V7.0/V7.1 reconstruits | NON |

---

## Contraintes du spec V7.2 — vérification

| Contrainte | Statut |
|------------|--------|
| NE PAS reconstruire les moteurs V7.0/V7.1 | ✓ Non reconstruits |
| Aucune donnée fictive | ✓ |
| Ne jamais afficher le diagnostic individuel dans le cockpit global | ✓ |
| Ne jamais afficher les données sexe/genre | ✓ Colonne inexistante, jamais référencée |
| NE PAS exécuter de migration distante | ✓ Non exécutée |
| tsc=0, build=success, privacy=PASS avant commit | ✓ Vérifié |

---

## Architecture — état final V7.2

```
/dashboard/mon-annee
  GlobalTeacherCockpit
    ├── Aperçu global : métriques + attention + table classes
    └── Élèves & Soutien : StudentSupportList (toutes classes)

/dashboard/mon-annee/[classeId]
  SchoolYearWorkspace (étendu)
    ├── Aperçu : YearProgressHero + NowSection + AnnualFlightPlan
    ├── Élèves & Soutien : ClassSupportSummary + StudentSupportList (classe)
    └── Curriculum / Syllabus / … (liens externes)

/dashboard/mon-annee/[classeId]/eleves/[eleveId]
  StudentDetailPage
    ├── Profil : besoins + notes
    ├── Plan de soutien : plans actifs/archivés (graceful si vide)
    └── Historique : journal audit
```

---

## Prochaines étapes (V7.3+)

1. **Formulaire de plan de soutien** — création/édition complète du plan V7.1
2. **Boucle d'intervention** — saisie d'observations, suivi de fréquence
3. **Quality Score UI** — indicateur visuel du score depuis `quality-scorer.ts`
4. **Export PDF** — plan de soutien en format imprimable FOIP-conforme
5. **Migration 042** — exécution après validation PO + développeur senior

---

## Migrations à exécuter

**Migration 042** est PROPOSÉE — NE PAS exécuter sans validation :

```
supabase/migrations/042_student_support_foundation_PROPOSED.sql
```
