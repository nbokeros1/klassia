# SCORGIA V7.5.3 — Final DB Integrity Audit

**Date :** 2026-08-19  
**Migration cible :** 045_canonical_pedagogical_structures_V75_3_FINAL_PROPOSED.sql  
**Périmètre :** validation avant GO remote execution

---

## Schéma confirmé — champs clés

### `teaching_packs` (migration 036)
```
enseignant_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE
classe_id     UUID NOT NULL REFERENCES classes(id)      ON DELETE CASCADE
UNIQUE (classe_id)                    -- un seul pack par classe
programme_annuel_id UUID (nullable FK ajouté via DO block)
```

### `programme_annuel` (schema.sql + migrations 036, 039)
```
classe_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE
teaching_pack_id UUID NULLABLE REFERENCES teaching_packs(id) ON DELETE SET NULL
contenu_json     JSONB DEFAULT '{}'
```

### `classes` (schema.sql)
```
enseignant_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE
```

### `utilisateurs` (schema.sql)
```
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE
-- utilisateurs.id ≠ auth.uid() — vérification correcte : user_id = auth.uid()
```

### `teaching_events` (migration 041)
```
enseignant_id    UUID NOT NULL
classe_id        UUID NOT NULL
teaching_pack_id UUID NOT NULL
programme_annuel_id UUID NULLABLE (SET NULL)
sequence_index   INTEGER NOT NULL (0-based, legacy V4/V5)
lecon_index      INTEGER NOT NULL (0-based, legacy V4/V5)
lesson_ref       TEXT   (dénormalisé "packId:seqIdx:leconIdx")
event_type       TEXT   CHECK ('lesson_taught' | 'lesson_taught_cancelled')
occurred_at      TIMESTAMPTZ NOT NULL
note             TEXT
-- Append-only: pas de UPDATE, pas de DELETE en RLS
```

### `fichiers_dossier` (schema.sql + migrations 037, 038)
```
teaching_pack_id UUID (nullable, ajouté migration 037)
sequence_index   INTEGER (0-based, ajouté migration 037)
lecon_index      INTEGER (0-based, ajouté migration 037)
contenu_json     JSONB  (ajouté migration 038)
```

---

## Chaîne d'ownership vérifiée

```
auth.users.id
  │ (user_id = auth.uid() — relation 1:1 unique)
  ▼
utilisateurs.id
  │ enseignant_id (1:N)
  ▼
classes.id
  │ classe_id (1:1 UNIQUE — un seul pack par classe)
  ▼
teaching_packs.id
  │ programme_annuel_id (nullable FK, inversement : programme_annuel.teaching_pack_id nullable)
  ▼
programme_annuel.id
  │ programme_annuel_id NOT NULL
  ▼
pedagogical_units (anchor: porte les 4 colonnes d'ownership)
  │ unit_id NOT NULL CASCADE
  ▼
pedagogical_sequences
  │ sequence_id NOT NULL CASCADE
  ▼
pedagogical_lessons
```

---

## P0 — Inconsistances possibles dans `pedagogical_units` (avant V7.5.3)

Dans migration 045 (V7.5.2), les 4 colonnes d'ownership (`programme_annuel_id`, `teaching_pack_id`, `enseignant_id`, `classe_id`) n'avaient aucun mécanisme garantissant leur cohérence mutuelle. Un INSERT malformé ou un bug backend pouvait créer :

```sql
-- Exemple de ligne invalide que 045 (V7.5.2) aurait acceptée :
INSERT INTO pedagogical_units (programme_annuel_id, teaching_pack_id, enseignant_id, classe_id, ...)
VALUES (
  'prog-de-teacher-A',   -- programme de Teacher A
  'pack-de-teacher-B',   -- pack de Teacher B ← incohérent
  'teacher-A-id',        -- enseignant déclaré = A
  'class-de-teacher-A'   -- classe de A
);
-- RLS (TO authenticated) n'aurait PAS bloqué ce cas en service-role
-- Le trigger validate_pedagogical_unit_context() rejette PED_UNIT_PACK_MISMATCH
```

---

## Validation trigger — `validate_pedagogical_unit_context()`

### Vérifications effectuées

| Check | Condition | Exception |
|-------|-----------|-----------|
| A | `programme_annuel` existe pour `programme_annuel_id` | `PED_UNIT_PROGRAMME_NOT_FOUND` |
| B | `programme_annuel.classe_id = NEW.classe_id` | `PED_UNIT_CLASS_MISMATCH` |
| C | `classes.enseignant_id = NEW.enseignant_id` | `PED_UNIT_OWNER_MISMATCH` |
| D | `teaching_packs.enseignant_id = NEW.enseignant_id` | `PED_UNIT_PACK_MISMATCH` |
| E | `teaching_packs.classe_id = NEW.classe_id` | `PED_UNIT_PACK_MISMATCH` |
| F | Si `programme.teaching_pack_id IS NOT NULL` → doit égaler `NEW.teaching_pack_id` | `PED_UNIT_CONTEXT_MISMATCH` |

### Comportement selon le caller

| Caller | RLS sur SELECT internes | Résultat |
|--------|------------------------|----------|
| Authenticated Teacher A | RLS actif → Teacher B rows invisibles → NOT FOUND → exception | ✓ |
| Service role | RLS bypassé → lit toutes les rows → valide l'intégrité réelle | ✓ |

### Sécurité de la fonction

- `SECURITY INVOKER` — pas de SECURITY DEFINER (non nécessaire)
- `SET search_path = public` — résolution de schéma déterministe, pas de search-path injection
- Aucune donnée sensible exposée dans les messages d'exception (HINT uniquement)
- `BEFORE INSERT OR UPDATE` — valide avant l'écriture

---

## Sémantique des statuts — Décision finale

### Unités et séquences
| Valeur | Signification |
|--------|---------------|
| `brouillon` | En cours de rédaction — pas encore validé |
| `planifiee` | Confirmé dans le plan (défaut) |
| `prete` | Toutes les leçons préparées — prêt à enseigner |
| `archivee` | Archivé — référence historique |

**Valeurs supprimées vs migration 045 V7.5.2 :** `en_cours`, `terminee`  
**Raison :** Ces valeurs impliquent une progression d'enseignement réelle → appartient à `teaching_events`.

### Leçons
| Valeur | Signification |
|--------|---------------|
| `planifiee` | Dans le plan (défaut) |
| `a_preparer` | Nécessite une préparation |
| `preparee` | Préparation complète |
| `archivee` | Archivé |

**Jamais :** `enseignee`, `date_enseignee`, `note_enseignement` → ces faits appartiennent à `teaching_events`.

---

## Requêtes de cardinalité — Correction

### Requête incorrecte (migration 045 V7.5.2)
```sql
-- INCORRECT — HAVING COUNT(*) = 0 ne retourne jamais rien
SELECT unit_id, COUNT(*) FROM pedagogical_sequences
GROUP BY unit_id HAVING COUNT(*) = 0;
```

### Requêtes correctes (migration 045 V7.5.3 FINAL)
```sql
-- Unités sans séquences (LEFT JOIN)
SELECT pu.id, pu.titre
FROM pedagogical_units pu
LEFT JOIN pedagogical_sequences ps ON ps.unit_id = pu.id
WHERE ps.id IS NULL;

-- Séquences sans leçons (LEFT JOIN)
SELECT ps.id, ps.titre
FROM pedagogical_sequences ps
LEFT JOIN pedagogical_lessons pl ON pl.sequence_id = ps.id
WHERE pl.id IS NULL;
```

**Explication :** `GROUP BY ... HAVING COUNT(*) = 0` ne peut jamais retourner de résultat, car les groupes sans membres ne sont pas retournés par GROUP BY. Seul le LEFT JOIN détecte les parents sans enfants.

---

## Doctrine RAG/Unit — Correction

### Migration 045 V7.5.2 (doctrine restrictive)
```
"One unit = one curricular domain (RAG code prefix: 'A', 'B', 'C')"
```

### Migration 045 V7.5.3 FINAL (doctrine correcte)
```
"A pedagogical unit is a macro instructional grouping derived from one or
more related curriculum domains/outcomes."
```

`domain_code` reste un champ de métadonnées optionnel. Il ne constitue pas un invariant structurel. Deux RAG peuvent appartenir à la même unité si c'est pédagogiquement pertinent.

---

## Tests cross-context CTX-A → CTX-I

| Test | Mécanisme | Résultat attendu |
|------|-----------|-----------------|
| CTX-A Teacher A programme + A class + A pack | Check A,B,C,D,E,F → tous passent | PASS |
| CTX-B Teacher A programme + Teacher B class | Check B : `prog.classe_id ≠ NEW.classe_id` | FAIL PED_UNIT_CLASS_MISMATCH |
| CTX-C Teacher A programme + Teacher B pack | Check D/E : `pack.enseignant_id ≠ A` | FAIL PED_UNIT_PACK_MISMATCH |
| CTX-D Teacher A class + Teacher B enseignant_id | Check C : `class.enseignant_id ≠ NEW.enseignant_id` | FAIL PED_UNIT_OWNER_MISMATCH |
| CTX-E programme.classe = Class A, unit.classe_id = Class B | Check B : `prog.classe_id ≠ NEW.classe_id` | FAIL PED_UNIT_CLASS_MISMATCH |
| CTX-F unit.teaching_pack_id ≠ programme.teaching_pack_id | Check F | FAIL PED_UNIT_CONTEXT_MISMATCH |
| CTX-G UPDATE titre uniquement | Context inchangé, tous les checks passent | PASS |
| CTX-H UPDATE unit.classe_id vers classe foreign | Check B,C,E,F → au moins un échoue | FAIL |
| CTX-I Service-role INSERT avec contexte invalide | RLS bypassé mais trigger actif | FAIL (trigger) |
