# Migration 036 — Rapport de correction
> **Date** : 2026-08-05  
> **Fichier** : `supabase/migrations/036_teaching_packs.sql`  
> **Statut** : ✅ Corrigé — prêt pour relance dans Supabase

---

## Erreur trouvée

```
ERROR 42601: syntax error at or near "NOT"
```

**Ligne** : 53–55 (avant correction)

```sql
-- INVALIDE en PostgreSQL
ALTER TABLE teaching_packs
  ADD CONSTRAINT IF NOT EXISTS fk_teaching_packs_programme_annuel
  FOREIGN KEY (programme_annuel_id) REFERENCES programme_annuel(id) ON DELETE SET NULL;
```

**Cause** : `ADD CONSTRAINT IF NOT EXISTS` n'existe pas en PostgreSQL. La syntaxe `IF NOT EXISTS` n'est supportée que pour `ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`, `CREATE FUNCTION`, etc. — pas pour `ADD CONSTRAINT`.

---

## Syntaxes vérifiées (migration complète)

| Syntaxe | Ligne | Valide PostgreSQL | Correction |
|---------|-------|------------------|-----------|
| `CREATE TABLE IF NOT EXISTS teaching_packs` | 9 | ✅ | Aucune |
| `ADD COLUMN IF NOT EXISTS` (×3) | 47–49 | ✅ | Aucune |
| `ADD CONSTRAINT IF NOT EXISTS fk_...` | 53–54 | ❌ | ✅ Corrigé |
| `CREATE INDEX IF NOT EXISTS` (×3) | 59–61 | ✅ | Aucune |
| `DROP POLICY IF EXISTS` (×2) | 67–68 | ✅ | Aucune |
| `DROP TRIGGER IF EXISTS` | 95 | ✅ | Aucune |
| `CREATE OR REPLACE FUNCTION` | 87 | ✅ | Aucune |

---

## Correction appliquée

**Avant** :
```sql
ALTER TABLE teaching_packs
  ADD CONSTRAINT IF NOT EXISTS fk_teaching_packs_programme_annuel
  FOREIGN KEY (programme_annuel_id) REFERENCES programme_annuel(id) ON DELETE SET NULL;
```

**Après** :
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conname    = 'fk_teaching_packs_programme_annuel'
      AND  conrelid   = 'teaching_packs'::regclass
  ) THEN
    ALTER TABLE teaching_packs
      ADD CONSTRAINT fk_teaching_packs_programme_annuel
      FOREIGN KEY (programme_annuel_id) REFERENCES programme_annuel(id) ON DELETE SET NULL;
  END IF;
END $$;
```

**Propriétés préservées** :
- Nom de la contrainte : `fk_teaching_packs_programme_annuel`
- Colonne source : `programme_annuel_id`
- Table référencée : `programme_annuel(id)`
- Action : `ON DELETE SET NULL`

---

## Objets potentiellement déjà créés (si migration partiellement exécutée)

Si la migration a échoué sur la ligne 54, voici l'état probable des objets :

| Objet | État probable |
|-------|--------------|
| Table `teaching_packs` | ✅ Créée (ligne 9 — avant l'erreur) |
| Colonne `programme_annuel.teaching_pack_id` | ✅ Ajoutée (ligne 47 — avant l'erreur) |
| Colonne `programme_annuel.calendrier_json` | ✅ Ajoutée (ligne 48 — avant l'erreur) |
| Colonne `programme_annuel.syllabus_json` | ✅ Ajoutée (ligne 49 — avant l'erreur) |
| Contrainte FK `fk_teaching_packs_programme_annuel` | ❌ Non créée (erreur sur cette ligne) |
| Index `idx_teaching_packs_enseignant` | ❌ Non créé (après l'erreur) |
| Index `idx_teaching_packs_classe` | ❌ Non créé |
| Index `idx_prog_annuel_teaching_pack` | ❌ Non créé |
| RLS sur `teaching_packs` | ❌ Non configuré |
| Trigger `trg_teaching_packs_updated_at` | ❌ Non créé |

---

## Requêtes de vérification avant relance

Exécuter dans Supabase → SQL Editor avant de relancer la migration :

```sql
-- 1. Vérifier si la table teaching_packs existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'teaching_packs'
) AS table_existe;

-- 2. Vérifier les colonnes ajoutées sur programme_annuel
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'programme_annuel'
  AND column_name IN ('teaching_pack_id', 'calendrier_json', 'syllabus_json')
ORDER BY column_name;

-- 3. Vérifier si la contrainte FK existe déjà
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'fk_teaching_packs_programme_annuel';

-- 4. Vérifier les index
SELECT indexname FROM pg_indexes
WHERE tablename = 'teaching_packs'
   OR (tablename = 'programme_annuel' AND indexname = 'idx_prog_annuel_teaching_pack')
ORDER BY indexname;

-- 5. Vérifier RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'teaching_packs';
```

---

## Procédure pour relancer la migration

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Ouvrir le fichier `supabase/migrations/036_teaching_packs.sql` (version corrigée)
3. Copier l'intégralité du contenu
4. Coller dans le SQL Editor
5. Cliquer **Run**
6. Vérifier le message de succès (aucune erreur)
7. Exécuter les requêtes de vérification ci-dessus pour confirmer

**La migration est idempotente** — elle peut être relancée même si certains objets existent déjà :
- `CREATE TABLE IF NOT EXISTS` → skip si la table existe
- `ADD COLUMN IF NOT EXISTS` → skip si la colonne existe
- Bloc `DO $$` → skip si la contrainte existe
- `CREATE INDEX IF NOT EXISTS` → skip si l'index existe
- `DROP POLICY IF EXISTS` + `CREATE POLICY` → recrée toujours (safe)
- `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` → recrée toujours (safe)

---

## Note sur les migrations 037 et 038

Les migrations 037 (`pack_versions`) et 038 (`detailed_lesson`) peuvent être exécutées uniquement après que 036 soit complètement appliquée — elles dépendent de la table `teaching_packs`.

---

*Document créé : FIX migration 036 · 2026-08-05*
