# SCORGIA BETA-RC1 — Production Architecture Audit

**Date:** 2026-08-20  
**Audited HEAD:** 519cba7  
**Scope:** Security · Database · API · Privacy · Runtime

---

## 1. Identity Model

The canonical identity chain is:

```
auth.users.id (auth.uid())
    ↓
utilisateurs.user_id        ← foreign key to auth.users.id
utilisateurs.id             ← internal UUID used everywhere else
    ↓
classes.enseignant_id       ← references utilisateurs.id
    ↓
teaching_packs.enseignant_id
programme_annuel (via classe_id)
teaching_events.enseignant_id
fichiers_dossier.enseignant_id
```

All RLS policies in schema.sql use the correct pattern:
```sql
enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
```

**Exception — spie_access_log:** This table intentionally stores `enseignant_id UUID REFERENCES auth.users(id)`, so `enseignant_id = auth.uid()` IS CORRECT for this table only.

**Status: PASS**

---

## 2. Row Level Security

### Core tables (schema.sql)

| Table | Policy Pattern | Status |
|-------|---------------|--------|
| utilisateurs | `auth.uid() = user_id` | PASS |
| classes | via utilisateurs chain | PASS |
| programme_annuel | via classe chain | PASS |
| unites | via classe chain | PASS |
| lecons | via classe chain | PASS |
| generations_ia | via utilisateurs chain | PASS |
| cours_semaine | via utilisateurs chain | PASS |
| ressources | via utilisateurs chain | PASS |
| communications | via utilisateurs chain | PASS |
| liste_attente | `auth.uid() IS NOT NULL` — too broad | **PARTIAL** |
| notes_agenda | via utilisateurs chain | PASS |
| sondages | via utilisateurs chain | PASS |

### Migration tables

| Table | Policy Pattern | Status |
|-------|---------------|--------|
| teaching_events | SELECT/INSERT via utilisateurs chain; no UPDATE/DELETE | PASS |
| beta_invitations | Founder/admin roles only (migration 035) | PASS |
| beta_feedback | Insert any auth; SELECT/UPDATE founder/admin only | PASS |
| spie_access_log | `enseignant_id = auth.uid()` — correct (references auth.users.id) | PASS |
| pedagogical_units | PROPOSED — table does not exist in production | NOT APPLIED |
| pedagogical_sequences | PROPOSED — table does not exist in production | NOT APPLIED |
| pedagogical_lessons | PROPOSED — table does not exist in production | NOT APPLIED |
| student_support_plans | PROPOSED — table does not exist in production | NOT APPLIED |

### Danger pattern scan

Search for `enseignant_id = auth.uid()` across all migration files:

- `038_detailed_lesson.sql:53` → `spie_access_log` only. **CORRECT** (this table uses `auth.users.id` FK).
- `042_student_support_foundation_PROPOSED.sql` → contains explicit warning comments "JAMAIS: enseignant_id = auth.uid()". Not applied.

**No dangerous identity mismatch found in applied migrations.**

---

## 3. Service Role Key

### Exposure check

`SUPABASE_SERVICE_ROLE_KEY` (without NEXT_PUBLIC_) is used in:

- All `src/app/api/**` routes — server-side only ✓
- `src/lib/supabase/admin.ts` — server-side utility ✓
- `src/lib/spie-access.ts` — imports `next/server`, server-side only ✓
- `src/app/partage/[token]/page.tsx` — Server Component (no 'use client'), comment documents intent ✓

`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — **does not exist** in codebase. Confirmed.

**Status: PASS — service role key never exposed to browser bundle.**

---

## 4. API Authentication

### Pattern: requireAuth() using getUser()

`src/lib/api-auth.ts` correctly uses `supabase.auth.getUser()` (server-side JWT validation), not `getSession()` (cookie-only, no JWT validation).

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser()
```

### Route-by-route auth

| Route | Auth method | Ownership verification |
|-------|------------|----------------------|
| `/api/spie/build-year` | `requireAuth()` + entitlement | `classes.eq('enseignant_id', profil.id)` |
| `/api/spie/mark-taught` | `requireAuth()` + 3-step chain | classe → pack → programme_annuel |
| `/api/spie/lesson-engine` | `requireAuth()` | profil + classe ownership |
| `/api/spie/syllabus-save` | `requireAuth()` | pack ownership |
| `/api/ia/curriculum` | `requireAuth()` | profil lookup |
| `/api/ia/generer` | **NONE** | **No auth. P0-01.** |
| `/api/founder/*` | `requireFounderOrAdmin()` | Role: founder/super_admin/admin |
| `/api/auth/beta-signup` | None (invitation validates identity) | beta_invitations check |
| `/api/beta/feedback` | service role only | Bypass RLS by design |

---

## 5. Cost / AI Rate Risk

### Build-year pipeline

- 3–4 Claude Sonnet calls per invocation (programme, syllabus, première leçon)
- Anti-doublon: one build per class (statut check)
- No per-user daily build limit
- `maxDuration: 300` per invocation

**Risk:** Moderate for controlled beta with ≤50 invited teachers. Escalates if open access occurs.

### Generer endpoint

- Single Claude call, streaming available
- **No authentication** (P0-01)
- Open to abuse from any internet user

**Risk: HIGH until P0-01 is fixed.**

---

## 6. Migration Status

| Migration | Status | Notes |
|-----------|--------|-------|
| 001–037 | Applied | Core schema, RLS, studio, packs, teaching_packs |
| 038 | Applied | Detailed lesson + spie_access_log |
| 039 | Applied | programme_annuel schema fix |
| 040 | Applied (proposed nomenclature) | Source ref |
| 041 | Applied | teaching_events (mark-taught route operational) |
| 042 | NOT APPLIED | Student support plans (PROPOSED) |
| 044 | NOT APPLIED | pedagogical_units/sequences/lessons (PROPOSED) |
| 045 (both) | NOT APPLIED | Canonical structures final (PROPOSED) |

### Migration 045 Decision Gate

**Recommendation: A — DEFER 044/045 UNTIL AFTER INITIAL BETA**

**Rationale:**
- All current reads use `programme_annuel.contenu_json` — the V3 JSON path
- Shadow-write was designed to run non-blocking; its failure does not impact the teacher experience
- Migration 044 introduces 3 new tables with indexes and RLS — applies risk during the first week of beta
- The V3 JSON model is complete (schema_version stamped), pedagogically validated, and operational
- Post-beta data migration from contenu_json → canonical tables is well-understood
- Introducing canonical tables while beta data is actively generated creates a data reconciliation obligation
- **Option B** (apply before beta) provides no user-visible benefit in RC1; all reads still go to contenu_json

**Required before Option A can reverse to B:**
- PO decision
- Staged rollout plan (shadow writes confirmed, then migrate reads)
- Test with copy of production data

---

## 7. Ghost Table Analysis

`public.unites` (created in schema.sql):
- Row count: 0 (confirmed in prior audits)
- FK referenced by `lecons.unite_id` (SET NULL on delete)
- Not used by any current application code
- Shadow-write (044) would populate `pedagogical_sequences` separately, not this table

**Recommendation: Do NOT drop before beta.** No runtime risk. Dropping requires confirming zero FK dependencies. Post-beta cleanup ticket is appropriate.

---

## 8. Observability

### Current state

- Build-year: structured `console.info/warn/error` with tagged keys (`[SPIE_CURRICULUM_EXTRACTION_OK]`, `[SPIE_BUILD_FAILED]`, `[AYDTE_COMPLETE]`, etc.)
- Vercel: captures stdout/stderr as function logs
- No external aggregator (Sentry, Datadog, etc.)

### Minimum requirements for beta founder diagnosis

1. Vercel Function Logs must be monitored by founder
2. Key build-year events are logged with `packId` + `classeId` — sufficient for manual diagnosis
3. `spie_access_log` table provides audit trail at DB level (if migration 038 is applied — it is)

### Gap

No user-visible error reference codes. If a build fails, the teacher sees "Réessayez" with no diagnostic identifier. Founder must correlate via Vercel logs + `packId`.

**Status: PARTIAL — Adequate for a 50-user controlled beta. Insufficient for 500+.**

---

## 9. Data Recovery

| Scenario | Outcome | Recovery |
|----------|---------|----------|
| AI generation fails midway | `statut: 'erreur'` set on teaching_pack | "Reprendre la génération" retries from last successful step |
| Syllabus fails | Build halted at syllabus gate | Retry creates new attempt |
| programme_annuel insert fails | Downstream steps blocked, error reported | Retry via wizard |
| mark-taught fails | No partial state; INSERT is atomic | User retries |
| Folder binding fails | Logged as warning; pack still complete | Binding retried on next access |
| Upload extraction empty | Explicit guard blocks build | Teacher prompted to re-upload |

**Status: PASS — All critical paths have documented failure modes and retry options.**

---

## 10. Legacy Compatibility

- V2 programmes (no `schema_version` or `schema_version: 'v2'`) remain readable
- `getCanonicalPedagogicalYear()` — resolves from `contenu_json.unites[]` regardless of version
- Toxic legacy data (placeholder titles) is identifiable via the validator; not silently presented as V3 quality

**Status: PASS**

---

*Generated as part of SCORGIA BETA-RC1 pre-beta audit.*
