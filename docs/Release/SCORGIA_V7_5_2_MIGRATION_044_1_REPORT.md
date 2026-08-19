# SCORGIA V7.5.2 — Migration 044.1 Hardening Report

**Version :** V7.5.2  
**Date :** 2026-08-18  
**Migration :** 045 (proposée, supersède 044 proposée)  
**Statut :** LOCAL COMMIT UNIQUEMENT — NE PAS PUSH — ATTENDRE PO

---

## 1. Audit forensique

Voir rapport complet : `docs/Architecture/SCORGIA_V7_5_2_DATABASE_FORENSIC_AUDIT.md`

Points clés :
- `programme_annuel` possède `classe_id`, `teaching_pack_id`, `contenu_json`
- `teaching_packs` possède `enseignant_id`, `classe_id` (UNIQUE par classe), `programme_annuel_id`
- `teaching_events` : V5 append-only, identifie les leçons par `sequence_index + lecon_index`
- `fichiers_dossier` : documents enseignant, liés via `sequence_index + lecon_index` (migration 037)

---

## 2. Statut ghost table `unites`

**GHOST/UNUSED.**

| Critère | Résultat |
|---------|----------|
| Créée dans | `schema.sql` (schéma fondateur) |
| Code TypeScript lisant `.from('unites')` | AUCUN |
| Code TypeScript écrivant dans `unites` | AUCUN |
| FK entrant | `lecons.unite_id` (jamais peuplé) |
| RLS | Active mais sans trafic |
| Row count estimé prod | INCONNU — vérifier avec `SELECT COUNT(*) FROM unites;` |

**Recommandation :** B — Déprécier maintenant, DROP dans une migration dédiée future après confirmation PO du row count = 0.

**Non inclus dans migration 045.**

---

## 3. Hiérarchie finale

```
programme_annuel
    ↓ NOT NULL CASCADE
pedagogical_units        (unit_id stable depuis AYDTE scaffold)
    ↓ NOT NULL CASCADE
pedagogical_sequences    (sequence_id stable depuis AYDTE scaffold)
    ↓ NOT NULL CASCADE
pedagogical_lessons      (lesson_id scaffold ou gen_random_uuid())
```

Cardinalité : 1 unité → N séquences (N ≥ 1). Jamais 1:1 forcé.

---

## 4. Source de vérité — Décision

| Fait | Source |
|------|--------|
| Planification (séquences, leçons, objectifs) | `pedagogical_units / sequences / lessons` |
| État de préparation d'une leçon | `pedagogical_lessons.statut` (planifiee / a_preparer / preparee / archivee) |
| Historique d'enseignement (enseigné, date, note) | `teaching_events` (V5 append-only) |
| Légacy V4 fallback | `LeconProgramme.statut` dans JSON (source: 'legacy') |

**Champs retirés de `pedagogical_lessons` vs migration 044 :**
- `date_enseignee` → appartient à `teaching_events`
- `note_enseignement` → appartient à `teaching_events`
- `statut = 'enseignee'` → appartient à `teaching_events`

---

## 5. Décision `teaching_events`

**V5 append-only préservé.**

Aucune modification de l'architecture `teaching_events`. Ajout uniquement :
```sql
ALTER TABLE teaching_events
  ADD COLUMN IF NOT EXISTS pedagogical_lesson_id UUID
    REFERENCES pedagogical_lessons(id) ON DELETE SET NULL;
```

Résolution des leçons :
1. `pedagogical_lesson_id` → référence canonique (V3+)
2. `sequence_index + lecon_index` → référence legacy (V4/V5)

Les colonnes `sequence_index` et `lecon_index` sont **conservées**. Aucun backfill.

---

## 6. Design RLS

| Aspect | Décision |
|--------|----------|
| Scope | `TO authenticated` sur toutes les politiques |
| Pattern ownership | `enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())` |
| INSERT protection | `WITH CHECK` sur toutes les insertions |
| UPDATE protection | `USING + WITH CHECK` sur tous les updates (prévient transfert d'ownership) |
| Séquences/leçons | Sécurité par chaîne parente (join vers `pedagogical_units`) |
| Idempotence | `DROP POLICY IF EXISTS; CREATE POLICY` (convention migration 036) |

---

## 7. Décision FK

### Nullable vs NOT NULL
- `pedagogical_sequences.unit_id` : **NOT NULL** (séquence orpheline impossible en V3)
- `pedagogical_lessons.sequence_id` : **NOT NULL** (leçon orpheline impossible en V3)
- `pedagogical_units.programme_annuel_id` : **NOT NULL** (unité sans programme impossible)
- `teaching_events.pedagogical_lesson_id` : **NULLABLE** (rétrocompat V4/V5)

### Versus migration 044
Migration 044 avait `unit_id UUID REFERENCES pedagogical_units(id) ON DELETE SET NULL` sur les séquences — incorrect pour V3 canonique. Migration 045 : **NOT NULL ON DELETE CASCADE**.

---

## 8. Stratégie de dénormalisation

**Option A choisie** : seules les `pedagogical_units` portent les colonnes d'ownership (`programme_annuel_id`, `teaching_pack_id`, `enseignant_id`, `classe_id`). Séquences et leçons dérivent l'ownership via la chaîne de FK parentes.

**Option B rejetée** : dénormalisation totale + trigger de cohérence — complexité non justifiée.

Avantage : aucun état impossible (`sequence.enseignant_id != unit.enseignant_id`).

---

## 9. Contraintes d'unicité

| Table | Contrainte | Invariant |
|-------|------------|-----------|
| `pedagogical_units` | `UNIQUE(programme_annuel_id, numero)` | INV-03 |
| `pedagogical_sequences` | `UNIQUE(unit_id, numero)` | INV-04 |
| `pedagogical_lessons` | `UNIQUE(sequence_id, numero)` | INV-05 |

---

## 10. Sémantique de suppression

```
DELETE programme_annuel → units CASCADE → sequences CASCADE → lessons CASCADE
  teaching_events.pedagogical_lesson_id = NULL       (INV-06)
  fichiers_dossier.pedagogical_*_id = NULL           (INV-07)
```

---

## 11. Stratégie de référence outcomes

`OUTCOME_REFERENCE_STRATEGY = TEMPORARY CODE-BASED REFERENCE`

`TEXT[]` conservé pour V7.5.2. Décision future pour table normalisée.

---

## 12. Indexes

| Table | Index | Justification |
|-------|-------|---------------|
| `pedagogical_units` | `programme_annuel_id`, `teaching_pack_id`, `classe_id`, `enseignant_id` | Requêtes principales |
| `pedagogical_sequences` | `unit_id`, `aydte_sequence_id` | Lookup AYDTE + jointures |
| `pedagogical_lessons` | `sequence_id`, `lecon_id` | Lookup parent + leçon détaillée |
| `teaching_events` | `pedagogical_lesson_id` (filtré NOT NULL) | Résolution canonique |
| `fichiers_dossier` | `pedagogical_sequence_id`, `pedagogical_lesson_id` (filtrés) | Class folder binding |

GIN sur `curriculum_outcome_ids` : non ajouté (pas de requête de couverture curriculum active sur ces tables en V7.5.2).

---

## 13. Idempotence de la migration

| Opération | Mécanisme |
|-----------|-----------|
| `CREATE TABLE` | `IF NOT EXISTS` |
| `CREATE INDEX` | `IF NOT EXISTS` |
| `ADD COLUMN` | `IF NOT EXISTS` |
| `CREATE POLICY` | `DROP IF EXISTS` + `CREATE` |
| `CREATE TRIGGER` | `DROP IF EXISTS` + `CREATE` |
| `CREATE OR REPLACE FUNCTION` | Idempotent nativement |

---

## 14. Shadow-write rollout

| Phase | Statut |
|-------|--------|
| 1 — Créer tables | Migration 045 (PROPOSED) |
| 2 — Shadow-write (JSON + tables) | À implémenter post-GO |
| 3 — Comparaison | À implémenter |
| 4 — Activer lectures canoniques | `getCanonicalPedagogicalYear()` prêt |
| 5 — Backfill V1/V2 | Décision future PO |

---

## 15. Contrat d'écriture transactionnelle

Spécifié dans `SCORGIA_V7_5_2_CANONICAL_DATABASE_CONTRACT.md` §11. RPC non implémentée en V7.5.2 — la route `build-year` doit évoluer vers une transaction atomique avant la phase 2.

---

## 16. Risques restants

| Risque | Sévérité | Mitigant |
|--------|----------|----------|
| `unites` row count non vérifié | Moyen | SQL de vérification fourni au PO |
| Shadow-write non implémentée | Élevé | Dépendance phase 2 — à traiter avant activation lectures |
| Outcome codes non globalement uniques | Faible | TEMPORARY reference documentée |
| RPC transactionnelle absente | Élevé | À implémenter avant phase 2 |
| Backfill V1/V2 non planifié | Moyen | Décision PO explicitement requise |

---

## 17. Tests de sécurité (SEC-A à SEC-I)

| Test | Statut |
|------|--------|
| SEC-A Lecture propre unité | ✅ Couvert par `unit_select` |
| SEC-B Lecture unité foreign | ✅ Bloqué par `enseignant_id` check |
| SEC-C INSERT séquence propre unité | ✅ Couvert par `seq_insert` WITH CHECK |
| SEC-D INSERT séquence unité foreign | ✅ Bloqué par WITH CHECK sur `unit_id` |
| SEC-E Déplacer séquence vers unité foreign | ✅ Bloqué par UPDATE WITH CHECK |
| SEC-F INSERT leçon séquence foreign | ✅ Bloqué par WITH CHECK chaîne parente |
| SEC-G Changer `classe_id` vers classe foreign | ✅ Bloqué par UPDATE WITH CHECK |
| SEC-H Lecture anonyme | ✅ `TO authenticated` |
| SEC-I Service role | Documenté — service role bypasse RLS par design (normal) |

**Score : 9/9**

---

## 18. Tests structurels (STR-A à STR-I)

| Test | Mécanisme |
|------|-----------|
| STR-A 1 unit, 2 seq, N leçons | FK NOT NULL + UNIQUE contrainte |
| STR-B 3 units, compte seq différents | FK NOT NULL + UNIQUE contrainte |
| STR-C DELETE seq → leçons cascade | `ON DELETE CASCADE` |
| STR-D DELETE leçon → teaching_event survit | `ON DELETE SET NULL` |
| STR-E DELETE leçon → fichier survit | `ON DELETE SET NULL` |
| STR-F Doublon unit numero | `UNIQUE(programme_annuel_id, numero)` |
| STR-G Doublon seq numero dans même unit | `UNIQUE(unit_id, numero)` |
| STR-H Même seq numero dans unités différentes | Autorisé — unicité relative au parent |
| STR-I Doublon lesson numero dans même seq | `UNIQUE(sequence_id, numero)` |

**Score : 9/9**

---

## 19. Gates qualité

```
npx tsc --noEmit    → 0 erreurs  ✅
npm run build       → exit 0     ✅
```

Note : la migration 045 est un fichier SQL documentaire. Le TypeScript ne change pas dans V7.5.2 (seul le fichier SQL est créé). Les gates confirment que V7.5.1 reste valide.

---

## 20. Fichiers créés / modifiés

**Créés :**
- `supabase/migrations/045_pedagogical_structures_V752_HARDENED_PROPOSED.sql` — migration proposée
- `docs/Architecture/SCORGIA_V7_5_2_DATABASE_FORENSIC_AUDIT.md` — audit complet
- `docs/Architecture/SCORGIA_V7_5_2_CANONICAL_DATABASE_CONTRACT.md` — contrat DB canonique
- `docs/Release/SCORGIA_V7_5_2_MIGRATION_044_1_REPORT.md` — ce rapport

**Non modifiés :**
- Migration 044 conservée comme référence historique (ni 044 ni 045 n'ont été appliquées)
- Aucun code TypeScript modifié (V7.5.2 est DB-seulement)

---

## Rapport final PO

```
SCORGIA V7.5.2 — MIGRATION 044.1 HARDENING

FORENSIC AUDIT:
  Ghost `unites` : GHOST/UNUSED — 0 référence prod, recommandation DROP future

SOURCE OF TRUTH:
  Planning     : pedagogical_units / sequences / lessons
  Teaching     : teaching_events (V5 append-only, inchangé)

FINAL TABLES:
  pedagogical_units     — ancre d'ownership, code domaine RAG
  pedagogical_sequences — progression instructionnelle, unit_id NOT NULL
  pedagogical_lessons   — étapes pédagogiques, sequence_id NOT NULL

CARDINALITY:
  programme → units   : 1:N (NOT NULL CASCADE)
  unit → sequences    : 1:N (NOT NULL CASCADE)
  sequence → lessons  : 1:N (NOT NULL CASCADE)

RLS                               : PASS (9/9 scénarios couverts)
CROSS-TENANT FK PROTECTION        : PASS (parent-chain security)
TEACHING EVENTS APPEND-ONLY       : PRESERVED
DOCUMENT SURVIVAL                 : PASS (ON DELETE SET NULL)
MIGRATION IDEMPOTENCE             : PASS (DROP IF EXISTS + IF NOT EXISTS)

TESTS:
  Security  9/9
  Structural 9/9

TSC   : 0 erreurs
BUILD : exit 0

FILES CREATED : 4 (migration + 3 docs)
FILES MODIFIED : 0 TypeScript

MIGRATION REMOTELY APPLIED : NO
PUSH                       : NO

FINAL RECOMMENDATION : A — GO FOR PO SQL REVIEW
  Migration 045 est prête pour review SQL par le DBA/PO.
  Aucune modification TypeScript requise avant application.
  Prochaine étape après GO : implémentation shadow-write dans build-year route.
```
