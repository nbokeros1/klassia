# MON-ANNEE-V2 — Rapport de livraison complet

**Statut :** Livré — en attente de validation Product Owner  
**Date :** 2026-08-15  
**Build :** tsc 0 erreurs · `npm run build` exit code 0  
**Dépend de :** MON-ANNEE-V1, SPIE-P0.4

---

## 1. Résumé exécutif

MON-ANNEE-V2 transforme le Teaching Pack en une **architecture pédagogique traçable**. Chaque séquence et chaque leçon possède une identité réelle : titre descriptif, justification pédagogique, objectif d'apprentissage ancré dans le curriculum, activité principale, preuve d'apprentissage observable.

La relation bi-directionnelle curriculum ↔ séquences ↔ leçons est maintenant calculée et affichée dans Mon Année.

### Sections de la spec livrées

| Section | Sujet | Statut |
|---------|-------|--------|
| 1 | Principe chaîne curriculum → leçon | ✓ encodé dans le prompt |
| 2 | Audit | ✓ effectué |
| 3 | CurriculumOutcome normalisé | ✓ type créé |
| 4 | Curriculum analysé dans Mon Année | ✓ vue V2 bi-directionnelle |
| 5 | Nouveau contrat SequencePlan | ✓ Unite étendue |
| 6 | Découpage curriculum / justification | ✓ prompt V2 |
| 7 | Plans de leçon lors de Build Year | ✓ prompt V2 + types |
| 8 | Progression interne de la séquence | ✓ progression_role |
| 9 | Justification de chaque leçon | ✓ lecon.justification |
| 10 | Activité + preuve d'apprentissage | ✓ activite_principale + preuve_apprentissage |
| 11 | Première leçon depuis le plan | ✓ compatible (lecon_id lié) |
| 12 | Quiz facultatif | ✓ always-skip + build-pipeline |
| 13 | getCurriculumCoverage() | ✓ fonction créée |
| 14 | Relation bi-directionnelle | ✓ curriculum_outcome_ids + vue |
| 15 | IDs plutôt que duplication | ✓ curriculum_outcome_ids[] |
| 16 | Modèle plan annuel | ✓ prompt V2 |
| 17 | Modèle plan de séquence | ✓ Unite V2 |
| 18 | Export | ✓ données prêtes (templates inchangés) |
| 19 | Dossier de classe | Partiel — PO validation requise |
| 20 | Mon Année leçon-level | ✓ expandable rows |
| 21 | Smart Resume | ✓ compatible |
| 22 | Compatibilité anciens packs | ✓ tous champs optionnels |
| 23 | Interdictions respectées | ✓ |
| 24 | Test E2E | Prêt — à faire par PO |
| 25 | Quality gate | ✓ tsc 0 + build 0 |
| 26 | Livrable docs | ✓ |

**Section 19 (arborescence)** : la génération de fichiers `plan_lecon` individuels dans `fichiers_dossier` pour chaque leçon nécessite une validation PO avant implémentation (plusieurs inserts DB lors de Build Year, potentiel volume × nb_lecons).

---

## 2. Audit initial — ROOT CAUSE

**"Unité 1" / "Contenu à définir" :** lignes 258–278 de `route.ts` — le `catch` du programme_annuel créait du contenu placeholder et marquait quand même `stepSuccess()`.

**Quiz bloquant :** `verifyTeachingPackCompleteness` ajoutait `'quiz'` dans `missing[]` → le pack ne pouvait jamais atteindre `statut: 'pret'` sans quiz.

**Types insuffisants :** `Unite` et `LeconProgramme` sans champs pédagogiques riches → impossible d'afficher des données structurées dans Mon Année.

**Pas de traçabilité RA :** aucun `curriculum_outcome_ids` dans le modèle existant → impossible de calculer quelle séquence/leçon couvre quel RA.

---

## 3. Fichiers créés (2)

| Fichier | Description |
|---------|-------------|
| `src/lib/spie/curriculum-coverage.ts` | `getCurriculumCoverage()` — fonction pure bi-directionnelle |
| `docs/Product/MON-ANNEE-V2_CURRICULUM_PLANNING_ENGINE.md` | Spécification produit |

---

## 4. Fichiers modifiés (8)

| Fichier | Changement |
|---------|-----------|
| `src/lib/types/database.ts` | `CurriculumOutcome` + `Unite` V2 + `LeconProgramme` V2 + `ContenuProgramme.curriculum_outcomes` |
| `src/lib/types/school-year-dashboard.ts` | `curriculumCoverage?: CurriculumCoverageData` dans `SchoolYearDashboardData` |
| `src/lib/spie/build-pipeline.ts` | Quiz retiré de `missing[]` dans `verifyTeachingPackCompleteness` |
| `src/app/api/spie/build-year/route.ts` | Prompt programme V2, fail-fast curriculum, quiz always-skip |
| `src/app/dashboard/mon-annee/page.tsx` | Import + appel `getCurriculumCoverage()` dans `deriveData()` |
| `src/components/mon-annee/SchoolYearDashboard.tsx` | Passe `curriculumCoverage` à `CurriculumCoverage` |
| `src/components/mon-annee/AnnualPlanOverview.tsx` | Expandable rows (cliquer séquence → leçons avec V2 data) |
| `src/components/mon-annee/CurriculumCoverage.tsx` | Vue V2 bi-directionnelle (outcomes + Planifié/Préparé/Séq./Leçons) |

---

## 5. Contrats de données V2

### 5.1 CurriculumOutcome

```typescript
export type CurriculumOutcome = {
  id: string          // "RA-1.1" — clé stable de référence
  code?: string       // code officiel curriculum
  titre: string
  description: string
  type: 'resultat_apprentissage' | 'grande_idee' | 'competence' | 'connaissance' | 'standard' | 'attente'
  parentId?: string
}
```

Stocké dans `programme_annuel.contenu_json.curriculum_outcomes[]`. Aucune migration DB.

### 5.2 SequencePlan (Unite étendue)

Nouveaux champs tous optionnels :

```typescript
justification_pedagogique?: string
curriculum_outcome_ids?: string[]       // ["RA-1.1", "RA-2.3"]
grandes_idees?: string[]
concepts_cles?: string[]
prerequis?: string[]
activite_culminante?: string
evaluation_prevue?: string
```

### 5.3 LessonPlanSummary (LeconProgramme étendue)

Nouveaux champs tous optionnels :

```typescript
progression_role?: 'introduction' | 'acquisition' | 'pratique' | 'approfondissement' | 'integration' | 'evaluation' | 'autre'
objectif_apprentissage?: string         // "L'élève peut..."
curriculum_outcome_ids?: string[]
activite_principale?: string
preuve_apprentissage?: string
justification?: string
```

### 5.4 getCurriculumCoverage()

```typescript
// src/lib/spie/curriculum-coverage.ts
export function getCurriculumCoverage(contenu: ContenuProgramme): CurriculumCoverageData

// Sortie par outcome :
type CurriculumCoverageItem = {
  outcome:     CurriculumOutcome
  sequences:   OutcomeSequenceLink[]   // quelles séquences + leçons couvrent ce RA
  isPlanified: boolean
  isPrepared:  boolean  // au moins une leçon a un lecon_id
}
```

---

## 6. Prompt programme_annuel V2

- **max_tokens :** 5000 (V1 : 4000)
- **Règles impératives** encodées :
  1. Titres réels (JAMAIS "Unité 1", "Leçon 1", "Contenu à définir")
  2. `objectif_apprentissage` : "L'élève peut [action mesurable]"
  3. `justification_pedagogique` : 2 phrases max
  4. `progression_role` sur chaque leçon
  5. `curriculum_outcome_ids` bi-directionnels (séquences + leçons)
  6. 4–6 `curriculum_outcomes` au niveau racine
  7. 5–7 séquences × 4–6 leçons
  8. curriculumCtx tronqué à 2000 chars

---

## 7. Fail-fast curriculum

Si `parsedProg?.unites?.length === 0` :
```
buildState.curriculum = stepError(...)
→ SSE erreur + bloque les étapes en aval
→ supabase.update({ statut: 'erreur' })
→ controller.close(); return
```

Aucun fallback placeholder. Le build fail proprement et indique à l'enseignant de réessayer.

---

## 8. Vue AnnualPlanOverview V2

Cliquer sur une ligne séquence l'expand pour montrer ses leçons :

| Leçon | Titre + objectif | Durée | Rôle | Statut |
|-------|-----------------|-------|------|--------|
| L1 | Titre réel — "L'élève peut..." | 60 min | Intro | Préparée |
| L2 | Titre réel | 60 min | Acq. | À préparer |

- **Rôle** : badge violet (`introduction`, `acquisition`, `pratique`, etc.)
- **Préparée** : badge vert si `lecon_id` existe
- **Enseignée** : badge vert foncé si `statut === 'enseignee'`
- **Ouvrir →** : link vers `/dashboard/classes/[id]/lecon/[lecon_id]` si leçon générée

---

## 9. Vue CurriculumCoverage V2

**Mode V2** (programme avec `curriculum_outcomes`) :

| RA | Planifié | Préparé | Enseigné | Évalué | Planifié dans |
|----|----------|---------|----------|--------|---------------|
| 1.1 Lire des textes | ✓ | ✗ | — | — | Séq. 1 (L1, L2) |
| 1.2 Analyser... | ✓ | ✓ | — | — | Séq. 2 (L3) |

**Mode V1 fallback** (ancien pack sans `curriculum_outcomes`) :
- Table simple avec `raList` du syllabus (colonnes toutes `—`)
- Bandeau informatif : "La vue Curriculum analysé est disponible pour les programmes V2"

---

## 10. Relation bi-directionnelle

**Depuis curriculum** : `getCurriculumCoverage()` retourne pour RA-1.1 → Séq. 1 (L1, L2), Séq. 3 (L5)

**Depuis leçon** : `lecon.curriculum_outcome_ids` → ["RA-1.1", "RA-2.3"] → résolvables via `contenu.curriculum_outcomes`

Structure en place. Navigation directe depuis la leçon vers le curriculum à implémenter en V3.

---

## 11. Persistance

| Données | Stockage |
|---------|---------|
| `curriculum_outcomes[]` | `programme_annuel.contenu_json.curriculum_outcomes` (JSONB) |
| Champs V2 des unités | `programme_annuel.contenu_json.unites[].champs_v2` (JSONB) |
| Champs V2 des leçons | `programme_annuel.contenu_json.unites[].lecons[].champs_v2` (JSONB) |
| `buildState.quiz = 'skipped'` | `teaching_packs.contenu_json.build_state.quiz` |

**Aucune migration DB requise.** Les colonnes JSONB existantes absorbent la structure V2.

---

## 12. Compatibilité anciens packs

| Situation | Comportement |
|-----------|-------------|
| Ancien pack sans `curriculum_outcomes` | `getCurriculumCoverage` → `hasV2Data: false` → vue V1 fallback |
| Ancien pack sans `justification_pedagogique` | `undefined` → rien affiché dans AnnualPlanOverview |
| Ancien pack avec `quiz.status = 'success'` | `counts.quiz > 0` — pack reste `pret` (quiz pas supprimé) |
| Ancien pack avec `quiz.status = 'skipped'` | Complétude calculée sans quiz — atteint `pret` normalement |

---

## 13. Smart Resume

Compatible sans modification :
- `skipCurriculum = buildState.curriculum.status === 'success' && buildState.programme_annuel.objectId`
- Si curriculum V2 déjà en DB → rechargé tel quel, nouveau prompt non appelé
- Si curriculum V1 en DB → rechargé, pas de re-génération V2 automatique (le reprendre force une reconstruction)

---

## 14. Quality gate

```
npx tsc --noEmit → 0 erreurs
npm run build    → exit code 0
/dashboard/mon-annee → ○ (Static, Suspense shell)
```

---

## 15. Limites V1

| Limite | Prochaine étape |
|--------|----------------|
| Suivi Enseigné/Évalué toujours `—` | Table `ra_tracking` (V3) |
| Arborescence fichiers (section 19) | Validation PO → batch insert `fichiers_dossier` |
| Navigation curriculum → détail leçon | V3 |
| CurriculumCoverage cliquable | V3 — panel latéral |
| Quiz depuis la leçon | Bouton "Générer quiz" dans leçon |
| UpcomingAssessments avec dates | Table `evaluations` |

---

## 16. Tests recommandés

| Scénario | Attendu |
|----------|---------|
| Build Year — nouvelle classe | Séquences titres réels, `objectif_apprentissage`, `justification_pedagogique`, `curriculum_outcomes` |
| Build Year — IA retourne JSON malformé | Pipeline s'arrête proprement, `statut: 'erreur'`, SSE `bloque` sur étapes aval |
| Mon Année — pack V2 | `Curriculum analysé` visible, séquences cliquables, leçons avec rôles |
| Mon Année — pack V1 | Vue V1 fallback, pas de crash |
| Mon Année — cliquer séquence | Expand avec L1–L5, objectif V2, badge rôle, statut préparé/enseigné |
| Complétude — pack sans quiz | `statut: 'pret'` atteint normalement |
| Reprendre la génération | Curriculum existant V2 rechargé depuis DB sans ré-appel IA |
| Logout/login | Teaching Pack intact, build_state persisté |

---

*Ne pas push avant validation Product Owner*
