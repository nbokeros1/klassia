# ScorgIA — Subprocessor Inventory V1
**Date:** 2026-08-21  
**Version:** 1.0  
**Status:** Beta — incomplete; must be verified before general availability

---

## Verified subprocessors

| Subprocessor | Role | Country | Data category | Notes |
|-------------|------|---------|--------------|-------|
| **Anthropic** (Claude API) | AI content generation | United States | Pedagogical context (anonymized) | Server-side only; no student PII transmitted |
| **Supabase** | Database, authentication, storage | United States | All user data, pedagogical data | PostgreSQL; encrypted at rest and in transit |
| **Vercel** | Application hosting and deployment | United States | HTTP request logs; no persistent user data stored by Vercel | Edge runtime; Next.js hosting platform |

---

## Not verified / uncertain

The following should be audited before publishing this list publicly:

- Are Supabase backups stored in additional jurisdictions?
- Does Vercel analytics or edge logging store identifiable request data?
- Any third-party error monitoring (Sentry, Datadog, etc.) — not currently observed in codebase but should be confirmed.
- Email delivery service (for beta invitations) — not identified in code audit; must be added if one is used.

---

## Policy

None of the above subprocessors are authorized to use ScorgIA user data for their own commercial purposes. Contracts with subprocessors are governed by their respective Data Processing Agreements (DPAs).

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-21 | Initial inventory for beta controlled release |
