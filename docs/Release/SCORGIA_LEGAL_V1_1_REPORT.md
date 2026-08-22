# SCORGIA LEGAL V1.1 — Consent Persistence & Versioning
**Release Report**  
**Date:** 2026-08-21  
**Sprint:** SCORGIA LEGAL V1.1  
**Commit message:** `feat(legal): harden consent persistence and versioning`  
**Status:** LOCAL — DO NOT PUSH until Product Owner approval

---

## Summary

V1 shipped the consent checkbox gate and legal page trio (privacy, terms, trust). V1.1 adds the backend persistence layer: an append-only `legal_consents` event table, a re-consent status engine, and version tracking infrastructure. The API route now writes a durable consent event at signup. The system degrades gracefully if the migration has not yet been applied.

---

## What shipped in V1.1

### Architecture

| File | Change |
|------|--------|
| `supabase/migrations/046_legal_consents_V11_FINAL_PROPOSED.sql` | **CREATED** — Append-only `legal_consents` table, dedup index, audit index, RLS policies (owner + admin SELECT; no client INSERT; no UPDATE; no DELETE) |
| `supabase/migrations/046_legal_consents_PROPOSED.sql` | **SUPERSEDED** — Status header updated; mutable approach formally retired |

### Library

| File | Change |
|------|--------|
| `src/lib/legal/consent-status.ts` | **CREATED** — `getLegalConsentStatus()` + `writeConsentEvent()` server-side helpers |

### API

| File | Change |
|------|--------|
| `src/app/api/auth/beta-signup/route.ts` | **MODIFIED** — Added `writeConsentEvent` call after profile upsert; non-fatal error handling |

### Architecture docs

| File | Change |
|------|--------|
| `docs/Architecture/SCORGIA_LEGAL_V1_1_CONSENT_AUDIT.md` | **CREATED** — 15-question forensic audit |
| `docs/Architecture/ADR_LEGAL_CONSENT_STORAGE.md` | **CREATED** — ADR-LEGAL-001: Model A (mutable) rejected, Model B (append-only) accepted |

### Product docs

| File | Change |
|------|--------|
| `docs/Product/SCORGIA_LEGAL_CONSENT_VERSIONING.md` | **CREATED** — Versioning model, lifecycle, re-consent engine, failure handling |

---

## Database: what the migration does

```sql
CREATE TABLE legal_consents (
  id                 UUID  PK  DEFAULT gen_random_uuid(),
  user_id            UUID  NOT NULL  REFERENCES auth.users(id) ON DELETE CASCADE,
  utilisateur_id     UUID  REFERENCES utilisateurs(id) ON DELETE SET NULL,
  terms_version      TEXT  NOT NULL,
  privacy_version    TEXT  NOT NULL,
  acceptance_context TEXT  NOT NULL  DEFAULT 'beta_signup',
  accepted_at        TIMESTAMPTZ  NOT NULL  DEFAULT now(),
  created_at         TIMESTAMPTZ  NOT NULL  DEFAULT now()
)
```

**Not yet applied to production.** Requires explicit PO GO.

---

## Security constraints met

| Constraint | Status |
|-----------|--------|
| DO NOT remotely modify Supabase | RESPECTED |
| DO NOT execute Migration 046 | RESPECTED |
| DO NOT run `supabase db push` | RESPECTED |
| DO NOT delete existing consent information | RESPECTED |
| DO NOT weaken signup validation | RESPECTED (`legalAccepted` check retained) |
| DO NOT break beta invitations | RESPECTED |
| DO NOT break authentication | RESPECTED |
| NEVER store passwords, JWTs, or secrets in consent records | RESPECTED |
| DO NOT store unnecessary student information | RESPECTED (teacher accounts only) |
| Preserve backward compatibility | RESPECTED (non-fatal if migration not applied) |

---

## Identity model

`user_id` in `legal_consents` references `auth.users(id)` — the canonical Supabase Auth identity (`auth.uid()`), **not** `utilisateurs.id` which is the internal profile PK.

This distinction is explicitly documented in the migration SQL comments and in `ADR_LEGAL_CONSENT_STORAGE.md`.

---

## Failure modes

| Scenario | Behavior |
|---------|---------|
| Migration not applied (table missing) | `writeConsentEvent` returns `{ ok: false, error: 'MIGRATION_NOT_APPLIED' }` — non-fatal; signup succeeds; error logged |
| Double-click duplicate submission | PG error 23505 caught → `{ ok: true, duplicate: true }` — idempotent; no alert |
| Real insert error | `{ ok: false, error: '<PG_CODE>' }` — non-fatal; signup succeeds; error logged as `[LEGAL_CONSENT_WRITE_FAILED]` |
| User existed before V1.1 | `getLegalConsentStatus` returns `requiresAction: true, reason: 'NO_CONSENT'` — no retroactive fabrication |

---

## What is NOT yet active

- `/legal/accept` re-consent page (middleware gate not enabled)
- Re-consent enforcement on login
- Admin consent audit view
- Self-service account deletion portal

---

## Quality gates

- TSC: 0 errors  
- Build: SUCCESS  
- No Supabase remote operations executed  
- No secrets committed

---

## Next steps (requires PO GO)

1. Legal review of Terms v1.0 + Privacy v1.0 by Canadian legal professional
2. PO GO to apply `046_legal_consents_V11_FINAL_PROPOSED.sql` to production
3. Activate re-consent middleware gate
4. Implement `/legal/accept` page (future sprint)
