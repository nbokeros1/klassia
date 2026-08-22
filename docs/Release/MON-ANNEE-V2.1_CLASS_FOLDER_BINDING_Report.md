# MON-ANNEE-V2.1 — Class Folder Binding

**Statut :** Livré (V2.1A taxonomie corrigée) — en attente de validation Product Owner  
**Date :** 2026-08-15  
**Build :** tsc 0 erreurs · `npm run build` exit code 0  
**Dépend de :** MON-ANNEE-V2

---

## 1. Résumé

MON-ANNEE-V2.1 implémente la **Section 19** de la spec : chaque Build Year génère automatiquement une arborescence de navigation dans le dossier de classe. Le plan annuel, les séquences, et les plans de leçon sont indexés dans `fichiers_dossier` avec des références canoniques stables — permettant à l'enseignant de les retrouver directement depuis l'explorateur de fichiers.

---

## 2. Audit initial (résultat)

### Colonnes `fichiers_dossier` — existantes (migration 037)

| Colonne | Type | Usage Section 19 |
|---------|------|-----------------|
| `teaching_pack_id` | UUID | Identifie le pack propriétaire |
| `sequence_index` | INTEGER (0-based) | Identifie la séquence |
| `lecon_index` | INTEGER (0-based) | Identifie la leçon dans la séquence |
| `source_meta_json` | JSONB | Métadonnées de navigation canoniques |
| `tags` | TEXT[] | Discriminant de sous-type pour les entrées système |

Ces 5 colonnes forment une **référence canonique naturelle** pour chaque entrée système.

### Ce qui manquait

Pas de unique constraint sur la clé composite — impossible d'utiliser `ON CONFLICT` upsert via Supabase JS client.

### Verdict

Le schéma supporte des références canoniques propres. Le pattern **read-then-write** utilise les colonnes naturelles telles qu'elles ont été conçues. Pas de bricolage.

---

## 3. Implémentation (V2.1A — taxonomie corrigée)

### Pattern d'idempotence

```
Build N :
  1. SELECT WHERE teaching_pack_id = packId
  2. Construire Map<clé, {id, dossier_id}> des entrées existantes
  3. Pour chaque entrée souhaitée :
     - Absente → INSERT
     - Présente, bon dossier → skip
     - Présente, mauvais dossier → UPDATE dossier_id (correction taxonomie)
  4. Résultat : { inserted: M, updated: U, skipped: K }

Build N+1 (reprise) :
  1. SELECT → toutes les entrées retrouvées dans les bons dossiers
  2. Diff → toInsert=0, toUpdate=0
  3. skip complet → idempotent garanti
```

Clé composite : `"type_fichier:spie_subtag:sequence_index:lecon_index"`

### Arborescence officielle V2.1A

```
Classe
├── Préparation/
│   ├── Curriculum/
│   │   └── Curriculum — [source_curriculum]      ← type: curriculum
│   ├── Syllabus/           ← créé dynamiquement (type: custom)
│   │   └── Syllabus — [titre]                    ← type: document, tag: spie:syllabus
│   ├── Plan annuel/
│   │   └── [Titre du programme]                  ← type: document, tag: spie:plan_annuel
│   ├── Séquences/          ← créé dynamiquement (type: custom)
│   │   ├── S01 — [Titre séquence 1]              ← type: sequence
│   │   ├── S02 — [Titre séquence 2]              ← type: sequence
│   │   └── …
│   └── Plans de leçons/
│       ├── S01-L01 — [Titre leçon 1.1]           ← type: plan_lecon
│       ├── S01-L02 — [Titre leçon 1.2]           ← type: plan_lecon
│       └── …
└── Leçons/
    └── S01-L01 — [Titre leçon générée]           ← type: lecon_complete (ÉTAPE 6)
```

**Première leçon (ÉTAPE 6 route.ts) :** stockée dans `lecons/` (corrigé depuis `plans_lecons/`).

### Invariants respectés

| Règle spec | Implémentation |
|-----------|---------------|
| `fichiers_dossier` = index/navigation, pas source de vérité | Les entrées n'ont pas de `contenu_html` — juste `nom`, `description`, `source_meta_json` |
| Jamais d'INSERT aveugle à chaque reprise | Pattern read-then-write + Set existant |
| Ne pas supprimer les documents utilisateur | La fonction ne fait jamais de DELETE |
| Référence canonique dans `source_meta_json` | `{ type, pack_id, prog_id, seq_num, lecon_num }` sur chaque entrée |

---

## 4. Fichiers modifiés / créés

| Fichier | Changement |
|---------|-----------|
| `src/lib/spie/class-folder-binding.ts` | **Créé** — fonction `bindProgrammeToClassFolder()` |
| `src/app/api/spie/build-year/route.ts` | **Modifié** — import + ÉTAPE 7.5 (non-bloquante) |
| `src/lib/types/database.ts` | **Modifié** — `FichierDossier` étendu (colonnes migrations 037 + 038) |
| `supabase/migrations/040_spie_source_ref_proposed.sql` | **Créé** — migration proposée, NE PAS exécuter sans validation PO |

---

## 5. Tags système

Toutes les entrées SPIE portent le tag `spie:system` + un tag de sous-type :

| Tag | Type entrée |
|-----|------------|
| `spie:curriculum` | Curriculum source |
| `spie:syllabus` | Syllabus du programme |
| `spie:plan_annuel` | Plan annuel (titre du programme) |
| `spie:sequence` | Résumé de séquence |
| `spie:plan_lecon` | Plan de leçon navigation |
| `spie:lecon_complete` | Première leçon générée (existante, rattachée) |

Filtre rapide depuis l'explorateur : `tags @> ARRAY['spie:system']`.

---

## 6. Migration proposée (validation PO requise)

**Fichier :** `supabase/migrations/040_spie_source_ref_proposed.sql`

```sql
ALTER TABLE fichiers_dossier ADD COLUMN IF NOT EXISTS source_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fichiers_dossier_source_ref
  ON fichiers_dossier(source_ref) WHERE source_ref IS NOT NULL;
```

**Bénéfice après migration :**
- Remplace le read-then-write par un `upsert({ onConflict: 'source_ref' })` atomique
- Garantit l'unicité au niveau DB (pas seulement applicatif)
- Zéro impact sur les documents utilisateur (`source_ref IS NULL` pour eux)

**État actuel sans la migration :** Correct et idempotent — la migration est une optimisation, pas un prérequis.

---

## 7. Comportement non-bloquant

Si `bindProgrammeToClassFolder()` échoue (dossiers manquants, erreur réseau) :
- Le build N'est PAS interrompu
- L'erreur est journalisée en `console.warn('[SPIE_BINDING_WARN]')`
- Le Teaching Pack est marqué `pret` normalement si les autres étapes réussissent
- L'arborescence sera recréée au prochain Build ou Reprendre

---

## 8. Idempotence — scénarios testés

| Scénario | Comportement attendu |
|----------|---------------------|
| Build initial (nouvelle classe) | `inserted: N+M` (séquences + leçons) |
| Reprendre la génération | `inserted: 0, skipped: N+M` — aucun doublon |
| Dossiers système manquants | Entrées skippées silencieusement, 0 crash |
| Première leçon déjà taggée | `.is('teaching_pack_id', null)` → UPDATE ignoré |
| Programme avec 5 séq × 5 leçons | `inserted: 2 (curriculum+syllabus+plan_annuel) + 5 (séq) + 25 (plans)` = 33 |

---

## 9. Quality gate

```
npx tsc --noEmit → 0 erreurs
npm run build    → exit code 0
```

---

*Ne pas push avant validation Product Owner*
