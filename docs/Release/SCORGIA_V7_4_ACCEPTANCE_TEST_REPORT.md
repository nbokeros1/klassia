# SCORGIA V7.4.1 → V7.4.3 — PO Acceptance Test Report
**Date :** 2026-08-18  
**Auditeur :** Claude Sonnet 4.6 (pipeline AI)  
**Contraintes :** No push · No UI redesign · No migration · No manual content repair  

---

## 0. Résumé exécutif

| Signal | Résultat |
|---|---|
| Classe réelle trouvée | ✅ "CLASSE 8 B" — FRANÇAIS ; Secondaire 3 |
| Données programme existant | ❌ 100 % placeholders (données V1 pré-hotfix) |
| SPIE-02 isolation | ✅ 21 outcomes (6 RAG + 15 RAS) — confidence 95/100 |
| Validator tests | ✅ 24/24 passed |
| tsc | ✅ 0 erreur |
| build | ✅ SUCCESS |
| Fallback V1 supprimé | ✅ HTTP 422 remplace INSERT silencieux |
| SPIE-02_RUNTIME_USED | YES (isolation confirmée, 22.5 s) |
| Gap identifié | ⚠️ `curriculum_contenu = NULL` → SPIE-02 ne s'active pas en pipeline réel |

**RECOMMANDATION : B — DO NOT PUSH — minor correction required**  
Raison : L'objectif anti-placeholder est atteint. Mais SPIE-02 ne se déclenchera pas en production car le champ `curriculum_contenu` est `NULL` même pour les packs avec fichier uploadé. Ce gap doit être investigué avant le push.

---

## 1. Classe cible

**Classe trouvée :** `cbd11102-d174-431e-96a5-79ccda4bd8b6`  
Nom : "CLASSE 8 B" | Matière : FRANCAIS ; Etudes sociales | Niveau : Secondaire 3

**Teaching Pack :** `b1cb462a-8c8b-400f-8511-514943d57ed5`  
- statut : `pret`  
- curriculum_source : `televerse` (fichier uploadé)  
- curriculum_officiel : `null`  
- **curriculum_contenu : `NULL`** ← gap critique

---

## 2. Contenu réel du programme en base

Programme `729594da-9604-400b-a778-2f95bec06f8f` — créé le 2026-08-15  
- schema_version : *absent* (legacy — généré avant V7.4.3)
- 6 unités · 30 leçons · 0 curriculum_outcomes

### Titres réels extraits

| # | Unité | Objectifs | Leçons |
|---|---|---|---|
| 1 | **"Unité 1"** | "Objectif principal" | Leçon 1 → Leçon 5 |
| 2 | **"Unité 2"** | "Objectif principal" | Leçon 6 → Leçon 10 |
| 3 | **"Unité 3"** | "Objectif principal" | Leçon 11 → Leçon 15 |
| 4 | **"Unité 4"** | "Objectif principal" | Leçon 16 → Leçon 20 |
| 5 | **"Unité 5"** | "Objectif principal" | Leçon 21 → Leçon 25 |
| 6 | **"Unité 6"** | "Objectif principal" | Leçon 26 → Leçon 30 |

**Diagnostic :** Ce programme a été généré par le fallback V1 qui créait silencieusement ces données toxiques sur `JSON.parse` failure. Ce comportement est la cible exacte de V7.4.3.

---

## 3. Integrity scan — placeholders détectés

```
❌ [729594da] DIRTY: Unité 1, Unité 2, Unité 3, Unité 6, Leçon 1, Leçon 2,
                     Objectif principal, Contenu à définir
```

Strings recherchées : 10 patterns | Résultat : **8 hits** — programme intégralement toxique.

---

## 4. SPIE-02 isolation test

**Source :** Alberta French Language Arts, Grade 9 (2 249 chars — texte de référence)  
**Modèle :** `claude-opus-4-5`  
**Latence :** 22 545 ms | Tokens in : 1 091 · out : 2 811  

### Outcomes extraits (21 total)

| Domaine | Code | Bloom | Texte (extrait) |
|---|---|---|---|
| RAG | A1 | comprendre | "L'élève comprend et interprète des messages oraux…" |
| RAG | A2 | appliquer | "L'élève s'exprime oralement de façon claire et cohérente." |
| RAG | B1 | analyser | "L'élève lit et interprète des textes de différents types." |
| RAG | B2 | comprendre | "L'élève manifeste un intérêt pour la lecture en français." |
| RAG | C1 | créer | "L'élève produit des textes variés adaptés à différentes situations." |
| RAG | C2 | appliquer | "L'élève applique les conventions linguistiques du français." |
| RAS | A1.1 | analyser | "identifie les idées principales et secondaires…" |
| RAS | A1.2 | évaluer | "dégage et évalue les stratégies d'écoute…" |
| RAS | A1.3 | évaluer | "évalue la crédibilité et la pertinence des informations…" |
| RAS | A2.1 | appliquer | "organise ses idées en fonction de l'intention…" |
| RAS | A2.2 | appliquer | "utilise un vocabulaire précis et varié…" |
| RAS | A2.3 | évaluer | "soutient et défend ses points de vue par des arguments…" |
| RAS | B1.1 | appliquer | "utilise des stratégies efficaces pour comprendre…" |
| RAS | B1.2 | analyser | "analyse les caractéristiques propres à chaque type…" |
| RAS | B1.3 | évaluer | "formule une appréciation critique justifiée…" |
| … | … | … | 6 autres RAS extraits |

**Grandes idées extraites :**
1. "La langue française est vecteur d'identité culturelle en contexte minoritaire."
2. "La communication efficace nécessite écoute active, expression claire et pensée critique."
3. "La littérature francophone reflète la diversité des expériences humaines."

**Scores SPIE-02 :** confidenceScore : **95** · completenessScore : **95**  
**Hiérarchie :** RAG→RAS correctement encodée (parentCode respecté)  
**SPIE-02_RUNTIME_USED = YES ✅**

> Note : Test effectué sur texte de référence. Le pack DB a `curriculum_contenu = NULL` — SPIE-02 ne se déclencherait pas pour cette classe sans correction préalable.

---

## 5. UI verification

Non exécutable dans ce contexte (test headless). Aucune modification UI dans V7.4.3 — Mon Année affiche le contenu JSON tel quel. Les bandeaux `ⓘ` pour champs absents sont déjà en place pour les packs V1.

---

## 6. SPIE-02_RUNTIME_USED

```
SPIE-02_RUNTIME_USED = YES
Evidence: isolation test réussi — 22 545 ms, 21 outcomes, confidence 95
Pipeline réel: NON ACTIVÉ (curriculum_contenu = NULL dans le pack DB)
```

Le moteur fonctionne. Le déclencheur pipeline est absent car la valeur `curriculum_contenu` n'est pas persistée lors de l'upload de fichier curriculum.

---

## 7. Qualitative Pedagogical Inspection — Programme existant

| Rubrique | Score | Note |
|---|---|---|
| Fidélité curriculaire | **0/10** | Données toxiques — aucun lien curriculaire |
| Cohérence des unités | **0/10** | Données toxiques — pas de justification |
| Cohérence séquences | **5/10** | Pas d'entité Séquence distincte (DEC-029 non livré) |
| Progression des leçons | **0/10** | Données toxiques — titres purement numériques |
| Spécificité des titres | **0/10** | Placeholders génériques |
| Traçabilité curriculum→leçon | **0/10** | Données toxiques |
| Crédibilité globale | **0/10** | Plan inutilisable pour enseigner |
| **SCORE MOYEN** | **0.7/10** | Données V1 pré-hotfix — attendu |

Ce programme a été créé avant V7.4.3. V7.4.3 aurait bloqué son insertion (HTTP 422 + log `[SPIE_PLACEHOLDER_BLOCKED]`). L'objectif du hotfix est confirmé.

---

## 8. Résultats qualité du code

| Gate | Résultat | Source |
|---|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur | V7.4.3 delivery report |
| `npm run build` | ✅ SUCCESS | V7.4.3 delivery report |
| Validator tests (24 cas) | ✅ 24/24 | validator-test.mjs, exécuté live |
| Fallback V1 supprimé | ✅ HTTP 422 | src/app/api/ia/curriculum/route.ts |
| SPIE-02 isolation | ✅ 21 outcomes | live-test.mjs, exécuté live |
| Anti-placeholder règles | ✅ 11 patterns | validate-pedagogical-programme.ts |
| DB migration | ✅ Aucune | conforme à la contrainte |
| Push Git | ✅ Aucun push | conforme à la contrainte |

---

## 9. Gap identifié — `curriculum_contenu` non persisté

### Observation

Le Teaching Pack de "CLASSE 8 B" a :
- `curriculum_source = 'televerse'` (un fichier a été uploadé)
- `curriculum_contenu = NULL` (le texte n'a pas été extrait et sauvegardé)

### Impact

Dans le pipeline `build-year`, la fonction `buildStructuredCurriculumContext()` vérifie :
```typescript
if (pack?.curriculum_contenu && pack.curriculum_contenu.length > 100) {
  // SPIE-02 path — JAMAIS ATTEINT si curriculum_contenu = NULL
}
```

Sans `curriculum_contenu`, SPIE-02 ne se déclenche pas. Le pipeline utilise la clé officielle ou le texte générique — ce qui produit un programme thématiquement générique mais pédagogiquement non-spécifique.

### Cause probable

Le flux d'upload curriculum ne fait pas l'OCR/extraction et ne persiste pas le texte dans `curriculum_contenu`. Ce champ existait peut-être avant cette session dans le schéma, mais n'est jamais rempli par l'interface.

### Action requise avant push

Vérifier dans le flux upload curriculum (`BuildMyYearWizard.tsx`, route upload, ou middleware de traitement) si le texte est extrait et persisté dans `curriculum_contenu`. Si non, c'est un bug de flux à corriger (sans migration DB — le champ est déjà dans le schéma JSONB).

---

## 10. RECOMMANDATION FINALE

### **B — DO NOT PUSH — minor correction required**

#### Ce qui est solide (ne pas retravailler)
- ✅ Fallback V1 supprimé → HTTP 422 — protège contra les données toxiques
- ✅ Validator anti-placeholder (11 règles, 24 tests verts) — garde-fou fiable
- ✅ SPIE-02 extrait 21 outcomes avec confidence 95/100 — moteur pédagogique validé
- ✅ Bridge SPIE-02 correctement intégré dans build-year
- ✅ Budget contexte × 4 (2k → 8k chars raw fallback)
- ✅ Schema_version stamp + logs structurés
- ✅ tsc=0, build=SUCCESS, aucune migration

#### Ce qui bloque le push
- ⚠️ **`curriculum_contenu` est NULL pour les classes avec fichier uploadé** → SPIE-02 ne s'active jamais en production réelle
- Symptôme : le flux upload ne persiste pas le texte extrait dans la colonne `curriculum_contenu`
- Conséquence : la fonctionnalité principale de V7.4.3 (SPIE-02 structured outcomes) ne bénéficiera à aucun enseignant lors du push

#### Correction requise
Localiser dans le flux upload curriculum (probablement `BuildMyYearWizard.tsx` ou l'API d'upload) le point où le texte du fichier est extrait. Persister ce texte dans `teaching_packs.curriculum_contenu`. Pas de migration requise (champ déjà existant dans le schéma).

#### Ce qui peut attendre V7.5 (inchangé)
- DEC-029 : table sequences + AYDTE
- DEC-030 : PGE SPIE-04
- Nettoyage des programmes toxiques existants
- Bannière "régénérer" pour les packs V1 en Mon Année

---

*Rapport généré automatiquement — no production code modified — no data repaired — no push performed.*
