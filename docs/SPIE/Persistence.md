# Persistence — Teaching Pack & Plan annuel

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09

---

## Migration 036

**Fichier :** `supabase/migrations/036_teaching_packs.sql`

### Nouvelles tables

#### `teaching_packs`

```sql
CREATE TABLE teaching_packs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classe_id           UUID NOT NULL REFERENCES classes(id)    ON DELETE CASCADE,
  nom                 TEXT NOT NULL,
  statut              teaching_pack_statut NOT NULL DEFAULT 'configuration',
  province            TEXT,
  pays                TEXT NOT NULL DEFAULT 'Canada',
  juridiction         TEXT,
  langue              TEXT NOT NULL DEFAULT 'fr',
  annee_scolaire      TEXT,
  curriculum_source   curriculum_source_type,
  curriculum_officiel TEXT,
  curriculum_contenu  TEXT,
  programme_annuel_id UUID REFERENCES programme_annuel(id) DEFERRABLE INITIALLY DEFERRED,
  calendrier_json     JSONB,
  gabarits_json       JSONB,
  contenu_json        JSONB,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teaching_packs_classe_unique UNIQUE (classe_id)
);
```

La contrainte `UNIQUE (classe_id)` garantit **un seul pack actif par classe**. Le pipeline utilise `upsert` avec `onConflict: 'classe_id'` pour reprendre un pack existant.

### Extensions de `programme_annuel`

```sql
ALTER TABLE programme_annuel
  ADD COLUMN teaching_pack_id UUID REFERENCES teaching_packs(id),
  ADD COLUMN calendrier_json  JSONB,
  ADD COLUMN syllabus_json    JSONB;
```

### FK différée

La FK `teaching_packs → programme_annuel` est `DEFERRABLE INITIALLY DEFERRED` pour permettre l'insertion dans les deux tables dans la même transaction sans conflit d'ordre.

### RLS

```sql
-- Enseignant voit uniquement ses propres packs
CREATE POLICY teaching_packs_own ON teaching_packs
  USING (enseignant_id = auth.uid());

-- Admin (enwaha22@gmail.com) voit tout
CREATE POLICY teaching_packs_admin ON teaching_packs
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'enwaha22@gmail.com');
```

---

## Client Supabase côté serveur

Toutes les opérations d'écriture dans le pipeline `build-year` utilisent le **service role** :

```typescript
import { createClient as createServiceClient } from '@supabase/supabase-js'
const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

Le client côté browser utilise uniquement `createClient()` avec les permissions RLS normales.

---

## Indexation

```sql
-- Recherche par enseignant
CREATE INDEX idx_teaching_packs_enseignant ON teaching_packs(enseignant_id);
-- Recherche par classe (+ unicité gérée par UNIQUE)
CREATE INDEX idx_teaching_packs_classe ON teaching_packs(classe_id);
-- Recherche par statut
CREATE INDEX idx_teaching_packs_statut ON teaching_packs(statut);
```

---

## Migration 037 (SPIE-BETA-02)

**Fichier :** `supabase/migrations/037_pack_versions.sql`

### Nouvelle table `pack_versions`

```sql
CREATE TABLE pack_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_pack_id UUID NOT NULL REFERENCES teaching_packs(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL,
  document_id      TEXT,
  version_numero   INTEGER NOT NULL DEFAULT 1,
  label            TEXT,
  contenu_json     JSONB NOT NULL,
  modifie_par      TEXT NOT NULL CHECK (modifie_par IN ('ia', 'utilisateur')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS : visible uniquement par l'enseignant propriétaire du `teaching_pack_id`.

### Extensions de tables existantes

**`teaching_packs`** (ALTER TABLE) :
```sql
ADD COLUMN pack_template_id   TEXT,
ADD COLUMN source_meta_json   JSONB,
ADD COLUMN qualite_json       JSONB,
ADD COLUMN version_numero     INTEGER NOT NULL DEFAULT 1,
ADD COLUMN derniere_modif_par TEXT DEFAULT 'ia'
```

**`fichiers_dossier`** :
```sql
ADD COLUMN teaching_pack_id  UUID REFERENCES teaching_packs(id),
ADD COLUMN sequence_index    INTEGER,
ADD COLUMN lecon_index       INTEGER,
ADD COLUMN modifie_par_user  BOOLEAN DEFAULT FALSE,
ADD COLUMN version_numero    INTEGER DEFAULT 1,
ADD COLUMN source_meta_json  JSONB
```

**`programme_annuel`** :
```sql
ADD COLUMN modifie_par   TEXT DEFAULT 'ia',
ADD COLUMN version_numero INTEGER DEFAULT 1,
ADD COLUMN qualite_json  JSONB
```

### Règle de versionnement

Avant chaque écriture sur `programme_annuel.syllabus_json`, `syllabus-save` :
1. Lit la version actuelle
2. L'archive dans `pack_versions` avec `modifie_par` et `version_numero` courant
3. Écrit la nouvelle version
4. Incrémente `version_numero` et met `modifie_par = 'utilisateur'`

---

---

## SPIE-PERSISTENCE-01 — BuildState et vérification

### BuildState persisté dans teaching_packs.contenu_json

```sql
-- Colonne existante — contenu enrichi depuis SPIE-PERSISTENCE-01
-- teaching_packs.contenu_json inclut maintenant :
{
  "build_state": {
    "buildId": "uuid",
    "startedAt": "ISO",
    "completedAt": "ISO",
    "pack":             { "status": "success", "objectId": "uuid", "persisted": true, "verified": true },
    "curriculum":       { "status": "success", "persisted": true, "verified": true },
    "syllabus":         { "status": "success", "persisted": true, "verified": true },
    "programme_annuel": { "status": "success", "objectId": "uuid", "persisted": true, "verified": true },
    "plans_lecon":      { "status": "success", "persisted": true, "verified": true },
    "premiere_lecon":   { "status": "success", "objectId": "uuid", "persisted": true, "verified": true },
    "quiz":             { "status": "success", "objectId": "uuid", "persisted": true, "verified": true },
    "finalized": true
  }
}
```

Aucune migration requise — `contenu_json` est déjà JSONB (migration 036).

### Endpoint verify-pack

```
POST /api/spie/verify-pack
Body: { "pack_id": "uuid", "classe_id": "uuid" }
```

Re-lit toutes les tables depuis la DB et retourne la complétude réelle.
Protégé par `requireAuth()` + vérification propriétaire du pack.

### Fichier utilitaires

```
src/lib/spie/build-pipeline.ts
  ├── StepResult, BuildState, StepStatus   (types)
  ├── stepSuccess(objectId?)               (helper)
  ├── stepError(error)                     (helper)
  ├── stepSkipped(objectId?)               (helper)
  ├── initBuildState()                     (initialise tous les steps à 'pending')
  └── verifyTeachingPackCompleteness()     (re-lit DB → CompletenessResult)
```

---

## Intégration PCE (studio_ia_memoire)

À l'étape `sauvegarde`, le pipeline alimente le Pedagogical Context Engine :

```typescript
await supabaseAdmin.from('studio_ia_memoire').upsert({
  enseignant_id: user.id,
  classe_id: input.classe_id,
  type: 'teaching_pack',
  contenu: JSON.stringify({ pack_id, nb_unites, nb_lecons, ... }),
}, { onConflict: 'enseignant_id,classe_id,type' })
```

Cela respecte DEC-025 (PCE comme gate mandatory) sans modifier `build-system-prompt.ts` (DEC-005).

---

## Migration 038 (SPIE-BETA-03)

**Fichier :** `supabase/migrations/038_detailed_lesson.sql`

### Extensions de tables existantes

**`fichiers_dossier`** :
```sql
ADD COLUMN contenu_json JSONB
```
Stocke l'objet `DetailedLesson` complet pour `type_fichier = 'lecon_detaillee'`.

**`teaching_packs`** :
```sql
ADD COLUMN lecon_detaillee_id     UUID REFERENCES fichiers_dossier(id),
ADD COLUMN lecon_detaillee_statut TEXT DEFAULT 'non_generee'
```

**`lecons`** :
```sql
ADD COLUMN detailed_lesson_id     UUID REFERENCES fichiers_dossier(id),
ADD COLUMN source_teaching_pack_id UUID REFERENCES teaching_packs(id)
```

### Nouvelle table `spie_access_log`

```sql
CREATE TABLE spie_access_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  teaching_pack_id UUID REFERENCES teaching_packs(id),
  fichier_id      UUID REFERENCES fichiers_dossier(id),
  statut          TEXT NOT NULL DEFAULT 'ok',
  details_json    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS : chaque enseignant voit uniquement ses propres logs. Admin voit tout.

### Règle de versionnement (leçon détaillée)

Avant chaque régénération ciblée (`/api/spie/lesson-regenerate`) :
1. La `DetailedLesson` courante est archivée dans `pack_versions` avec `type_version = 'avant_regen_section'`
2. Le champ `version` de la leçon est incrémenté
3. La nouvelle version est écrite dans `fichiers_dossier.contenu_json`

L'archivage est non-bloquant (try/catch) — si `pack_versions` n'existe pas encore, la régénération continue quand même.
