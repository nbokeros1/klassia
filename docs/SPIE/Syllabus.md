# Syllabus — Génération et structure

**Statut :** SPIE-BETA-02 · Actif  
**Dernière mise à jour :** 2026-08-04

---

## Qu'est-ce que le syllabus ?

Le **syllabus** est la vue d'ensemble de l'année scolaire pour une classe. Il décrit :
- Les grandes idées et résultats d'apprentissage
- Les méthodes pédagogiques et d'évaluation prévues
- Les ressources suggérées
- Les normes ou référentiels curriculaires utilisés

Le syllabus est généré par le pipeline `build-year` à l'étape 3, **après** le plan annuel et **avant** la sauvegarde en base.

---

## Type TypeScript

```typescript
// src/lib/types/teaching-pack.ts
export type PackSyllabus = {
  titre_cours: string
  niveau: string
  matiere: string
  enseignant?: string
  description?: string
  grandes_idees: string[]
  resultats_apprentissage: string[]
  methodes_pedagogiques: string[]
  methodes_evaluation: string[]
  ressources_suggeres?: string[]
  attentes?: string[]           // Ontario
  normes_reference?: string[]   // Alberta, CB
  version: string               // '1.0'
  created_at: string            // ISO date
}
```

---

## Génération

**Appel IA :** Claude claude-sonnet-4-6, max_tokens = 1500  
**Format de sortie :** JSON brut (pas de markdown wrapper)

**Prompt (résumé) :**
```
Tu es un expert pédagogique francophone.
Génère un syllabus structuré pour un cours de [matière] de [niveau] en [province].
Contexte curriculum : [extrait du ContenuProgramme généré à l'étape précédente]
Réponse UNIQUEMENT en JSON valide correspondant à PackSyllabus.
```

**Fallback :** Si le parsing JSON échoue, le pipeline continue avec `syllabus = undefined` dans `contenu_json`. Le pack sera marqué `partiellement_genere`.

---

## Persistance

Le syllabus est stocké à deux endroits :

| Endroit | Colonne | Utilisation |
|---------|---------|-------------|
| `programme_annuel` | `syllabus_json` | Lecture dans les exports (PDF, DOCX) |
| `teaching_packs` | `contenu_json.syllabus` | Affichage dans TeachingPackCard |

---

## Édition manuelle (SPIE-BETA-02)

**Composant :** `src/components/build-year/SyllabusEditor.tsx`

- Formulaire éditable pour tous les champs `PackSyllabus`
- Autosauvegarde avec debounce 1.5s (DEC-033) via `POST /api/spie/syllabus-save`
- Statut de sauvegarde : `idle | saving | saved | error`
- Avant chaque écriture, la version précédente est archivée dans `pack_versions` (DEC-028)
- `modifie_par` = `'utilisateur'` pour les modifications manuelles

**Champs institutionnels non générés :**  
Les champs suivants ne sont jamais générés par l'IA : retards, plagiat, pondérations, absences, etc. L'avertissement correspondant est affiché dans le formulaire.

---

## Export

Le syllabus est inclus dans :
- Export DOCX : `POST /api/spie/pack-export { type: 'syllabus' }` — entitlement `export_syllabus`
- Export DOCX pack condensé : `type: 'pack_condense'`
- Partage communautaire (à venir — soumis à validation PO)

Footer DOCX : `"Document généré par ScorgIA (Bodingo AI Tech Inc.) — [avertissement Alberta si applicable]"`.  
"Powered by Claude" n'apparaît jamais (DEC-032).

---

## Voir aussi

- [Annual_Plan.md](Annual_Plan.md) — Plan annuel
- [Build_My_Year_Workflow.md](Build_My_Year_Workflow.md) — Pipeline complet
- [Teaching_Pack_Exports.md](Teaching_Pack_Exports.md) — Exports DOCX
