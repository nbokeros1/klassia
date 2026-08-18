# SCORGIA V7.4.2 — Rapport d'Audit : Profondeur des Données Pédagogiques
**Date :** 2026-08-18  
**Version :** V7.4.2  
**Type :** FORENSIC AUDIT — Aucune implémentation, aucune migration, aucun push  
**Commit :** audit documents uniquement  
**Statut :** EN ATTENTE DÉCISION PRODUCT OWNER

---

## Diagnostic exécutif

L'audit détermine **pourquoi les données pédagogiques affichées dans Mon Année contiennent des libellés génériques** ("Unité 1", "Objectif principal", "Leçon 1") et où la richesse curriculaire se perd entre la source et l'UI.

**Réponse directe :**

> La richesse pédagogique est perdue à **deux niveaux distincts** selon le flux de création du programme.
>
> 1. **Flux V1** (planification de classe — toujours actif) : un fallback silencieux codé en dur dans `/api/ia/curriculum` génère "Unité 1" / "Objectif principal" / "Leçon 1" dès que l'IA retourne du texte non-JSON. Ce fallback est sauvegardé en base sans warning.
>
> 2. **Flux V2** (SPIE build-year — nouveau) : le pipeline transmet seulement 2 000 chars du curriculum à l'IA, alors que le moteur d'extraction SPIE-02 (entièrement implémenté) en lit 12 000 de façon structurée. Ce moteur n'est jamais appelé en production.

---

## Causes racines

### Cause #1 — Fallback silencieux V1 [CRITIQUE]

**Fichier :** `src/app/api/ia/curriculum/route.ts` — lignes 116–138

Quand `JSON.parse(response_IA)` échoue, le code insère directement en base :
```
6 unités × 5 leçons = 30 leçons avec :
  titre d'unité : "Unité 1", "Unité 2", ..., "Unité 6"
  objectifs     : ["Objectif principal", "Objectif secondaire"]
  titre leçon   : "Leçon 1", "Leçon 2", ..., "Leçon 30"
  sujet         : "Contenu à définir"
```

Le `catch {}` est **silencieux** — aucun log, aucun code HTTP d'erreur, aucun blocage de l'insertion. La route répond `{ success: true }` avec ces données toxiques.

**Cette route est encore appelée** par `src/app/dashboard/classes/[id]/planification/page.tsx`.

**Probabilité de déclenchement :** Toute timeout, rate limit, ou réponse IA non-JSON (refusal, message en markdown, erreur Anthropic) déclenche le fallback. Les JSON parse failures sont fréquentes sur les modèles de chat confrontés à des formats contraints.

---

### Cause #2 — Context curriculum tronqué à 2 000 chars [MAJEUR]

**Fichier :** `src/app/api/spie/build-year/route.ts`

```typescript
const curriculumCtx = syllabusText.substring(0, 2000)
```

Un document Alberta French Language Arts Grade 9 fait **50 000+ chars**. L'IA de génération du programme ne voit que les 2 000 premiers caractères (environ 1,5 page). Les outcomes de fin de document (A3, A4, B1, B2...) sont invisibles.

En comparaison, le moteur d'extraction SPIE-02 (`extraction-prompt.ts`) traite jusqu'à **12 000 chars** de façon structurée et retourne des `NormalizedOutcome[]` avec codes, niveaux Bloom, hiérarchie RAG→RAS. Ce moteur n'est jamais appelé.

---

### Cause #3 — Pipeline SPIE incomplet : moteurs architecturés mais non branchés [STRATÉGIQUE]

Trois moteurs sont entièrement implémentés mais déconnectés du pipeline de production :

| Moteur | Fichier | Statut | Ce qu'il apporterait |
|---|---|---|---|
| SPIE-02 Extraction | `curriculum/extraction/` | ✅ Complet, non branché | NormalizedOutcome[] avec codes réels et Bloom |
| AYDTE Planning | `aydte/planning/annual-planning-engine.ts` | ✅ Complet, non branché | SequenceBlock[] groupés par prerequis, couverture curriculaire |
| PGE Génération | `engines/pge/pge-engine.ts` | ❌ Stubs (SPIE-04 non livré) | Interface définie, zéro implémentation |

La route `build-year` est une **route monolithique** qui court-circuite tous ces moteurs et appelle l'IA directement avec un prompt + 2 000 chars de contexte brut.

---

### Cause #4 — Absence d'entité Séquence en base [STRUCTUREL]

Il n'existe **pas de table `sequences`** dans `supabase/schema.sql`. Le concept de "séquence" dans le code legacy = un index dans `contenu_json.unites[]`. Le modèle `SequenceBlock` avec son propre UUID, ses `outcomeIds[]` et ses semaines propres existe dans `src/lib/spie/aydte/types/twin.ts` mais n'est jamais persisté.

Conséquence : le modèle pédagogique cible (Programme → **Séquence** → Unité → Leçon) ne peut pas être représenté dans la base actuelle.

---

## Les titres réels existent-ils quelque part ?

| Question | Réponse |
|---|---|
| Des titres pédagogiques réels sont-ils générés par le nouveau flux ? | **OUI** — la route V2 (SPIE build-year) génère des titres thématiques réels avec anti-placeholder explicite dans le prompt |
| Les données toxiques "Unité 1" existent-elles en base ? | **Probablement OUI** — pour les classes créées via le flux V1 (planification), surtout si la génération IA a subi un timeout ou un format incorrect |
| Des séquences distinctes des unités existent-elles ? | **NON** — la production n'a pas de table séquences ; l'unité EST la séquence |

---

## Un changement de schéma est-il nécessaire ?

| Besoin | Schema change ? | Priorité |
|---|---|---|
| Supprimer le fallback silencieux V1 | ❌ Non | 🔴 CRITIQUE |
| Augmenter le budget context V2 | ❌ Non (code only) | 🟠 MAJEUR |
| Brancher SPIE-02 extraction | ❌ Non (code only) | 🟠 MAJEUR |
| Validator anti-placeholder pré-insert | ❌ Non | 🟠 MAJEUR |
| Séquence de premier rang (SequenceBlock) | ✅ OUI — table sequences | 🟡 V7.5 |
| Stocker NormalizedOutcome en base | ✅ OUI — table curriculum_outcomes | 🟡 V7.5 |
| question_directrice, CCHP | ✅ OUI — colonnes supplémentaires | 🔵 V8 |

---

## Recommandation V7.5

**Ordre de priorité recommandé :**

**P0 — Sans migration (peut être fait en V7.4.x) :**
1. **DEC-026** : Supprimer le fallback V1 codé en dur — retourner HTTP 422 + message d'erreur à l'enseignant
2. **DEC-027** : Budget context V2 × 4 (2 000 → 8 000 chars)
3. **DEC-031** : Validator anti-placeholder pré-insertion dans `programme_annuel`

**P1 — V7.5 (avec migration légère) :**
4. **DEC-028** : Brancher SPIE-02 dans le pipeline `build-year`
5. **DEC-032** : Flag `schema_version: 'v1'|'v2'` + bannière de régénération Mon Année

**P2 — V8 (migration significative) :**
6. **DEC-029** : Table `sequences` + branchement AYDTE
7. **DEC-030** : PGE SPIE-04 implémenté
8. Champs `question_directrice`, `CCHP`, niveauBloom

---

## Périmètre respecté

| Contrainte | Statut |
|---|---|
| Aucune implémentation de feature | ✅ Audit uniquement |
| Aucune migration de base de données | ✅ SQL non modifié |
| Aucun changement destructif | ✅ Aucun fichier production modifié |
| SchoolYearWorkspaceShell non modifié | ✅ |
| PlanAnnuelView non modifié | ✅ |
| SequencesView non modifié | ✅ |
| PlansLeconView non modifié | ✅ |
| LeconsWorkspace non modifié | ✅ |
| Pas de push Git | ✅ Commit local uniquement |

---

## Documents produits

| Document | Chemin |
|---|---|
| Audit architecture complet | `docs/Architecture/SCORGIA_PEDAGOGICAL_DATA_DEPTH_AUDIT.md` |
| Ce rapport | `docs/Release/SCORGIA_V7_4_2_AUDIT_REPORT.md` |

**Document d'audit référence :** [SCORGIA_PEDAGOGICAL_DATA_DEPTH_AUDIT.md](../Architecture/SCORGIA_PEDAGOGICAL_DATA_DEPTH_AUDIT.md) — contient la matrice de richesse complète (16 champs × 7 étapes), la trace end-to-end de l'outcome A1.1 (Alberta Français Sec 3), et les 7 DEC détaillées (DEC-026 à DEC-032).
