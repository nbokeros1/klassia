# ScorgIA — Legal Consent Versioning Model
**Sprint:** SCORGIA LEGAL V1.1  
**Date:** 2026-08-21  
**Owner:** Product / Architecture

---

## What we track

For every user who creates a ScorgIA account, we record:

| Field | Example | Why |
|-------|---------|-----|
| `user_id` | `3fa85f64-...` | Links consent to the auth identity |
| `terms_version` | `"1.0"` | Which Terms version was accepted |
| `privacy_version` | `"1.0"` | Which Privacy version was accepted (independent lifecycle) |
| `acceptance_context` | `"beta_signup"` | Which flow triggered acceptance |
| `accepted_at` | `2026-08-21T14:30:00Z` | When — server-generated, not client-controlled |

---

## Version lifecycle

Versions are defined in `src/lib/legal/constants.ts`:

```ts
export const LEGAL_VERSIONS = {
  terms:   '1.0',
  privacy: '1.0',
} as const
```

**To release a new version:**
1. Update the constant (e.g., `terms: '1.1'`)
2. Update `LEGAL_DATES.terms`
3. Update the content in `src/content/legal/terms-fr.ts`
4. Bump triggers `getLegalConsentStatus()` to return `requiresAction: true` for users who accepted `'1.0'`

**Terms and Privacy are versioned independently.** Updating one does not require re-acceptance of the other.

---

## Re-consent engine

`getLegalConsentStatus(adminClient, userId)` returns:

```ts
{
  hasConsent:     boolean           // false if no record exists
  termsVersion:   string | null     // most recent accepted terms version
  privacyVersion: string | null     // most recent accepted privacy version
  termsCurrent:   boolean           // termsVersion === LEGAL_VERSIONS.terms
  privacyCurrent: boolean           // privacyVersion === LEGAL_VERSIONS.privacy
  requiresAction: boolean           // true if any document is outdated or missing
  reason:         ConsentReason     // 'NO_CONSENT' | 'TERMS_OUTDATED' | 'PRIVACY_OUTDATED' | 'BOTH_OUTDATED' | null
}
```

**Comparison is exact equality** — `'1.0' === '1.0'`, not semantic version comparison. This means:
- `'1.0' !== '1.0.1'` → re-consent required for errata
- `'1.0' !== '1.1'` → re-consent required for substantive updates
- If errata should NOT require re-consent, keep `LEGAL_VERSIONS.terms = '1.0'` and update only display text

---

## Acceptance contexts

| Context | When used |
|---------|----------|
| `beta_signup` | User completes beta signup flow (current) |
| `signup` | General public signup (future) |
| `legal_update` | User re-consents after version bump (future) |
| `admin_migration` | Reserved — for documented, justified admin operations only |

**`admin_migration` must never be used to backfill retroactive consent** for users who did not actually go through an acceptance flow.

---

## What we do NOT track

- IP address
- Device fingerprint or browser user agent
- Geographic location
- Student data (consent concerns teacher accounts only)
- Password hash or auth tokens

---

## Existing beta users (as of V1.1 activation)

Users who signed up before the `legal_consents` table existed have **no consent record**. `getLegalConsentStatus()` returns `requiresAction: true, reason: 'NO_CONSENT'` for them.

**Resolution:** These users will be prompted to re-accept on next login via the `/legal/accept` page (future — not yet activated in V1.1).

**Never retroactively create consent records** for these users. The absence of a record is the accurate state.

---

## Future: /legal/accept re-consent flow

When a user's `requiresAction === true`:

```
User authenticates
→ server calls getLegalConsentStatus(userId)
→ if requiresAction:
     redirect to /legal/accept
→ /legal/accept shows current Terms + Privacy links
→ user explicitly accepts
→ server calls writeConsentEvent({ acceptance_context: 'legal_update' })
→ redirect to dashboard
```

**Not yet active.** The page is designed but the middleware gate is not enabled in V1.1. Activation requires PO GO + migration applied.

---

## Atomicity and failure handling

The current signup sequence:
1. Create auth user
2. Upsert utilisateurs
3. **Write consent event** ← new in V1.1
4. Update invitation status

If step 3 fails with a real error (not duplicate): the account exists and is functional, but `requiresAction = true` on next login check. The error is logged as `[LEGAL_CONSENT_WRITE_FAILED]`. The user is not notified of the internal failure.

Before migration 046_V11 is applied, step 3 returns `error: 'MIGRATION_NOT_APPLIED'` — non-fatal.

---

## Database table

`legal_consents` — see `supabase/migrations/046_legal_consents_V11_FINAL_PROPOSED.sql`.

**Not yet applied to production.**
