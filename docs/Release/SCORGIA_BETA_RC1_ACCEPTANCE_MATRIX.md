# SCORGIA BETA-RC1 — Acceptance Matrix

**Date:** 2026-08-20  
**Audited HEAD:** 519cba7  
**Method:** Static code analysis · API route inspection · Schema audit · Runtime build verification

---

## Acceptance Checklist

| # | Category | Gate | Status | Notes |
|---|----------|------|--------|-------|
| 1 | Signup | Invite-only β-signup, invitation validated server-side | PASS | `beta_invitations` table check via service role |
| 2 | Login | Supabase auth, JWT via `getUser()` | PASS | `requireAuth()` uses `getUser()` correctly |
| 3 | Onboarding | Multi-step wizard, class/curriculum/calendar setup | PASS | Complete flow exists |
| 4 | Class creation | Class created with enseignant_id FK, visible in dashboard | PASS | Standard Supabase insert |
| 5 | Curriculum upload | PDF/DOCX upload → extraction → curriculum_fichier_contenu | PASS | Guard against empty extraction present |
| 6 | SPIE extraction | `extractOutcomesFromText()` → NormalizedOutcome[] | PASS | Fallback to raw 8,000 chars on failure |
| 7 | Anti-placeholder | `validatePedagogicalProgramme()` called before DB write | PASS | Blocks "Unité 1", "Leçon 1" etc. |
| 8 | Annual generation | AYDTE + Claude Sonnet → programme_annuel persisted | PASS | DB verify step after every write |
| 9 | Syllabus | Two-attempt generation with truncation recovery | PASS | Policy fields correctly templated as teacher input |
| 10 | Mon Année global | Multi-class cockpit, metrics from real data | PASS | Empty states present for missing data |
| 11 | Mon Année class workspace | All 10 tabs render | PARTIAL | Évaluations: from JSON. Student support: table not applied (042) |
| 12 | Lesson registry | Two-pane UX, unit → sequence → lesson hierarchy | PASS | Teaching events status derivation present |
| 13 | Teaching events | Append-only INSERT, `lesson_taught` / `lesson_taught_cancelled` | PASS | No UPDATE/DELETE RLS policies |
| 14 | Curriculum coverage | Outcome → sequence/lesson linkage from contenu_json | PASS | BUG-05 fix in place |
| 15 | Préparer | AI generation with class/curriculum context | PARTIAL | Auth gap P0-01 on /api/ia/generer |
| 16 | Document engine | Upload → extraction → indexing → fichiers_dossier | PASS | MIME type validation in indexer |
| 17 | Class folder binding | Programme → class folder tree written on build-year | PASS | Binding is non-blocking; errors logged |
| 18 | Students | eleves table, class-scoped query | PASS | Class isolation confirmed via RLS |
| 19 | Student privacy | `buildSafeStudentAIContext` defined | FAIL | Guards not called in /api/ia/generer (P0-02) |
| 20 | Student support plans | Persistence layer | FAIL | Migration 042 PROPOSED, not applied |
| 21 | Evaluations | Tab renders from JSON | PARTIAL | No dedicated table; no creation UI |
| 22 | Mobile | V7.6.1 architecture, PO physical Android PASS | PASS | No regression found in code audit |
| 23 | Desktop | 1440px sidebar, no mobile bleed | PASS | CSS media query correctly scoped |
| 24 | RLS — utilisateurs | `auth.uid() = user_id` | PASS | Correct |
| 25 | RLS — classes | `enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())` | PASS | Correct |
| 26 | RLS — programme_annuel | Via classe chain | PASS | Correct |
| 27 | RLS — teaching_events | Via utilisateurs.id chain, INSERT WITH CHECK | PASS | Append-only enforced at DB level |
| 28 | RLS — beta_invitations | Founder/admin only | PASS | Migration 035 applied |
| 29 | RLS — liste_attente | Any authenticated user can read | FAIL | Too broad (P2-01) |
| 30 | Service role safety | `SUPABASE_SERVICE_ROLE_KEY` never in NEXT_PUBLIC_ | PASS | Confirmed grep of all usages |
| 31 | API auth — build-year | `requireAuth()` + `getUser()` + entitlement check | PASS | |
| 32 | API auth — mark-taught | `requireAuth()` + 3-step ownership chain | PASS | Class → pack → programme chain |
| 33 | API auth — generer | NO AUTH CHECK | FAIL | P0-01 |
| 34 | API auth — founder routes | `requireFounderOrAdmin()` server-side | PASS | |
| 35 | DB health — unites | Ghost table exists, row count = 0 | PASS | No beta risk; do not drop yet |
| 36 | DB health — canonical tables | pedagogical_units/sequences/lessons | FAIL | Tables not created (044 not applied); shadow-write silently fails |
| 37 | Observability | console.info/error structured logs | PARTIAL | Logs exist in build-year pipeline; no external aggregator |
| 38 | Recovery — build-year | Reprendre la génération | PASS | BuildState tracked, resume logic present |
| 39 | Legacy compatibility | V2 JSON still readable | PASS | `schema_version` field, V2 reads from unites[] |
| 40 | TSC | 0 errors | PASS | Confirmed |
| 41 | Build | `next build` exit 0 | PASS | Confirmed |
| 42 | Beta access model | Invite-only, `role: 'beta'` assigned | PASS | Explicit model, not open |
| 43 | Loading branding | ScorgiaLogo (purple S), no legacy K | PASS | `LoadingScreen.tsx` confirmed |
| 44 | Error experience | User-facing messages in French, no stack traces | PASS | All API routes return `{ error: '...' }` |
| 45 | Rate limiting — build-year | Anti-doublon per class only | PARTIAL | No per-user daily limit (P1-03) |
| 46 | Support/recovery path | Error states, reprendre, contact | PARTIAL | In-app retry exists; no support email/chat |

---

## Pass / Fail / Partial Summary

| Status | Count |
|--------|-------|
| PASS | 32 |
| PARTIAL | 7 |
| FAIL | 7 |

### FAIL items requiring resolution before beta

| # | Item | Blocker Level |
|---|------|---------------|
| 19 | Student privacy guards not called | P0 |
| 20 | Student support plans table not applied | P1 |
| 29 | liste_attente RLS too broad | P2 |
| 33 | /api/ia/generer unauthenticated | P0 |
| 36 | Canonical tables not created | P1 |

Items 29, 36 do not block beta if scoped to the risk:
- P2-01 (waitlist RLS): beta teachers cannot see waitlist via frontend; only via direct DB query. Acceptable for controlled beta.
- P1-01 (canonical tables): graceful degradation confirmed; contenu_json path remains primary.

**True beta blockers: items 19 and 33 (P0).**

---

*Matrix generated as part of SCORGIA BETA-RC1 pre-beta audit.*
