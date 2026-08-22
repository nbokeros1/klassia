# MON-ANNEE-V4 — Curriculum Progress & Teaching Tracker

**Statut :** Livré — en attente de validation Product Owner  
**Date :** 2026-08-15  
**Build :** tsc 0 erreurs · `npm run build` exit code 0  
**Dépend de :** MON-ANNEE-V3 (Smart Syllabus Engine)

---

## 1. Résumé

MON-ANNEE-V4 active le suivi de l'enseignement réel : l'enseignant peut marquer ses leçons comme enseignées via une modal de confirmation, et le tableau de bord calcule en temps réel son rythme pédagogique par rapport au calendrier scolaire.

---

## 2. Périmètre — ce qui a changé

| Zone | Ce qui change |
|------|--------------|
| `LeconProgramme` (type) | `date_enseignee?`, `note_enseignement?` ajoutés |
| `school-year-dashboard.ts` | `PacingIndicator`, `PacingStatut`, `pacingIndicator?`, `schoolYearElapsedPct?`, `'enseigner'` dans PriorityTask.type |
| `curriculum-coverage.ts` | `isTaught: boolean` par CurriculumCoverageItem |
| `teaching-progress.ts` | Nouveau — fonctions pures de rythme et prochaine action |
| `/api/spie/mark-taught` | Nouveau — PATCH JSONB avec auth complète |
| `MarkTaughtModal` | Nouveau — confirmation explicite avec date + note |
| `AnnualPlanOverview` | Bouton + Enseigner, modal, optimistic update, `onTaughtUpdated` callback |
| `CurriculumCoverage` | Colonne Enseigné avec données réelles (`item.isTaught`) |
| `CurrentSequenceCard` | Mini-liste leçons avec statuts individuels |
| `SchoolYearDashboard` | Badge rythme dans l'en-tête, prop `onTaughtUpdated` |
| `PriorityTasks` | Nouveau type `'enseigner'` (vert, priorité 1) |
| `deriveData()` | Pacing V4, tâches prioritaires V4 (enseigner > préparer > syllabus) |
| Migration 041 | PROPOSÉE — table `teaching_events` (non exécutée) |

---

## 3. Fonctionnalité centrale : Marquer comme enseignée

### Flow

1. Plan annuel → expand une séquence
2. Bouton **+ Enseigner** sur une leçon
3. Modal : date (défaut aujourd'hui) + note optionnelle
4. Confirmer → PATCH `/api/spie/mark-taught`
5. Optimistic update local + rechargement du pack complet

### Annulation

Le bouton devient **Annuler ✕** pour les leçons déjà enseignées.  
Le modal affiche la date d'enseignement actuelle et confirme le retour à 'brouillon'.

### Règle fondamentale

> Jamais de marquage automatique. L'enseignant décide.

---

## 4. Indicateur de rythme

```
Δ = % leçons enseignées − % année scolaire écoulée

EN AVANCE       Δ ≥ +8 %     → vert   #22C55E
DANS LE RYTHME  -7 % ≤ Δ < +8 %  → bleu   #3B82F6
À SURVEILLER    -15 % ≤ Δ < -7 % → ambré  #F59E0B
EN RETARD       Δ < -15 %    → rouge  #EF4444
```

Affiché en badge dans l'en-tête de Mon Année. Non affiché si données insuffisantes (aucune leçon enseignée ou année inconnue).

---

## 5. Couverture curriculum V4

La matrice RA (V2) affiche désormais :

| Colonne | Source | V4 |
|---------|--------|-----|
| Planifié | `curriculum_outcome_ids` | ✓ (inchangé) |
| Préparé | `lecon_id != null` | ✓ (inchangé) |
| Enseigné | `lecon.statut === 'enseignee'` | **NOUVEAU** — données réelles |
| Évalué | (aucune source) | — toujours vide |

---

## 6. Tâches prioritaires V4

| Priorité | Type | Déclencheur |
|----------|------|------------|
| 1 | Enseigner | Leçon prête (plan complet) dans la séquence en cours |
| 2 | Préparer (×3) | Leçons sans plan dans la séquence en cours |
| 3 | Planifier | Syllabus < 80 % |

---

## 7. Architecture choisie

**OPTION A (STATE)** — `statut` + `date_enseignee` + `note_enseignement` dans `programme_annuel.contenu_json` JSONB.

**Justification :** zéro migration distante (contrainte V4), cohérence immédiate avec les lectures déjà en place.

**Migration 041 (EVENTS) proposée** pour V5 : table `teaching_events` permettant l'historique multi-enseignements et l'agrégation par RA.

---

## 8. Fichiers créés

| Fichier | Type |
|---------|------|
| `src/lib/spie/teaching-progress.ts` | Créé |
| `src/app/api/spie/mark-taught/route.ts` | Créé |
| `src/components/mon-annee/MarkTaughtModal.tsx` | Créé |
| `supabase/migrations/041_teaching_progress_PROPOSED.sql` | Créé — proposé, non exécuté |
| `docs/Product/MON-ANNEE-V4_CURRICULUM_PROGRESS_TRACKER.md` | Créé |
| `docs/Architecture/V4_TEACHING_TRACKING_ARCHITECTURE.md` | Créé |

## 9. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/lib/types/database.ts` | `LeconProgramme` V4 fields |
| `src/lib/types/school-year-dashboard.ts` | `PacingIndicator`, `'enseigner'` type |
| `src/lib/spie/curriculum-coverage.ts` | `isTaught` par item |
| `src/components/mon-annee/AnnualPlanOverview.tsx` | Bouton + Enseigner + modal |
| `src/components/mon-annee/CurriculumCoverage.tsx` | Colonne Enseigné réelle |
| `src/components/mon-annee/CurrentSequenceCard.tsx` | Mini-liste leçons |
| `src/components/mon-annee/SchoolYearDashboard.tsx` | Badge rythme + `onTaughtUpdated` |
| `src/components/mon-annee/PriorityTasks.tsx` | Type `'enseigner'` |
| `src/app/dashboard/mon-annee/page.tsx` | `deriveData()` V4 + `onTaughtUpdated` |

---

## 10. Ce qui N'a PAS changé

- Aucune migration distante exécutée
- Aucun push
- Smart Syllabus (V3), Curriculum V2, plan annuel, séquences, leçons détaillées — non touchés
- Branding, auth, paiement, Quiz, landing, Founder — non touchés

---

## 11. Quality gate

```
npx tsc --noEmit → 0 erreurs
npm run build    → exit code 0
```

---

*Ne pas push avant validation Product Owner*
