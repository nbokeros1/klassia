# SCORGIA LEGAL V1.1 — Forensic Audit of Migration 046
**Sprint:** SCORGIA LEGAL & TRUST LAYER V1.1  
**Date:** 2026-08-21  
**Baseline commit:** 392ffee  
**Status:** Audit complete — superseded by `046_legal_consents_V11_FINAL_PROPOSED.sql`

---

## Scope

Full forensic audit of `supabase/migrations/046_legal_consents_PROPOSED.sql` against ScorgIA's architecture, signup flow, RLS conventions, and privacy requirements.

---

## A. What exactly does Migration 046 create?

Migration 046 adds three columns to the existing `utilisateurs` table:

```sql
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS terms_version      TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version    TEXT,
  ADD COLUMN IF NOT EXISTS legal_accepted_at  TIMESTAMPTZ;
```

Plus `COMMENT ON COLUMN` statements. No new table, no index, no RLS change, no trigger.

---

## B. Does it modify utilisateurs or create a dedicated consent table?

**Modifies `utilisateurs`.** No dedicated consent table is created.

---

## C. Is the design mutable or append-only?

**Mutable.** The columns are plain ALTER TABLE additions to an existing row-per-user table. Any subsequent UPDATE to `utilisateurs` can overwrite `terms_version`, `privacy_version`, or `legal_accepted_at`.

---

## D. Can one user have multiple consent events?

**No.** One row per user in `utilisateurs`. Only the current (latest) value is retained.

---

## E. Can we prove acceptance of Privacy v1.0 independently from Terms v1.0?

**Partially.** The columns are separate, so version values are independently stored. However:
- A single `legal_accepted_at` timestamp cannot differentiate between accepting Terms v1.0 on day 1 and Privacy v1.0 on day 2.
- When Terms v1.1 is released and the user re-consents, `legal_accepted_at` is overwritten. We can no longer prove *when* the user first accepted Terms v1.0 (only that they eventually accepted Terms v1.1).

**Verdict: Insufficient for audit trail.**

---

## F. Is accepted_at server-generated?

**No DEFAULT defined.** The column has no `DEFAULT now()`. The application layer must explicitly set it. If not set, it remains NULL. If set by application code, the application controls the value — there is no PostgreSQL-level guarantee.

**Verdict: Vulnerable to application-layer timestamp injection.**

---

## G. Can the client forge user_id?

**In the existing beta-signup route, no.** The route uses `data.user.id` from Supabase Auth (returned by `supabase.auth.signUp()`), never from the request body. The service role writes to `utilisateurs.user_id = data.user.id`.

However, there is no structural barrier preventing a future authenticated endpoint from accepting a `user_id` from the client if carelessly written. The architecture does not enforce this at the database level for `utilisateurs`.

**Verdict: Acceptable in current route; vulnerable by convention alone.**

---

## H. Can the client forge accepted_at?

**Yes, if application code allows it.** No `DEFAULT` and no `NOT NULL` means the column can be set to any value (including a past date) by any code that performs an UPDATE or INSERT on `utilisateurs`. The service role key bypasses RLS. An attacker with the service role key (infrastructure-level) could backdate consent.

**Verdict: No database-level protection.**

---

## I. Can Teacher A read/write Teacher B's consent?

**Read/write via application SDK: No** (current RLS on `utilisateurs` is `FOR ALL USING (auth.uid() = user_id)` — correct). Teacher A can only see/modify their own row.

However: since the consent fields are part of the `utilisateurs` table, any future code that grants broader access to `utilisateurs` (e.g., a teacher collaboration feature) could inadvertently expose consent fields.

**Verdict: Acceptable under current RLS, but fragile by proximity.**

---

## J. What happens when the Terms become v1.1?

With mutable fields: `terms_version` is overwritten to `'1.1'`. Evidence of acceptance of `'1.0'` is permanently erased. We cannot prove the user ever accepted Terms v1.0.

**Verdict: Audit trail broken on every version bump.**

---

## K. What happens when Privacy becomes v2.0 but Terms remain v1.0?

With mutable fields: `privacy_version` updates to `'2.0'`. `legal_accepted_at` is overwritten. We lose the timestamp of original Terms v1.0 acceptance.

**Verdict: Single timestamp is structurally ambiguous.**

---

## L. What happens when a user deletes their account?

`utilisateurs.user_id` references `auth.users(id) ON DELETE CASCADE`. Account deletion cascades to delete the utilisateurs row, including all consent fields. No consent evidence survives.

For audit purposes this means: once a user deletes their account, there is no record that they ever accepted any legal document.

**Note:** For privacy/right-to-erasure, this is desirable. For legal liability purposes (did we obtain valid consent?), an argument could be made for retaining redacted evidence. This tension is flagged — see ADR for resolution.

---

## M. Does the migration preserve enough information for an audit?

**No.** Key deficiencies:
1. Mutable fields lose historical acceptance records on every re-consent
2. Single `legal_accepted_at` cannot attribute timestamps to individual documents
3. No `acceptance_context` — we don't know whether consent was given at beta_signup, legal_update, etc.
4. No structural guarantee that `accepted_at` is server-generated
5. Cannot answer: "On what date did user X accept Privacy v1.0 specifically?"

---

## N. Is any collected field unnecessary?

The three fields are directionally correct (we want versions + timestamp). But `legal_accepted_at` is ambiguous because it cannot be tied to a specific document version without supporting structure. In the dedicated-table model, `accepted_at` is per-event and inherently unambiguous.

---

## O. Does it conflict with existing signup or beta invitation architecture?

**No direct conflict.** The beta-signup route uses an `upsert` on `utilisateurs`, so adding these columns simply requires the route to also set them during signup. The `UPSERT ... ON CONFLICT (user_id)` would update them if re-running.

However: since `legal_accepted_at` has no DEFAULT, if the upsert doesn't include it, it stays NULL indefinitely. This is a silent failure mode.

The migration also has no CHECK constraint ensuring that `terms_version` and `privacy_version` are non-NULL or match known versions.

---

## Summary of Migration 046 Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Mutable fields erase acceptance history on re-consent | Critical | Cannot prove previous version acceptance |
| Single `legal_accepted_at` shared between both docs | High | Ambiguous timestamp attribution |
| No `DEFAULT now()` on `legal_accepted_at` | High | Silent NULL if application forgets to set |
| No `acceptance_context` | Medium | Cannot distinguish beta_signup vs legal_update |
| No index on consent lookup | Low | Minor query performance |
| No NOT NULL constraint on version fields | Medium | Silent omission possible |
| Consent proximity to other user data in utilisateurs | Low | Future access-broadening risk |

**Conclusion:** Migration 046 is **SUPERSEDED**. See `046_legal_consents_V11_FINAL_PROPOSED.sql` and `ADR_LEGAL_CONSENT_STORAGE.md`.

---

## Identity Architecture (for V1.1 design reference)

```
auth.users.id       = auth.uid()  = canonical identity
utilisateurs.user_id = auth.uid()  = foreign key linking profile to auth
utilisateurs.id      = internal row UUID (NOT auth.uid())
```

RLS pattern used throughout ScorgIA:
- Simple ownership: `auth.uid() = user_id`
- Join-based: `enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())`
- Admin check: `EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND u.role IN (...))`

**Critical note from migration 032/035:** An early version of several RLS policies used `u.id = auth.uid()` (comparing utilisateurs PK to auth UID), which is always FALSE. This was corrected in migration 035 to `u.user_id = auth.uid()`. The V1.1 migration follows the correct pattern throughout.

---

## Existing Beta Users — Consent Evidence Audit

**Users who signed up BEFORE commit `392ffee` (2026-08-21):**  
No legal checkbox existed in the UI. No server validation. No consent record in any table.  
Classification: **Category B — consent cannot be proven durably.**

**Users who signed up AFTER `392ffee` and BEFORE V1.1 migration activation:**  
The UI required checkbox acceptance. The server validated `legalAccepted: true`. But no durable DB record was written.  
Classification: **Category B — behavioral evidence only (server log), no structured record.**

**Users who sign up AFTER V1.1 migration activation:**  
Consent event written to `legal_consents` by service role during signup.  
Classification: **Category A — durable, auditable evidence.**

**Recommendation:** For Category B users — on next login, present `/legal/accept` page. Do NOT retroactively fabricate consent records. The absence of a record IS the accurate state.
