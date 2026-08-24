# SCORGIA V7.8A — Beta Success Metrics

**Date**: 2026-08-24  
**Status**: DESIGN ONLY — No implementation  
**Audience**: Founder / Product Owner

---

## Philosophy

> Measure what teachers actually do, not what they say.  
> Avoid vanity metrics. Every metric must answer a product decision.

The following metrics are selected for a beta cohort of fewer than 50 teachers. They are deterministic, derivable from DB facts, and directly actionable.

---

## The 8 Core Beta Metrics

### M1 — Invitation → Signup Conversion

**Definition**: Percentage of invited teachers who created an account.

```
Formula: COUNT(utilisateurs WHERE role='beta') / COUNT(beta_invitations WHERE statut != 'annulee')
```

**Why it matters**: If < 70%, the invitation message or signup experience is broken.  
**Current data source**: `beta_invitations` + `utilisateurs`  
**Reliability**: MEDIUM — invitation linkage is manual, not automatic  
**Beta target**: > 80%

---

### M2 — Signup → Onboarding Completion

**Definition**: Percentage of beta accounts that completed onboarding.

```
Formula: COUNT(utilisateurs WHERE role='beta' AND onboarding_complete=true) / COUNT(utilisateurs WHERE role='beta')
```

**Why it matters**: Onboarding completion unlocks full access. If < 90%, teachers are abandoning before starting.  
**Current data source**: `utilisateurs.onboarding_complete`  
**Reliability**: HIGH  
**Beta target**: > 90%

---

### M3 — Onboarding → First Class

**Definition**: Percentage of onboarding-complete teachers who created at least one class.

```
Formula: COUNT(DISTINCT classes.enseignant_id WHERE user is beta) / COUNT(beta users with onboarding_complete=true)
```

**Why it matters**: Creating a class is the gateway to all features. If a teacher hasn't created a class, they haven't started.  
**Current data source**: `classes` JOIN `utilisateurs`  
**Reliability**: HIGH  
**Beta target**: > 70%

---

### M4 — Time to First Value

**Definition**: Median number of days from account creation to Build My Year completion (`teaching_packs.statut='pret'`).

```
Formula: MEDIAN(teaching_packs.updated_at - utilisateurs.created_at) WHERE pack statut='pret' AND user role='beta'
```

**Why it matters**: If teachers take > 2 weeks to reach first value, the onboarding path has friction. ScorgIA's promise is fast setup.  
**Current data source**: `teaching_packs` + `utilisateurs`  
**Reliability**: HIGH (once statut='pret' is properly timestamped)  
**Note**: `teaching_packs` has no `completed_at` field — need to use `updated_at` when statut='pret', or add event in V7.8B  
**Beta target**: < 7 days

---

### M5 — Build My Year Completion Rate

**Definition**: Percentage of started Build My Year packs that reach `statut='pret'`.

```
Formula: COUNT(teaching_packs WHERE statut='pret' AND user is beta) / COUNT(teaching_packs WHERE user is beta)
```

**Why it matters**: If < 50%, teachers start but don't finish. Root cause must be found (AI failure, confusing UX, time required).  
**Current data source**: `teaching_packs.statut`  
**Reliability**: HIGH  
**Beta target**: > 60%

---

### M6 — 7-Day Return Rate

**Definition**: Percentage of teachers who had activity in their second week (days 8–14) after signup.

```
Proxy formula (no session model): COUNT(beta users with generations_ia OR teaching_events OR classes created in days 8-14) / COUNT(beta users activated 14+ days ago)
```

**Why it matters**: If teachers don't return in week 2, ScorgIA is a one-time experiment, not a tool. This is the most important retention signal for beta.  
**Current data source**: `generations_ia` + `teaching_events` (approximate — not a true session model)  
**Reliability**: APPROXIMATE (missing: dashboard open, Mon Année open)  
**Beta target**: > 50%  
**Gap**: True return visit requires session signal (see M.8B event in audit)

---

### M7 — Feedback Submission Rate

**Definition**: Percentage of active beta teachers who submitted at least one piece of feedback.

```
Formula: COUNT(DISTINCT beta_feedback.utilisateur_id WHERE user is beta) / COUNT(active beta users)
```

**Why it matters**: Low feedback rate = teachers are not engaged with the beta process, OR the feedback mechanism is invisible (likely the latter — NO UI EXISTS YET).  
**Current data source**: `beta_feedback`  
**Reliability**: N/A — no feedback UI exists  
**Beta target**: > 30% after feedback UI is shipped  
**Blocker**: Requires "Donner mon avis" UI (Mission 15 in audit)

---

### M8 — Blocking Error Rate

**Definition**: Percentage of active beta teachers who reported a blocking issue.

```
Formula: COUNT(DISTINCT utilisateur_id WHERE beta_feedback.type='blocked') / COUNT(active beta users)
```

**Why it matters**: If > 10% of teachers are reporting being blocked, something must be fixed immediately.  
**Current data source**: `beta_feedback WHERE type='blocked'` (category doesn't exist yet — current categories are bug/idea/remark/rating)  
**Reliability**: LOW — requires new 'blocked' category + UI  
**Beta target**: < 10%  
**Blocker**: Requires feedback UI + category taxonomy update

---

## Supporting Indicators (Non-Primary)

These are useful but not primary success signals:

| Indicator | Source | Notes |
|-----------|--------|-------|
| AI generations per active user/week | `generations_ia` | Usage intensity |
| Lessons prepared per active user | `lecons` | Feature depth |
| Teaching events (lessons taught) | `teaching_events` | Advanced engagement |
| Time in onboarding (steps completed) | Not tracked yet | Requires M.8B events |
| Error rate by feature | `beta_logs` | Currently unstructured |
| Cohort progression over time | Mixed | No session model yet |

---

## Metric Dashboard: Data Availability Matrix

| Metric | Available now? | Missing piece | V7.8B fixes? |
|--------|---------------|---------------|-------------|
| M1 Invitation → Signup | PARTIAL | Invitation not auto-linked | YES |
| M2 Signup → Onboarding | YES | — | — |
| M3 Onboarding → Class | YES | — | — |
| M4 Time to first value | PARTIAL | No `completed_at` timestamp | YES |
| M5 Build My Year rate | YES | — | — |
| M6 7-day return | APPROXIMATE | No session model | PARTIAL |
| M7 Feedback rate | NO | No feedback UI | YES |
| M8 Blocking error rate | NO | No feedback UI, wrong categories | YES |

**3 of 8 metrics fully available today. 5 require V7.8B.**

---

## Anti-Patterns to Avoid

| Do NOT measure | Why |
|----------------|-----|
| "Users who logged in" | `derniere_connexion` is unreliable — never written by app |
| "Page views" | No tracking infrastructure |
| "Time on page" | No session model |
| "Feature satisfaction score" | Requires survey infrastructure not yet built |
| "NPS" | Too early for beta; relationship-based feedback is more useful |

---

## When to Escalate

| Metric | Escalate if |
|--------|------------|
| M1 (Invitation → Signup) | < 50% after 2 weeks |
| M2 (Onboarding completion) | < 80% |
| M3 (First class) | < 50% after 5 days |
| M4 (Time to first value) | > 14 days median |
| M5 (Build My Year rate) | < 40% |
| M6 (Return rate) | < 30% |
| M8 (Blocking errors) | > 15% |

Any single metric below the escalation threshold should trigger a direct conversation with the affected teachers (qualitative before quantitative at this beta scale).

---

## Implementation Note

None of these metrics require third-party tools at current beta scale. They are derivable via:
- SQL queries on existing Supabase tables (service_role)
- A `/api/founder/beta-metrics` server route
- A simple founder dashboard page

External analytics (PostHog, Amplitude) can be evaluated post-beta if the cohort exceeds 200 users.
