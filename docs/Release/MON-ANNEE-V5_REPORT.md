# MON-ANNEE-V5 — Teaching Events + Curriculum Coverage Hardening

**Date :** 2026-08-16  
**Statut :** IMPLÉMENTÉ — en attente d'application de la migration 041 + push  
**Auteur :** Claude Code (claude-sonnet-4-6)  
**Sprint :** MON-ANNEE-V5

---

## Contexte

V4 stockait l'état d'enseignement dans `programme_annuel.contenu_json` (JSONB). Ce design présentait 5 bugs actifs (BUG-02 à BUG-06) identifiés lors de l'audit MON-ANNEE-INTEGRATION-01.

V5 introduit un journal d'événements append-only (`teaching_events`) et corrige tous ces bugs.

---

## Bugs fermés

| Bug | Sévérité | Correction V5 |
|-----|---------|--------------|
| BUG-01 | P2 | HOTFIX-01 (session précédente) — profil.id dans loadClasses |
| BUG-02 | P2 | INSERT append-only remplace UPDATE JSONB |
| BUG-03 | P3 | `.single()` → `.maybeSingle()` sur teaching_packs |
| BUG-04 | P3 | Validation runtime dans POST mark-taught |
| BUG-05 | P3 | seqCovers ne propage plus vers les leçons avec mapping explicite |
| BUG-06 | P3 | totalLecons calculé depuis contenu_json.unites, plus dénormalisé |

---

## Fichiers modifiés

### Nouveaux fichiers
- `supabase/migrations/041_teaching_progress.sql` — table `teaching_events`, indexes, RLS
- `src/lib/spie/teaching-events.ts` — résolveur central (makeLessonKey, getLessonTeachingState, buildLessonStateMap, countTaughtFromMap, makeLessonRef)
- `src/app/api/spie/mark-taught/route.ts` — remplacé PATCH → POST (nouvelle signature)

### Fichiers modifiés
- `src/lib/types/database.ts` — `TeachingEvent`, `TeachingEventType`
- `src/lib/types/school-year-dashboard.ts` — `LessonTeachingState`, `seqIdx` sur `SequenceProgress`, `lessonStateMap` sur `SchoolYearDashboardData`
- `src/lib/spie/curriculum-coverage.ts` — BUG-05 fix, `coverageConfidence`, `isAssessed`, param `lessonStateMap`
- `src/lib/spie/teaching-progress.ts` — `getNextTeachingAction()` accepte `lessonStateMap`
- `src/app/dashboard/mon-annee/page.tsx` — chargement events V5, `deriveData()` V5, BUG-03/BUG-06 fix
- `src/components/mon-annee/MarkTaughtModal.tsx` — props V5 (seqIdx, leconIdx, teachingPackId, currentState), POST vers nouvelle API
- `src/components/mon-annee/AnnualPlanOverview.tsx` — props lessonStateMap + teachingPackId, optimistic override V5
- `src/components/mon-annee/CurrentSequenceCard.tsx` — prop lessonStateMap, isTaught depuis map
- `src/components/mon-annee/SchoolYearDashboard.tsx` — threading lessonStateMap vers les enfants

---

## Architecture — Invariants V5

### Event-sourcing
- Append-only : aucun UPDATE ni DELETE sur `teaching_events`
- Annulation = nouvel événement `lesson_taught_cancelled`
- Dernier événement chronologique par leçon gagne

### Identité d'une leçon
- Clé DB : `teaching_pack_id + sequence_index + lecon_index` (0-based)
- Clé mémoire : `"${seqIdx}:${leconIdx}"` → `lessonStateMap`
- Référence stable : `lesson_ref = "packId:seqIdx:leconIdx"` (dénormalisé, requêtes rapides)

### Backward compatibility
- Fallback V4 : si aucun event pour une leçon → `lecon.statut === 'enseignee'` (contenu_json)
- `source: 'events' | 'legacy'` sur `LessonTeachingState`
- Aucune migration des données historiques V4 (spec: NE PAS migrer automatiquement)

### Batch fetch
- Un seul `SELECT * FROM teaching_events WHERE teaching_pack_id = ?` par chargement de classe
- Résolution en mémoire via `buildLessonStateMap()` — pas de N+1

---

## Quality Gates

| Gate | Résultat |
|------|---------|
| `tsc --noEmit` | ✅ 0 erreurs |
| `npm run build` | ✅ exit 0 |
| Migration 041 appliquée | ⏳ EN ATTENTE — action requise (voir ci-dessous) |
| RLS vérifié | ⏳ EN ATTENTE |
| BUG-02 fermé (no JSONB mutation) | ✅ POST INSERT-only |
| BUG-04 fermé (validation runtime) | ✅ whitelist + bounds check |
| BUG-05 fermé (seqCovers corrigé) | ✅ mapping explicite respecté |
| Push GitHub main | ⏳ EN ATTENTE migration |

---

## Action requise avant push

1. Appliquer la migration 041 dans Supabase :
   ```bash
   # Option A — CLI Supabase
   supabase db push

   # Option B — SQL Editor Supabase Studio
   # Copier/coller le contenu de supabase/migrations/041_teaching_progress.sql
   ```

2. Vérifier dans Supabase Studio :
   - Table `teaching_events` existe
   - RLS activé (`ALTER TABLE teaching_events ENABLE ROW LEVEL SECURITY`)
   - Politiques `te_select` et `te_insert` présentes
   - Aucune politique UPDATE/DELETE (append-only garanti)

3. Une fois migration confirmée :
   ```bash
   git push origin main
   ```
