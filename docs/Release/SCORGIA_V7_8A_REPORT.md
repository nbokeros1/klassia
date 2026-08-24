# SCORGIA V7.8A — Beta Operations Audit Report

**Date**: 2026-08-24  
**Sprint type**: FORENSIC AUDIT — No code changes  
**Author**: Eddy Nwaha  
**Status**: COMPLETE — Waiting for PO go/no-go on V7.8B

---

## What V7.8A Is

V7.8A is a forensic audit sprint. Its sole output is documentation.  
No code was modified. No migrations were applied. No data was changed.

The audit inspects 27 missions covering: invitation lifecycle, user activation, last activity signals, founder surfaces, RLS, privacy, funnel observability, feedback infrastructure, error observability, and schema gaps.

---

## SCORGIA V7.8A — FINAL REPORT

### CURRENT BETA INFRASTRUCTURE

```
Tables active:
  beta_invitations    — invitation lifecycle
  beta_feedback       — user feedback (no UI yet)
  beta_logs           — client error logs (functional)
  audit_trail         — admin action log
  scorgia_roles       — role definitions
  utilisateurs        — teacher profiles (+ role, forfait, onboarding fields)
  classes             — teacher classes
  teaching_packs      — Build My Year packs
  programme_annuel    — annual programs
  teaching_events     — lesson taught events (append-only)
  generations_ia      — AI generation history
  activity_events     — pedagogical events (teacher-scoped, founder-BLOCKED)

Proposed tables (NOT applied):
  legal_consents      — migration 046, waiting PO go
  beta_events         — not yet created, needed for V7.8B
```

### FOUNDER ROUTES

19 pages in `/founder/*`. Of these:
- 9 have server-protected data APIs (`/api/founder/*`)
- All 19 rely on client-side layout guard only
- Most beta-relevant: `/founder/beta`, `/founder/utilisateurs`, `/founder/analytics`
- Most beta-critical gap: no unified Beta Command Center page

### BETA_INVITATIONS

**PARTIAL**

- Schema complete (statuses: en_attente, envoyee, acceptee, expiree, annulee)
- Timestamps: `created_at` ✓, `sent_at` ✓ (manual), `activated_at` ✓ (manual), `expire_at` ✓
- Gap: `utilisateur_id` never auto-populated on signup
- Gap: no `signup_at` field
- Gap: lifecycle is entirely manual — founder updates status in dropdown

### BETA_FEEDBACK

**PARTIAL**

- Schema exists (type: bug/idea/remark/rating — incomplete for beta)
- RLS: correct (admin read, any auth user insert)
- Founder UI: visible in `/founder/beta` indirectly
- **BLOCKER: No UI entry point in teacher-facing app** — no "Donner mon avis" button anywhere
- Zero feedback collected to date (no UI = no data)

### BETA_LOGS

**PARTIAL**

- `logger.ts` is wired — sends warn/error to `/api/beta/log`
- Global error capture installed (`installGlobalErrorCapture`)
- RLS: admin/founder read only ✓
- No product events — only technical errors/warnings
- Not usable as product analytics store
- Status: functions as error log, incomplete as observability tool

### LAST ACTIVITY SIGNAL

**MISSING**

- `utilisateurs.derniere_connexion` — column exists in prod, not in any migration file, never written by app code → **unreliable / schema drift**
- `auth.last_sign_in_at` — exists in Supabase auth, not exposed to app queries
- Best current proxy: MAX(generations_ia.created_at, classes.created_at, teaching_events.created_at) per user — approximate, misses browsing

### FUNNEL OBSERVABILITY

**7 / 12 STAGES OBSERVABLE**

| Stage | Observable |
|-------|-----------|
| F0 Invitation created | ✓ |
| F1 Invitation sent | ✓ (manual) |
| F2 Account created | ✓ |
| F3 Dashboard reached | ✗ |
| F4 Onboarding complete | ✓ |
| F5 Class created | ✓ |
| F6 First IA generation | ✓ |
| F7 Build My Year started | ✓ |
| F8 Build My Year complete | ✓ |
| F9 Lesson prepared | ✓ |
| F10 Mon Année engaged | ✗ |
| F11 Return visit | ✗ |

### FIRST VALUE

**Recommended**: Build My Year pack reaches `statut='pret'`  
**Secondary**: First AI generation completed  
**Not first value**: account creation, onboarding completion

### ERROR OBSERVABILITY

**PARTIAL**

- Client JS errors captured via `beta_logs` ✓
- Server-side errors: Vercel logs only, not in DB
- Cannot answer "who saw Build My Year failures this week?" — not tracked
- No structured `error_code` field — errors are free-text

### PRIVACY

**PASS with notes**

- No student data found in analytics infrastructure
- `beta_feedback.description` is free text — risk of incidental student context
- `beta_logs.data` JSONB is unstructured — founders must not share externally
- Privacy taxonomy documented in audit

### RLS

**PARTIAL**

- `beta_invitations`: PASS ✓
- `beta_feedback`: PASS ✓
- `beta_logs`: PASS ✓
- `activity_events`: LIMITATION — teacher-scoped, founder CANNOT read cross-user activity
- Ordinary beta teachers cannot see each other's data ✓

### FOUNDER RBAC

**FAIL — P1 SECURITY**

- `src/app/founder/layout.tsx` uses client-side `useEffect` guard only
- HTML renders before auth check completes
- API data routes DO have server-side guards ✓
- Pages themselves: NO server-side protection
- **Must be fixed before any additional users are given founder-level access**

### CURRENT COHORT (aggregate only)

| Metric | Observable from DB | Notes |
|--------|-------------------|-------|
| Invitations created | ✓ | Visible in /founder/beta |
| Invitations sent | ✓ | Visible |
| Accounts created | ✓ | utilisateurs WHERE role='beta' |
| Onboarding complete | ✓ | onboarding_complete=true |
| Classes created | ✓ | JOIN classes |
| No classes | ✓ | Derivable |
| First value detectable | ✓ | teaching_packs.statut='pret' |
| Feedback submitted | ✓ | beta_feedback (0 rows expected — no UI) |

Exact counts not published in this document. Run queries from `/founder/utilisateurs` or service_role.

### NEW EVENT TABLE REQUIRED

**YES** — `beta_events` table needed for V7.8B

### MIGRATION REQUIRED FOR V7.8B

**YES** — 1 migration covering:
1. `beta_events` table
2. `est_actif` + `derniere_connexion` columns formally added to schema
3. Founder-read policy on `activity_events`
4. `beta_feedback` category enum update (add 'blocked', 'confused', 'positive')

---

## TOP 10 GAPS

1. No product event tracking — F3/F10/F11 invisible
2. Founder layout is client-only guard (P1 security)
3. `derniere_connexion` never written by app — schema drift
4. Beta invitation lifecycle is fully manual — no auto-linkage
5. No feedback UI in teacher-facing app
6. `activity_events` blocked for founder analytics
7. `est_actif` column in schema drift (not in migrations)
8. No structured error events per feature
9. No return visit / session model
10. 5 of 8 beta success metrics not yet computable

---

## RECOMMENDED V7.8B SCOPE (PROPOSED ONLY — NOT YET STARTED)

| Priority | Task |
|----------|------|
| P0 | Add Next.js middleware guard for `/founder/*` (security) |
| P1 | Create `beta_events` table via migration |
| P1 | Wire `beta_invitations.utilisateur_id` on signup |
| P1 | Instrument 4 server events (class, build_year x2, ai) |
| P1 | Add "Donner mon avis" feedback widget |
| P2 | Build `/founder/beta-command` dashboard page |
| P2 | Instrument 2 client events (dashboard_entered, return_visit) |
| P2 | Expose `auth.last_sign_in_at` as reliable last-activity |
| P3 | Add founder-read RLS on `activity_events` |
| P3 | Fix schema drift for `est_actif` + `derniere_connexion` |

---

## Files Created

| File | Purpose |
|------|---------|
| `docs/Architecture/SCORGIA_V7_8A_BETA_OPERATIONS_AUDIT.md` | 27-mission forensic audit |
| `docs/Product/SCORGIA_V7_8A_BETA_METRICS.md` | 8 core beta success metrics |
| `docs/Product/SCORGIA_V7_8A_FOUNDER_COMMAND_CENTER_BLUEPRINT.md` | IA for future Command Center |
| `docs/Release/SCORGIA_V7_8A_REPORT.md` | This file |

---

## Constraints Respected

- [x] No code modified
- [x] No Supabase changes
- [x] No migrations applied
- [x] No data inserted, deleted, or modified
- [x] No push
- [x] No deploy

---

```
CODE CHANGES:     NONE
DATABASE CHANGES: NONE
MIGRATIONS:       NONE
COMMIT:           NONE (docs only — awaiting PO go)
PUSH:             NO

FINAL RECOMMENDATION: A — READY TO DESIGN V7.8B
STOP. WAIT FOR PRODUCT OWNER.
```
