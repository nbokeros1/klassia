# SCORGIA V7.5.2 — Canonical Database Contract

**Date :** 2026-08-18  
**Statut :** PROPOSED — en attente approbation PO  
**Migration :** 045 (proposée, non appliquée)

---

## 1. Hiérarchie finale

```
programme_annuel (contenu_json + canonical tables)
    │
    ▼ 1:N
pedagogical_units           ← macro thème (domaine RAG)
    │ unit_id NOT NULL FK
    ▼ 1:N
pedagogical_sequences       ← progression instructionnelle
    │ sequence_id NOT NULL FK
    ▼ 1:N
pedagogical_lessons         ← étape pédagogique

(séparé, append-only)
teaching_events             ← historique d'enseignement V5
```

---

## 2. Source de vérité — Décision finale

| Domaine | Source autoritaire |
|---------|-------------------|
| **Planification** (quoi, quand, objectifs) | `pedagogical_units / sequences / lessons` |
| **Préparation** (statut de préparation) | `pedagogical_lessons.statut` |
| **Historique d'enseignement** (enseigné quand, note) | `teaching_events` (V5, append-only) |
| **Documents enseignant** | `fichiers_dossier` |
| **État enseigné/non-enseigné (legacy V4)** | `LeconProgramme.statut` dans `contenu_json` (fallback uniquement) |

**Règle absolue :** ne jamais créer deux sources autoritaires pour un même fait. `pedagogical_lessons` ne contient ni `date_enseignee`, ni `note_enseignement`, ni `statut = 'enseignee'`.

---

## 3. Modèles de tables

### `pedagogical_units`
```
id                     UUID PK (scaffold UUID inséré directement)
programme_annuel_id    UUID NOT NULL FK → programme_annuel CASCADE
teaching_pack_id       UUID NOT NULL FK → teaching_packs CASCADE
enseignant_id          UUID NOT NULL FK → utilisateurs CASCADE
classe_id              UUID NOT NULL FK → classes CASCADE
numero                 INTEGER NOT NULL
titre                  TEXT NOT NULL
domain_code            TEXT (préfixe RAG: "A", "B", "C"; fallback "G1")
curriculum_outcome_ids TEXT[] DEFAULT '{}'
statut                 TEXT DEFAULT 'planifiee' CHECK planifiee|en_cours|terminee|archivee
created_at / updated_at TIMESTAMPTZ
UNIQUE (programme_annuel_id, numero)
```

### `pedagogical_sequences`
```
id                     UUID PK (scaffold UUID inséré directement)
unit_id                UUID NOT NULL FK → pedagogical_units CASCADE
numero                 INTEGER NOT NULL
titre / theme          TEXT
semaine_debut/fin      INTEGER NOT NULL (avec CHECK semaine_fin >= semaine_debut)
curriculum_outcome_ids / grandes_idees / objectifs / concepts_cles TEXT[]
justification_pedagogique / activite_culminante / evaluation_prevue TEXT
aydte_sequence_id      TEXT (= id stable AYDTE SequenceBlock)
aydte_pacing_score     INTEGER (0–100)
aydte_coverage_pct     INTEGER (0–100)
duree_estimee_heures   NUMERIC(5,1)
statut                 TEXT DEFAULT 'planifiee' CHECK planifiee|en_cours|terminee|archivee
created_at / updated_at TIMESTAMPTZ
UNIQUE (unit_id, numero)
```

### `pedagogical_lessons`
```
id                     UUID PK (scaffold UUID inséré directement)
sequence_id            UUID NOT NULL FK → pedagogical_sequences CASCADE
lecon_id               UUID NULLABLE FK → lecons SET NULL
numero                 INTEGER NOT NULL
titre / sujet          TEXT
duree_minutes          INTEGER DEFAULT 60 CHECK > 0
type                   TEXT DEFAULT 'developpement' CHECK introduction|developpement|evaluation|synthese
progression_role       TEXT NULLABLE CHECK (voir liste)
curriculum_outcome_ids TEXT[] DEFAULT '{}'
objectif_apprentissage / activite_principale / preuve_apprentissage / justification TEXT
statut                 TEXT DEFAULT 'planifiee' CHECK planifiee|a_preparer|preparee|archivee
created_at / updated_at TIMESTAMPTZ
UNIQUE (sequence_id, numero)
```

---

## 4. Décision FK — Justification

### Nullable vs NOT NULL

| Table | Colonne | Choix | Raison |
|-------|---------|-------|--------|
| `pedagogical_sequences.unit_id` | NOT NULL | Séquence orpheline impossible en V3 |
| `pedagogical_lessons.sequence_id` | NOT NULL | Leçon orpheline impossible en V3 |
| `pedagogical_units.programme_annuel_id` | NOT NULL | Unité sans programme = impossible |
| `pedagogical_units.teaching_pack_id` | NOT NULL | Unité sans pack = impossible |
| `teaching_events.pedagogical_lesson_id` | NULLABLE | Rétrocompat legacy (V4 events) |
| `fichiers_dossier.pedagogical_*_id` | NULLABLE | Documents existent sans référence canonique |

### ON DELETE

| Relation | ON DELETE | Raison |
|----------|-----------|--------|
| `programme_annuel` → `pedagogical_units` | CASCADE | Supprimer le plan supprime sa structure |
| `pedagogical_units` → `pedagogical_sequences` | CASCADE | Supprimer une unité supprime ses séquences |
| `pedagogical_sequences` → `pedagogical_lessons` | CASCADE | Supprimer une séquence supprime ses leçons |
| `teaching_events.pedagogical_lesson_id` | SET NULL | Historique survit (INV-06) |
| `fichiers_dossier.pedagogical_*_id` | SET NULL | Documents survivent (INV-07) |

---

## 5. Stratégie de dénormalisation — Décision

**Option A choisie (propriété minimale sur unités, dérivée via chaîne FK).**

`pedagogical_units` porte les 4 colonnes d'ownership : `programme_annuel_id`, `teaching_pack_id`, `enseignant_id`, `classe_id`.

`pedagogical_sequences` et `pedagogical_lessons` ne portent que `unit_id` / `sequence_id`. Ownership dérivée via JOIN sur la chaîne parente.

**Avantages :**
- Aucun état impossible (teacher A sur séquence, teacher B sur unité parente)
- Cohérence garantie par la base de données elle-même
- RLS pour séquences/leçons = requête sur table parente

**Inconvénients acceptés :**
- Requêtes sur séquences/leçons nécessitent un JOIN vers `pedagogical_units`
- Acceptable pour V7.5.2 (tables non encore en prod, volume faible)

**Option B rejetée** (dénormalisation totale + trigger de cohérence) : complexité non justifiée à ce stade.

---

## 6. Contraintes d'unicité

| Table | Contrainte | Code d'invariant |
|-------|------------|-----------------|
| `pedagogical_units` | `UNIQUE(programme_annuel_id, numero)` | INV-03 |
| `pedagogical_sequences` | `UNIQUE(unit_id, numero)` | INV-04 |
| `pedagogical_lessons` | `UNIQUE(sequence_id, numero)` | INV-05 |

Note : même `numero` dans des unités différentes est autorisé (deux séquences numéro 1, une par unité = valide). L'unicité est relative au parent direct.

---

## 7. Sémantique de suppression

```
DELETE programme_annuel
  → pedagogical_units CASCADE
    → pedagogical_sequences CASCADE
      → pedagogical_lessons CASCADE
        → teaching_events.pedagogical_lesson_id = NULL  (historique préservé)
        → fichiers_dossier.pedagogical_lesson_id = NULL (documents préservés)
      → fichiers_dossier.pedagogical_sequence_id = NULL (documents préservés)
```

**Invariants de survie :**
- INV-06 : Supprimer la structure de planification ne supprime PAS l'historique d'enseignement.
- INV-07 : Supprimer la structure de planification ne supprime PAS les documents enseignant.

---

## 8. Sécurité RLS — Design

### Philosophie
- Toutes les politiques : `TO authenticated`
- Vérification ownership : `enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())`
- INSERT : WITH CHECK pour bloquer l'injection cross-tenant
- UPDATE : USING + WITH CHECK pour bloquer le changement de propriétaire

### Séquences et leçons — sécurité par chaîne parente

```sql
-- Séquences : vérifier via unité parente
unit_id IN (
  SELECT id FROM pedagogical_units
  WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
)

-- Leçons : vérifier via séquence → unité
sequence_id IN (
  SELECT ps.id FROM pedagogical_sequences ps
  JOIN pedagogical_units pu ON pu.id = ps.unit_id
  WHERE pu.enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
)
```

### Scénarios bloqués (Security Test Matrix)

| Code | Scénario | Mécanisme bloquant |
|------|----------|--------------------|
| SEC-B | Lecture d'une unité foreign | Politique SELECT avec enseignant_id check |
| SEC-D | INSERT séquence dans unité foreign (même son propre enseignant_id) | WITH CHECK sur unit_id |
| SEC-E | Déplacer une séquence vers une unité foreign (UPDATE unit_id) | WITH CHECK sur UPDATE |
| SEC-F | INSERT leçon dans séquence foreign | WITH CHECK sur sequence_id |
| SEC-G | Changer classe_id d'une unité vers une classe foreign | WITH CHECK sur unit.classe_id |
| SEC-H | Lecture anonyme | TO authenticated |

---

## 9. Invariants de base de données

| Code | Invariant |
|------|-----------|
| INV-01 | Toute `pedagogical_sequence` a exactement une unité parente (FK NOT NULL) |
| INV-02 | Toute `pedagogical_lesson` a exactement une séquence parente (FK NOT NULL) |
| INV-03 | `numero` d'une unité est unique dans un `programme_annuel` |
| INV-04 | `numero` d'une séquence est unique dans une `pedagogical_unit` |
| INV-05 | `numero` d'une leçon est unique dans une `pedagogical_sequence` |
| INV-06 | Supprimer la structure de planification ne supprime pas `teaching_events` |
| INV-07 | Supprimer la structure de planification ne supprime pas `fichiers_dossier` |
| INV-08 | L'historique d'enseignement est autoritatif dans `teaching_events` |
| INV-09 | `pedagogical_lessons.statut` représente l'état de planification/préparation uniquement |
| INV-10 | Un seul pack actif par classe (`teaching_packs.classe_id` UNIQUE) |

---

## 10. Rollout shadow-write

| Phase | Action | Statut V7.5.2 |
|-------|--------|---------------|
| 1 | Créer les tables canoniques | Migration 045 (PROPOSED) |
| 2 | Shadow-write : écrire JSON + tables canoniques en parallèle | À implémenter après GO |
| 3 | Comparer les deux représentations | À implémenter |
| 4 | Activer les lectures canoniques (`getCanonicalPedagogicalYear` phase 1) | À activer |
| 5 | Backfill legacy V1/V2 → V3 (script contrôlé) | Future décision PO |

`getCanonicalPedagogicalYear()` est déjà préparé pour la phase 4 : priorité 1 = tables canoniques (commentaire "NOT YET POPULATED" dans le code).

---

## 11. Contrat d'écriture transactionnelle (future RPC)

```sql
BEGIN;
  -- 1. Insérer les unités avec les UUIDs scaffold AYDTE
  INSERT INTO pedagogical_units (id, programme_annuel_id, ...) VALUES (...);
  
  -- 2. Insérer les séquences avec leurs UUIDs scaffold
  INSERT INTO pedagogical_sequences (id, unit_id, ...) VALUES (...);
  
  -- 3. Insérer les leçons
  INSERT INTO pedagogical_lessons (id, sequence_id, ...) VALUES (...);
  
  -- 4. Mettre à jour le JSON (shadow-write)
  UPDATE programme_annuel SET contenu_json = ..., schema_version = 'v3' ...;
COMMIT;
-- En cas d'échec : rollback complet. Jamais d'unité sans séquence.
```

---

## 12. Stratégie de référence outcomes

`OUTCOME_REFERENCE_STRATEGY = TEMPORARY CODE-BASED REFERENCE`

Les `curriculum_outcome_ids TEXT[]` stockent des codes comme `["A1", "A1.1"]`. Ces codes ne sont pas globalement uniques sans contexte (curriculum, province, niveau, version).

**Acceptable pour V7.5.2.** Décision d'architecture future requise pour une table `curriculum_outcomes` normalisée avec PK composite (`curriculum_id, province, grade, code`).
