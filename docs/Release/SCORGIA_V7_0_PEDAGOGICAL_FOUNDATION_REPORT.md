# ScorgIA V7.0 — Rapport PO : Fondation pédagogique & Templates maîtres

> **Version :** 7.0  
> **Date :** 2026-08-17  
> **Auteur :** Claude (Sonnet 4.6) — session de développement  
> **Statut :** À valider par le Product Owner avant tout push  
> **Commit prévu :** `feat(pedagogy): V7.0 pedagogical standards & master templates foundation`

---

## ⚠️ DÉCISION REQUISE DU PO

Ce rapport doit être approuvé **avant** le push vers `origin/main`.  
Aucune migration distante n'est déployée dans cette version.  
Le commit est prêt — il attend votre confirmation.

---

## 1. Résumé exécutif

V7.0 établit la couche de qualité pédagogique de ScorgIA. Ce n'est pas une refonte de l'interface — c'est l'infrastructure intellectuelle sur laquelle s'appuieront les V7.1 à V12.

**Ce qui a été créé :**
- 3 modules TypeScript (types, moteur qualité, traçabilité) + 1 registre de templates
- 6 documents de référence (recherche, produit, architecture)
- 0 migration distante
- 0 changement d'interface utilisateur
- 0 rupture de compatibilité V1–V6

**Résultats quality gates :**
| Gate | Résultat |
|------|----------|
| `npx tsc --noEmit` | ✅ 0 erreurs |
| `npm run build` | ✅ Exit 0 |
| Audit anti-fallback | ✅ Aucun Objectif principal / Unité 1 inventé |
| Audit politiques scolaires | ✅ Aucun `AI_GENERATED` sur champ politique |
| Audit migrations DB | ✅ Aucune migration distante |
| Compatibilité V1–V6 | ✅ Aucun type existant modifié |

---

## 2. Fichiers créés

### Modules TypeScript (code de production)

| Fichier | Description | Missions |
|---------|-------------|---------|
| `src/lib/pedagogy/types/index.ts` | Tous les types pédagogiques V7 — 21 types + constantes | 2–15 |
| `src/lib/pedagogy/quality-engine.ts` | Moteur de qualité déterministe — 10 dimensions, scoring 0–100 | 9 |
| `src/lib/pedagogy/traceability.ts` | Moteur de traçabilité RA → preuves d'apprentissage | 10 |
| `src/lib/pedagogy/templates/registry.ts` | Registre central des 7 templates maîtres Alberta FR | 14 |

### Documentation (docs/)

| Fichier | Description |
|---------|-------------|
| `docs/Research/ALBERTA_PEDAGOGICAL_STANDARDS_V7.md` | Standards TQS 2023, curriculum Alberta, inclusion, règles absolues ScorgIA |
| `docs/Product/SCORGIA_STUDENT_SUPPORT_MODEL.md` | Modèle de soutien pédagogique — ce que ScorgIA fait/ne fait jamais |
| `docs/Product/SMART_CLASSROOM_V1.md` | Smart Classroom — modèle de données uniquement (éditeur visuel = V8) |
| `docs/Architecture/SCORGIA_PEDAGOGICAL_INTELLIGENCE_FRAMEWORK.md` | Constitution pédagogique — 17 sections, référence normative |
| `docs/Product/SCORGIA_MASTER_TEMPLATES.md` | Spécification complète des 7 templates maîtres |
| `docs/Release/SCORGIA_V7_0_PEDAGOGICAL_FOUNDATION_REPORT.md` | Ce document |

---

## 3. Fichiers modifiés

| Fichier | Modification | Impact |
|---------|-------------|--------|
| `src/lib/pedagogy/quality-engine.ts` | Import corrigé : `'./types'` → `'./types/index'` + ajout `LessonPhase` | Correction de bug de résolution de module |
| `src/lib/pedagogy/traceability.ts` | Import corrigé : `'./types'` → `'./types/index'` | Correction de bug de résolution de module |
| `src/lib/pedagogy/templates/registry.ts` | Import corrigé : `'../types'` → `'../types/index'` | Correction de bug de résolution de module |

**Cause du bug :** Un fichier `src/lib/pedagogy/types.ts` préexistant (V1–V6) prenait priorité sur le nouveau dossier `types/index.ts`. TypeScript résout `'./types'` en `types.ts` avant `types/index.ts`. Corrigé avec des chemins d'import explicites.

---

## 4. Modèles définis

### Types de documents pédagogiques

| Type | Modèle | Champs requis | Champs jamais IA |
|------|--------|---------------|-----------------|
| Plan de leçon | `LessonPlanV7` | titre, curriculum_outcome_ids, objectif_eleve, criteres_reussite | reflexion_enseignant |
| Plan de séquence | `SequencePlanV7` | titre, objectif_sequence, curriculum_outcome_ids, justification_pedagogique | — |
| Plan d'unité | `UnitPlanV7` | titre, curriculum_outcome_ids, semaine_debut, semaine_fin | — |
| Syllabus | `SyllabusV7` | identite_cours.titre, curriculum_applicable, resultats_majeurs | politique_*, courriel, coordonnees |
| Dossier de soutien | `StudentSupportPlanV7` | eleve_id, classe_id, statut, niveau_confidentialite, date_creation | designation_officielle, besoins_observes |

### Types d'infrastructure

| Type | Usage |
|------|-------|
| `PedagogicalProvenance` | Attribution de source pour chaque champ |
| `PedagogicalQualityReport` | Rapport de qualité — 10 dimensions, score 0–100 |
| `TraceabilityGraph` | Graphe RA → unités → séquences → leçons → événements → preuves |
| `PedagogicalTemplate` | Template avec champs requis, règles qualité, provenances |
| `SmartClassroomModel` | Modèle de classe — pas d'éditeur visuel en V7 |
| `GroupWorkModel` | Groupes de travail avec justification pédagogique obligatoire |

---

## 5. Règles officielles vs décisions produit ScorgIA

### Règles officielles Alberta (catégorie A)

| Code | Règle | Source |
|------|-------|--------|
| TQS-2.1 | Toute leçon ancre dans les RA officiels | Alberta Education TQS 2023 |
| TQS-3.1 | Pas de diagnostic ou regroupement basé sur identité protégée dans plans collectifs | Human Rights Act Alberta |
| TQS-5.1 | Les politiques scolaires ne sont jamais inventées | TQS 2023 |
| TQS-5.2 | Données élèves pseudonymisées — FOIP | Freedom of Information and Protection of Privacy Act |
| INC-2 | ScorgIA ne génère pas de PEI | Standards for Special Education |

### Décisions produit ScorgIA (catégorie C)

| Code | Décision | Justification |
|------|----------|---------------|
| ABS-05 | ScorgIA ne prétend jamais connaître "le meilleur groupement" | Éviter une sur-confiance dans l'algorithme |
| ABS-06 | Le score de qualité est indicatif — jamais "prouve" la qualité réelle | Le jugement de l'enseignant reste souverain |
| QUAL-01 | Seuil `STRONG` à 8.5/10 (pas 9.0) | Accessibilité pour les bons documents sans perfection formelle |
| TRACE-01 | Lacunes de traçabilité signalées, jamais comblées automatiquement | Prévient la génération de preuves fictives |

---

## 6. Lacunes de base de données

Aucune migration n'a été créée ni déployée dans V7.0. Les modèles de données suivants n'ont pas de table DB correspondante :

| Modèle | Table DB nécessaire | Priorité V7.1 |
|--------|---------------------|---------------|
| `LessonPlanV7` | `lesson_plans_v7` ou champ JSON dans `lecons` | Haute |
| `StudentSupportPlanV7` | `student_support_plans` | Haute |
| `SmartClassroomModel` | `smart_classroom_models` | Moyenne |
| `PedagogicalQualityReport` | Pas nécessaire — calculé à la demande | — |
| `TraceabilityGraph` | Pas nécessaire — calculé dynamiquement | — |

---

## 7. Migrations proposées (NON déployées)

Ces migrations sont à créer en V7.1 après validation du modèle :

### Migration proposée — lesson_plans_v7

```sql
-- supabase/migrations/040_lesson_plans_v7_PROPOSED.sql
-- À ne pas exécuter avant validation du modèle par l'équipe pédagogique

CREATE TABLE lesson_plans_v7 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecon_id        UUID REFERENCES lecons(id) ON DELETE SET NULL,
  classe_id       UUID NOT NULL,
  enseignant_id   UUID NOT NULL REFERENCES profiles(id),
  titre           TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  contenu_json    JSONB NOT NULL DEFAULT '{}',
  quality_score   NUMERIC(5,2),
  quality_level   TEXT CHECK (quality_level IN ('NOT_READY','NEEDS_REVIEW','READY','STRONG')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lesson_plans_v7 ENABLE ROW LEVEL SECURITY;
-- Policies à définir selon le pattern existant
```

### Migration proposée — student_support_plans

```sql
-- supabase/migrations/041_student_support_plans_PROPOSED.sql

CREATE TABLE student_support_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id_hash         TEXT NOT NULL,  -- pseudonymisé — jamais l'ID réel en clair
  classe_id             UUID NOT NULL,
  enseignant_id         UUID NOT NULL REFERENCES profiles(id),
  annee_scolaire        TEXT NOT NULL,
  statut                TEXT NOT NULL DEFAULT 'brouillon',
  niveau_confidentialite TEXT NOT NULL,
  contenu_json          JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE student_support_plans ENABLE ROW LEVEL SECURITY;
-- RLS: enseignant_id = auth.uid() uniquement
```

---

## 8. Risques de confidentialité

| Risque | Niveau | Mitigation en place |
|--------|--------|---------------------|
| `eleve_id` brut dans prompt IA | **CRITIQUE** | Champ `never_ai_generated`, règle documentée — implémentation technique requise en V7.1 |
| Diagnostic médical dans plan collectif | **CRITIQUE** | Types interdits, règle ABS-03 — contrôle UI requis en V7.1 |
| Politiques scolaires inventées | **ÉLEVÉ** | `never_ai_generated: true` sur tous les champs politiques, `validateSyllabusProvenance()` implémentée |
| Photo de salle de classe partagée sans consentement | **MOYEN** | Champ `consentement` dans `SmartClassroomModel.photos[]` |

**Note :** Les risques CRITIQUE sont actuellement documentés dans les types et règles mais **pas encore enforcement au niveau UI/API**. V7.1 doit ajouter les guards de runtime.

---

## 9. Résultats des quality gates

### Mission 20 — Checklist d'audit

| Vérification | Résultat | Preuve |
|-------------|----------|--------|
| Aucun RA "fallback" généré (`Unité 1`, `Objectif principal`) | ✅ | grep `src/lib/pedagogy` — 0 occurrences |
| Aucun champ `politique_*` marqué `AI_GENERATED` | ✅ | `never_ai_generated: true` sur tous les champs politiques |
| Aucune migration distante dans V7.0 | ✅ | Aucun fichier `.sql` dans `supabase/migrations/` ajouté |
| Rétrocompatibilité V1–V6 | ✅ | Aucun type existant modifié — `types.ts` préexistant intact |
| Aucun diagnostic médical dans les types | ✅ | `StudentSupportPlanV7` — aucun champ diagnostic |
| `tsc --noEmit` | ✅ 0 erreurs | Résolu : import path `./types/index` |
| `npm run build` | ✅ Exit 0 | Build statique + dynamique — aucune régression |

---

## 10. Recommandations V7.1

Classées par priorité :

| # | Recommandation | Pourquoi |
|---|----------------|----------|
| 1 | Créer la table `lesson_plans_v7` + API CRUD | Permettre la persistance des plans générés avec `LessonPlanV7` |
| 2 | Guard runtime pour pseudonymisation élève | Le risque FOIP doit être enforcement au niveau API, pas juste documenté |
| 3 | Intégrer `validateSyllabusProvenance()` dans le pipeline Build Year | Bloquer la sauvegarde si des champs politiques sont `AI_GENERATED` |
| 4 | Frameworks FNMI officiels Alberta | TQS-4 est une exigence officielle — V7.0 la documente, V7.1 doit l'intégrer |
| 5 | UI — badges de provenance visibles | L'enseignant doit voir ce que ScorgIA a généré vs ce qui vient du curriculum |
| 6 | Tests unitaires pour `quality-engine.ts` | Moteur déterministe — les tests garantissent la stabilité des seuils |
| 7 | Tests unitaires pour `traceability.ts` | Valider les cas de bord (RA non planifié, leçon sans plan, etc.) |
| 8 | Table `student_support_plans` | Permettre la persistance des plans de soutien avec confidentialité |

---

## 11. Ce que V7.0 ne change PAS

- L'interface utilisateur (aucun composant React modifié)
- La sidebar, la navigation, le branding
- Les routes existantes
- Le schéma de base de données distant
- Les systèmes V1–V6 existants (BuildMyYearWizard, SPIE, etc.)
- Les types existants dans `src/lib/pedagogy/types.ts` (préexistant V1–V6)

---

## 12. Instruction de push (après approbation PO)

```bash
git add \
  src/lib/pedagogy/types/index.ts \
  src/lib/pedagogy/quality-engine.ts \
  src/lib/pedagogy/traceability.ts \
  src/lib/pedagogy/templates/registry.ts \
  docs/Research/ALBERTA_PEDAGOGICAL_STANDARDS_V7.md \
  docs/Product/SCORGIA_STUDENT_SUPPORT_MODEL.md \
  docs/Product/SMART_CLASSROOM_V1.md \
  docs/Architecture/SCORGIA_PEDAGOGICAL_INTELLIGENCE_FRAMEWORK.md \
  docs/Product/SCORGIA_MASTER_TEMPLATES.md \
  docs/Release/SCORGIA_V7_0_PEDAGOGICAL_FOUNDATION_REPORT.md

git commit -m "feat(pedagogy): V7.0 pedagogical standards & master templates foundation"
git push origin main
```

**⚠️ NE PAS EXÉCUTER avant approbation explicite du PO.**

---

*Rapport généré le 2026-08-17 — session Claude Sonnet 4.6.*
