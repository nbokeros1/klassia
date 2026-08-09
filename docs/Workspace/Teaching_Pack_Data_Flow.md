# Teaching Pack — Flux de données
**ScorgIA · RELEASE-P0.2 · 2026-08-09**

---

## Flux complet du pipeline Construire

```
Enseignant
  → BuildMyYearWizard (input: classe, matière, niveau, province, nb_semaines)
  → POST /api/spie/build-year
  → SSE stream (étapes 1–10)

Étape 1 : Validation des droits (forfait)
Étape 2 : Upsert teaching_packs (onConflict: classe_id)
Étape 3 : Génération curriculum (Claude Sonnet)
Étape 4 : Génération syllabus (Claude Sonnet)
Étape 5 : Génération plan annuel + séquences + leçons outline
          → INSERT/UPDATE programme_annuel.contenu_json
          → UPDATE teaching_packs.programme_annuel_id
Étape 6 : Génération première leçon complète
          → INSERT fichiers_dossier (type_fichier='lecon_complete', contenu_html)
          → UPDATE teaching_packs.lecon_detaillee_id (SPIE-BETA-03 only)
Étape 7 : Génération quiz formatif
          → INSERT fichiers_dossier (type_fichier='quiz', contenu_html)
Étape 8 : Upsert studio_ia_memoire (contexte programme pour Préparer)
Étape 9 : UPDATE teaching_packs.statut = 'pret'
Étape 10: SSE done
```

---

## Données persistées par Build

| Table | Opération | Clé de conflit |
|-------|-----------|----------------|
| `teaching_packs` | UPSERT | `classe_id` |
| `programme_annuel` | INSERT ou UPDATE | `teaching_pack_id` |
| `fichiers_dossier` (lecon) | INSERT | — (non dédupliqué) |
| `fichiers_dossier` (quiz) | INSERT | — (non dédupliqué) |
| `studio_ia_memoire` | UPSERT | `enseignant_id, cle, type` |

---

## Ce que Build-Year N'écrit PAS

- Table `lecons` — uniquement alimentée par l'éditeur de leçon et `lesson-to-enseigner`
- Table `quiz` / `questions_quiz` — le quiz de build-year est en HTML libre dans `fichiers_dossier`
- Table `conversations_ia` — aucune conversation créée

---

## Lecture par les composants

| Composant | Source de données |
|-----------|------------------|
| `classes/page.tsx` (compteurs) | `lecons` + `fichiers_dossier` + `teaching_packs` |
| `programme/page.tsx` (onglets) | `teaching_packs` → `programme_annuel` (contenu_json, syllabus_json) |
| `programme/page.tsx` (quiz tab) | `fichiers_dossier` WHERE type_fichier='quiz' |
| `bibliotheque/page.tsx` | `fichiers_dossier` (tous types) |
| `PedagogiqueExplorer` | `teaching_packs` + `programme_annuel` + `fichiers_dossier` + `conversations_ia` |

---

## Séquence de FK

```
teaching_packs.programme_annuel_id ──→ programme_annuel.id
teaching_packs.lecon_detaillee_id  ──→ fichiers_dossier.id (SPIE-BETA-03)
fichiers_dossier.dossier_id        ──→ dossiers_systeme.id
dossiers_systeme.classe_id         ──→ classes.id
```

> **Note** : `fichiers_dossier.classe_id` est dénormalisé pour performance (évite le JOIN via dossier).
