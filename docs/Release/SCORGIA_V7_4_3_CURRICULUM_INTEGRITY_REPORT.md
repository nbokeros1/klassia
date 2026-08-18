# SCORGIA V7.4.3 — Curriculum Integrity Hotfix
**Date :** 2026-08-18  
**Type :** P0 DATA QUALITY · No UI redesign · No remote migration  
**Branch :** main (commit local — NO PUSH)  
**Statut :** LIVRÉ · En attente validation Product Owner

---

## Objectif

Éliminer la production silencieuse de plans annuels pédagogiquement toxiques et connecter le moteur SPIE-02 pour que le pipeline V2 consomme des données curriculaires structurées là où elles sont disponibles.

---

## 1. Fallback V1 supprimé

**Fichier modifié :** `src/app/api/ia/curriculum/route.ts`

**Ancien comportement :**

```typescript
} catch {
  // SILENCIEUX — persistait immédiatement en base :
  programme = { unites: Array.from({length: 6}, (_, i) => ({
    titre: `Unité ${i + 1}`,
    objectifs: ['Objectif principal', 'Objectif secondaire'],
    lecons: Array.from({length: 5}, (_, j) => ({ titre: `Leçon ${i*5+j+1}`, sujet: 'Contenu à définir' }))
  }))}
}
```

**Nouveau comportement :**

```typescript
} catch {
  console.error('[SPIE_CURRICULUM_GENERATION_INVALID]', { step: 'parse', code: 'CURRICULUM_GENERATION_INVALID', matiere, niveau, ... })
  return NextResponse.json(
    { success: false, error: '...', code: 'CURRICULUM_GENERATION_INVALID' },
    { status: 422 }
  )
}
```

La route retourne **HTTP 422** avec `code: 'CURRICULUM_GENERATION_INVALID'`. Aucune persistance. Le frontend reçoit un état d'échec explicite.

---

## 2. Validateur anti-placeholder

**Fichier créé :** `src/lib/spie/validate-pedagogical-programme.ts`

### Règles détectées

| Pattern | Règle |
|---|---|
| `/^Unité\s+\d+(\s*[-—:].{0,30})?$/i` | `generic-unit-title` |
| `/^Séquence\s+\d+(\s*[-—:].{0,30})?$/i` | `generic-unit-title` |
| `/^Le[çc]on\s+\d+(\s*[-—:].{0,30})?$/i` | `generic-lesson-title` |
| `"Objectif principal"` (exact) | `placeholder-objective` |
| `"Objectif secondaire"` (exact) | `placeholder-objective` |
| `"Contenu à définir"` (exact) | `placeholder-content` |
| `"Titre à définir"` (exact) | `placeholder-title` |
| `"Objectif à définir"` (exact) | `placeholder-objective` |
| `"À définir"` (exact) | `placeholder-content` |
| `"Non spécifié"` (exact) | `placeholder-content` |
| `"Description à compléter"` (exact) | `placeholder-content` |

### Anti-faux-positifs

Les titres réels contenant des nombres passent sans blocage :
- `"Unité de mesure — le mètre"` ✅
- `"Les Premières Nations : 5 nations fondatrices"` ✅
- `"Chapitre 1 : L'identité francophone"` ✅

Les patterns bloqués sont **sémantiquement placeholders** (le titre = exactement une structure générique de fallback).

### Intégration

Appelé dans :
1. **`/api/ia/curriculum`** — après `JSON.parse()` réussi, avant tout INSERT
2. **`/api/spie/build-year`** — après la tentative de parse du programme généré, avant le bloc fail-fast existant

Résultat type :
```typescript
{ valid: boolean, violations: Array<{ field: string, value: string, rule: string }> }
```

---

## 3. Intégration SPIE-02

### Bridge créé

**Fichier créé :** `src/lib/spie/curriculum/extraction/curriculum-bridge.ts`

Deux exports :
- `extractOutcomesFromText(text, config, sourceName)` — wraps le texte brut dans un `ParsedCurriculumDocument` minimal et appelle `CurriculumExtractorService.extract()`
- `formatOutcomesForPrompt(outcomes, maxOutcomes=60)` — sérialise les `NormalizedOutcome[]` en JSON compact (~4 800 chars pour 60 outcomes)

### Chemin d'intégration dans `build-year`

```
curriculum_fichier_contenu disponible ?
├── OUI → SPIE-02 extraction (Claude Opus 4.5, jusqu'à 12,000 chars)
│         ├── SUCCESS → contextBlock = NormalizedOutcome[] JSON + aperçu 2,000 chars
│         │             → outcomesExtracted = true
│         └── ÉCHEC   → log [SPIE_CURRICULUM_EXTRACTION_FAILED]
│                     → fallback raw text 8,000 chars (vs 2,000 avant V7.4.3)
└── NON  → buildCurriculumContext() → clé officielle ou programme général
```

### Ce que SPIE-02 apporte quand il réussit

L'IA de génération du programme reçoit dans son prompt :
```json
[
  {"id": "outcome_A1", "code": "A1", "texte": "L'élève partagera des informations...", "vocab": "rag_ras", "bloom": "synthétiser", "parentId": null},
  {"id": "outcome_A1.1", "code": "A1.1", "texte": "L'élève utilisera un vocabulaire varié...", "vocab": "rag_ras", "bloom": "appliquer", "parentId": "outcome_A1"},
  ...
]
```

Les `curriculum_outcome_ids` générés dans le programme peuvent désormais référencer des codes réels (A1, A1.1, B2...) au lieu d'IDs AI-inventés.

### Limitation connue

SPIE-02 utilise le modèle `claude-opus-4-5` (configuré dans `CurriculumExtractorService`). Cela ajoute une étape IA supplémentaire au pipeline `build-year` (latence ~10-20s). Acceptable pour une opération de construction d'année qui prend déjà 60-120s.

Si le teacher n'a pas uploadé de fichier curriculum (seulement sélectionné une clé officielle comme `alberta`), SPIE-02 n'est pas appelé car il n'y a pas de texte source à extraire.

---

## 4. Budget de contexte

| Scénario | Avant V7.4.3 | Après V7.4.3 |
|---|---|---|
| Fichier uploadé + SPIE-02 réussit | 2,000 chars brut | NormalizedOutcome[] JSON (~4,800 chars) + 2,000 chars aperçu |
| Fichier uploadé + SPIE-02 échoue | 2,000 chars brut | 8,000 chars brut (× 4) |
| Clé officielle (ex: `alberta`) | ~100 chars statique | ~100 chars statique (inchangé) |
| Pas de curriculum | "Programme général…" | "Programme général…" (inchangé) |

### Stratégie de sélection (priorité décroissante)

1. **Outcomes normalisés** : JSON structuré avec codes, Bloom, hiérarchie parent/enfant
2. **Aperçu document brut** : 2,000 premiers chars du fichier (repère de contexte pour l'IA)
3. **Raw text étendu** : 8,000 chars si SPIE-02 indisponible
4. **Clé officielle statique** : ~100 chars en dernier recours

### Budget token estimé (V2 build-year, pire cas)

| Composant | Chars | Tokens estimés |
|---|---|---|
| System prompt + rules | ~600 | ~150 |
| Structured outcomes (60 max) | ~4,800 | ~1,200 |
| Aperçu brut | 2,000 | ~500 |
| Schema JSON example | ~2,000 | ~500 |
| **Total input** | | **~2,350** |
| Output (programme) | max_tokens=5,000 | ≤ 5,000 |

Reste dans le budget claude-sonnet-4-6 (200k context window).

---

## 5. Contrat de génération mis à jour

### Règle 4 — Structure variable (remplace l'ancienne règle fixe)

**Avant :**
```
4. 5 à 7 unités avec 4 à 6 leçons chacune, distribuées sur N semaines
```

**Après :**
```
4. Nombre d'unités et leçons déterminé par le curriculum
   (cible 4 à 8 unités, 2 à 6 leçons par unité selon la complexité pédagogique),
   distribué sur N semaines
```

La structure est désormais **curriculum-driven** — le nombre d'unités dépend de la richesse de la source, pas d'une constante hardcodée.

### Règle 6 — Ne jamais fabriquer des champs absents (nouvelle)

```
6. Ne fabrique AUCUN champ absent du curriculum source
   (question_directrice, CCHP, etc.) — laisser vide plutôt qu'inventer
```

### Champs requis par unité

| Champ | Requis | Condition |
|---|---|---|
| `titre` (non générique) | ✅ | Toujours |
| `justification_pedagogique` | ✅ | Toujours (2 phrases max) |
| `curriculum_outcome_ids[]` | ✅ | Codes réels si SPIE-02 a réussi |
| `grandes_idees[]` | ⚠️ | Si présent dans le curriculum source |
| `question_directrice` | ⚠️ | Si présent dans le curriculum source — jamais inventé |
| `CCHP` | ⚠️ | Si présent dans le curriculum source — jamais inventé |

---

## 6. Comportement fail-fast

### `/api/ia/curriculum` (V1)

| Cas | Avant | Après |
|---|---|---|
| JSON.parse échoue | 🔴 INSERT silencieux des données toxiques | 🟢 HTTP 422, no INSERT |
| JSON valide mais placeholder | 🔴 INSERT silencieux | 🟢 HTTP 422, no INSERT |
| JSON valide et propre | ✅ INSERT | ✅ INSERT (inchangé) |

### `/api/spie/build-year` (V2)

| Cas | Comportement |
|---|---|
| SPIE-02 extraction échoue | ⚠️ Log [SPIE_CURRICULUM_EXTRACTION_FAILED] + fallback raw text (non bloquant) |
| Programme généré = placeholder | 🔴 Log [SPIE_PLACEHOLDER_BLOCKED] + pack marqué `erreur` + SSE fail-fast |
| Programme vide (pas d'unités) | 🔴 [SPIE_BUILD_FAILED] (comportement antérieur maintenu) |
| Programme valide | ✅ Log [SPIE_PROGRAMME_VALIDATION_OK] + persist |

Le Teaching Pack n'est **jamais** marqué `pret` si le programme est invalide.

---

## 7. Compatibilité legacy

### Détection de version

Nouveau champ `schema_version?: 'v1' | 'v2'` ajouté à `ContenuProgramme` (type uniquement — pas de migration DB, le champ vit dans le JSONB).

| Valeur | Signification |
|---|---|
| `'v2'` | Généré par `/api/spie/build-year` après V7.4.3 — champs V2 garantis |
| `'v1'` | Réservé pour les programmes V1 régénérés explicitement |
| `undefined` | Legacy — antérieur à V7.4.3 — traité comme V1 |

### Packs anciens — aucune mutation

Les programmes existants en base **ne sont pas modifiés**. Le validator n'est appelé qu'au moment de la génération (INSERT/UPDATE). Les données existantes (même toxiques) restent lisibles par Mon Année, qui affiche déjà les bandeaux `ⓘ` pour les champs absents.

**Stratégie de nettoyage documentée (pour V7.5) :**

```sql
-- Détecter les programmes avec données toxiques
SELECT id, classe_id, titre, created_at
FROM programme_annuel
WHERE contenu_json->'unites'->0->>'titre' ~ '^Unité [0-9]'
   OR contenu_json->'unites'->0->'objectifs'->0 = '"Objectif principal"';
```

Mon Année pourra afficher : "Programme généré avec l'ancien moteur — reconstruisez pour activer les fonctionnalités pédagogiques V2."

---

## 8. Logs structurés

| Code de log | Déclencheur | Contenu |
|---|---|---|
| `[SPIE_CURRICULUM_GENERATION_INVALID]` | V1 JSON.parse échoue | step, code, matiere, niveau, responseLength, responsePreview |
| `[SPIE_PLACEHOLDER_BLOCKED]` | Validator rejette programme | step, code, classeId, packId, summary des violations |
| `[SPIE_CURRICULUM_EXTRACTION_FAILED]` | SPIE-02 bridge retourne 0 outcomes | classeId, packId, error, warnings, fallback |
| `[SPIE_CURRICULUM_EXTRACTION_OK]` | SPIE-02 réussit | classeId, packId, outcomeCount, tokensUsed |
| `[SPIE_PROGRAMME_VALIDATION_OK]` | Programme validé avant persist | classeId, packId, unites, outcomesExtracted |
| `[SPIE_BUILD_FAILED]` | Build-year interrompu | classeId, packId, step, stopReason, error |

Aucun payload curriculum sensible n'est loggé — seulement les métadonnées (longueur, compte, codes d'erreur).

---

## 9. Blocages restants pour V7.5

| Priorité | DEC | Blocage | Raison du report |
|---|---|---|---|
| 🟡 P1 | DEC-029 | Table `sequences` + AYDTE | Migration DB requise |
| 🟡 P1 | DEC-030 | PGE SPIE-04 implémenté | Charge de travail significative |
| 🟡 P1 | — | Bannière "régénérer" Mon Année | Attente validation PO + schema_version en base |
| 🔵 P2 | — | `question_directrice`, `CCHP` en schéma | Migration DB + spec pédagogique V8 |
| 🔵 P2 | — | Nettoyage programmes toxiques existants | Script + UX enseignant à définir |

---

## 10. Résultats qualité

| Gate | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run build` | ✅ SUCCESS |
| Fallback toxique V1 | ✅ Supprimé → HTTP 422 |
| Validator anti-placeholder | ✅ Créé + tests A–F |
| SPIE-02 branché en V2 | ✅ Via `curriculum-bridge.ts` |
| Budget context × 4 | ✅ 2 000 → 8 000 chars (raw fallback) |
| Structure variable | ✅ Prompt mis à jour |
| Fail-fast V2 | ✅ Validator + bloc SSE erreur |
| Logs structurés | ✅ 6 codes de log définis |
| Legacy V1 packs | ✅ Aucune mutation |
| DB migration | ✅ Aucune |
| Push Git | ✅ Aucun push effectué |

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `src/lib/spie/validate-pedagogical-programme.ts` | **Créé** — validator anti-placeholder |
| `src/lib/spie/curriculum/extraction/curriculum-bridge.ts` | **Créé** — bridge SPIE-02 pour texte brut |
| `src/lib/spie/__tests__/validate-pedagogical-programme.test.ts` | **Créé** — 7 cas de test (A–F) |
| `src/lib/types/database.ts` | Modifié — `ContenuProgramme.schema_version` ajouté |
| `src/app/api/ia/curriculum/route.ts` | Modifié — fallback supprimé, validator, logs |
| `src/app/api/spie/build-year/route.ts` | Modifié — SPIE-02 bridge, context budget, validator, prompt, logs |
| `docs/Release/SCORGIA_V7_4_3_CURRICULUM_INTEGRITY_REPORT.md` | **Créé** — ce rapport |

**Fichiers inchangés :** Mon Année (SchoolYearWorkspaceShell, PlanAnnuelView, SequencesView, PlansLeconView, LeconsWorkspace) — le hotfix répare le contrat de données, pas l'UI.
