# Teaching Pack — Définition et structure

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09

---

## Qu'est-ce qu'un Teaching Pack ?

Un **Teaching Pack** est l'unité centrale de la planification pédagogique dans KlassIA+. Il regroupe, pour une classe et une année scolaire donnée, **tout le matériel pédagogique généré ou supervisé par ScorgIA** :

| Couche | Contenu | Statut bêta |
|--------|---------|-------------|
| Syllabus | Vue d'ensemble de l'année (grandes idées, résultats, méthodes) | ✅ Inclus |
| Plan annuel | Structure complète en unités et leçons planifiées | ✅ Inclus |
| Séquences | Toutes les unités, squelette structuré | ✅ Inclus |
| Plans de leçon | Plans structurés de la 1re séquence | ✅ Inclus |
| Leçon développée | 1re leçon complète, prête à enseigner | ✅ Inclus |
| Quiz | Quiz de la 1re leçon | ✅ Inclus |
| Leçons supplémentaires | Toutes les autres leçons développées | 🔒 Forfait |
| Quiz supplémentaires | Quiz des autres leçons | 🔒 Forfait |
| Évaluations sommatives | Évaluations complètes par séquence | 🔒 Forfait |

---

## Modèle de données

### Table `teaching_packs` (migration 036)

```sql
id               UUID PRIMARY KEY
enseignant_id    UUID → utilisateurs.id  (RLS)
classe_id        UUID → classes.id  UNIQUE
nom              TEXT                    -- ex. "Plan annuel · 5e année · Mathématiques"
statut           teaching_pack_statut    -- voir enum ci-dessous
province         TEXT
pays             TEXT DEFAULT 'Canada'
juridiction      TEXT
langue           TEXT DEFAULT 'fr'
annee_scolaire   TEXT                    -- '2026-2027'
curriculum_source curriculum_source_type -- 'televerse' | 'officiel'
curriculum_officiel TEXT
curriculum_contenu TEXT                  -- texte brut extrait du document
programme_annuel_id UUID → programme_annuel.id
calendrier_json  JSONB                   -- SchoolCalendar
gabarits_json    JSONB                   -- PackGabarits
contenu_json     JSONB                   -- TeachingPackContenu
error_message    TEXT
```

### Enum `teaching_pack_statut`

| Valeur | Signification |
|--------|---------------|
| `configuration` | Wizard non complété |
| `curriculum_en_analyse` | Curriculum en cours d'analyse IA |
| `pret_a_planifier` | Curriculum analysé, génération non démarrée |
| `generation_en_cours` | Pipeline SSE actif |
| `partiellement_genere` | Pipeline terminé mais certaines étapes ignorées |
| `pret` | Pack complet selon les entitlements du forfait |
| `erreur` | Erreur bloquante (message dans `error_message`) |
| `archive` | Pack archivé (classe terminée) |

---

## Relation avec `programme_annuel`

Le Teaching Pack **n'est pas une alternative** au programme annuel — c'est une enveloppe qui lui donne du contexte :

```
teaching_packs
  ├── calendrier_json       (SchoolCalendar)
  ├── gabarits_json         (PackGabarits)
  ├── contenu_json          (TeachingPackContenu — métadonnées enrichies)
  └── programme_annuel_id ──→ programme_annuel
                                ├── contenu_json   (ContenuProgramme — unités + leçons)
                                ├── calendrier_json (copie)
                                └── syllabus_json  (PackSyllabus)
```

**Règle de lecture :** Pour afficher le plan annuel, lire `programme_annuel.contenu_json`. Pour afficher les métadonnées du pack (statut, entitlements, gabarits), lire `teaching_packs.contenu_json`.

---

## Contrainte de sécurité

- RLS activé sur `teaching_packs` : un enseignant ne voit que ses propres packs
- Unicité sur `(classe_id)` : une seule instance active par classe
- Toutes les opérations d'écriture utilisent le **service role** côté serveur

---

## Extensions SPIE-BETA-02

### Migration 037 — Ajouts

```sql
-- Table de versionnement
CREATE TABLE pack_versions (
  id                UUID PRIMARY KEY,
  teaching_pack_id  UUID → teaching_packs.id,
  document_type     TEXT,  -- 'syllabus' | 'plan_annuel' | 'sequence' | ...
  document_id       TEXT,
  version_numero    INTEGER,
  label             TEXT,
  contenu_json      JSONB NOT NULL,
  modifie_par       TEXT NOT NULL,  -- 'ia' | 'utilisateur'
  notes             TEXT,
  created_at        TIMESTAMPTZ
);
```

Extensions sur `teaching_packs` :

| Colonne | Type | Rôle |
|---------|------|------|
| `pack_template_id` | TEXT | Gabarit actif (`scorgia_alberta_plan_annuel_v1`, etc.) |
| `source_meta_json` | JSONB | `SourceTraceabilite[]` — traçabilité des sources |
| `qualite_json` | JSONB | Dernier `QualityGateResultat` pour le plan annuel |
| `version_numero` | INTEGER | Version courante du pack |
| `derniere_modif_par` | TEXT | 'ia' ou 'utilisateur' |

### Gabarits Alberta disponibles

| ID | Type | Sections |
|----|------|---------|
| `scorgia-alberta-plan-annuel-v1` | `plan_annuel` | 7 sections, ~30 champs |
| `scorgia-alberta-plan-sequence-v1` | `sequence` | 8 sections |
| `scorgia-alberta-plan-lecon-v1` | `plan_lecon` | 9 sections, 5 sous-sections |

Voir [Alberta_Teaching_Pack.md](Alberta_Teaching_Pack.md), [Alberta_Annual_Plan_Template.md](Alberta_Annual_Plan_Template.md).

### Quality Gate

Le Teaching Pack peut lancer un contrôle qualité via `POST /api/spie/quality-gate`.  
Voir [Pedagogical_Quality_Gate.md](Pedagogical_Quality_Gate.md).

### Exports DOCX

Via `POST /api/spie/pack-export`. Types : `syllabus`, `plan_annuel`, `sequence`, `pack_condense`.  
Voir [Teaching_Pack_Exports.md](Teaching_Pack_Exports.md).

---

---

## SPIE-PERSISTENCE-01 — BuildState et complétude

### BuildState dans contenu_json

Depuis SPIE-PERSISTENCE-01, `contenu_json.build_state` stocke l'état exact
de chaque étape de construction, avec `objectId`, `persisted`, `verified`.
Ce BuildState survit aux refreshs, déconnexions, et nouvel onglet.

```typescript
contenu_json: {
  ...TeachingPackContenu,
  build_state: {
    buildId: "uuid-...",
    pack:             { status: "success", objectId: "...", verified: true },
    curriculum:       { status: "success", verified: true },
    syllabus:         { status: "success", verified: true },
    programme_annuel: { status: "success", objectId: "...", verified: true },
    premiere_lecon:   { status: "success", objectId: "...", verified: true },
    quiz:             { status: "success", objectId: "...", verified: true },
    finalized: true
  }
}
```

### Règle de statut

Le champ `statut` du Teaching Pack est toujours déterminé par
`verifyTeachingPackCompleteness()` — une relecture complète depuis Supabase.
Il ne peut jamais être `pret` si les données ne sont pas présentes en base.

### Endpoint de vérification

`POST /api/spie/verify-pack` — disponible pour le diagnostic founder et
la récupération après build interrompu.  
Voir [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md).

---

## Voir aussi

- [Build_My_Year_Workflow.md](Build_My_Year_Workflow.md) — Pipeline de génération
- [Persistence_Pipeline.md](Persistence_Pipeline.md) — Pattern GENERATE→VERIFY
- [Build_Checkpoints.md](Build_Checkpoints.md) — BuildState structure
- [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md) — verifyTeachingPackCompleteness
- [Build_Recovery.md](Build_Recovery.md) — Smart resume et anti-doublon
- [Entitlements.md](Entitlements.md) — Droits d'accès par forfait
- [Persistence.md](Persistence.md) — Migration SQL et indexation
- [Alberta_Teaching_Pack.md](Alberta_Teaching_Pack.md) — Métadonnées Alberta
- [Teaching_Pack_UX.md](Teaching_Pack_UX.md) — Interface utilisateur
- [Teaching_Pack_Exports.md](Teaching_Pack_Exports.md) — Exports DOCX
