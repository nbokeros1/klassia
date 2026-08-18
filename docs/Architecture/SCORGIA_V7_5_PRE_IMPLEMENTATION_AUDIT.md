# SCORGIA V7.5 — Pre-Implementation Audit
**Date :** 2026-08-18  
**Auteur :** ScorgIA Canonical Planning Engine audit  
**Statut :** COMPLÉTÉ — implémentation V7.5 autorisée

---

## 1. Est-ce que la création de 3 nouvelles tables crée une duplication dangereuse ?

**Réponse : NON — Règle STOP de la Section 35 ne s'applique pas.**

La table `unites` existe dans `schema.sql` (migration 038) mais n'a **jamais été peuplée**. Elle est une coquille vide sans contraintes FK actives, sans données, sans code de lecture. Ce n'est pas une duplication — c'est un précurseur abandonné.

Les 3 nouvelles tables proposées (`pedagogical_sequences`, `pedagogical_lessons`, et les FK optionnelles sur `teaching_events`/`fichiers_dossier`) ne dupliquent aucune donnée existante. Les données de plan annuel vivent en JSONB dans `programme_annuel.contenu_json` — les nouvelles tables sont des vues normalisées de ces blobs, pas des copies.

**Recommandation :** Avant d'appliquer la migration 044, vérifier la table `unites` et soit la peupler dans la migration, soit la supprimer (DROP TABLE unites).

---

## 2. AYDTE — est-il du vrai code fonctionnel ou un stub ?

**Réponse : VRAI CODE FONCTIONNEL — 216 lignes, 0 stub.**

`src/lib/spie/aydte/planning/annual-planning-engine.ts` :
- `groupByPrerequisFirst(outcomes, maxPerGroup)` — groupe par relation parent/enfant (RAG → RAS)
- `buildSequence(outcomeGroup, ordre, minutesPerOutcome)` — crée un `SequenceBlock` avec UUID stable
- `allocateToCalendar(sequences, totalSemaines, minutesParSemaine, bufferPercent)` — alloue des semaines
- `AnnualPlanningEngine.plan(input)` — point d'entrée, retourne `AnnualPlanningOutput`

**Problème :** AYDTE était complètement déconnecté de la pipeline de production. Il n'était appelé nulle part. V7.5 remédie à ce problème.

**PGE (`pge-engine.ts`)** : C'est lui le vrai stub — toutes les méthodes lancent `'not implemented (SPIE-04)'`. PGE n'est **pas** câblé dans V7.5.

---

## 3. Où vivent les données pédagogiques actuellement ?

### Tables DB peuplées

| Table | Contenu |
|-------|---------|
| `teaching_packs` | Pack de l'enseignant (statut, curriculum, calendrier) |
| `programme_annuel` | Métadonnées + JSONB `contenu_json` |
| `teaching_events` | Événements d'enseignement (mark-taught) |
| `fichiers_dossier` | Fichiers de dossier de classe |
| `lecons` | Plans de leçons détaillés |

### JSONB uniquement (pas de table)

| Structure | Emplacement |
|-----------|------------|
| `Unite[]` (séquences) | `programme_annuel.contenu_json.unites` |
| `LeconProgramme[]` (plans) | Chaque `unite.lecons[]` |
| `CurriculumOutcome[]` | `programme_annuel.contenu_json.curriculum_outcomes` |
| `PackSyllabus` | `programme_annuel.syllabus_json` |

---

## 4. Quelle est la fragilité du système de séquence/leçon actuel ?

**Fragilité : HAUTE — indices positionnels.**

`sequence_index` et `lecon_index` dans `teaching_events` et `fichiers_dossier` sont des **entiers positionnels 0-basés** dans `contenu_json.unites[]`. Ils ne sont pas des UUIDs stables.

**Conséquence :** Si l'enseignant réordonne les unités ou régénère le programme, les événements passés (`teaching_events`) pointent vers les mauvaises leçons.

**V7.5 ne casse pas ce système** : les champs positionnels sont conservés. `sequence_id` (UUID AYDTE) est ajouté comme champ **optionnel** sur `Unite` — backward-compat total. La migration vers les UUIDs stables nécessite une décision séparée du Product Owner.

---

## 5. La table ghost `unites` — risque ?

**Risque : BAS — table vide, aucun code de lecture.**

```sql
-- schema.sql (migration 038)
CREATE TABLE IF NOT EXISTS unites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID REFERENCES programme_annuel(id) ON DELETE CASCADE
  -- ... autres colonnes
);
```

- **Jamais peuplée** — 0 lignes en prod
- **Jamais lue** — aucun `SELECT FROM unites` dans le codebase
- **Pas de FK actives** — pas de code dépendant

**Action recommandée avant migration 044 :** `DROP TABLE IF EXISTS unites;` ou migration alternative qui l'utilise comme `pedagogical_sequences` directement (renommer + ajouter colonnes).

---

## 6. SPIE-02 → AYDTE : quelles données transitent ?

```
NormalizedOutcome[] (SPIE-02 output)
  ├── id: string                 → used as AYDTE outcome reference
  ├── code?: string              → displayed in sequence scaffold
  ├── texte: string              → sequence titre + description
  ├── parentId?: string          → groupByPrerequisFirst() grouping key
  ├── vocabulaireSpie            → (not used by AYDTE directly)
  ├── niveauBloom?               → (not used by AYDTE directly)
  └── conceptsIds: string[]      → (not used by AYDTE directly)

→ AydtePlanningBridge synthesizes CurriculumPacingModel:
  ├── totalHeuresEstimees = totalSemaines × minutesParSemaine × 0.85 / 60
  ├── OutcomePacing[]: minutesEstimés = totalMinutes / nbOutcomes
  └── ConstraintSet: vide (SPIE-05 non implémenté)

→ AnnualPlanningEngine.plan() returns:
  ├── SequenceBlock[]: [{ id: "seq_xxx", outcomeIds[], semaineDébut, semainesFin, ... }]
  └── AnnualPlanNode[]: calendar allocation
```

---

## 7. Compatibilité backward : programmes V1/V2 existants ?

**Aucune rupture.** Les changements sont strictement additifs :

| Changement | Impact V1/V2 |
|-----------|-------------|
| `Unite.sequence_id?` — optionnel | Absent → ignoré partout |
| `Unite.unit_id?` — optionnel | Absent → ignoré partout |
| `ContenuProgramme.units?` — optionnel | Absent → `getCanonicalPedagogicalYear()` crée une unit virtuelle |
| `ContenuProgramme.schema_version: 'v3'` | Nouveaux programmes seulement |
| `PedagogicalYearTree.hasV3Data` — nouveau champ | `false` pour V1/V2 — UI peut ignorer |
| `pedagogical-year-tree.ts` : `UnitNode.sequenceId?` | `undefined` pour V1/V2 |

`getCanonicalPedagogicalYear()` gère les 4 états (v1, v2, v3, legacy) de façon transparente.

---

## Conclusion

La règle STOP Section 35 ne s'applique pas. L'implémentation V7.5 peut procéder avec :
- AYDTE câblé (production) — **FAIT**
- Types V3 étendus — **FAIT**
- Canonical year reader — **FAIT**
- Migration 044 proposée — **FAIT (non appliquée)**
- Documentation — **EN COURS**

Décision GO/NO-GO pour la migration 044 reste au Product Owner.
