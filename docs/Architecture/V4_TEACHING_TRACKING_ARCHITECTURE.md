# V4 — Teaching Tracking Architecture

**Date :** 2026-08-15  
**Scope :** MON-ANNEE-V4 — Curriculum Progress & Teaching Tracker

---

## Décision architecturale : STATE vs EVENTS

### OPTION A — STATE (retenu pour V4)

Stocker `statut`, `date_enseignee`, `note_enseignement` directement dans `programme_annuel.contenu_json` JSONB sur chaque `LeconProgramme`.

**Raison du choix :**
- Aucune migration distante requise (contrainte V4)
- `AnnualPlanOverview` lisait déjà `lecon.statut === 'enseignee'` avant V4 → cohérence immédiate
- `deriveData()` lisait déjà ce champ pour `taughtLecons`, `completedSequences` → zéro régression
- `CurriculumCoverage` peut dériver `isTaught` depuis les leçons couvrant un RA

**Limites connues :**
- Pas d'historique multi-enseignements (un même RA enseigné en L1, L3, L8 : seul le dernier statut persiste sur chaque leçon)
- Write non-atomique : deux builds simultanés pourraient créer un conflict JSONB (usage séquentiel normal → pas de problème)

### OPTION B — EVENTS (proposée pour V5 — migration 041)

Table `teaching_events` : journal immuable d'événements. Chaque passage en classe est un événement distinct. Supporte nativement "RA 1.2 enseigné 3 fois".

**Migration 041** : `supabase/migrations/041_teaching_progress_PROPOSED.sql` — PROPOSÉE, non exécutée.

---

## Chaîne de couverture V4

```
CURRICULUM                    → curriculum_outcomes[] dans ContenuProgramme
  ↓ planifié                  → unite.curriculum_outcome_ids[] ou lecon.curriculum_outcome_ids[]
  ↓ préparé                   → lecon.lecon_id (présence = plan détaillé existe)
  ↓ enseigné (V4)             → lecon.statut === 'enseignee'
  ↓ évalué (V5)               → (pas de source en V4)
```

---

## Flot de données : marquer une leçon enseignée

```
[AnnualPlanOverview] → clic "+ Enseigner"
  ↓
[MarkTaughtModal] → date + note → confirmer
  ↓
PATCH /api/spie/mark-taught
  ↓ auth → ownership (user → profil → classe → programme_annuel)
  ↓ lit contenu_json
  ↓ mute lecons[uniteNumero][leconNumero].statut = 'enseignee'
  ↓ ajoute date_enseignee, note_enseignement
  ↓ write back programme_annuel.contenu_json
  ↓ { success: true }
  ↓
[AnnualPlanOverview] → optimistic update (localOverrides Map)
  + onTaughtUpdated() → loadPackData(classeId) → rechargement complet
```

---

## Indicateur de rythme : calcul

```
schoolYearElapsedPct = getSchoolYearElapsedPercent(anneeScolaire)
  → annee "2025-2026" : start = 2025-09-01, end = 2026-06-30
  → elapsed = (now - start) / (end - start) * 100, clamp [0, 100]

teachingPct = taughtLecons / totalLecons * 100

delta = teachingPct - schoolYearElapsedPct

Statut :
  delta >= +8   → EN_AVANCE (#22C55E)
  delta >= -7   → DANS_LE_RYTHME (#3B82F6)
  delta >= -15  → A_SURVEILLER (#F59E0B)
  delta <  -15  → EN_RETARD (#EF4444)
```

Implémentation : `src/lib/spie/teaching-progress.ts` — fonctions pures, aucune mutation, testable.

---

## Couverture curriculum : isTaught per RA

```typescript
// getCurriculumCoverage() — pour chaque outcome :
let taughtInAnySeq = false
for (const unite of contenu.unites) {
  const leconsCovering = unite.lecons.filter(l => l.curriculum_outcome_ids?.includes(outcome.id))
  const seqCovers = unite.curriculum_outcome_ids?.includes(outcome.id)
  const hasTaught = leconsCovering.some(l => l.statut === 'enseignee')
    || (seqCovers && unite.lecons.some(l => l.statut === 'enseignee'))
  if (hasTaught) taughtInAnySeq = true
}
item.isTaught = taughtInAnySeq
```

---

## Tâches prioritaires V4 — ordre déterministe

```
Priority 1 : ENSEIGNER
  → leçon avec lecon_id (plan complet) ET statut !== 'enseignee' dans séquence en cours
  → getNextTeachingAction() dans teaching-progress.ts

Priority 2 : PRÉPARER (max 3)
  → leçons sans lecon_id ET statut !== 'enseignee' dans séquence en cours

Priority 3 : PLANIFIER syllabus
  → syllabusCompleteness !== undefined && syllabusCompleteness < 80
```

---

## Fichiers créés / modifiés

| Fichier | Action | Raison |
|---------|--------|--------|
| `src/lib/types/database.ts` | Modifié | `LeconProgramme` + `date_enseignee?`, `note_enseignement?` |
| `src/lib/types/school-year-dashboard.ts` | Modifié | `PacingIndicator`, `PacingStatut`, `pacingIndicator?`, `schoolYearElapsedPct?`, `'enseigner'` dans PriorityTask.type |
| `src/lib/spie/curriculum-coverage.ts` | Modifié | `isTaught: boolean` dans `CurriculumCoverageItem` |
| `src/lib/spie/teaching-progress.ts` | Créé | Fonctions pures : rythme, élapsed %, prochaine action |
| `src/app/api/spie/mark-taught/route.ts` | Créé | PATCH JSONB avec auth + ownership check |
| `src/components/mon-annee/MarkTaughtModal.tsx` | Créé | Modal confirmation (date + note) |
| `src/components/mon-annee/AnnualPlanOverview.tsx` | Modifié | Bouton + Enseigner, modal, optimistic updates |
| `src/components/mon-annee/CurriculumCoverage.tsx` | Modifié | Colonne Enseigné avec données réelles |
| `src/components/mon-annee/CurrentSequenceCard.tsx` | Modifié | Mini-liste leçons avec statuts |
| `src/components/mon-annee/SchoolYearDashboard.tsx` | Modifié | Badge rythme dans header, `onTaughtUpdated` prop |
| `src/components/mon-annee/PriorityTasks.tsx` | Modifié | Config `'enseigner'` (#22C55E) |
| `src/app/dashboard/mon-annee/page.tsx` | Modifié | `deriveData()` V4 (rythme, tâches V4), `onTaughtUpdated` |
| `supabase/migrations/041_teaching_progress_PROPOSED.sql` | Créé | PROPOSÉE — teaching_events table (non exécutée) |

---

## Ce qui N'a PAS changé

- Aucune migration distante exécutée
- Aucun push
- Curriculum V2, séquences, plan détaillé des leçons — non touchés
- Branding, auth, paiement, Quiz, landing — non touchés
- SyllabusViewer, getSyllabusCompleteness — non touchés
- `lecons` table (plans détaillés) — non touchée
