# SPIE-DIAGNOSTIC-01 — Rapport de diagnostic P0
## Pipeline "Construire mon année scolaire" — Analyse des défaillances

**Statut :** RÉSOLU  
**Date du diagnostic :** 2026-08-09  
**Sévérité :** P0 — Pipeline bloqué pour tous les utilisateurs  
**Fichier affecté :** `src/app/api/spie/build-year/route.ts`

---

## Symptômes observés

Au déclenchement du pipeline "Construire mon année scolaire", les étapes suivantes
échouaient systématiquement :

| Étape | Statut affiché |
|-------|---------------|
| Validation configuration | ✅ SUCCESS |
| Génération curriculum/plan annuel | ✅ SUCCESS |
| Création syllabus | ❌ FAIL |
| Sauvegarde plan annuel | ❌ FAIL |
| Plans de leçon | ❌ FAIL |
| Première leçon | ❌ FAIL |
| Quiz | ❌ FAIL (dépendant) |

Le Teaching Pack atteignait le statut `partiellement_genere` ou `erreur`
malgré une génération IA réussie.

---

## Méthodologie de diagnostic

1. **Audit forensique du schéma DB** — lecture de `supabase/schema.sql`
2. **Audit des migrations** — lecture de `supabase/migrations/010_corrections_critiques.sql` et `036_teaching_packs.sql`
3. **Confrontation code vs DB** — comparaison des colonnes utilisées dans les INSERT/UPDATE vs colonnes existantes en DB
4. **Identification des contraintes CHECK** — vérification des valeurs acceptées par les contraintes

---

## Cause racine 1 — Colonne `genere_par_ia` inexistante

### Symptôme
Étape "Sauvegarde plan annuel" : FAIL  
→ Toutes les étapes suivantes : FAIL (progId = null)

### Cause
Le code utilisait `genere_par_ia: true` dans l'INSERT et l'UPDATE de `programme_annuel`.
Cette colonne n'existe pas dans la table.

### Preuve
Colonnes réelles de `programme_annuel` :
```
id, classe_id, titre, nb_semaines, contenu_json, created_at,
teaching_pack_id, calendrier_json, syllabus_json
```
Aucune colonne `genere_par_ia` — ni dans `supabase/schema.sql`, ni dans une migration.

### Impact
L'INSERT PostgreSQL lève une erreur → `insertErr` non-null → `progRow = null`  
→ `progId = null` → `buildState.programme_annuel = stepError(...)` → tout le pipeline downstream échoue.

### Correction
```diff
- genere_par_ia: true,  // supprimé du UPDATE
```
```diff
- genere_par_ia: true,  // supprimé de l'INSERT
```

---

## Cause racine 2 — Statut `'prete'` invalide pour `fichiers_dossier`

### Symptôme
Étape "Première leçon" : FAIL  
Étape "Quiz" : FAIL

### Cause
Le code utilisait `statut: 'prete'` dans les INSERT de `fichiers_dossier`.
La contrainte CHECK de cette table n'accepte pas `'prete'`.

### Preuve
Migration `010_corrections_critiques.sql` :
```sql
ALTER TABLE fichiers_dossier
  ADD CONSTRAINT fichiers_dossier_statut_check
  CHECK (statut IN ('brouillon','valide','enseigne','archive'));
```

La valeur `'prete'` est valide pour la table `lecons.statut`, pas pour `fichiers_dossier.statut`.

### Impact
L'INSERT PostgreSQL lève une violation de contrainte CHECK → `fichierErr` non-null  
→ `fichierRow = null` → leçon/quiz non persisté → stepError → FAIL.

### Correction
```diff
- statut: 'prete',   // leçon INSERT
+ statut: 'brouillon',
```
```diff
- statut: 'prete',   // quiz INSERT
+ statut: 'brouillon',
```

---

## Corrections appliquées

| # | Fichier | Ligne (approx.) | Changement |
|---|---------|-----------------|------------|
| 1 | `build-year/route.ts` | ~374 | Suppression `genere_par_ia: true` (UPDATE programme_annuel) |
| 2 | `build-year/route.ts` | ~389 | Suppression `genere_par_ia: true` (INSERT programme_annuel) |
| 3 | `build-year/route.ts` | ~450 | `statut: 'prete'` → `statut: 'brouillon'` (INSERT leçon) |
| 4 | `build-year/route.ts` | ~520 | `statut: 'prete'` → `statut: 'brouillon'` (INSERT quiz) |

---

## Améliorations annexes (SPIE-DIAGNOSTIC-01)

### Mission 2 — Logging structuré du syllabus

Ajout d'un logging robuste dans le bloc syllabus :
- `rawSylCapture` capture la réponse Claude brute avant tout parsing
- Extraction JSON robuste : `cleanSyl.indexOf('{')` → `lastIndexOf('}')` (gère le texte avant/après)
- `console.error('[build-year][syllabus] FAIL ...')` avec `packId`, `error`, `raw[0:500]`
- Instruction système renforcée : `"Commence directement par {"` pour réduire les faux-positifs

### Mission 8 — Endpoint de diagnostic founder

Création de `GET /api/founder/build-debug?packId=...` :
- Protégé par `is_admin` ou rôle `founder/super_admin`
- Retourne : pack metadata, db state (prog annuel, leçon count, quiz count), build_state complet, step trace, failing steps, completeness réel (via `verifyTeachingPackCompleteness`)
- Diagnostic summary : `firstFailingStep`, `firstFailingError`, `missingElements`

---

## Vérification qualité post-correction

```
npx tsc --noEmit  →  0 erreur
npm run build     →  EXIT 0
```

---

## Leçons apprises

1. **Valider le schéma DB avant tout INSERT** — toujours croiser le code avec `schema.sql` + migrations pour les colonnes utilisées.
2. **Les contraintes CHECK ne sont pas documentées dans les types TypeScript** — elles doivent être auditées manuellement depuis les migrations.
3. **Distinguer `fichiers_dossier.statut` et `lecons.statut`** — deux tables avec des contraintes CHECK différentes pour un champ au même nom.
4. **Logging structuré dès le départ** — sans `rawSylCapture`, le diagnostic du syllabus aurait été impossible sans logs serveur en prod.

---

## Voir aussi

- [Build_Debugging_Guide.md](Build_Debugging_Guide.md) — Procédure de débogage step-by-step
- [Build_Trace_Model.md](Build_Trace_Model.md) — Modèle de trace structurée
- [Persistence_Pipeline.md](Persistence_Pipeline.md) — Pattern GENERATE→VERIFY
- [Decision_Log.md](Decision_Log.md) — DEC-061 à DEC-065
