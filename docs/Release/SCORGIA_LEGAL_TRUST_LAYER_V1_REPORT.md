# Release Report — SCORGIA LEGAL & TRUST LAYER V1
**Date:** 2026-08-21  
**Status:** LOCAL COMMIT READY — AWAITING PRODUCT OWNER GO BEFORE PUSH  
**TSC:** 0 errors  
**Build:** Pending final verification  

---

## Summary

Full legal and privacy layer for ScorgIA controlled beta. Covers public legal pages, signup consent gate, brand audit, and proposed DB migration.

---

## Files created

| File | Type | Purpose |
|------|------|---------|
| `src/lib/legal/constants.ts` | New | Single source of truth for versions, dates, company, placeholders |
| `src/content/legal/privacy-fr.ts` | New | 22-section French privacy policy (`LegalSection[]`) |
| `src/content/legal/terms-fr.ts` | New | 24-section French terms of use (`LegalSection[]`) |
| `src/components/legal/LegalPageLayout.tsx` | New | Shared dark-theme layout: sticky nav, TOC, sections, footer |
| `src/components/legal/ScorgiaCopyrightNotice.tsx` | New | Reusable copyright notice + optional legal links |
| `src/components/legal/AIUseNotice.tsx` | New | Reusable AI disclosure notice (compact + full) |
| `src/app/privacy/page.tsx` | New | `/privacy` public route |
| `src/app/terms/page.tsx` | New | `/terms` public route |
| `src/app/trust/page.tsx` | New | `/trust` trust center (pillars, AI, subprocessors, contact) |
| `supabase/migrations/046_legal_consents_PROPOSED.sql` | New | PROPOSED ONLY — `terms_version`, `privacy_version`, `legal_accepted_at` |
| `docs/Legal/SCORGIA_LEGAL_IMPLEMENTATION_NOTES.md` | New | Implementation notes and open items |
| `docs/Legal/SCORGIA_SUBPROCESSOR_INVENTORY_V1.md` | New | Subprocessor inventory V1 |
| `docs/Release/SCORGIA_LEGAL_TRUST_LAYER_V1_REPORT.md` | New | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/app/signup/page.tsx` | Added `legalAccepted` state; consent checkbox (unchecked by default); submit disabled until checked; `legalAccepted` sent in API body |
| `src/app/api/auth/beta-signup/route.ts` | Added `legalAccepted?: boolean` to `SignupPayload`; returns 400 if not `true` |
| `src/app/page.tsx` | Fixed footer copyright to `Bodingo AI Tech Inc.`; converted footer `<span>` links to `<Link>` with real hrefs (`/privacy`, `/terms`, `#contact`) |
| `src/app/login/page.tsx` | Added legal footer: Confidentialité / Conditions / Confiance / © Bodingo |
| `src/app/api/ia/teaching-copilot/route.ts` | "KlassIA Copilot" → "ScorgIA Copilot" (brand audit) |

---

## What is NOT included (by design)

- Cookie banner — no non-essential tracking active
- English policy documents — FR only for beta
- Server-side consent storage — requires migration 046 (proposed, not applied)
- Privacy officer, support email, jurisdiction, address — placeholders pending legal counsel
- `dangerouslySetInnerHTML` — not used anywhere

---

## Middleware

No changes. `/privacy`, `/terms`, `/trust` are outside the matcher in `proxy.ts` — automatically public.

---

## DO NOT PUSH

Commit locally. Wait for Product Owner validation before pushing to `origin/main`.

---

## Open items for general availability

1. Resolve all `LEGAL_PLACEHOLDERS` with real data (requires legal counsel)
2. Apply migration 046 + update `beta-signup` to persist consent version + timestamp
3. Implement self-service account deletion portal
4. Professional Canadian legal review
5. English policy documents for EN-market launch
6. Complete subprocessor audit (email delivery, error monitoring)
