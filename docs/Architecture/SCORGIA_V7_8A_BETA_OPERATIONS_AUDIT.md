# SCORGIA V7.8A — Beta Operations Forensic Audit

**Date**: 2026-08-24  
**Status**: AUDIT ONLY — No code changes. No DB changes. No migrations applied.  
**Author**: Eddy Nwaha / SCORGIA Founder  
**Scope**: Full forensic inspection of beta operations infrastructure

---

## FINAL SUMMARY

```
BETA INFRASTRUCTURE:       PARTIAL — tables exist, product events missing
FOUNDER ROUTES:            PARTIAL — 19 pages, 9 server-protected APIs
BETA_INVITATIONS:          PARTIAL — schema good, lifecycle linkage broken
BETA_FEEDBACK:             PARTIAL — schema good, NO UI ENTRY POINT
BETA_LOGS:                 PARTIAL — wired for errors only, not product events
LAST ACTIVITY SIGNAL:      MISSING (derniere_connexion not reliably updated)
FUNNEL OBSERVABILITY:      7 / 12 STAGES OBSERVABLE
FIRST VALUE:               Build My Year completed OR first IA generation
ERROR OBSERVABILITY:       PARTIAL
PRIVACY:                   PASS with notes
RLS:                       PARTIAL — activity_events not founder-readable
FOUNDER RBAC:              FAIL — layout.tsx is client-only guard (P1)
NEW EVENT TABLE REQUIRED:  YES (beta_events)
MIGRATION REQUIRED V7.8B:  YES (1 small migration)
```

---

## MISSION 0 — CURRENT SYSTEM INVENTORY

### Tables confirmed in schema

| Table | Purpose | RLS | Founder readable |
|-------|---------|-----|-----------------|
| `utilisateurs` | Teacher profiles | ✓ (own row) | ✓ (service_role) |
| `classes` | Teacher classes | ✓ (own) | ✓ |
| `teaching_packs` | Build My Year packs | ✓ (own) | ✓ |
| `programme_annuel` | Annual programs | ✓ (own) | ✓ |
| `teaching_events` | Lesson taught log | ✓ (own) | ✓ |
| `lecons` | Lesson plans | ✓ (own) | ✓ |
| `generations_ia` | AI generation history | ✓ (own) | ✓ |
| `beta_invitations` | Beta invite lifecycle | ✓ (founder/admin only) | ✓ |
| `beta_feedback` | User feedback | ✓ (admin read, auth insert) | ✓ |
| `beta_logs` | Client error logs | ✓ (admin/founder read) | ✓ |
| `audit_trail` | Admin action log | ✓ (founder/admin read) | ✓ |
| `scorgia_roles` | Role definitions | Public read | ✓ |
| `activity_events` | Pedagogical events | ✓ (teacher-scoped ONLY) | ✗ BLOCKED |
| `legal_consents` | Consent records | PROPOSED — not applied | — |

### Key columns on `utilisateurs` (assembled from all migrations)

```
id, user_id, prenom, nom, email, ecole, type_compte, langue, bio,
matiere, niveau_enseignement, annees_exp, certifications,
style_enseignement, instructions_perso, ia_config,
ville, province, pays, telephone, profil_ia,
is_admin, onboarding_complete, onboarding_complete_v2, onboarding_etape,
onboarding_cascade_complete, palier_scolaire, forfait, role,
gabarit_lecon_url, gabarit_lecon_analyse, menus_debloque,
est_actif (*), derniere_connexion (*)
created_at
```

> (*) `est_actif` and `derniere_connexion` are used by founder pages but DO NOT appear in any migration file. They exist in production via out-of-band addition. **Schema drift — these columns are not version-controlled.**

### Analytics / tracking tools

- **PostHog**: NOT INSTALLED  
- **Sentry**: NOT INSTALLED  
- **Mixpanel / Amplitude**: NOT INSTALLED  
- **Vercel Analytics / Speed Insights**: NOT INSTALLED  
- **Custom `logger.ts`**: INSTALLED — sends `warn`/`error` to `beta_logs` via `/api/beta/log`  
- **Global error capture**: INSTALLED — `installGlobalErrorCapture()` catches unhandled JS errors  
- **Product event tracking**: NOT INSTALLED — no "dashboard opened", "class created" events

---

## MISSION 1 — FOUNDER SURFACES

| Route | Purpose | Server guard | Client guard | Beta relevance | Status |
|-------|---------|-------------|-------------|----------------|--------|
| `/founder` | Platform overview (KPIs, feed) | ✗ | ✓ layout.tsx | HIGH | PARTIAL |
| `/founder/beta` | Invitation management + waitlist | `/api/founder/beta` ✓ | ✓ | CRITICAL | PARTIAL |
| `/founder/utilisateurs` | User list, role/forfait edit | `/api/founder/users` ✓ | ✓ | HIGH | PARTIAL |
| `/founder/analytics` | IA usage, at-risk users | ✗ | ✓ | HIGH | PARTIAL |
| `/founder/audit` | Audit trail + impersonation log | ✗ | ✓ | MEDIUM | PARTIAL |
| `/founder/bi` | Business intelligence dashboard | ✗ | ✓ | MEDIUM | PARTIAL |
| `/founder/roadmap` | Product roadmap | `/api/founder/roadmap` ✓ | ✓ | LOW | PARTIAL |
| `/founder/finances` | Billing overview | ✗ | ✓ | LOW | UNUSED |
| `/founder/deployment` | Deploy logs | `/api/founder/deployment` ✓ | ✓ | LOW | UNUSED |
| `/founder/monitoring` | System monitoring | ✗ | ✓ | LOW | UNUSED |
| `/founder/notifications` | Founder notifications | `/api/founder/notifications` ✓ | ✓ | LOW | PARTIAL |
| `/founder/ia` | IA management | ✗ | ✓ | MEDIUM | PARTIAL |
| `/founder/contenu` | Content management | ✗ | ✓ | LOW | UNUSED |
| `/founder/produits` | Products list | `/api/founder/products` ✓ | ✓ | LOW | PARTIAL |
| `/founder/company` | Company info | `/api/founder/company` ✓ | ✓ | LOW | PARTIAL |
| `/founder/infrastructure` | Infrastructure view | ✗ | ✓ | LOW | UNUSED |
| `/founder/vision` | Founder vision doc | ✗ | ✓ | LOW | UNUSED |
| `/founder/parametres` | Founder settings | ✗ | ✓ | LOW | PARTIAL |
| `/founder/audit` | Audit trail | ✗ | ✓ | MEDIUM | PARTIAL |

**Critical finding**: `/founder/layout.tsx` uses a **client-side `useEffect` guard only**. The server does not reject unauthorized requests before hydration. Pages load HTML before the check completes. API routes that serve data do have server-side checks, but the pages themselves are not server-protected.

**For beta operations**, the most relevant pages are:
- `/founder/beta` — invitation lifecycle (needs: activation signal, user linkage)
- `/founder/utilisateurs` — user list (needs: reliable last activity)
- `/founder/analytics` — usage (needs: per-feature breakdown)

No existing founder page can answer: "who used Build My Year this week?" or "who abandoned at onboarding step 3?"

---

## MISSION 2 — BETA INVITATION FUNNEL

### Schema (migration 032 + 035 fix)

```sql
beta_invitations (
  id, email, code, utilisateur_id,
  statut CHECK IN ('en_attente','envoyee','acceptee','expiree','annulee'),
  expire_at, sent_at, activated_at, notes, created_by, created_at
)
```

### Lifecycle mapping

| Stage | Field | Who sets it | Automatic? |
|-------|-------|-------------|------------|
| Invitation created | `created_at` | Founder via UI | ✓ |
| Invitation sent | `sent_at` | Founder sets statut → 'envoyee' | ✗ MANUAL |
| User accepted | `statut='acceptee'`, `activated_at` | Founder via PATCH | ✗ MANUAL |
| Account created | — | Not linked automatically | ✗ MISSING |
| User linked | `utilisateur_id` | Never set automatically | ✗ MISSING |

### Critical gaps

1. **No automatic acceptance detection**: When a user signs up with the invited email, `beta_invitations` is not updated automatically. `activated_at` is set manually by the founder when they change the status dropdown.
2. **No invitation-to-account linkage**: `utilisateur_id` on `beta_invitations` is never populated by the signup flow.
3. **No `signup_at` field**: The moment the user created their account is not recorded on the invitation.
4. **Manual lifecycle only**: The entire invitation funnel relies on the founder manually updating statuses.

---

## MISSION 3 — USER ACTIVATION LADDER

| Level | Label | Definition | Observable? |
|-------|-------|-----------|------------|
| A0 | Invited | Invitation created in DB | ✓ `beta_invitations.created_at` |
| A1 | Sent | Invitation email sent | ✓ `beta_invitations.sent_at` (manual) |
| A2 | Account created | User signed up | ✓ `utilisateurs.created_at` |
| A3 | Dashboard reached | Opened dashboard for first time | ✗ Not tracked |
| A4 | Onboarding complete | Set `onboarding_complete=true` | ✓ `utilisateurs.onboarding_complete` |
| A5 | Class created | First class in `classes` | ✓ via `classes` JOIN |
| A6 | First IA action | First `generations_ia` row | ✓ via `generations_ia` JOIN |
| A7 | First value | Build My Year pack completed | ✓ `teaching_packs.statut='pret'` |
| A8 | Return visit | Second session after first | ✗ Not tracked |

**Currently observable without new tracking: A0, A1, A2, A4, A5, A6, A7**  
**Not observable: A3 (dashboard reached), A8 (return visit)**

---

## MISSION 4 — EXISTING DATA FOR ACTIVITY INFERENCE

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| Account created | `utilisateurs.created_at` | HIGH | ✓ reliable |
| Invitation sent | `beta_invitations.sent_at` | MEDIUM | Set manually by founder |
| Invitation accepted | `beta_invitations.activated_at` | LOW | Manually set, not automatic |
| Onboarding complete | `utilisateurs.onboarding_complete` | HIGH | Set by app on "Go to dashboard" |
| Class created | `classes.created_at` | HIGH | ✓ reliable business fact |
| Teaching pack created | `teaching_packs.created_at` | HIGH | Build My Year started |
| Teaching pack completed | `teaching_packs.statut='pret'` | HIGH | Build My Year done |
| AI generation | `generations_ia.created_at` | HIGH | ✓ direct signal |
| Lesson taught | `teaching_events.created_at` | HIGH | Pedagogical event |
| Error encountered | `beta_logs.created_at WHERE level='error'` | MEDIUM | Client-side only |

**No table has `updated_at` or `last_seen` or `last_login` populated by the app.**

`utilisateurs.derniere_connexion` exists in the code but:
- Not found in any migration file (schema drift)
- No code path that writes to it was found
- Currently `null` for all beta users unless manually set

---

## MISSION 5 — LAST ACTIVITY SIGNAL

| Source | Reliability | Notes |
|--------|-------------|-------|
| `utilisateurs.derniere_connexion` | UNSAFE / MISLEADING | Column exists in prod but never written by app code. Always null unless manually set. |
| `auth.last_sign_in_at` | APPROXIMATE | Supabase auth table — not exposed via public schema queries. Requires service_role lookup. Not surfaced in founder dashboard. |
| `generations_ia.created_at` | APPROXIMATE | Only captures IA usage, not general activity. A teacher who browses without generating IA is invisible. |
| `beta_logs.created_at` | APPROXIMATE | Only errors/warnings. Underestimates activity. |
| `teaching_events.created_at` | APPROXIMATE | Only lesson teaching activity. |
| `classes.created_at` | APPROXIMATE | Only class creation moment. |
| `audit_trail.created_at` | APPROXIMATE | Only founder/admin actions, not teacher activity. |

**Verdict**: ScorgIA currently has NO reliable automatic last-activity signal for regular teacher sessions. The only accurate source is `auth.last_sign_in_at` (via Supabase auth), which requires a service_role lookup and is not currently surfaced anywhere.

---

## MISSION 6 — BETA_LOGS AUDIT

### Schema
```sql
beta_logs (
  id, level CHECK IN ('debug','info','warn','error'),
  tag, message, data JSONB, page_url, utilisateur_id, created_at
)
```

### Who writes to it?
- `src/lib/logger.ts` — client-side logger, sends `warn`/`error` to `/api/beta/log`
- `installGlobalErrorCapture()` — captures unhandled JS errors and promise rejections
- No server-side routes write to `beta_logs`

### Current event types observed
Only technical error/warning logs. No structured product events. No event names like `dashboard_opened`.

### Assessment

| Criterion | Finding |
|-----------|---------|
| Is it used? | YES — logger.ts is wired and functional |
| Event types | ERROR/WARN only — not product events |
| Sensitive payloads | LOW RISK — `data` JSONB is unstructured. Some routes log error context. |
| Student data | NOT FOUND — no student names/IDs in any logger call reviewed |
| RLS enabled | ✓ YES |
| Beta users can write | NO — writes via service_role through API route |
| Beta users can read | NO — read restricted to founder/super_admin/admin |
| Cross-user exposure | NONE — no user can read other users' logs |
| Founder-readable | YES via RLS policy |
| Useful for product analytics | NO — it captures errors, not product funnels |

**STATUS: PARTIAL** — Works as error log, useless as product event store.

---

## MISSION 7 — BETA_FEEDBACK AUDIT

### Schema
```sql
beta_feedback (
  id, utilisateur_id,
  type CHECK IN ('bug','idea','remark','rating'),
  titre, description, page_url, feature_note (1-5),
  statut CHECK IN ('nouveau','en_traitement','resolu','ferme'),
  created_at
)
```

### Assessment

| Criterion | Finding |
|-----------|---------|
| Schema adequate | PARTIAL — missing `classe_id`, `context`, `version`, `severity` |
| Category coverage | PARTIAL — 'bug','idea','remark','rating' — no "Je suis bloqué", no "Je ne comprends pas" |
| User linkage | ✓ `utilisateur_id` → `utilisateurs(id)` |
| Class linkage | ✗ MISSING — no `classe_id` |
| Page/context | ✓ `page_url` present |
| UI entry point | ✗ NOT FOUND — no "Donner mon avis" button in dashboard, onboarding, Mon Année, Préparer |
| Founder read | ✓ via RLS policy (migration 035) |
| RLS (write) | ✓ any authenticated user can INSERT |
| Can users submit? | API-wise YES, but NO UI exists to do so |
| Student PII risk | LOW — free text fields `titre`/`description` could theoretically contain sensitive context |

**STATUS: PARTIAL** — Table and RLS are ready. No UI entry point exists. No feedback has been collected.

---

## MISSION 8 — PROPOSED PRODUCT EVENT TAXONOMY

These are PROPOSED events only. Not implemented.

| Event | When | Why it matters | Minimum payload | Forbidden | Source | Reliability |
|-------|------|----------------|-----------------|-----------|--------|------------|
| `beta_dashboard_entered` | User lands on /dashboard for first time | Funnel F3 — converts A2→A3 | user_id, timestamp, is_first_visit | Content, class data | Client | MEDIUM |
| `beta_onboarding_step_completed` | Each step completed | Where users drop off | user_id, step_name, duration_ms | Form values | Client | HIGH |
| `beta_class_created` | Class created in DB | Funnel F5 | user_id, class_count_after, timestamp | Class name | Server | HIGH |
| `beta_build_year_started` | Teaching pack created | Funnel F6 | user_id, pack_id, timestamp | Curriculum content | Server | HIGH |
| `beta_build_year_completed` | Pack statut → 'pret' | First value achieved | user_id, pack_id, duration_ms | — | Server | HIGH |
| `beta_ai_generation` | AI generation completed | Feature usage | user_id, type_contenu, success, duration_ms | Prompt, generated content | Server | HIGH |
| `beta_prepare_opened` | User opens Préparer section | Feature awareness | user_id, route, timestamp | — | Client | MEDIUM |
| `beta_mon_annee_opened` | User opens Mon Année | Feature awareness | user_id, timestamp | — | Client | MEDIUM |
| `beta_feedback_submitted` | User submits feedback | Engagement signal | user_id, feedback_type, route | Description text | Server | HIGH |
| `beta_error_seen` | Error displayed in UI | User impact | user_id, error_code, route | Stack trace | Client | MEDIUM |
| `beta_return_visit` | Session after >24h gap | Retention signal | user_id, days_since_first, timestamp | — | Server | MEDIUM |
| `beta_teaching_event_created` | Lesson marked taught | Advanced engagement | user_id, pack_id, lesson_count | Lesson content | Server | HIGH |

---

## MISSION 9 — PRIVACY BY DESIGN

### Prohibited data in analytics events

- Student names, student IDs (except as opaque count)
- Student diagnoses, intervention plans
- Lesson body text, curriculum document content
- Teacher personal notes and annotations
- AI prompts and generated content
- Passwords, tokens, API keys
- IP addresses / device fingerprints (unless separately approved)
- Email addresses (use internal `user_id` instead)
- File contents of uploaded curriculum documents

### Permitted data

- Internal `user_id` (UUID — not email)
- Event name + timestamp
- Route (URL path, not query string if it contains IDs)
- Success/failure boolean
- Error code (not stack trace in payload)
- Count metrics (class_count, lesson_count)
- Duration in milliseconds
- Feature name (abstracted, not content)

### Notes

- `beta_feedback.description` is free text — founders must be aware that teachers might include student context. Founders should not share this externally.
- `beta_logs.data` JSONB is unstructured — ensure logger calls never include lesson/student data.

---

## MISSION 10 — FOUNDER COMMAND CENTER DESIGN

See `SCORGIA_V7_8A_FOUNDER_COMMAND_CENTER_BLUEPRINT.md` for the full IA.

Short summary of sections:

| Section | Key metrics | Data source |
|---------|------------|-------------|
| A — Beta overview | Invited / Accepted / Activated / Active / Inactive | beta_invitations + utilisateurs |
| B — Funnel | F0→F8 conversion rates | Mixed tables |
| C — Teacher status table | Per-teacher activation ladder + last signal | Mixed |
| D — Feedback | Bug / Blocked / Suggestion / Positive | beta_feedback |
| E — Errors | Top errors, affected users, affected routes | beta_logs |
| F — Feature usage | Build My Year, Préparer, Mon Année, IA | business tables |

---

## MISSION 11 — BETA HEALTH STATUS MODEL

Proposed deterministic status model (thresholds require PO approval):

| Status | Rule |
|--------|------|
| `ACTIVE` | Meaningful action (class created / IA generation / lesson taught / teaching pack progressed) in last 7 days |
| `AT_RISK` | Onboarding complete but no first value event in 5 days |
| `BLOCKED` | Feedback marked 'bug' with no 'resolu' status + no activity in 2 days |
| `INACTIVE` | No activity signal in 14 days after A4 (onboarding complete) |
| `INVITED` | Invitation sent, account not yet created |
| `PENDING_SETUP` | Account created, onboarding not complete |

No AI scoring. Rules are explicit and auditable.

---

## MISSION 12 — FUNNEL DEFINITIONS

| Stage | Label | Existing signal | Missing signal | Reliability |
|-------|-------|----------------|----------------|------------|
| F0 | Invitation created | `beta_invitations.created_at` | — | HIGH |
| F1 | Invitation sent | `beta_invitations.sent_at` | — | MEDIUM (manual) |
| F2 | Account created | `utilisateurs.created_at` | Linkage to invitation | HIGH |
| F3 | Dashboard reached | — | `beta_dashboard_entered` event | MISSING |
| F4 | Onboarding complete | `utilisateurs.onboarding_complete` | — | HIGH |
| F5 | Class created | `classes.created_at` JOIN | — | HIGH |
| F6 | First IA generation | `generations_ia` JOIN | — | HIGH |
| F7 | Build My Year started | `teaching_packs.created_at` JOIN | — | HIGH |
| F8 | Build My Year complete | `teaching_packs.statut='pret'` | — | HIGH |
| F9 | Lesson prepared | `lecons.created_at` JOIN | — | HIGH |
| F10 | Mon Année engaged | — | `beta_mon_annee_opened` event | MISSING |
| F11 | Return visit | — | Session gap detection needed | MISSING |

**7 of 12 stages observable from existing data. 3 stages fully missing.**

---

## MISSION 13 — FIRST VALUE DEFINITION

**Recommended primary "first value" metric:**

> **Build My Year pack reaches `statut='pret'`** (i.e., a complete annual plan was generated and is ready for teaching)

Rationale: This is ScorgIA's primary promise. A teacher who has completed Build My Year has received the core differentiating value proposition of the platform.

**Secondary "first value" metric:**

> **First AI generation completed** (`generations_ia` row created)

Rationale: Faster to achieve than Build My Year, captures "aha moment" for teachers who start with Préparer.

**Not "first value":**
- Account created (A2) — no product value delivered
- Onboarding complete (A4) — administrative, not pedagogical
- Dashboard reached (A3) — exploratory, not value

---

## MISSION 14 — ERROR OBSERVABILITY

### Current state

| Mechanism | Captures | Founder-visible | Notes |
|-----------|---------|-----------------|-------|
| `beta_logs` (client) | JS errors, unhandled rejections | YES via `/founder` KPI | Only client errors |
| Vercel logs | Server errors, 5xx, API crashes | YES via Vercel dashboard | Not in app |
| API route try/catch | Caught server errors | NO — not logged to any table | Errors returned to client only |
| User-facing error messages | What user sees | NO — not tracked | |

### Can founder answer: "Who saw Build My Year failures this week?"

**NO.** Current system cannot answer this question.

Missing infrastructure:
1. Server-side routes do not write structured error events to `beta_logs` or any table
2. No `event_name` field on `beta_logs` — all logs are unstructured text
3. No linkage between error and specific feature/route in structured form
4. No "error rate by route" view in founder surfaces

Minimum missing event:
```json
{
  "event": "beta_error_seen",
  "user_id": "<uuid>",
  "route": "/dashboard/classes/[id]/programme",
  "error_code": "SPIE_BUILD_FAILED",
  "timestamp": "..."
}
```

---

## MISSION 15 — FEEDBACK UX (PROPOSED, NOT IMPLEMENTED)

Proposed "Donner mon avis" entry point:

**Location**: Floating button available from:
- `/dashboard` (after 30s on page)
- `/dashboard/mon-annee`
- `/dashboard/gerer/preparer`
- Any page after an error is displayed

**Feedback types** (proposed — more actionable than current 'bug'/'idea'/'remark'/'rating'):
- `bug` — "Quelque chose ne fonctionne pas"
- `blocked` — "Je suis bloqué"
- `confused` — "Je ne comprends pas"
- `suggestion` — "J'ai une suggestion"
- `positive` — "J'aime cette fonctionnalité"

**Auto-attached** (read from session, no user input):
- `user_id` (internal UUID)
- `route` (current URL path)
- `app_commit` (if available from env var)
- `timestamp`
- `feedback_type`

**Never auto-attached**:
- Page content, lesson text, student data
- Email or name

---

## MISSION 16 — BETA COHORT AGGREGATE (READ-ONLY)

Data derivable from current DB without exposing emails:

| Metric | Source | Value (approximate — requires live query) |
|--------|--------|------------------------------------------|
| Invitations created | `beta_invitations` | Visible to founder in /founder/beta |
| Invitations sent | `beta_invitations WHERE sent_at IS NOT NULL` | Visible |
| Accounts created | `utilisateurs WHERE role='beta'` | Query available |
| Onboarding complete | `utilisateurs WHERE role='beta' AND onboarding_complete=true` | Query available |
| Classes created | `classes` JOIN `utilisateurs WHERE role='beta'` | Derivable |
| No classes | Users with role='beta' and 0 classes | Derivable |
| First IA action detectable | `generations_ia` JOIN beta users | Derivable |
| Build My Year complete | `teaching_packs WHERE statut='pret'` JOIN beta users | Derivable |
| Feedback submitted | `beta_feedback` JOIN beta users | Derivable |

Exact counts not provided here — requires live Supabase query. Queries designed to show aggregates only, no individual PII in this document.

---

## MISSION 17 — SECURITY: FOUNDER RBAC

### Layout guard
```typescript
// src/app/founder/layout.tsx
useEffect(() => {
  const check = async () => {
    // client-side fetch of user profile
    const isAuthorized = profil?.role === 'founder' || profil?.role === 'super_admin' || profil?.is_admin === true
    if (!isAuthorized) { router.replace('/dashboard') }
  }
  check()
}, [router])
```

**FINDING: CLIENT-ONLY GUARD — P1 SECURITY ISSUE**

The layout renders the HTML and begins hydrating before the authorization check completes. A technically savvy user could:
- Disable JavaScript and view raw HTML
- Intercept the rendered content before redirect fires
- Access the page briefly before redirect

**API routes are properly server-guarded** — data APIs (`/api/founder/*`) do server-side verification before returning data. But the pages themselves are not.

**Required fix for V7.8B**: Add a Next.js middleware or server component guard for `/founder/*` routes.

---

## MISSION 18 — RLS AUDIT

### beta_invitations (migration 035)
- SELECT: founder, super_admin, admin, beta_manager — ✓
- INSERT: same roles — ✓ WITH CHECK present
- UPDATE: same roles — ✓ WITH CHECK present
- DELETE: same roles (implied by FOR ALL) — ✓
- Beta teachers: CANNOT access — ✓
- Cross-user exposure: NONE ✓

### beta_feedback (migration 035)
- SELECT: founder, super_admin, admin, beta_manager — ✓
- INSERT: any `auth.uid() IS NOT NULL` — ✓ intended (users submit feedback)
- UPDATE: admin+ only — ✓ WITH CHECK present
- DELETE: blocked (no policy) — ✓
- Beta teachers: can INSERT own feedback, CANNOT read others — ✓
- Cross-user exposure: NONE ✓

### beta_logs (migration 035)
- SELECT: founder, super_admin, admin ONLY (not beta_manager) — ✓
- INSERT: no RLS policy — writes via service_role through `/api/beta/log` — ✓
- Beta teachers: CANNOT read any logs — ✓
- Cross-user exposure: NONE ✓

### activity_events (migration 026)
- SELECT: teacher sees own events only — ✓ for user privacy
- No founder-level read policy — **LIMITATION**: founder cannot query activity across users
- This makes it unusable as a product analytics store without a founder-read policy

**Overall RLS: PASS for privacy. PARTIAL for founder observability (activity_events blocked).**

---

## MISSION 19 — QUERY ARCHITECTURE

For current beta scale (< 50 users), recommended approach:

- **Direct aggregate SQL via service_role** — sufficient for current scale
- **Server route per metric** — `/api/founder/beta-metrics` with service_role
- **No caching needed** at < 50 users; add Redis/KV cache at 500+
- **No N+1** — use JOINs or aggregate subqueries, not per-user loops
- **No Supabase RPC needed** — simple selects with JOINs are readable and maintainable

Example query pattern for funnel:
```sql
SELECT
  COUNT(*) FILTER (WHERE role = 'beta') AS total_beta_users,
  COUNT(*) FILTER (WHERE role = 'beta' AND onboarding_complete = true) AS onboarding_done,
  COUNT(DISTINCT c.enseignant_id) FILTER (WHERE u.role = 'beta') AS created_class
FROM utilisateurs u
LEFT JOIN classes c ON c.enseignant_id = u.id
```

---

## MISSION 20 — SCHEMA GAP ANALYSIS

**Outcome: C — New `beta_events` table needed**

Existing `beta_logs` is designed for errors, not product events. Mixing product analytics into it would degrade both systems.

Existing `activity_events` is teacher-scoped and pedagogically focused; re-purposing it for product analytics would require RLS changes and semantic confusion.

**Proposed minimal schema** (for V7.8B — DO NOT CREATE NOW):

```sql
CREATE TABLE beta_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  event        TEXT NOT NULL,   -- e.g. 'beta_class_created'
  route        TEXT,
  properties   JSONB NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Founder can read all events
CREATE POLICY "founder_read_beta_events" ON beta_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs u
      WHERE u.user_id = auth.uid()
        AND (u.role IN ('founder','super_admin','admin') OR u.is_admin = true))
  );

-- No direct user read — events are internal analytics
-- All writes via service_role from server routes
```

---

## MISSION 21 — EVENT SOURCE OF TRUTH

### Business facts (DO NOT duplicate as analytics events)

These already exist and are the source of truth:

| Fact | Table | Use as |
|------|-------|--------|
| Class created | `classes.created_at` | F5 funnel stage |
| Teaching pack created | `teaching_packs.created_at` | F7 funnel stage |
| Teaching pack complete | `teaching_packs.statut='pret'` | First value |
| Lesson taught | `teaching_events` | Advanced engagement |
| AI generation | `generations_ia` | Feature usage |

### Analytics events (need new system)

These cannot be derived from business facts:

| Event | Why it can't be derived |
|-------|------------------------|
| Dashboard entered (first time) | No timestamp of first navigation |
| Return visit | No session model |
| Mon Année opened | No row created on open |
| Préparer opened | No row created on open |
| Error seen by user | Server errors not logged to DB |

---

## MISSION 22 — DATA RETENTION POLICY (PROPOSED)

| Category | Proposed retention | Notes |
|----------|-------------------|-------|
| `utilisateurs` (profile) | Indefinite (until account deleted) | Business record |
| `classes`, `lecons`, `teaching_packs` | Indefinite | Business records |
| `beta_events` (analytics) | 2 years post-beta | Analytics, not business |
| `beta_logs` (error logs) | 6 months | Technical logs |
| `beta_feedback` | Indefinite | Product insights |
| `audit_trail` | 5 years | Legal / compliance |
| `legal_consents` | 7 years (when applied) | Legal requirement |

---

## MISSION 23 — PERFORMANCE PROJECTIONS

| Scale | Architecture | Notes |
|-------|-------------|-------|
| Current (< 10 users) | Direct SQL queries | No optimization needed |
| 50 users | Direct SQL + simple indexes | Add index on `beta_events(user_id, occurred_at)` |
| 500 users | Aggregate materialized views or scheduled summaries | Cache founder dashboard data |
| 5000+ users | Dedicated analytics pipeline (ClickHouse, BigQuery, or PostHog) | Do not over-engineer now |

Current architecture is appropriate. Revisit at 100 beta users.

---

## MISSION 24 — FOUNDER WEEKLY BRIEF (DESIGN)

Proposed automated weekly summary structure:

```
SCORGIA Beta Weekly Brief — Week of [DATE]

ACTIVATION THIS WEEK
  New accounts: X
  Completed onboarding: X
  Created first class: X
  Completed Build My Year: X

ENGAGEMENT
  Active users (any action): X / Y total beta
  AI generations: X
  Teaching events logged: X

BLOCKERS
  1. [Top error or feedback category]
  2. [Second blocker]
  3. [Third blocker]

REQUESTED IMPROVEMENTS
  1. [Top suggestion/idea from beta_feedback]
  2. [Second suggestion]
  3. [Third suggestion]

HEALTH
  AT_RISK users (activated but no first value): X
  INACTIVE users (>14 days no activity): X
```

Generated deterministically from DB queries. No AI interpretation.

---

## MISSION 25 — BETA SUCCESS METRICS (5–8)

| # | Metric | Formula | Target (beta) |
|---|--------|---------|---------------|
| 1 | Invitation → Signup | `utilisateurs(role='beta')` / invitations sent | > 80% |
| 2 | Signup → Onboarding complete | onboarding_complete / signups | > 90% |
| 3 | Onboarding → First class | classes created / onboarding complete | > 70% |
| 4 | Time to first value | Median days from signup to `teaching_packs.statut='pret'` | < 7 days |
| 5 | Build My Year completion rate | packs `statut='pret'` / packs created | > 60% |
| 6 | 7-day return rate | Users with activity in week 2 / users in week 1 | > 50% |
| 7 | Feedback submission rate | beta_feedback rows / active users | > 30% |
| 8 | Blocking error rate | `beta_feedback WHERE type='blocked'` / active users | < 10% |

---

## MISSION 26 — DECISION FRAMEWORK

| Trigger | Action |
|---------|--------|
| > 2 users blocked at same funnel stage | FIX NOW |
| > 20% of cohort has no first value after 7 days | FIX NOW |
| A single teacher reports a crash reproducibly | FIX NOW |
| `beta_logs` errors > 50/day from same route | FIX NOW |
| 1 cosmetic complaint | WATCH |
| 1 suggestion (feature request) | WATCH, add to roadmap |
| Single user preference (not a bug) | POST-BETA |
| Feature not yet used by anyone | WATCH (don't remove, measure first) |

---

## MISSION 27 — DOCUMENTATION

Created in this sprint:

1. `docs/Architecture/SCORGIA_V7_8A_BETA_OPERATIONS_AUDIT.md` (this file)
2. `docs/Product/SCORGIA_V7_8A_BETA_METRICS.md`
3. `docs/Product/SCORGIA_V7_8A_FOUNDER_COMMAND_CENTER_BLUEPRINT.md`
4. `docs/Release/SCORGIA_V7_8A_REPORT.md`

---

## TOP 10 GAPS

1. **No product event tracking** — funnel stages F3 (dashboard entered), F10 (Mon Année), F11 (return visit) are invisible
2. **Founder layout is client-only guard** — P1 security: `/founder/*` HTML rendered before auth check
3. **`derniere_connexion` is unreliable** — referenced everywhere but never written by app code
4. **Beta invitation lifecycle is manual** — `activated_at` set by founder, not automatically on signup
5. **No invitation → account linkage** — `beta_invitations.utilisateur_id` never populated automatically
6. **No feedback UI** — `beta_feedback` table ready, no "Donner mon avis" button exists
7. **`activity_events` not founder-readable** — teacher-scoped RLS blocks cross-user analytics
8. **`est_actif` / `derniere_connexion` schema drift** — columns used in code but not in any migration file
9. **No structured error events per feature** — can't answer "who saw Build My Year failures this week?"
10. **No return visit / session model** — cannot measure 7-day retention without additional signal

---

## RECOMMENDED V7.8B SCOPE

1. Add middleware/server guard for `/founder/*` routes (SECURITY — P1)
2. Create `beta_events` table with migration (1 migration)
3. Instrument 4 server-side events: `beta_class_created`, `beta_build_year_started`, `beta_build_year_completed`, `beta_ai_generation`
4. Instrument 2 client-side events: `beta_dashboard_entered`, `beta_return_visit`
5. Add founder-read policy to `activity_events`
6. Wire `beta_invitations.utilisateur_id` automatically on signup
7. Add `beta_dashboard_entered` server route to update `derniere_connexion` via `auth.last_sign_in_at`
8. Add "Donner mon avis" feedback widget with 5 beta categories
9. Build `/founder/beta-command` page using existing data + new events

---

```
CODE CHANGES:    NONE
DATABASE CHANGES: NONE
MIGRATIONS:      NONE
COMMIT:          NONE
PUSH:            NO

FINAL RECOMMENDATION: A — READY TO DESIGN V7.8B

STOP. WAIT FOR PRODUCT OWNER.
```
