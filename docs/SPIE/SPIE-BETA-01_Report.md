# SPIE-BETA-01 — Rapport de sprint

**Sprint :** SPIE-BETA-01 — Parcours "Construire mon année scolaire"  
**Statut :** ✅ Complété  
**Date :** 2026-08-04  
**Auteur :** ScorgIA Engineering

---

## Résumé

SPIE-BETA-01 implémente le premier sprint fonctionnel de la bêta privée KlassIA+. Il livre le parcours complet "Construire mon année scolaire" — du wizard de configuration jusqu'à la génération complète du Teaching Pack (syllabus, plan annuel, première leçon développée, quiz).

---

## Missions accomplies

| # | Mission | Statut |
|---|---------|--------|
| 01 | Audit du code existant | ✅ |
| 02 | Points d'entrée identifiés | ✅ |
| 03 | Migration 036 — `teaching_packs` table | ✅ |
| 04 | Types TypeScript Teaching Pack | ✅ |
| 05 | Entitlements bêta (`src/lib/entitlements.ts`) | ✅ |
| 06 | API `GET /api/spie/official-curricula` | ✅ |
| 07 | API SSE `POST /api/spie/build-year` | ✅ |
| 08 | Wizard `BuildMyYearWizard` (5 étapes + progress) | ✅ |
| 09 | Page `/dashboard/classes/[id]/programme` | ✅ |
| 10 | Composant `TeachingPackCard` | ✅ |
| 11 | Composant `AnnualPlanTimeline` | ✅ |
| 12 | Bouton "🗓️ Mon année" dans la page classe | ✅ |
| 13 | Documentation — 9 fichiers `docs/SPIE/` | ✅ |

---

## Fichiers créés

### Backend / Données
- `supabase/migrations/036_teaching_packs.sql` — Migration DB
- `src/lib/types/teaching-pack.ts` — Types domaine
- `src/lib/entitlements.ts` — Entitlements bêta
- `src/app/api/spie/official-curricula/route.ts` — API curriculums officiels
- `src/app/api/spie/build-year/route.ts` — Pipeline SSE

### Frontend
- `src/components/build-year/BuildMyYearWizard.tsx` — Wizard 5 étapes
- `src/components/build-year/TeachingPackCard.tsx` — Carte Teaching Pack
- `src/components/build-year/AnnualPlanTimeline.tsx` — Timeline plan annuel
- `src/app/dashboard/classes/[id]/programme/page.tsx` — Page "Mon année"

### Fichiers modifiés
- `src/lib/types/database.ts` — Extension `ProgrammeAnnuel` (3 colonnes)
- `src/app/dashboard/classes/[id]/page.tsx` — Bouton "Mon année"

### Documentation
- `docs/SPIE/Teaching_Pack.md`
- `docs/SPIE/Build_My_Year_Workflow.md`
- `docs/SPIE/Entitlements.md`
- `docs/SPIE/Syllabus.md`
- `docs/SPIE/Annual_Plan.md`
- `docs/SPIE/Sequence_Plans.md`
- `docs/SPIE/Lesson_Plans.md`
- `docs/SPIE/Persistence.md`
- `docs/SPIE/SPIE-BETA-01_Report.md` (ce fichier)

---

## Contraintes respectées

| Contrainte | Respect |
|-----------|---------|
| Ne pas créer une seconde architecture concurrente | ✅ — Extension de `programme_annuel` existant |
| Ne jamais afficher un faux curriculum officiel | ✅ — `OFFICIAL_CURRICULA = []` |
| Ne pas réécrire le moteur IA | ✅ — Appels directs Anthropic séparés |
| Ne pas intégrer Stripe | ✅ |
| Ne pas commencer le forfait payant | ✅ — Bêta gratuite |
| RÈGLE ABSOLUE : Ne pas modifier `build-system-prompt.ts` | ✅ — Prompt leçon direct |
| RLS sur toutes les nouvelles tables | ✅ — Policy `teaching_packs_own` + `teaching_packs_admin` |
| Service role uniquement côté serveur | ✅ — Utilisé uniquement dans la route API |
| Unicité des documents par enseignant | ✅ — `enseignant_id` dans tous les upserts |
| Admin = enwaha22@gmail.com uniquement | ✅ — Policy admin par email |

---

## Points techniques notables

### Gestion de la FK différée
Le Teaching Pack et le Programme Annuel ont une dépendance circulaire potentielle. Résolue par une FK `DEFERRABLE INITIALLY DEFERRED` de `teaching_packs → programme_annuel`, permettant l'insertion dans l'ordre correct sans deadlock.

### Entitlements indépendants
Le système `entitlements.ts` est volontairement séparé de `useForfait` pour permettre à tous les forfaits d'accéder à la bêta sans casser les gates existants.

### Wizard auto-initialise le calendrier
Quand l'enseignant change l'année scolaire (étape 1), le calendrier (étape 4) se réinitialise automatiquement avec les dates par défaut correspondantes — évite les incohérences.

---

## Dette introduite

Aucune nouvelle dette critique. Les points à surveiller :

| Point | Priorité | Action |
|-------|----------|--------|
| `contenu_json` non typé dans `programme_annuel` (hérite `Record<string,unknown>`) | Basse | Typer en `PackSyllabus` lors de la migration vers TypeScript strict |
| Route `/api/import/docx` référencée dans le wizard mais non créée ici | Moyenne | Créer ou pointer vers l'import existant |
| `AnnualPlanTimeline` utilise `<details>` natif | Basse | Remplacer par composant animé si UX insuffisante |

---

## Prochaines étapes (SPIE-BETA-02 proposition)

1. Exports PDF/DOCX du plan annuel et du syllabus
2. Partage communautaire du Teaching Pack
3. Adaptation dynamique du plan (réorganisation des unités)
4. Développement des leçons supplémentaires (forfait Pro)
5. Intégration du calendrier scolaire réel (import iCal / CSV)

> Ces évolutions nécessitent la validation du Product Owner avant implémentation.
