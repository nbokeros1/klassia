# SCORGIA V7.5.2 — Database Forensic Audit

**Date :** 2026-08-18  
**Version :** V7.5.2 pre-migration  
**Périmètre :** tables ghost, RLS, triggers, ownership, teaching_events, fichiers_dossier

---

## A. La table `unites` existe-t-elle dans schema/migrations ?

**OUI.** Elle est définie dans `supabase/schema.sql` lignes 66–76 (table initiale) avec RLS activée (ligne 222) et politique (ligne 251) et GRANT (ligne 386).

---

## B. Quelle migration l'a créée ?

**Aucune migration numérotée.** Elle fait partie du schéma fondateur `schema.sql`. Elle n'est associée à aucun numéro de migration 001–043.

---

## C. Colonnes de `unites`

```sql
CREATE TABLE IF NOT EXISTS unites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id    UUID REFERENCES programme_annuel(id) ON DELETE CASCADE,
  classe_id       UUID REFERENCES classes(id) ON DELETE CASCADE,
  numero          INTEGER,
  titre           TEXT,
  semaine_debut   INTEGER,
  semaine_fin     INTEGER,
  objectifs       TEXT[],
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

Absences significatives : pas de `enseignant_id`, pas de `teaching_pack_id`, pas de `curriculum_outcome_ids`, pas de `schema_version`. Cette table précède l'architecture V3.

---

## D. Le code de production lit-il `unites` ?

**NON.** Recherche exhaustive sur `src/` — aucune instruction `.from('unites')` ou `FROM unites` dans le code TypeScript. La seule référence dans `canonical-year-reader.ts` est à `contenu_json.unites[]` (tableau JSON), pas à la table relationnelle.

---

## E. Le code de production écrit-il dans `unites` ?

**NON.** Aucun INSERT, UPDATE ou DELETE sur la table `unites` dans `src/`.

---

## F. Une FK référence-t-elle `unites` ?

**OUI — une seule.** La table `lecons` contient :

```sql
unite_id UUID REFERENCES unites(id) ON DELETE SET NULL
```

(`schema.sql` ligne 82). Cependant, `lecons.unite_id` n'est jamais peuplé par le code de production (les leçons sont créées via `fichiers_dossier` + `detailed_lesson_id`, jamais par insertion dans `lecons` avec `unite_id`).

---

## G. Une politique RLS référence-t-elle `unites` ?

**OUI.**

```sql
ALTER TABLE unites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_unites" ON unites
  FOR ALL USING (
    classe_id IN (
      SELECT id FROM classes
      WHERE enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
    )
  );
```

La politique existe mais est inutilisée en pratique (aucun code ne lit/écrit la table).

---

## H. Classification de `unites`

**GHOST/UNUSED.**

- Table créée dans le schéma initial
- Jamais peuplée par le code de production
- Un seul FK entrant (`lecons.unite_id`) jamais utilisé
- RLS active mais sans trafic réel
- Représente une intention architecturale pré-V3 jamais concrétisée

Recommandation : **B — Déprécier maintenant, supprimer dans une migration ultérieure dédiée.**  
`DROP TABLE unites` ne peut pas être inclus dans 044.1/045 sans vérification de la table en production (row count = 0 requis). Fournir la requête de vérification au PO.

---

## I. Le repository contient-il déjà une fonction générique `set_updated_at()` ?

**NON.** La fonction `set_updated_at()` n'existe que dans le fichier PROPOSED 044 (jamais exécuté). Elle n'est présente dans aucune migration appliquée.

Convention du repository : chaque table a sa propre fonction nommée `update_<table>_updated_at()` :

| Fonction | Migration | Table |
|----------|-----------|-------|
| `update_teaching_pack_updated_at()` | 036 | teaching_packs |
| `update_fichiers_indexation_updated_at()` | 023 | fichiers_dossier (indexation) |
| `update_missions_enseignant_updated_at()` | 024 | missions_enseignant |
| `update_workflow_instances_updated_at()` | 025 | workflow_instances |
| `update_workflow_step_states_updated_at()` | 025 | workflow_step_states |

**Conclusion :** créer `update_pedagogical_structure_updated_at()` en respectant la convention.

---

## J. Quelles tables utilisent déjà une fonction `updated_at` ?

`teaching_packs`, `fichiers_dossier` (indexation), `missions_enseignant`, `workflow_instances`, `workflow_step_states`. Les tables principales (`programme_annuel`, `classes`, `utilisateurs`, `teaching_events`) n'ont pas de trigger `updated_at` — elles n'ont pas de colonne `updated_at`.

---

## K. Comment `teaching_events` représente-t-il l'état enseigné/non-enseigné ?

**V5 append-only.** Chaque enseignement est un `INSERT` :

```
event_type = 'lesson_taught'          → leçon marquée enseignée
event_type = 'lesson_taught_cancelled' → annulation (préserve l'historique)
```

Identité d'une leçon : `teaching_pack_id + sequence_index (0-based) + lecon_index (0-based)`.

Résolution : le **dernier événement chronologique** pour (seqIdx, leconIdx) gagne.

---

## L. `teaching_events` est-il encore append-only ?

**OUI.** Migration 041 : "Pas de UPDATE ni DELETE : append-only par architecture." Aucune politique RLS UPDATE ou DELETE n'existe sur `teaching_events`. L'annulation se fait par un nouvel événement `lesson_taught_cancelled`.

---

## M. Du code traite-t-il `date_enseignee`, `note_enseignement`, `statut = 'enseignee'` comme autoritatifs ?

**Partiellement — fallback V4 uniquement.**

`src/lib/spie/teaching-events.ts` :
```typescript
// Fallback V4 — LEGACY, non autoritatif
if (fallbackLecon?.statut === 'enseignee') {
  return {
    isTaught: true,
    taughtAt: fallbackLecon.date_enseignee ?? null,
    note:     fallbackLecon.note_enseignement ?? null,
    source:   'legacy',   // ← marqué explicitement comme source legacy
  }
}
```

Ces champs (`date_enseignee`, `note_enseignement`, `statut = 'enseignee'`) sont des **champs V4 sur `LeconProgramme`** (type JSON dans `contenu_json`). Ce sont des champs de rétrocompatibilité, **jamais utilisés comme source primaire** si des `teaching_events` existent pour la même leçon.

**Conséquence pour `pedagogical_lessons` :** ces trois champs ne doivent PAS être ajoutés sur la table canonique. L'historique d'enseignement appartient à `teaching_events`.

---

## N. Chaîne de propriété exacte

```
auth.users.id  (Supabase Auth)
    │ user_id (1:1, UNIQUE)
    ▼
utilisateurs.id
    │ enseignant_id (1:N)
    ▼
classes.id
    │ classe_id (1:1 UNIQUE par classe)
    ▼
teaching_packs.id
    │ teaching_pack_id (1:1, nullable FK)
    ▼
programme_annuel.id
    │ programme_annuel_id
    ▼
[pedagogical_units] ← nouveau
    │ unit_id (1:N)
    ▼
[pedagogical_sequences] ← nouveau
    │ sequence_id (1:N)
    ▼
[pedagogical_lessons] ← nouveau
```

Règle RLS fondamentale :
```sql
auth.uid() → utilisateurs.id via (utilisateurs.user_id = auth.uid())
```

**Important :** `utilisateurs.id ≠ auth.uid()`. Toute politique qui compare directement `enseignant_id = auth.uid()` serait incorrecte. La vérification correcte est :
```sql
enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
```
Cette forme est cohérente avec les migrations 036, 041.

---

## Résumé : références cross-table `unites`

| Contexte | Référence | Active en prod ? |
|----------|-----------|-----------------|
| `lecons.unite_id` | FK vers `unites(id)` | NON — jamais peuplé |
| RLS `user_own_unites` | Politique sur la table | NON — aucun trafic |
| GRANT sur `unites` | `TO authenticated` | NON — aucun trafic |
| Code TypeScript | Aucune | — |

---

## Collision risk `unites` ↔ `pedagogical_units`

Aucun risque de collision de noms. Les tables ont des noms distincts. Le risque est conceptuel :
- `unites` était destinée à être la table "séquences" du plan annuel
- `pedagogical_units` est le niveau macro-thématique au-dessus des séquences

Si la table `unites` est un jour réactivée, sa structure (sans `enseignant_id`, sans `curriculum_outcome_ids`) est incompatible avec l'architecture V3. Elle ne peut pas être réutilisée sans refonte.

---

## Audit `curriculum_outcome_ids`

Aucune table `curriculum_outcomes` relationnelle stable n'existe dans le schéma déployé. Les outcomes sont référencés comme codes texte (`TEXT[]`) ou via `contenu_json.curriculum_outcomes[]` (JSON).

**Stratégie :** `OUTCOME_REFERENCE_STRATEGY = TEMPORARY CODE-BASED REFERENCE`

Risk : `"A1.1"` n'est pas globalement unique (dépend du curriculum, de la province, du niveau, de la version). Acceptable pour V7.5.2. Table normalisée d'outcomes = décision d'architecture future.

---

## Vérifications SQL pour le PO

```sql
-- 1. Vérifier si unites est vide (sécurité avant tout DROP futur)
SELECT COUNT(*) FROM unites;

-- 2. Vérifier si lecons.unite_id est peuplé
SELECT COUNT(*) FROM lecons WHERE unite_id IS NOT NULL;

-- 3. Vérifier l'existence de la fonction set_updated_at
SELECT proname FROM pg_proc WHERE proname = 'set_updated_at';

-- 4. Vérifier les fonctions updated_at existantes
SELECT proname FROM pg_proc WHERE proname LIKE 'update_%_updated_at';
```
