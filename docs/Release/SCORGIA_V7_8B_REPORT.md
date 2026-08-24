# SCORGIA V7.8B — Beta Operations & Founder Command Center — Release Report

**Date**: 2026-08-24
**Sprint type**: IMPLEMENTATION — Beta Operations Infrastructure
**Author**: Eddy Nwaha
**Status**: COMPLETE — Local commit only, pending PO push authorization

---

## What V7.8B Is

V7.8B implements the full Beta Operations & Founder Command Center based on the forensic audit from V7.8A. It converts the founder space from a client-side security model to a proper server-side guard, adds product event tracking infrastructure, creates the Founder Beta Command Center page, and deploys the teacher-facing feedback widget.

---

## Phases Delivered

| Phase | Scope | Status |
|-------|-------|--------|
| 1 — P0 Security | Server-side founder layout guard | ✓ DONE |
| 2+6 — Migration | `beta_events` table + schema drift fixes (PROPOSED) | ✓ DONE |
| 3-4 — Event Writer | `src/lib/analytics/beta-events.ts` | ✓ DONE |
| 5 — Client Events API | `POST /api/beta/events` | ✓ DONE |
| 7-13 — Command Center API | `GET /api/founder/beta-command` | ✓ DONE |
| 14 — Feedback Widget | `FeedbackWidget.tsx` — floating 💬 button + modal | ✓ DONE |
| 15 — Feedback API | `POST /api/beta/feedback` | ✓ DONE |
| 17 — Build Year Events | `build_year_started` + `build_year_completed` in pipeline | ✓ DONE |
| 18 — Dashboard Event | `dashboard_entered` via `BetaSessionTracker` | ✓ DONE |
| 19-26 — Command Center Page | `/founder/beta-command` — 6-tab dashboard | ✓ DONE |
| 27 — Sidebar Nav | Added "Command Center" link to `FounderSidebar` | ✓ DONE |
| 34 — Type + Build Check | `npx tsc --noEmit` → 0 errors. `npm run build` → ✓ | ✓ DONE |

---

## Files Created

| File | Description |
|------|-------------|
| `src/app/founder/layout.tsx` | REWRITTEN — server component, server-side auth guard |
| `supabase/migrations/047_beta_operations_V78B_PROPOSED.sql` | PROPOSED migration — DO NOT APPLY without PO |
| `src/lib/analytics/beta-events.ts` | Server-side event writer with allowlist + sanitization |
| `src/app/api/beta/events/route.ts` | Client-side event API endpoint |
| `src/app/api/beta/feedback/route.ts` | Feedback submission API |
| `src/app/api/founder/beta-command/route.ts` | Command Center data API (7 query groups, service_role) |
| `src/components/beta/FeedbackWidget.tsx` | Teacher-facing floating feedback button + modal |
| `src/components/beta/BetaSessionTracker.tsx` | Dashboard session tracking (once-per-session) |
| `src/app/founder/beta-command/page.tsx` | Founder Command Center (6 tabs: Overview, Enseignants, Retours, Erreurs, Usage, Semaine) |

## Files Modified

| File | Change |
|------|--------|
| `src/app/dashboard/layout.tsx` | Added `BetaSessionTracker` + `FeedbackWidget` |
| `src/app/api/spie/build-year/route.ts` | Added `build_year_started` + `build_year_completed` events |
| `src/components/founder/FounderSidebar.tsx` | Added "Command Center" nav link |

---

## Security Posture

### P0 — Founder Layout (FIXED)

**Before**: `'use client'` + `useEffect` auth check. HTML rendered before auth verified.

**After**: `async` server component. `createClient()` → verify session → check `utilisateurs.role/is_admin` → `redirect('/login')` or `redirect('/dashboard')` on failure. Zero HTML sent to unauthorized users.

### API Security

All founder APIs continue to use `requireFounderOrAdmin()` server-side. No change to existing role gates. New `beta-command` API uses the same pattern.

### No RLS Weakening

All new tables inherit strict RLS. `beta_events` INSERT is allowed for authenticated users (events written via API route, not direct from client). SELECT restricted to admin/founder roles only.

---

## Migration 047 — PROPOSED Status

`supabase/migrations/047_beta_operations_V78B_PROPOSED.sql` is created but **NOT applied**. The migration covers:

1. `beta_events` table with allowlisted event types and features
2. Schema drift fix: `est_actif` + `derniere_connexion` formally added to `utilisateurs`
3. Founder-read policy on `activity_events` (currently teacher-scoped only)
4. `beta_feedback` type constraint update: adds `blocked`, `confused`, `positive`

**Apply only after PO review and Supabase staging test.**

Until migration 047 is applied:
- `beta_events` table does not exist → event writes silently fail (non-throwing analytics)
- `activity_events` founder reads return empty (RLS blocks cross-user reads)
- New feedback types (`blocked`, `confused`, `positive`) will fail DB constraint → feedback widget will show an error on submit

**To partially unblock before migration**: the feedback widget and session tracker are deployed, but events will only persist once the migration is applied.

---

## Beta Metrics Impact

| Metric | Before | After |
|--------|--------|-------|
| M1 Invitation → Signup | PARTIAL | PARTIAL (no change to linkage) |
| M2 Signup → Onboarding | YES | YES |
| M3 Onboarding → Class | YES | YES |
| M4 Time to first value | PARTIAL | IMPROVED (build_year_completed event) |
| M5 Build My Year rate | YES | YES |
| M6 7-day return | APPROXIMATE | APPROXIMATE (dashboard_entered added) |
| M7 Feedback rate | NO | YES (widget deployed) |
| M8 Blocking error rate | NO | YES (blocked type + widget) |

---

## Funnel Observability After V7.8B

| Stage | Observable |
|-------|-----------|
| F3 Dashboard reached | ✓ (via `dashboard_entered` event once migration applied) |
| F7 Build My Year started | ✓ (via `build_year_started` event) |
| F8 Build My Year complete | ✓ (via `build_year_completed` event) |
| F10 Mon Année engaged | ✗ (route `/dashboard/mon-annee` has no page file — cannot instrument) |
| F11 Return visit | PARTIAL (`dashboard_entered` is per-session, approximates return) |

---

## Constraints Respected

- [x] DO NOT PUSH — local commit only
- [x] DO NOT DEPLOY
- [x] DO NOT MODIFY SUPABASE REMOTELY
- [x] Migration 047 created as PROPOSED — not applied
- [x] is_admin not set for beta users
- [x] forfait not changed in DB for beta users
- [x] Legal V1.1 not modified
- [x] RLS not weakened
- [x] No founder/admin tools exposed to beta users
- [x] No existing beta teacher data deleted or reset
- [x] No push to remote

---

## Next Steps

1. **Apply migration 047** once PO reviews and approves
2. **Push and deploy** once PO authorizes
3. **Verify feedback widget** appears for beta teachers in production
4. **Monitor `beta_events`** table growth over first week
5. **Check Command Center** loads correctly at `/founder/beta-command`
6. **Link `beta_invitations.utilisateur_id`** on signup (not yet done — requires signup flow change)

---

```
CODE CHANGES:     YES — 9 new files, 4 modified
DATABASE CHANGES: NONE (migration PROPOSED only)
MIGRATIONS:       047 PROPOSED — NOT APPLIED
COMMIT:           PENDING (local only — awaiting PO push authorization)
PUSH:             NO — DO NOT PUSH without PO confirmation

FINAL STATUS: V7.8B COMPLETE — READY FOR PO REVIEW
STOP. WAIT FOR PRODUCT OWNER.
```
