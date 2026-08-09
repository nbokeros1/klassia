# ScorgIA Alberta — Gabarit Plan annuel

**ID :** `scorgia-alberta-plan-annuel-v1`  
**Version :** 1.0.0-beta · 2026-08-04  
**Source :** `src/lib/alberta-templates.ts` → `GABARIT_PLAN_ANNUEL_ALBERTA`

---

## Sections

| # | Section | Obligatoire |
|---|---------|:-----------:|
| 1 | Identification (classe, enseignant, matière, niveau, langue) | ✅ |
| 2 | Références curriculaires (RAG, RAS, grandes idées) | ✅ |
| 3 | Contexte pédagogique (profil classe, périodes, ressources) | — |
| 4 | Organisation annuelle (séquences, durées, résultats liés) | ✅ |
| 5 | Couverture du curriculum (résultats couverts / à couvrir) | — |
| 6 | Évaluation (diagnostique, formative, sommative) | — |
| 7 | Révision et adaptation (date, motif, version) | — |

## Mapping SPIE

Chaque section est associée à un objet SPIE via le champ `objet_spie` dans la structure `GabaritChamp`. Ex : `Unite.objectifs`, `PackSyllabus.grandes_idees`, `SchoolCalendar.periodes_par_semaine`.

## Export DOCX

L'export via `POST /api/spie/pack-export { type: "plan_annuel" }` utilise ce gabarit pour construire le document Word. Pied de page : nom du pack + numéro de page + avertissement ScorgIA.
