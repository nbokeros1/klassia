# Year Build State Model
**ScorgIA · RELEASE-P0.2 · 2026-08-09**

---

## Vue d'ensemble

Le modèle d'état de l'année scolaire décrit les transitions possibles d'une classe depuis sa création jusqu'à l'état "Année prête".

---

## États d'une classe

| État | Condition | Affiché |
|------|-----------|---------|
| `non_initialisée` | Pas de `teaching_pack` | Badge "Sans curriculum" |
| `curriculum_chargé` | `classe.curriculum_charge = true`, pas de pack | Badge "✓ Curriculum" |
| `en_construction` | Pack `statut = 'generation_en_cours'` | Badge animé (pipeline SSE actif) |
| `partiellement_construite` | Pack `statut = 'partiellement_genere'` | Badge "Partiel" |
| `construite` | Pack `statut = 'pret'` | Badge "✓ Année construite" |
| `en_erreur` | Pack `statut = 'erreur'` | Badge rouge |

---

## Tables impliquées

```
classes
  └── teaching_packs (FK: classe_id)
        ├── programme_annuel (FK: programme_annuel_id)
        │     ├── contenu_json   → plan annuel + séquences + leçons outline
        │     └── syllabus_json  → syllabus structuré
        ├── lecon_detaillee_id   → FK → fichiers_dossier (leçon SPIE-BETA-03)
        └── statut               → non_initialise | pret | partiellement_genere | ...

fichiers_dossier (FK: classe_id, enseignant_id)
  ├── type_fichier = 'lecon_complete'  → leçon développée par build-year (contenu_html)
  └── type_fichier = 'quiz'           → quiz formatif (contenu_html)
```

---

## Transitions d'état

```
[non_initialisée]
    → wizard BuildMyYearWizard
    → SSE /api/spie/build-year
    → [en_construction]
    → [partiellement_construite] ou [construite]

[construite]
    → bouton "Reconstruire" + confirmation modal
    → wizard
    → [en_construction]
    → [construite] (mise à jour idempotente)
```

---

## Idempotence du pipeline

Le pipeline `build-year` est idempotent depuis RELEASE-P0.2 :

1. **teaching_packs** — upsert `onConflict: 'classe_id'`
2. **programme_annuel** — check-then-update via `teaching_pack_id`
3. **studio_ia_memoire** — upsert `onConflict: 'enseignant_id,cle,type'`
4. **fichiers_dossier** — INSERT (non dédupliqué — chaque build crée de nouveaux fichiers)

> **Limite connue** : chaque Reconstruire ajoute de nouveaux `fichiers_dossier`. Les anciens fichiers ne sont pas supprimés. La Bibliothèque affichera plusieurs versions.

---

## Fallback FK

Si `teaching_packs.programme_annuel_id` est null (FK non mise à jour lors du build) :
- `programme/page.tsx` cherche `programme_annuel` par `classe_id` en fallback
- `PedagogiqueExplorer` idem
- Le FK est réparé silencieusement lors du prochain chargement
