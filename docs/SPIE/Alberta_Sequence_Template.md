# ScorgIA Alberta — Gabarit Plan de séquence

**ID :** `scorgia-alberta-plan-sequence-v1`  
**Version :** 1.0.0-beta · 2026-08-04  
**Source :** `src/lib/alberta-templates.ts` → `GABARIT_PLAN_SEQUENCE_ALBERTA`

---

## Sections (20 sections)

1. Identification
2. Place dans le plan annuel (numéro, semaines, thème)
3. Résultats curriculaires (RAG, RAS, compétences, grandes idées)
4. Contenus et connaissances (vocabulaire, prérequis, objectifs, questions essentielles)
5. Progression des leçons (lien résultats ↔ leçons)
6. Approches pédagogiques (méthodes, ressources, différenciation)
7. Évaluation (diagnostique, formative, sommative, critères)
8. Réflexion et ajustements (risques, ajustements, réflexion post-séquence)

## Exigence clé

La section "Progression des leçons" doit **montrer explicitement quelles leçons contribuent à quels résultats d'apprentissage**. C'est une règle de conception, pas seulement une section.

## Export DOCX

`POST /api/spie/pack-export { type: "sequence", sequence_index: 0 }`
