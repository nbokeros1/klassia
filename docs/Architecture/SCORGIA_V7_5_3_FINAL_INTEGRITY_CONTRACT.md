# SCORGIA V7.5.3 — Final Integrity Contract

**Version :** V7.5.3  
**Date :** 2026-08-19  
**Migration :** 045_canonical_pedagogical_structures_V75_3_FINAL_PROPOSED.sql  
**Statut :** PROPOSED — en attente approbation PO  
**Supersède :** 045_pedagogical_structures_V752_HARDENED_PROPOSED.sql (V7.5.2)

---

## 1. Contrat d'intégrité — Vue d'ensemble

Ce document est le contrat d'architecture canonique pour V7.5.3. Il fusionne et remplace les invariants partiels de V7.5.2 et documente toutes les décisions d'intégrité structurelle.

La migration 045 V7.5.3 FINAL est **la seule candidate à l'exécution remote**. La migration 045 V7.5.2 est marquée SUPERSEDED et ne doit pas être exécutée.

---

## 2. Hiérarchie canonique

```
auth.users
  │ (user_id = auth.uid() — 1:1 unique)
  ▼
utilisateurs.id
  │ enseignant_id (1:N)
  ▼
classes.id
  │ classe_id (UNIQUE → 1:1 par classe)
  ▼
teaching_packs.id
  │ teaching_pack_id (nullable, cross-ref avec programme)
  ▼
programme_annuel.id           ← ancre de la planification annuelle
  │ programme_annuel_id NOT NULL CASCADE
  ▼
pedagogical_units             ← macro groupement pédagogique (1:N par programme)
  │ unit_id NOT NULL CASCADE
  ▼
pedagogical_sequences         ← progression instructionnelle (1:N par unité)
  │ sequence_id NOT NULL CASCADE
  ▼
pedagogical_lessons           ← étape pédagogique (1:N par séquence)

(séparé — append-only)
teaching_events               ← historique d'enseignement réel
fichiers_dossier              ← documents enseignant
```

**Cardinalité à chaque niveau :** 1:N strict (jamais 1:1 forcé).  
**Unité orpheline impossible.** Séquence orpheline impossible. Leçon orpheline impossible.

---

## 3. Invariants INV-01 → INV-12

| Code | Invariant | Mécanisme |
|------|-----------|-----------|
| INV-01 | Toute séquence a exactement une unité parente | FK NOT NULL + CASCADE |
| INV-02 | Toute leçon a exactement une séquence parente | FK NOT NULL + CASCADE |
| INV-03 | `numero` unique dans un `programme_annuel` | UNIQUE(programme_annuel_id, numero) |
| INV-04 | `numero` unique dans une `pedagogical_unit` | UNIQUE(unit_id, numero) |
| INV-05 | `numero` unique dans une `pedagogical_sequence` | UNIQUE(sequence_id, numero) |
| INV-06 | Supprimer la structure planification ne supprime pas `teaching_events` | ON DELETE SET NULL |
| INV-07 | Supprimer la structure planification ne supprime pas `fichiers_dossier` | ON DELETE SET NULL |
| INV-08 | L'historique d'enseignement est autoritatif dans `teaching_events` | Sémantique statut |
| INV-09 | `statut` des units/séquences = état de planification uniquement | CHECK + convention |
| INV-10 | Un seul pack actif par classe | UNIQUE(classe_id) sur teaching_packs |
| INV-11 | Les 4 colonnes d'ownership d'une unité forment un contexte cohérent | Trigger `validate_pedagogical_unit_context()` |
| INV-12 | Aucune leçon ne contient d'attribut d'enseignement réel | Convention schéma V7.5.3 |

---

## 4. Intégrité de contexte — Trigger P0 (nouveau en V7.5.3)

### Problème corrigé

En V7.5.2, `pedagogical_units` portait 4 colonnes d'ownership indépendantes sans mécanisme garantissant leur cohérence. Les RLS policies ne protègent que contre l'accès cross-tenant côté `authenticated` — elles ne garantissent pas la cohérence interne (ex. : teacher A's programme + teacher B's pack).

### Solution : `validate_pedagogical_unit_context()`

Trigger `BEFORE INSERT OR UPDATE` sur `pedagogical_units`.

**Vérifications :**
1. Le `programme_annuel_id` référence un programme existant
2. `programme_annuel.classe_id = NEW.classe_id`
3. `classes.enseignant_id = NEW.enseignant_id`
4. `teaching_packs.enseignant_id = NEW.enseignant_id`
5. `teaching_packs.classe_id = NEW.classe_id`
6. Si `programme_annuel.teaching_pack_id IS NOT NULL` → doit égaler `NEW.teaching_pack_id`

**Propriétés :**
- `SECURITY INVOKER` — pas de privilege escalation
- `SET search_path = public` — résolution déterministe, pas de search-path injection
- Fonctionne pour `authenticated` ET `service_role` (RLS bypassé pour service role mais trigger actif)

---

## 5. Sémantique des statuts — Décision finale

### Unités et séquences
```
brouillon   → en cours de rédaction (défaut initial)
planifiee   → confirmé dans le plan (défaut POST)
prete       → toutes les leçons préparées
archivee    → archivé
```

**Retirés de V7.5.2 :** `en_cours`, `terminee`  
Ces valeurs appartenaient sémantiquement à l'espace de l'enseignement réel. Elles causaient une confusion avec `teaching_events` qui est la vraie source d'état d'enseignement.

### Leçons
```
planifiee   → dans le plan (défaut)
a_preparer  → marquée pour préparation
preparee    → préparation complète
archivee    → archivé
```

**Jamais :** `enseignee`, `date_enseignee`, `note_enseignement` → ces faits appartiennent à `teaching_events`.

### Source de vérité par domaine

| Domaine | Source |
|---------|--------|
| Planification (quoi, quand, objectifs) | `pedagogical_units / sequences / lessons` |
| État de préparation d'une leçon | `pedagogical_lessons.statut` |
| Enseignement réel (enseigné, date, note) | `teaching_events` (V5, append-only) |
| Documents | `fichiers_dossier` |

---

## 6. Décisions FK

| Colonne | Nullable | ON DELETE | Raison |
|---------|----------|-----------|--------|
| `pedagogical_units.programme_annuel_id` | NOT NULL | CASCADE | Unité sans programme = impossible |
| `pedagogical_units.teaching_pack_id` | NOT NULL | CASCADE | Unité sans pack = impossible |
| `pedagogical_units.enseignant_id` | NOT NULL | CASCADE | Unité sans enseignant = impossible |
| `pedagogical_units.classe_id` | NOT NULL | CASCADE | Unité sans classe = impossible |
| `pedagogical_sequences.unit_id` | NOT NULL | CASCADE | Séquence orpheline impossible en V3 |
| `pedagogical_lessons.sequence_id` | NOT NULL | CASCADE | Leçon orpheline impossible en V3 |
| `teaching_events.pedagogical_lesson_id` | NULLABLE | SET NULL | Rétrocompat V4/V5 events |
| `fichiers_dossier.pedagogical_*_id` | NULLABLE | SET NULL | Documents survivent à la suppression |

---

## 7. Doctrine de groupement en unités

### V7.5.2 (doctrine restrictive — supprimée)
> "One unit = one curricular domain (RAG code prefix: 'A', 'B', 'C')"

Cette doctrine était technologiquement incorrecte. Elle imposait une contrainte qui n'existe pas dans les programmes d'études.

### V7.5.3 (doctrine correcte)
> "A pedagogical unit is a macro instructional grouping derived from one or more related curriculum domains/outcomes. A unit may span multiple domains when pedagogically coherent."

`domain_code` est un champ de métadonnées optionnel pour aider à organiser visuellement. Il n'est pas un invariant structurel. `groupSequencesIntoUnits()` en TypeScript utilise le code de domaine comme heuristique de regroupement initiale — un enseignant peut redéfinir les groupes.

---

## 8. Correction requêtes de cardinalité

### Requête incorrecte (V7.5.2 — HAVING COUNT = 0)

```sql
-- IMPOSSIBLE — GROUP BY ne produit jamais de groupe avec COUNT = 0
SELECT unit_id FROM pedagogical_sequences GROUP BY unit_id HAVING COUNT(*) = 0;
```

### Requêtes correctes (V7.5.3 — LEFT JOIN)

```sql
-- Unités sans séquences :
SELECT pu.id FROM pedagogical_units pu
LEFT JOIN pedagogical_sequences ps ON ps.unit_id = pu.id
WHERE ps.id IS NULL;

-- Séquences sans leçons :
SELECT ps.id FROM pedagogical_sequences ps
LEFT JOIN pedagogical_lessons pl ON pl.sequence_id = ps.id
WHERE pl.id IS NULL;
```

---

## 9. Sécurité RLS

### Philosophie
- Toutes les politiques : `TO authenticated`
- Pattern ownership : `enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())`
- INSERT : `WITH CHECK` pour bloquer l'injection cross-tenant
- UPDATE : `USING + WITH CHECK` pour bloquer le changement de propriétaire
- Idempotence : `DROP POLICY IF EXISTS` + `CREATE POLICY`

### Chaîne parente (séquences et leçons)

```sql
-- Séquences : propriété via unité parente
unit_id IN (
  SELECT id FROM pedagogical_units
  WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
)

-- Leçons : propriété via séquence → unité
sequence_id IN (
  SELECT ps.id FROM pedagogical_sequences ps
  JOIN pedagogical_units pu ON pu.id = ps.unit_id
  WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
)
```

### Couche RLS vs trigger

La RLS protège contre l'accès cross-tenant. Le trigger valide la cohérence interne du contexte. Ces deux couches sont indépendantes et complémentaires.

| Scénario | RLS | Trigger |
|----------|-----|---------|
| Teacher A lit unité de Teacher B | BLOQUE | — |
| Teacher A INSERT unité propre, contexte cohérent | PASSE | PASSE |
| Teacher A INSERT unité propre, contexte incohérent (pack foreign) | PASSE (RLS ne vérifie pas FK) | BLOQUE |
| Service role INSERT contexte incohérent | PASSE (bypass RLS) | BLOQUE |

---

## 10. Ghost table `unites`

**Statut : GHOST/UNUSED**

| Critère | Résultat |
|---------|----------|
| Créée dans | `schema.sql` |
| Lectures TypeScript | AUCUNE |
| Écritures TypeScript | AUCUNE |
| FK entrant | `lecons.unite_id` (jamais peuplé) |
| Migration 045 V7.5.3 | Non touchée |

**Avant tout DROP :** PO doit confirmer :
```sql
SELECT COUNT(*) FROM unites;
SELECT COUNT(*) FROM lecons WHERE unite_id IS NOT NULL;
```
Si les deux = 0, un DROP sécurisé peut être proposé dans une migration 046 dédiée.

---

## 11. Shadow-write rollout — Phases inchangées

| Phase | Action | Statut V7.5.3 |
|-------|--------|---------------|
| 1 | Créer tables canoniques | Migration 045 V7.5.3 (PROPOSED) |
| 2 | Shadow-write JSON + tables en parallèle | À implémenter post-GO |
| 3 | Comparaison | À implémenter |
| 4 | Activer lectures canoniques | `getCanonicalPedagogicalYear()` prêt |
| 5 | Backfill legacy V1/V2 | Décision PO future |

Aucun backfill dans V7.5.3.

---

## 12. Stratégie de référence outcomes

`OUTCOME_REFERENCE_STRATEGY = TEMPORARY CODE-BASED REFERENCE`

`TEXT[]` conservé. Codes comme `["A1.1", "A1.2"]` non globalement uniques sans contexte (curriculum, province, niveau). Acceptable pour V7.5.x. Table normalisée = décision PO future.

---

## 13. Invariants supplémentaires V7.5.3

| Code | Invariant | Ajouté dans |
|------|-----------|-------------|
| INV-11 | 4 colonnes d'ownership cohérentes dans `pedagogical_units` | V7.5.3 (trigger) |
| INV-12 | Aucune leçon ne porte d'attribut d'enseignement réel | V7.5.3 (sémantique) |

---

## 14. Fichiers SCORGIA V7.5.3

| Fichier | Type | Note |
|---------|------|------|
| `supabase/migrations/045_canonical_pedagogical_structures_V75_3_FINAL_PROPOSED.sql` | Migration PROPOSED | Candidat unique pour exécution remote |
| `supabase/migrations/045_pedagogical_structures_V752_HARDENED_PROPOSED.sql` | Migration SUPERSEDED | NE PAS EXÉCUTER |
| `docs/Architecture/SCORGIA_V7_5_3_FINAL_INTEGRITY_CONTRACT.md` | Ce fichier | Contrat d'architecture V7.5.3 |
| `docs/Architecture/SCORGIA_V7_5_3_FINAL_DB_INTEGRITY_AUDIT.md` | Audit | Vérification schéma + trigger |
| `docs/Release/SCORGIA_V7_5_3_MIGRATION_FINAL_REVIEW.md` | Rapport PO | Format décision GO/NO-GO |
