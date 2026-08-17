# SCORGIA V7.3 — Release Report

**Date :** août 2026  
**Branche :** main  
**Commit :** feat: SCORGIA-V7.3 — academic planning workspace and curriculum traceability

---

## Résumé

V7.3 transforme les onglets « Mon Année » en espace de planification pédagogique complet. Six nouveaux onglets migrated exposent la chaîne complète CURRICULUM → PLAN ANNUEL → SÉQUENCES → PLANS DE LEÇON → LEÇONS — sans reconstruire les moteurs V7.0/V7.1 ni exécuter de migration distante.

---

## Fichiers livrés

**Créés :**
- `src/components/mon-annee/academic/CurriculumView.tsx`
- `src/components/mon-annee/academic/SyllabusTab.tsx`
- `src/components/mon-annee/academic/PlanAnnuelView.tsx`
- `src/components/mon-annee/academic/SequencesView.tsx`
- `src/components/mon-annee/academic/PlansLeconView.tsx`
- `src/components/mon-annee/academic/LeconsWorkspace.tsx`
- `docs/Product/SCORGIA_V7_3_ACADEMIC_PLANNING_WORKSPACE.md`
- `docs/Architecture/SCORGIA_V7_3_CONTENT_CHAIN.md`
- `docs/Release/SCORGIA_V7_3_REPORT.md`

**Modifiés :**
- `src/components/mon-annee/SchoolYearWorkspace.tsx` — 6 onglets migrated + prop `lecons`
- `src/app/dashboard/mon-annee/[classeId]/page.tsx` — fetch `lecons` en parallèle

---

## Audit de la chaîne de contenu

| Maillon | Source | Statut |
|---------|--------|--------|
| CURRICULUM → UNITÉ | `curriculum_outcomes[].id` liés via `Unite.curriculum_outcome_ids[]` dans contenu_json V2 | **PASS** |
| UNITÉ → SÉQUENCE | Séquences = Unités dans le modèle DB (`programme_annuel.contenu_json.unites[]`) | **PASS** |
| SÉQUENCE → LEÇON | `Unite.lecons[]` (LeconProgramme) — liste ordonnée dans la séquence | **PASS** |
| LEÇON → PLAN | `LeconProgramme.lecon_id` FK → `lecons.id` (null = non préparée) | **PASS** |
| PLAN → DOCUMENT | `Lecon.contenu_json: ContenuLecon` — structure 3 moments + différenciation | **PASS** |
| LEÇON → TEACHING EVENT | `teaching_events` indexés par `sequence_index` / `lecon_index` → `lessonStateMap` | **PASS** |
| TEACHING EVENT → COCKPIT | `buildLessonStateMap()` + `deriveData()` → métriques + couverture dans `SchoolYearDashboardData` | **PASS** |
| CLASS FOLDER BINDING | `classe_id` présent sur toutes les tables : `lecons`, `eleves`, `teaching_events`, `teaching_packs` | **PASS** |

---

## Qualité

| Critère | Résultat |
|---------|---------|
| `npx tsc --noEmit` | 0 erreurs |
| `npm run build` | SUCCESS |
| P0 bloquants | Aucun |
| Migration distante exécutée | Non |
| Données fictives introduites | Non |
| Dépendances ajoutées | Aucune |

---

## Contraintes V7.3 respectées

- Moteurs V7.0/V7.1 (`deriveData`, `buildLessonStateMap`, `getCurriculumCoverage`) : intacts, non reconstruits
- Backward compatibility V1 : tous les composants ont un fallback gracieux si `curriculum_outcomes` absent
- Aucune donnée inventée : si donnée absente → état vide informatif ou « Non disponible »
- Tiptap/RichEditor existants : audités, non requis dans ce périmètre (lecture seule)
- `student_support_plans` : fetch gracieux (table non en prod) maintenu depuis V7.2

---

## Prochaines étapes potentielles

- **V7.4** : Onglet Évaluations migrated (lier `evaluation_prevue` des unités aux outils d'évaluation existants)
- **V7.5** : Onglet Ressources migrated (lier les ressources par séquence)
- **V8.0** : Édition inline des plans de leçon directement depuis l'onglet Plans de Leçon (via RichEditor existant)
