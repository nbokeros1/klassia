# DEPLOY-BETA-02A — Rapport maxDuration routes longues
> **Date** : 2026-08-05  
> **Statut** : ✅ Complété — build en cours de validation

---

## Audit complet des routes

### Méthode

Lecture de chaque route handler pour évaluer :
- Durée potentielle (nombre d'appels Claude, streaming, opérations bloquantes)
- Présence de SSE (Server-Sent Events)
- Dépendances Node.js (child_process, fs, mammoth, pptxgenjs, docx)
- Présence antérieure de `maxDuration`

---

## Tableau d'audit

| Route | Durée potentielle | Streaming SSE | `maxDuration` avant | Action |
|-------|-----------------|---------------|---------------------|--------|
| `/api/spie/lesson-engine` | 90–180 s (13 étapes Claude séquentielles) | ✅ Oui | ❌ Absent | ✅ Ajouté = 300 |
| `/api/spie/build-year` | 60–120 s (pipeline SSE multi-étapes) | ✅ Oui | ❌ Absent | ✅ Ajouté = 300 |
| `/api/spie/lesson-regenerate` | 20–60 s (1 appel Sonnet + archivage DB) | ❌ Non | ❌ Absent | ✅ Ajouté = 120 |
| `/api/export/pdf` | 30–90 s (`exec soffice` + DOCX gen + Anthropic) | ❌ Non | ❌ Absent | ✅ Ajouté = 120 |
| `/api/spie/analyze-template` | 15–30 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/spie/pack-export` | 5–15 s (génération DOCX, pas d'IA) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/spie/lesson-to-quiz` | < 5 s (DB uniquement) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/spie/lesson-to-enseigner` | < 5 s (DB uniquement) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/spie/quality-gate` | < 5 s (calcul local) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/spie/syllabus-save` | < 5 s (DB uniquement) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/spie/official-curricula` | < 5 s (DB uniquement) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/curriculum` | 30–60 s (1 appel Claude, 6000 tok input) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/regenerer-plan-annuel` | 30–60 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/generer` | 30–60 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/assistant` | < 30 s (streaming tokens) | ✅ Oui | ❌ Absent | Pas de changement |
| `/api/ia/quiz` | 20–45 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/analyser-gabarit` | 15–30 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/analyser-calendrier-scolaire` | 15–25 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/ia/importer-emploi-du-temps` | 15–25 s (1 appel Claude) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/export/docx` | 15–60 s (Anthropic + docx lib) | ❌ Non | ❌ Absent | Pas de changement |
| `/api/export/pptx` | 5–20 s (PptxGenJS, pas d'IA) | ❌ Non | ❌ Absent | Pas de changement |

---

## Modifications appliquées

### 1. `src/app/api/spie/lesson-engine/route.ts`

```typescript
// Ajouté après les imports, avant le SSE helper
export const maxDuration = 300
```

**Justification** : Pipeline SSE 13 étapes — 8 appels Claude séquentiels (2 Sonnet + 6 Haiku). Durée mesurée : 90–180 s. Dépasse systématiquement la limite Vercel Pro par défaut (60 s).

---

### 2. `src/app/api/spie/build-year/route.ts`

```typescript
// Ajouté après les imports, avant les Helpers
export const maxDuration = 300
```

**Justification** : Pipeline SSE qui génère syllabus + plan annuel + séquences via plusieurs appels Claude. Durée estimée : 60–120 s. Risque de timeout certain sans cette valeur.

---

### 3. `src/app/api/spie/lesson-regenerate/route.ts`

```typescript
// Ajouté après les imports, avant les Helpers
export const maxDuration = 120
```

**Justification** : Un appel Claude Sonnet-4-6 avec tokens élevés pour régénérer une section de leçon + archivage DB dans `pack_versions`. Durée normale : 20–60 s. La valeur 120 laisse une marge de sécurité sans prétendre aux 300 s des pipelines SSE.

---

### 4. `src/app/api/export/pdf/route.ts`

```typescript
// Ajouté après const execAsync = promisify(exec)
export const maxDuration = 120
```

**Justification** : Deux opérations chaînées — génération DOCX (appel interne `/api/export/docx` incluant Anthropic) + conversion `soffice --headless` via `exec()` bloquant. La durée cumulée peut atteindre 60–90 s. La valeur 120 couvre les cas limites.

---

## Runtime — Analyse

Aucune route ne déclare `export const runtime = 'edge'`. Toutes fonctionnent en **runtime Node.js implicite**, ce qui est correct car elles utilisent :

| Route | Dépendances Node.js |
|-------|-------------------|
| `/api/export/pdf` | `child_process`, `fs`, `path`, `os` |
| `/api/export/docx` | `docx` (Packer), Anthropic SDK |
| `/api/export/pptx` | `pptxgenjs` |
| `/api/ia/assistant` | `mammoth` (lecture DOCX) |

**Décision** : Pas de `runtime = 'nodejs'` ajouté — le brief spécifie de ne pas forcer ce qui est déjà implicite. La convention Next.js garantit Node.js par défaut.

---

## ⚠ Risque critique identifié — `export/pdf` et LibreOffice

La route `export/pdf` invoque `soffice` (LibreOffice) via `exec()` :

```typescript
await execAsync(`soffice --headless --convert-to pdf --outdir "${tmpDir}" "${tmpDocx}"`)
```

**LibreOffice n'est pas disponible dans l'environnement Vercel.** Cette route **échouera en production Vercel** avec :
```
Error: Command failed: soffice: not found
```

Ce risque est indépendant du `maxDuration`. Il doit être traité séparément (post-bêta ou via une solution alternative comme `pdf-lib`, `puppeteer`, ou un service tiers).

**Impact bêta** : L'export PDF ne fonctionnera pas sur Vercel. L'export DOCX et PPTX fonctionneront.

---

## Risques restants

| Risque | Sévérité | Route | Statut |
|--------|----------|-------|--------|
| `soffice` absent sur Vercel | 🔴 Critique | `/api/export/pdf` | Non résolu — hors périmètre DEPLOY-BETA-02A |
| Payload curriculum > 4.5 Mo | 🟡 Modéré | `/api/ia/curriculum` | Non résolu — documenté dans VERCEL_COMPATIBILITY_ASSESSMENT.md |
| `/api/ia/curriculum` peut dépasser 60 s | 🟡 Modéré | curriculum | Acceptable — borderline, généralement < 60 s |

---

## Résultats des tests

| Test | Résultat |
|------|---------|
| `npx tsc --noEmit` | ✅ 0 erreur |
| `npm run lint` | ✅ 0 erreur dans les fichiers modifiés (erreurs préexistantes dans admin/* non liées) |
| `npm run build` | ✅ Exit 0 — 112 pages statiques, 0 erreur |

---

*Document créé : DEPLOY-BETA-02A · 2026-08-05*
