# ScorgIA — Legal Implementation Notes
**Sprint:** SCORGIA LEGAL & TRUST LAYER V1  
**Date:** 2026-08-21  
**Status:** Implemented — Awaiting PO GO before push

---

## Architecture decision

Legal content is stored as structured TypeScript (`LegalSection[]`) in `src/content/legal/`, not as raw HTML strings. This avoids `dangerouslySetInnerHTML`, is type-safe, and renders via the `LegalPageLayout` component.

Legal version constants are the single source of truth. Every page and component imports from `src/lib/legal/constants.ts`.

---

## What IS implemented

| File | What it does |
|------|-------------|
| `src/lib/legal/constants.ts` | Single source of truth: versions, dates, company info, placeholders |
| `src/content/legal/privacy-fr.ts` | 22-section French privacy policy as `LegalSection[]` |
| `src/content/legal/terms-fr.ts` | 24-section French terms of use as `LegalSection[]` |
| `src/components/legal/LegalPageLayout.tsx` | Shared dark-theme layout with sticky nav, TOC, section rendering, footer |
| `src/components/legal/ScorgiaCopyrightNotice.tsx` | Reusable copyright + optional legal links component |
| `src/components/legal/AIUseNotice.tsx` | Reusable AI disclosure — compact and full variants |
| `src/app/privacy/page.tsx` | Public `/privacy` route — server component |
| `src/app/terms/page.tsx` | Public `/terms` route — server component |
| `src/app/trust/page.tsx` | Public `/trust` route — trust center with pillars, AI disclosure, subprocessors |
| `src/app/signup/page.tsx` | Added `legalAccepted` state + consent checkbox (unchecked by default) |
| `src/app/api/auth/beta-signup/route.ts` | Added `legalAccepted` field to `SignupPayload`, returns 400 if not `true` |
| `src/app/page.tsx` | Fixed copyright to Bodingo AI Tech Inc.; footer links → `<Link>` with real hrefs |
| `src/app/login/page.tsx` | Added legal footer: Confidentialité / Conditions / Confiance / © |
| `src/app/api/ia/teaching-copilot/route.ts` | "KlassIA Copilot" → "ScorgIA Copilot" (brand audit) |
| `supabase/migrations/046_legal_consents_PROPOSED.sql` | PROPOSED ONLY — adds `terms_version`, `privacy_version`, `legal_accepted_at` to `utilisateurs` |

---

## What is NOT implemented (by design)

- **Cookie banner**: No non-essential tracking active — no consent banner warranted.
- **Server-side consent storage**: `legalAccepted` is validated at signup (400 if false), but not yet persisted to DB. Requires migration 046 first.
- **Self-service account deletion portal**: Referenced as placeholder in privacy policy.
- **English versions** of privacy policy and terms: FR only for beta. Stub files can be added pre-launch.
- **Privacy officer identity / support email / governing jurisdiction / legal address**: All replaced with explicit `LEGAL_PLACEHOLDERS` constants. These must be resolved by PO + legal counsel before general availability.

---

## Middleware — no changes needed

`src/proxy.ts` matches only `/dashboard/*`, `/admin/*`, `/founder/*`. The new public routes `/privacy`, `/terms`, `/trust` are outside the matcher and are automatically public. No edits required.

---

## Open items before general availability

1. Resolve all `LEGAL_PLACEHOLDERS` with real values (legal counsel required).
2. Apply migration 046 to record consent version at signup.
3. Implement self-service account deletion portal.
4. Professional Canadian legal review of both policy documents.
5. Consider English versions before English-market launch.
6. Review subprocessor list for completeness (any additional Vercel edge locations, analytics, monitoring tools).
