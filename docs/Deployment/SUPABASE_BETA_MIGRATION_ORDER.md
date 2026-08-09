# Supabase — Ordre d'exécution des migrations (bêta)
> **Mission** : DEPLOY-BETA-01 · M4  
> **Date** : 2026-08-05  
> **Statut** : Référence officielle — 38 migrations, 2 conflits de numérotation à résoudre

---

## Prérequis absolus

1. **Sauvegarder la base de données** : Supabase Dashboard → Settings → Database → Backups → Create backup
2. **Vérifier l'environnement cible** : toujours exécuter les migrations sur la base de bêta, jamais en production (il n'y en a pas encore)
3. **Exécuter les migrations dans l'ordre** : SQL Editor → coller le contenu → Run
4. **Vérifier après chaque migration** : les requêtes de vérification ci-dessous

---

## ⚠ Conflits de numérotation identifiés

| Numéro | Fichiers en conflit | Ordre recommandé |
|--------|--------------------|--------------------|
| 008 | `008_taches_auto_gabarit.sql` + `008_structure_complete.sql` | structure_complete D'ABORD, puis taches_auto_gabarit |
| 011 | `011_assistant_vocal.sql` + `011_matieres_multiples.sql` | matieres_multiples D'ABORD, puis assistant_vocal |
| 012 | `012_notifications.sql` + `012_fix_type_fichier_medias.sql` | fix_type_fichier_medias D'ABORD, puis notifications |

> **Note** : Le fichier `006_*.sql` est absent. Ce n'est pas une erreur — il a été intégré dans un autre script ou sauté délibérément.

---

## Ordre d'exécution officiel

| Étape | Fichier | Description | RLS inclus |
|-------|---------|-------------|------------|
| 01 | `001_fix_schema.sql` | Correctifs schéma initial (lecons, etc.) | Non |
| 02 | `002_fix_rls_nouvelles_tables.sql` | RLS nouvelles tables | ✅ Oui |
| 03 | `003_quiz_live.sql` | Tables quiz live (quiz_sessions, etc.) | ✅ Oui |
| 04 | `004_classe_restructure.sql` | Restructuration des classes | Non |
| 05 | `005_communaute_dossiers.sql` | Communauté et dossiers | Non |
| — | *(006 absent)* | — | — |
| 07 | `007_admin_outils_onboarding.sql` | Admin, outils, onboarding | Non |
| 08a | `008_structure_complete.sql` | Structure complète : dossiers, fichiers, calendrier, Studio IA | ✅ Oui |
| 08b | `008_taches_auto_gabarit.sql` | Tâches auto-générées + gabarit personnel | Non |
| 09 | `009_fix_calendrier_studio_ia.sql` | Correctifs calendrier et Studio IA | Non |
| 10 | `010_corrections_critiques.sql` | Index unique studio_ia_memoire (enseignant_id, cle, type) | Non |
| 11a | `011_matieres_multiples.sql` | Matières multiples | Non |
| 11b | `011_assistant_vocal.sql` | Assistant vocal | Non |
| 12a | `012_fix_type_fichier_medias.sql` | Correctif type_fichier médias | Non |
| 12b | `012_notifications.sql` | Notifications | ✅ Oui |
| 13 | `013_multi_matieres.sql` | Multi-matières (consolidation) | Non |
| 14 | `014_studio_ia_memoire_unique.sql` | Index unique studio_ia_memoire (renforcement) | Non |
| 15 | `015_restructure_dossiers_matiere.sql` | Restructuration dossiers par matière | Non |
| 16 | `016_onboarding_forfaits_quotas.sql` | Onboarding, forfaits, quotas | ✅ Oui |
| 17 | `017_admin_impersonation.sql` | Admin impersonation | ✅ Oui |
| 18 | `018_calendrier_scolaire.sql` | Calendrier scolaire | ✅ Oui |
| 19 | `019_conversations_ia_preparer.sql` | Conversations IA Préparer | ✅ Oui |
| 20 | `020_fix_trigger_sous_dossiers_preparation.sql` | Correctif trigger sous-dossiers préparation | Non |
| 21 | `021_fix_nom_evaluations_sommatives.sql` | Correctif nom évaluations sommatives | Non |
| 22 | `022_storage_path_mime_type.sql` | Storage path et MIME type | Non |
| 23 | `023_fichiers_indexation.sql` | Indexation fichiers | Non |
| 24 | `024_missions_enseignant.sql` | Missions enseignant | ✅ Oui |
| 25 | `025_workflow_runtime.sql` | Workflow runtime | ✅ Oui |
| 26 | `026_activity_events.sql` | Activity events | ✅ Oui |
| 27 | `027_teacher_insights.sql` | Teacher insights | ✅ Oui |
| 28 | `028_teacher_recommendations.sql` | Teacher recommendations | ✅ Oui |
| 29 | `029_teacher_predictions.sql` | Teacher predictions | ✅ Oui |
| 30 | `030_teacher_memory.sql` | Teacher memory | ✅ Oui |
| 31 | `031_beta_tables.sql` | Tables bêta (beta_feedback, beta_logs, beta_invitations) | ✅ Oui |
| 32 | `032_founder_platform.sql` | Plateforme Founder | ✅ Oui |
| 33 | `033_business_center.sql` | Business center | ✅ Oui |
| 34 | `034_fix_rls_policies.sql` | Correctifs RLS (patch global) | ✅ Oui |
| 35 | `035_fix_founder_beta_rls_complete.sql` | RLS Founder + bêta complet | ✅ Oui |
| 36 | `036_teaching_packs.sql` | Teaching packs (SPIE-BETA-01) | ✅ Oui |
| 37 | `037_pack_versions.sql` | Pack versions — colonnes : teaching_pack_id, document_type, document_id, version_numero, label, contenu_json, modifie_par, notes, enseignant_id, created_at | ✅ Oui |
| 38 | `038_detailed_lesson.sql` | Leçon détaillée (SPIE-BETA-03 — DetailedLesson dans fichiers_dossier.contenu_json) | ✅ Oui |

---

## Requêtes de vérification post-migration

```sql
-- Vérifier les tables SPIE
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'teaching_packs', 'pack_versions', 'fichiers_dossier',
  'beta_invitations', 'beta_feedback', 'beta_logs',
  'spie_access_log', 'studio_ia_memoire', 'conversations_ia'
)
ORDER BY table_name;

-- Vérifier l'index unique studio_ia_memoire (critique pour build-year)
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'studio_ia_memoire'
AND indexname = 'idx_studio_ia_memoire_unique';

-- Vérifier les colonnes pack_versions (critique pour lesson-regenerate)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pack_versions'
ORDER BY ordinal_position;

-- Vérifier RLS activé sur les tables critiques
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('teaching_packs', 'pack_versions', 'spie_access_log', 'beta_invitations')
ORDER BY tablename;
```

---

## Rollback

En cas d'erreur sur une migration :

1. **Ne pas paniquer** — la plupart des migrations sont `ALTER TABLE` ou `CREATE TABLE IF NOT EXISTS` (idempotentes)
2. **Identifier la migration en erreur** dans le message Supabase
3. **Restaurer depuis le backup** si des données ont été perdues ou corrompues
4. **Corriger le fichier SQL** avant de réessayer
5. **Ne jamais modifier le schéma manuellement** sans créer une nouvelle migration numérotée

---

*Document créé : DEPLOY-BETA-01 · M4 · 2026-08-05*
