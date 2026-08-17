# V7.1 — Revue des migrations proposées & audit modèle élève

> **Date :** 2026-08-17  
> **Contexte :** V7.0 est live. V7.1 introduit la couche Student Intelligence.  
> **Statut :** Document de décision — NE PAS exécuter les migrations avant approbation PO.

---

## Section 1 — Recommandations V7.0 → classification P0/P1/P2

### Recommandations extraites du rapport V7.0 (section 10)

| # | Recommandation V7.0 | Priorité V7.1 | Décision |
|---|---------------------|---------------|---------|
| 1 | Table `lesson_plans_v7` + API CRUD | **P1** → REJETÉE | Voir Section 4 — source de vérité concurrente |
| 2 | Guard runtime pseudonymisation élève | **P0** | Implémentée — `student-ai-context.ts` |
| 3 | Intégrer `validateSyllabusProvenance()` dans Build Year | **P1** | Reportée V7.2 — hors périmètre Student Intelligence |
| 4 | Frameworks FNMI officiels Alberta | **P1** | Reportée V7.2 — nécessite recherche externe |
| 5 | UI badges provenance visibles | **P2** | Reportée V7.2 — UI V7.1 = ViewModels uniquement |
| 6 | Tests unitaires `quality-engine.ts` | **P1** | Reportée V7.2 — infrastructure test à valider |
| 7 | Tests unitaires `traceability.ts` | **P1** | Reportée V7.2 |
| 8 | Table `student_support_plans` | **P0** | ACCEPTÉE avec révisions majeures |

---

## Section 2 — Audit du modèle élève existant (Mission 1)

### 2.1 Table `eleves` (migration 004)

| Concept | Existe ? | Table | Type | Relation | RLS | Qualité | Gap | Action V7.1 |
|---------|----------|-------|------|----------|-----|---------|-----|-------------|
| Identité élève | ✅ | `eleves` | TABLE | `classe_id → classes`, `enseignant_id → utilisateurs` | ✅ correct | ⚠ Partielle | `profil_type` pseudo-diagnostic | Réutiliser telle quelle — ne pas modifier |
| Prénom/Nom | ✅ | `eleves.prenom`, `eleves.nom` | TEXT | — | ✅ | ✅ | — | Source de vérité unique |
| Profil type | ✅ | `eleves.profil_type` | TEXT CHECK | — | ✅ | ❌ Pseudo-diagnostic | Labels 'difficulte','pei' = pseudo-diagnostics | NE PAS UTILISER en V7.1 — déprécier silencieusement |
| Besoins non structurés | ✅ | `eleves.besoins` | TEXT[] | — | ✅ | ⚠ Trop vague | Aucune structure pédagogique | Supersédé par `student_support_plans` |
| Notes enseignant | ✅ | `eleves.notes_enseignant` | TEXT | — | ✅ | ⚠ Non structuré | Pas versionné | Supersédé par `student_support_plans` |
| Contact parent | ✅ | `eleves.contact_parent` | TEXT | — | ✅ | ⚠ Non chiffré | Données personnelles en clair | Hors périmètre V7.1 |
| Rappels élève | ✅ | `rappels_classe.eleve_id` | FK | `eleves(id)` | ✅ | ✅ | — | Réutiliser |
| Dossier élève | ✅ | `dossiers_systeme` type `eleves` | ENUM | — | ✅ | ✅ | Pas de lien direct à `student_support_plans` | Connecter en V7.2 |
| Activité différenciée | ✅ | `activites.version_pei` | TEXT | — | ✅ | ⚠ Nominatif | Label 'pei' dans colonne = problème | Déprécier silencieusement |
| Plan de soutien | ❌ | — | — | — | — | — | Modèle V7.0 pas persité | CRÉER `student_support_plans` |
| Désignations officielles | ❌ | — | — | — | — | — | Aucune table | Dans `student_support_plans.contenu_json` |
| Observations structurées | ❌ | — | — | — | — | — | Aucune table | Dans `student_support_plans.contenu_json` |
| Interventions | ❌ | — | — | — | — | — | Aucune table | Dans `student_support_plans.contenu_json` |
| Objectifs mesurables | ❌ | — | — | — | — | — | Aucune table | Dans `student_support_plans.contenu_json` |
| Audit trail modifications | ❌ | — | — | — | — | — | Aucune table | Dans `student_support_plans.changes_json` |

**RÈGLE FONDAMENTALE RESPECTÉE :** `eleves` reste la source unique d'identité. Toute donnée pédagogique supplémentaire référence `eleves.id` via FK.

### 2.2 Index manquants sur `eleves`

La table `eleves` (migration 004) n'a aucun index explicite. Performance dégradée sur les requêtes habituelles :

```sql
-- Manquant — critique pour les queries "tous les élèves d'une classe"
CREATE INDEX IF NOT EXISTS idx_eleves_classe ON eleves(classe_id);

-- Manquant — pour RLS lookup
CREATE INDEX IF NOT EXISTS idx_eleves_enseignant ON eleves(enseignant_id);
```

Ces index seront ajoutés dans la migration `042_student_support_foundation_PROPOSED.sql`.

### 2.3 Problèmes de qualité de la table `eleves`

| Problème | Sévérité | Description |
|---------|----------|-------------|
| `profil_type IN ('standard','difficulte','avance','pei','autre')` | 🔴 Élevée | Pseudo-diagnostic encodé en DB — viole le principe "ScorgIA ne pose aucun diagnostic". Ne jamais lire ni afficher ce champ dans les nouveaux composants V7.1 |
| Pas de `updated_at` trigger | 🟡 Moyenne | `updated_at` existe dans le DDL mais aucun trigger automatique |
| `contact_parent TEXT` | 🟡 Moyenne | Données personnelles non chiffrées — hors périmètre V7.1 |
| Pas d'index | 🟡 Moyenne | Performance — ajouté dans migration 042 |

---

## Section 3 — Audit migration proposée V7.0 : `lesson_plans_v7`

### DDL V7.0 proposé (rappel)

```sql
CREATE TABLE lesson_plans_v7 (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecon_id        UUID REFERENCES lecons(id) ON DELETE SET NULL,
  classe_id       UUID NOT NULL,                                    -- ❌ Pas de FK
  enseignant_id   UUID NOT NULL REFERENCES profiles(id),           -- ❌ Table 'profiles' inexistante
  titre           TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  contenu_json    JSONB NOT NULL DEFAULT '{}',
  quality_score   NUMERIC(5,2),
  quality_level   TEXT CHECK (...),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Problèmes identifiés

| # | Problème | Sévérité |
|---|---------|----------|
| 1 | `REFERENCES profiles(id)` — table inexistante dans ce schéma (devrait être `utilisateurs(id)`) | 🔴 Bloquant |
| 2 | `classe_id UUID NOT NULL` sans FK `REFERENCES classes(id)` | 🔴 Bloquant |
| 3 | Aucune RLS définie | 🔴 Bloquant |
| 4 | Aucun index sur `enseignant_id`, `classe_id`, `lecon_id` | 🟡 |
| 5 | `version INTEGER` sans gestion de conflits | 🟡 |
| 6 | Pas de `ON DELETE` sur `classe_id` | 🟡 |

### Décision architecturale : REJET

**`lesson_plans_v7` est rejetée.** Raison principale :

La table `lecons` stocke déjà `contenu_json JSONB` (structure V1–V6). Les fichiers SPIE utilisent `fichiers_dossier` pour les plans de leçon complets (tags `spie:plan_lecon`). Ajouter une troisième table créerait une source de vérité concurrente non maintenable.

**Alternative adoptée :** La structure `LessonPlanV7` est disponible comme type TypeScript. En V7.2, le contenu sera persisté en enrichissant `lecons.contenu_json` avec un champ `v7_plan` JSONB nested, ou via un champ dédié `plan_v7_json` sur la table `lecons` (ALTER TABLE, pas CREATE TABLE).

---

## Section 4 — Audit migration proposée V7.0 : `student_support_plans`

### DDL V7.0 proposé (rappel)

```sql
CREATE TABLE student_support_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id_hash         TEXT NOT NULL,        -- ❌ Design incorrect (voir ci-dessous)
  classe_id             UUID NOT NULL,        -- ❌ Pas de FK
  enseignant_id         UUID NOT NULL REFERENCES profiles(id), -- ❌ Table inexistante
  annee_scolaire        TEXT NOT NULL,
  statut                TEXT NOT NULL DEFAULT 'brouillon',
  niveau_confidentialite TEXT NOT NULL,
  contenu_json          JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE student_support_plans ENABLE ROW LEVEL SECURITY;
-- RLS: enseignant_id = auth.uid()  ❌ WRONG PATTERN
```

### Problèmes identifiés

| # | Problème | Sévérité | Correction |
|---|---------|----------|------------|
| 1 | `REFERENCES profiles(id)` — table inexistante | 🔴 Bloquant | `REFERENCES utilisateurs(id)` |
| 2 | `classe_id` sans FK | 🔴 Bloquant | `REFERENCES classes(id) ON DELETE CASCADE` |
| 3 | `enseignant_id = auth.uid()` dans RLS — **PATTERN INCORRECT** | 🔴 Bloquant | `enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())` |
| 4 | `eleve_id_hash TEXT` — hash côté DB inutile et dangereux | 🟡 | Stocker `eleve_id UUID REFERENCES eleves(id)` — la pseudonymisation se fait côté app avant appel IA |
| 5 | Aucune policy RLS granulaire (SELECT/INSERT/UPDATE séparés) | 🟡 | Policies séparées |
| 6 | Aucun index | 🟡 | Indexes sur `enseignant_id`, `eleve_id`, `classe_id` |
| 7 | Pas de `CHECK` sur `statut` | 🟡 | Contrainte explicite |
| 8 | Pas de `CHECK` sur `niveau_confidentialite` | 🟡 | Contrainte explicite |
| 9 | Aucun `service role` access policy | 🟡 | Policy service role |
| 10 | `changes_json` absent | 🟡 | Audit trail intégré |

### Décision : ACCEPTÉE avec révisions majeures

`student_support_plans` est une table nécessaire sans doublon dans le schéma existant. Elle est acceptée avec les corrections listées en Section 5.

**Note sur `eleve_id`:** Stocker `eleve_id UUID REFERENCES eleves(id)` (l'ID réel) est la décision correcte. La pseudonymisation est une responsabilité applicative (côté `student-ai-context.ts`), pas une responsabilité DB. Hasher en DB rendrait les lookups impossibles sans reconstruction du hash.

---

## Section 5 — Architecture finale de migration V7.1

**Fichier :** `supabase/migrations/042_student_support_foundation_PROPOSED.sql`

### Ce que la migration 042 fait

| Opération | Table | Justification |
|-----------|-------|---------------|
| ADD INDEX `idx_eleves_classe` | `eleves` | Performance queries classe |
| ADD INDEX `idx_eleves_enseignant` | `eleves` | Performance RLS |
| CREATE TABLE `student_support_plans` | Nouvelle | Plan de soutien pédagogique |
| RLS + policies granulaires | `student_support_plans` | Sécurité cross-teacher |
| Indexes performance | `student_support_plans` | Queries enseignant + classe + élève |

### Pattern RLS canonique utilisé

```sql
-- Toujours utiliser ce pattern dans ce schéma :
enseignant_id IN (
  SELECT id FROM utilisateurs WHERE user_id = auth.uid()
)
-- JAMAIS : enseignant_id = auth.uid()
-- JAMAIS : REFERENCES profiles(id)
```

---

## Section 6 — Compatibilité V1–V7.0

| Aspect | Impact |
|--------|--------|
| Table `eleves` | Non modifiée — ajout d'indexes uniquement |
| `profil_type` column | Non supprimée — dépréciation silencieuse en V7.1, suppression V8+ |
| `activites.version_pei` | Non supprimée — dépréciation silencieuse |
| `student_support_plans` | Nouvelle table — 0 impact sur l'existant |
| Types V7.0 (`StudentSupportPlanV7` etc.) | Inchangés |

---

*Audit réalisé le 2026-08-17 — session Claude Sonnet 4.6.*
