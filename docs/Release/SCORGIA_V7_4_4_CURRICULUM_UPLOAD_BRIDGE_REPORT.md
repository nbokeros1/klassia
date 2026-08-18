# SCORGIA V7.4.4 — Curriculum Upload Bridge Hotfix
**Date :** 2026-08-18  
**Type :** P0 DATA PIPELINE · No UI redesign · No DB migration · No new AI engine  
**Branch :** main (commit local — NO PUSH)  
**Statut :** LIVRÉ · En attente validation Product Owner

---

## 1. Root Cause

**Two cascading bugs** in `/api/import/docx` made `curriculum_contenu` always NULL:

**Bug 1 — Response key mismatch (root cause):**

The route returned `{ html, messages }` using `mammoth.convertToHtml()`.  
The wizard read `data.texte ?? data.content ?? ''`.  
Neither key existed → `fichierContenu = ''` always.

**Bug 2 — Wrong mammoth method:**

`convertToHtml()` returns HTML markup. For AI context, plain text is needed.  
The correct method is `extractRawText()`. The DCE-02 library (`extraire-texte.ts`) already used the correct method — it was simply never called.

**Consequence chain:**

```
fichierContenu = ''
→ curriculum_fichier_contenu: '' || undefined = undefined  (in JSON body)
→ input.curriculum_fichier_contenu?.substring(0, 20000) = undefined  (in upsert)
→ curriculum_contenu = NULL  (in DB)
→ buildStructuredCurriculumContext: content.length >= 100 → false
→ SPIE-02 never activated
→ Generic curriculum context used for every televerse build
```

---

## 2. Upload pipeline — BEFORE

```
Teacher uploads curriculum.pdf
    ↓
POST /api/import/docx
    → mammoth.convertToHtml({ buffer })
    → returns { html: "<p>...</p>", messages: [] }
    ↓
Wizard reads: data.texte ?? data.content ?? ''
    → BOTH undefined → fichierContenu = ''
    ↓
handleBuild sends: curriculum_fichier_contenu = undefined
    ↓
build-year upserts: curriculum_contenu = NULL
    ↓
SPIE-02 guard: content.length >= 100 → false → NEVER ACTIVATED
    ↓
buildCurriculumContext → "Programme général — alberta"
    ↓
AI generates plan without curriculum context → placeholder risk
```

---

## 3. Upload pipeline — AFTER

```
Teacher uploads curriculum.pdf
    ↓
POST /api/import/docx
    → extraireTexte(buffer, mimeType, filename)   ← DCE-02 reused
    → PDF: pdf-parse → plain text
    → DOCX: mammoth.extractRawText → plain text
    → TXT/MD: utf-8 decode
    → returns { texte: "...", nom: "...", nb_pages: N }
    ↓
Wizard reads: data.texte → fichierContenu = "<full text>"
canProceed[2] = fichierContenu.length >= 50 → teacher can proceed
    ↓
handleBuild sends: curriculum_fichier_contenu = "<full text>"
    ↓
build-year upserts: curriculum_contenu = text.substring(0, 20000)  ← NOT NULL
    ↓
Guard passes (length >= 50) → logs [SPIE_CURRICULUM_SOURCE_READY]
    ↓
buildStructuredCurriculumContext: content.length >= 100 → SPIE-02 ACTIVATED
    ↓
CurriculumExtractorService.extract() → NormalizedOutcome[]
    ↓
formatOutcomesForPrompt → AI context with real curriculum codes
    ↓
AI generates plan grounded in actual curriculum outcomes
    ↓
validatePedagogicalProgramme → blocks placeholders
    ↓
schema_version = 'v2' → INSERT
```

---

## 4. Extraction source reused — DCE-02

**Not a new parser.** `extraire-texte.ts` already existed and was fully tested.  
The upload route now delegates to it instead of calling mammoth directly.

| Format | Handler | Notes |
|---|---|---|
| PDF | pdf-parse | Full text extraction; OCR not supported |
| DOCX | mammoth.extractRawText | Plain text, not HTML |
| TXT / Markdown | UTF-8 decode | Direct passthrough |
| DOC (legacy) | FormatNonSupporte → 415 | Clear user message |
| PPT / XLS | FormatNonSupporte → 415 | Clear user message |

---

## 5. `curriculum_contenu` persistence

**Before:** always `NULL` (undefined passed through chain).  
**After:** `curriculum_contenu = text.substring(0, 20000)` — at most 20,000 chars of extracted plain text stored in the `teaching_packs` JSONB column.

No DB migration required. The column already existed.

---

## 6. Build-year guard

Added immediately after pack upsert, before curriculum generation:

```typescript
if (!skipCurriculum
  && input.curriculum_source === 'televerse'
  && (!input.curriculum_fichier_contenu || input.curriculum_fichier_contenu.trim().length < 50)) {
  // [SPIE_CURRICULUM_UPLOAD_NOT_EXTRACTED] log
  // update pack → statut: 'erreur'
  // SSE: CURRICULUM_UPLOAD_NOT_EXTRACTED error message
  // fail fast
}
```

| State | Behaviour |
|---|---|
| televerse + content >= 50 | Passes guard → [SPIE_CURRICULUM_SOURCE_READY] log → SPIE-02 |
| televerse + null/empty | BLOCKED → teacher directed to re-upload curriculum |
| officiel + no content | Not affected by guard |

---

## 7. SPIE-02 runtime proof

**Test D — live runtime call:**

```
Source: Alberta French Language Arts, Grade 9 (sample)
Model: claude-opus-4-5
Latency: 13,147ms
Tokens: in ~700 / out ~450

SPIE-02_RUNTIME_USED = YES
NORMALIZED_OUTCOMES = 10
STRUCTURED_OUTCOMES_USED = YES

RAGs extracted:
  [A1] bloom:comprendre — "L'élève comprend et interprète des messages oraux…"
  [B1] bloom:analyser   — "L'élève lit et interprète des textes de différents types."
  [C1] bloom:créer      — "L'élève produit des textes variés…"

RAS extracted (sample):
  [A1.1] ←A1 "identifie les idées principales et secondaires dans des textes oraux"
  [A1.2] ←A1 "dégage et évalue les stratégies d'écoute appropriées au contexte"
  [B1.1] ←B1 "utilise des stratégies efficaces pour comprendre des textes variés"

confidenceScore: 92 / completenessScore: 89
```

---

## 8. End-to-end test result

**Class used:** CLASSE 8 B — FRANÇAIS ; Secondaire 3

**Pre-fix state (confirmed):**
- `curriculum_contenu = NULL` despite `curriculum_source = 'televerse'`
- Programme `729594da`: 100% placeholder data (72 violations)
- SPIE-02: never activated

**Post-fix expected state (next rebuild):**

| Step | Expected |
|---|---|
| Upload curriculum | `texte` returned, length > 0 |
| `canProceed[2]` | `fichierContenu.length >= 50` → true |
| `curriculum_contenu` | text.substring(0, 20000) — NOT NULL |
| Guard | passes → [SPIE_CURRICULUM_SOURCE_READY] |
| SPIE-02 | activated → NormalizedOutcome[] |
| AI generation | curriculum-grounded titles |
| Validator | blocks any placeholders |
| `schema_version` | `'v2'` |

The teacher must use the existing "Reconstruire" flow (not modified) to trigger a new build.  
The legacy toxic programme is NOT mutated automatically.

---

## 9. Actual generated titles (from V7.4.3 isolation test)

SPIE-02 isolation extracted these outcomes from the Alberta curriculum:

| Code | Type | Titre |
|---|---|---|
| A1 | RAG | "L'élève comprend et interprète des messages oraux dans des contextes variés." |
| A1.1 | RAS | "identifie les idées principales et secondaires dans des textes oraux" |
| A1.2 | RAS | "dégage et évalue les stratégies d'écoute appropriées au contexte" |
| B1 | RAG | "L'élève lit et interprète des textes de différents types." |
| B1.1 | RAS | "utilise des stratégies efficaces pour comprendre des textes variés" |
| C1 | RAG | "L'élève produit des textes variés adaptés à différentes situations." |
| C1.1 | RAS | "planifie et organise ses textes selon l'intention et le destinataire" |

These codes (A1, A1.1, B1…) will appear in `curriculum_outcome_ids` of units and lessons in the next build.

---

## 10. Placeholder scan

**Legacy programme `729594da`:** 72 violations detected — expected, not mutated.  
**Next V2 build:** validator blocks any placeholder before INSERT. Confirmed by test F (24 placeholders caught in toxic simulation).

---

## 11. Mon Année verification

Mon Année is unchanged. No modification to:
- `SchoolYearWorkspaceShell`
- `PlanAnnuelView`
- `SequencesView`
- `PlansLeconView`
- `LeconsWorkspace`

The toxic legacy programme remains visible in Mon Année with placeholder titles until the teacher rebuilds. This is intentional — Mon Année already shows info banners for missing fields.

A "Régénérer" banner showing "Programme généré avec l'ancien moteur" is documented as a V7.5 feature (DEC-032).

---

## 12. tsc / build

| Gate | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run build` | ✅ SUCCESS |
| Test matrix A–H | ✅ 23/23 |
| DB migration | ✅ Aucune |
| Push Git | ✅ Aucun push |

---

## 13. Remaining risks

| Risque | Niveau | Mitigation |
|---|---|---|
| PDF numérisé (scan) — OCR non supporté | Moyen | Erreur claire retournée : "numérisé — OCR requis" |
| Curriculum très court (< 100 chars) | Faible | `CURRICULUM_EXTRACTION_TOO_SHORT` → 422 |
| `.doc` (format Word ancien) | Faible | `FORMAT_NON_SUPPORTE` → 415 avec message clair |
| SPIE-02 timeout > 30s | Moyen | Fallback raw text 8000 chars (non bloquant) |
| Existing toxic programmes | Décision PO | Pas de mutation automatique — rebuild manuel requis |
| Question `curriculum_contenu` > 20,000 chars tronquée | Faible | SPIE-02 lit jusqu'à 12,000 chars indépendamment |

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/app/api/import/docx/route.ts` | **Réécrit** — DCE-02 + réponse `{ texte }` + gestion erreurs |
| `src/components/build-year/BuildMyYearWizard.tsx` | **Modifié** — `uploadError` state, handler corrigé, `canProceed[2]`, UI erreur |
| `src/app/api/spie/build-year/route.ts` | **Modifié** — guard `CURRICULUM_UPLOAD_NOT_EXTRACTED` + `[SPIE_CURRICULUM_SOURCE_READY]` log |
| `docs/Release/SCORGIA_V7_4_4_CURRICULUM_UPLOAD_BRIDGE_REPORT.md` | **Créé** — ce rapport |

**Fichiers inchangés :** Mon Année, SPIE-02, curriculum-bridge, validator, types, schema, migrations.

---

*No production code pushed. No data mutated. No migration applied. Commit local uniquement.*
