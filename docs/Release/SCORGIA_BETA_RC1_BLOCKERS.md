# SCORGIA BETA-RC1 — Blockers & Issues

**Date:** 2026-08-20  
**Audited HEAD:** 519cba7  
**Auditor roles:** QA Architect · Staff Engineer · Security Reviewer · Privacy Reviewer

---

## P0 — MUST FIX BEFORE ANY EXTERNAL BETA USER

### P0-01 — Unauthenticated AI generation endpoint

| Field | Value |
|-------|-------|
| **ID** | P0-01 |
| **Severity** | P0 |
| **Route/Module** | `POST /api/ia/generer` |
| **File** | `src/app/api/ia/generer/route.ts` |
| **Beta Blocking** | YES |

**Description:**  
`/api/ia/generer` has no mandatory authentication guard. The quota check is wrapped in `if (profilQuota)`, which is only set when `getSession()` returns a valid session. An unauthenticated caller receives `profilQuota = null`, bypasses the quota check, and proceeds to full Claude Sonnet generation.

**Reproduction:**  
```
curl -X POST https://scorgia-*.vercel.app/api/ia/generer \
  -H "Content-Type: application/json" \
  -d '{"type_contenu":"plan_lecon","sujet":"test"}'
```
Expected: 401 Unauthorized.  
Actual: Claude Sonnet invoked, AI-generated content returned.

**Root cause:**  
`requireAuth()` is never called at the top of the route handler. Quota check via `getSession()` is non-blocking (wrapped in try/catch, result conditional).

**User impact:**  
Anyone can consume Claude API credits at ScorgIA's expense. Open beta = public API endpoint.

**Recommended action:**  
Add `requireAuth()` at the top of the handler, return 401 if not authenticated. One-line fix.

---

### P0-02 — Student privacy guards defined but never called in AI routes

| Field | Value |
|-------|-------|
| **ID** | P0-02 |
| **Severity** | P0 |
| **Route/Module** | `POST /api/ia/generer` + any future student AI routes |
| **File** | `src/lib/pedagogy/privacy/student-ai-context.ts`, `src/lib/pedagogy/privacy/ai-field-guards.ts` |
| **Beta Blocking** | YES |

**Description:**  
The student privacy architecture (V7.1) defines `buildSafeStudentAIContext()`, `generateStudentPseudonym()`, and `PROTECTED_FIELDS`. These are never imported or called in any API route. `/api/ia/generer` accepts `profils_eleves[]` with raw `profil_type`, `besoins`, `notes_enseignant` fields and passes them directly to Claude without pseudonymization or field guards.

**Reproduction:**  
Grep confirms: `buildSafeStudentAIContext`, `generateStudentPseudonym`, `PROTECTED_FIELDS` — only referenced within the privacy lib files themselves, not in any route.

**Root cause:**  
Privacy module was built (V7.1) but integration into the generation route was not completed.

**User impact:**  
Raw student notes/needs strings from the teacher's device are sent to Anthropic API without pseudonymization. Contradicts stated LPRPDE compliance on the signup page.

**Recommended action:**  
Before beta: filter `profils_eleves` through `buildSafeStudentAIContext()` before constructing the Claude prompt. Block `PROTECTED_FIELDS`. Minimum: remove raw notes from the generer prompt; full fix: wire the privacy module.

---

## P1 — SHOULD FIX BEFORE BETA

### P1-01 — Canonical pedagogical shadow-write targets non-existent tables

| Field | Value |
|-------|-------|
| **ID** | P1-01 |
| **Severity** | P1 |
| **Route/Module** | `POST /api/spie/build-year` → `shadowWriteCanonicalPedagogicalStructure()` |
| **File** | `src/lib/spie/canonical-shadow-write.ts` |
| **Beta Blocking** | NO (graceful degradation) |

**Description:**  
The build-year pipeline calls `shadowWriteCanonicalPedagogicalStructure()` which attempts to INSERT into `pedagogical_units`, `pedagogical_sequences`, `pedagogical_lessons`. Migration 044 (which creates these tables) is PROPOSED and has NOT been applied to production. Every build-year completes successfully (JSON stored in `programme_annuel.contenu_json`) but the shadow-write silently fails and logs `[SPIE_CANONICAL_SHADOW_WRITE_WARN]`. Future reads from canonical tables will find no data.

**User impact:**  
No visible user impact in beta (reads still use `contenu_json`). Misleading build logs. Canonical structures never persist.

**Recommended action:**  
Either: (A) Apply migration 044 before beta, or (B) disable the shadow-write call until 044 is applied. Recommend A for consistency with the architecture.

---

### P1-02 — Student support plans table not applied

| Field | Value |
|-------|-------|
| **ID** | P1-02 |
| **Severity** | P1 |
| **Route/Module** | `/dashboard/mon-annee/[classeId]/eleves/[eleveId]` |
| **File** | `supabase/migrations/042_student_support_foundation_PROPOSED.sql` |
| **Beta Blocking** | Partial — student list works, support plans do not persist |

**Description:**  
Migration 042 (`student_support_plans` table) is PROPOSED and not applied. The `eleves` table exists (from earlier migrations). Student lists load. But support plan persistence, intervention tracking, and structured plan storage fail silently.

**User impact:**  
Beta teachers seeing the student support section expect persistence. Plans may appear to save (client-optimistic) but are lost on reload.

**Recommended action:**  
Apply migration 042 before beta opens, OR clearly label the student support section as "À venir" to set expectations.

---

### P1-03 — No rate limiting on build-year beyond anti-doublon-per-class

| Field | Value |
|-------|-------|
| **ID** | P1-03 |
| **Severity** | P1 |
| **Route/Module** | `POST /api/spie/build-year` |
| **Beta Blocking** | NO |

**Description:**  
The anti-doublon check prevents concurrent builds on the same class. But a teacher with multiple classes, or a malicious actor with many accounts, can spam the endpoint. Each invocation runs 3–4 Claude Sonnet calls (programme, syllabus, première leçon) with `maxDuration: 300`.

**User impact:**  
Cost exposure during open beta. No beta user would hit this accidentally.

**Recommended action:**  
Add per-user build count limit in beta (e.g., max 3 builds/day/user). Implement as server-side check against teaching_packs count for the user.

---

### P1-04 — Landing page mobile horizontal overflow (pre-existing)

| Field | Value |
|-------|-------|
| **ID** | P1-04 |
| **Severity** | P1 |
| **Route/Module** | `/` |
| **File** | `src/app/page.tsx` |
| **Beta Blocking** | NO — dashboard beta teachers go directly to signup |

**Description:**  
Landing page nav/tabs horizontally overflow on common mobile widths (confirmed V7.6.1 audit, not fixed). Decorative blobs are contained. This is the marketing entry page; beta teachers use a direct invite link.

**Recommended action:**  
Audit and fix landing page responsive before public marketing launch. Not blocking for controlled beta (invite-only teachers bypass the landing page).

---

### P1-05 — Founder layout client-side role check only

| Field | Value |
|-------|-------|
| **ID** | P1-05 |
| **Severity** | P1 |
| **Route/Module** | `/founder/*` |
| **File** | `src/app/founder/layout.tsx` |
| **Beta Blocking** | NO — API routes are server-side gated |

**Description:**  
`/founder/layout.tsx` uses `useEffect` to check `profil.role` and redirects non-founders. This is client-side only: content briefly renders before the check completes. However, all `/api/founder/*` routes use `requireFounderOrAdmin()` server-side, so no data is exposed to unauthorized users via the API.

**User impact:**  
Brief flash of founder UI before redirect. No data leakage (API gated separately).

**Recommended action:**  
Add Next.js middleware or server-side redirect in a layout server component. Low urgency given API protection.

---

## P2 — ACCEPTABLE FOR CONTROLLED BETA

### P2-01 — liste_attente readable by any authenticated user

| Field | Value |
|-------|-------|
| **ID** | P2-01 |
| **Severity** | P2 |
| **File** | `supabase/schema.sql` line 296–297 |
| **Beta Blocking** | NO |

**Description:**  
```sql
CREATE POLICY "admin_read_liste_attente" ON liste_attente
  FOR SELECT USING (auth.uid() IS NOT NULL);
```
Any authenticated teacher can query `liste_attente` (waitlist emails). This is broader than intended; only founder/admin should read it.

**Recommended action:**  
Update policy to require `role IN ('founder', 'super_admin', 'admin')`.

---

### P2-02 — /api/ia/generer uses getSession() for quota (weaker than getUser())

| Field | Value |
|-------|-------|
| **ID** | P2-02 |
| **Severity** | P2 (will become N/A once P0-01 is fixed with requireAuth) |
| **Beta Blocking** | NO |

**Description:**  
Quota check uses `supabase.auth.getSession()` which reads the local cookie without server-side JWT verification. `requireAuth()` in `api-auth.ts` correctly uses `getUser()`. Once P0-01 is fixed, this is moot.

---

### P2-03 — Evaluations tab: no dedicated DB table

| Field | Value |
|-------|-------|
| **ID** | P2-03 |
| **Severity** | P2 |
| **Route/Module** | Mon Année → Évaluations tab |
| **Beta Blocking** | NO — displays from contenu_json |

**Description:**  
Upcoming evaluations are derived from `contenu_json.unites[].evaluation_prevue` strings. There is no dedicated `evaluations` table. Teachers cannot create/edit evaluations independently of the annual plan.

**Recommended action:**  
Document in beta product contract as "Beta/Partial". Address in V8.

---

### P2-04 — Password minimum 6 characters (Supabase default)

| Field | Value |
|-------|-------|
| **ID** | P2-04 |
| **Severity** | P2 |
| **Beta Blocking** | NO |

**Description:**  
`minLength={6}` on password field. Modern best practice is 8–12+. Supabase default is 6.

**Recommended action:**  
Increase to 8 minimum for beta. Low effort.

---

### P2-05 — No legal/privacy links on signup page

| Field | Value |
|-------|-------|
| **ID** | P2-05 |
| **Severity** | P2 |
| **Beta Blocking** | NO for private controlled beta |

**Description:**  
Signup page states "Conformité LPRPDE" but provides no link to a privacy policy or terms. For a controlled beta with invited teachers this is acceptable. Required before public launch.

---

## P3 — POST-BETA POLISH

| ID | Description | File |
|----|-------------|------|
| P3-01 | Inter font used in auth pages — design spec recommends Plus Jakarta Sans/Sora/Manrope | `signup/page.tsx`, `login/page.tsx` |
| P3-02 | Signup slogan "espace pédagogique gratuit" conflicts with invite-only messaging | `signup/page.tsx` line 84 |
| P3-03 | Dead routes (historique, ressources, studio, planification, communication) in filesystem — no visible harm but can be cleaned | various |
| P3-04 | Founder layout uses Inter-free system fonts; inconsistent with dashboard font system | `founder/layout.tsx` |
| P3-05 | Calendar: no direct link from annual plan pacing to calendar events | `/dashboard/calendrier` |

---

## Summary

| Severity | Count |
|----------|-------|
| P0 | 2 |
| P1 | 5 |
| P2 | 5 |
| P3 | 5 |

**P0 issues require resolution before any external beta teacher accesses production.**  
P0-01 (generer auth) is a one-line fix. P0-02 (privacy guards) requires routing the generer prompt through the privacy module.
