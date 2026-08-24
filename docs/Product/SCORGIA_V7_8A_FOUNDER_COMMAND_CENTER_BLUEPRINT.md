# SCORGIA V7.8A — Founder Beta Command Center Blueprint

**Date**: 2026-08-24  
**Status**: DESIGN ONLY — No implementation  
**Audience**: Founder / Product Owner  
**Planned route**: `/founder/beta-command` (new page, V7.8B)

---

## Objective

Give the Founder a single page that answers, without queries, SQL, or Vercel log diving:

- Who is in the beta?
- Who is stuck?
- What are the top blockers?
- Is the product delivering first value?
- Who hasn't come back?

---

## Section A — Beta Overview (Top of Page)

Four KPI cards across the top:

| Card | Value | Source |
|------|-------|--------|
| Invited | COUNT from `beta_invitations` | Live |
| Accepted | COUNT where `statut IN ('acceptee')` | Live |
| Activated | COUNT where `onboarding_complete=true` AND role='beta' | Live |
| Active (7d) | COUNT with meaningful action in last 7 days | Requires V7.8B events |

Below the cards: a horizontal progress bar showing the cohort's funnel position.

```
Invited ──── Accepted ──── Signed up ──── Onboarding ──── First class ──── First value
[6]          [5]           [5]            [4]              [3]              [2]
```

---

## Section B — Funnel Breakdown

A vertical funnel showing conversion at each stage, with absolute numbers and percentages:

```
F0  Invitations créées      6      100%
F1  Envoyées                5       83%    ↓
F2  Comptes créés           5       83%    ↓  (linkage gap: manual)
F4  Onboarding terminé      4       80%    ↓
F5  Classe créée            3       75%    ↓
F7  Build My Year démarré   2       67%    ↓
F8  Build My Year terminé   1       50%    ↓  ← FIRST VALUE
```

Each stage shows the drop-off in red if > 30% drop. Clicking a stage shows the list of teachers at that stage.

**Data sources**: `beta_invitations`, `utilisateurs`, `classes`, `teaching_packs`

---

## Section C — Teacher Status Table

A table with one row per beta teacher. **No full email displayed** — show first name + last name initial only (e.g., "Marie D.") unless founder clicks to expand.

| Column | Source | Notes |
|--------|--------|-------|
| Name | `utilisateurs.prenom + nom[0]` | Pseudonymous in list view |
| Status | Computed (ACTIVE/AT_RISK/BLOCKED/INACTIVE/PENDING) | See health model |
| Invitation state | `beta_invitations.statut` | |
| Onboarding | `utilisateurs.onboarding_complete` | ✓ / ✗ |
| Classes | COUNT from `classes` | 0/1/2+ |
| First value | `teaching_packs.statut='pret'` exists? | ✓ / — |
| Last signal | Most recent of: IA gen, class created, teaching event | Approximate |
| Feedback | COUNT from `beta_feedback` | 0, 1, 2+ |

**Sorting**: by Status (BLOCKED first), then by Last signal ascending (most inactive first).

**Status computation** (server-side, deterministic):

```
BLOCKED   → feedback with type='blocked' unresolved + no activity >2d
AT_RISK   → onboarding complete + no class in >5d
INACTIVE  → any meaningful signal >14d ago
ACTIVE    → meaningful action in last 7d
PENDING   → account created, onboarding not complete
INVITED   → invitation sent, no account created
```

---

## Section D — Feedback Panel

Feeds from `beta_feedback`. Displays recent feedback items grouped by type.

**Layout**: Two columns
- Left: Bug reports + Blocked reports (urgent)  
- Right: Suggestions + Positive feedback

Each item shows:
- Type badge (color-coded)
- `titre`
- `page_url` (truncated)
- Time ago ("il y a 2 jours")
- Statut select (nouveau → en_traitement → resolu → ferme)
- Teacher reference (first name only)

**Note**: Description field NOT shown in list view (contains free text that may include sensitive context). Founder must click to expand.

---

## Section E — Error Dashboard

Feeds from `beta_logs WHERE level='error'`.

| View | Content |
|------|---------|
| Top errors (7d) | Grouped by `message` similarity, count + affected user count |
| Affected routes | `page_url` grouped |
| Error trend | Count per day (last 7 days, simple bar) |
| First / Last seen | `created_at` range per error group |

**Current limitation**: Errors are unstructured text — grouping requires string matching, which is imprecise. V7.8B adds `error_code` field to resolve this.

---

## Section F — Feature Usage

Derived from existing business tables, no new events needed:

| Feature | Metric | Source |
|---------|--------|--------|
| Build My Year | Packs created / Packs completed (%) | `teaching_packs` |
| Préparer | Lesson plans created (count) | `lecons` |
| Mon Année | Teaching events logged | `teaching_events` |
| IA | Generations by type | `generations_ia` |
| Calendrier | Course blocks created | `cours_semaine` |

Simple horizontal bar chart for each feature showing per-user average.

---

## Section G — Weekly Brief (Automated Summary Block)

A collapsible panel at the bottom that generates a deterministic summary for the current week:

```
RÉSUMÉ CETTE SEMAINE (2026-W34)

Activation
  Nouveaux comptes : X
  Onboarding terminé : X
  Première classe : X
  Build My Year terminé : X

Usage
  Utilisateurs actifs : X / Y
  Générations IA : X
  Événements d'enseignement : X

Alertes
  Utilisateurs AT_RISK : X
  Utilisateurs INACTIVE : X
  Erreurs uniques (7j) : X

Feedbacks
  Non traités : X
  Bloquants : X
```

No AI. Counts only. Deterministic every time.

---

## Data Architecture for This Page

The page will call a single server route: `/api/founder/beta-command`

```typescript
// Returns:
{
  funnel: { f0, f1, f2, f4, f5, f7, f8 },
  teachers: [{ id, name, status, invitation_statut, onboarding, class_count, first_value, last_signal, feedback_count }],
  feedback: { recent: [], counts_by_type: {} },
  errors: { top: [], by_route: [], trend: [] },
  usage: { build_year: {}, prepare: {}, mon_annee: {}, ia: {} },
  weekly: { ... }
}
```

All queries use service_role. One round trip. No N+1.

---

## Privacy Rules for This Page

- Teacher table shows abbreviated name by default
- Full email visible only via click/expand (founder-only)
- Feedback descriptions not shown in list view
- No student data surfaced anywhere
- No curriculum document content
- Lesson titles: shown only as counts, not text
- AI generation content: never shown, only counts by type

---

## Implementation Checklist (V7.8B)

- [ ] Create `beta_events` table + migration
- [ ] Add server-side guard middleware for `/founder/*`
- [ ] Wire `beta_invitations.utilisateur_id` on signup
- [ ] Instrument 4 server events: class_created, build_year_started, build_year_completed, ai_generation
- [ ] Instrument 2 client events: dashboard_entered, return_visit
- [ ] Add founder-read RLS policy on `activity_events`
- [ ] Build `/api/founder/beta-command` server route
- [ ] Build `/founder/beta-command` page (sections A–G)
- [ ] Add "Donner mon avis" feedback widget
- [ ] Update `beta_feedback` categories to match beta taxonomy
- [ ] Fix `est_actif` + `derniere_connexion` schema drift (add to migration)

---

## Pages That Are NOT Needed

The following founder pages are low-priority for beta operations and can remain as-is:

- `/founder/finances` — no billing in beta
- `/founder/infrastructure` — use Vercel/Supabase dashboards
- `/founder/contenu` — content managed in code
- `/founder/vision` — reference doc only

The following are HIGH priority and should be enhanced in V7.8B:

- `/founder/beta` — add teacher activation state column, auto-link invitation
- `/founder/utilisateurs` — fix `derniere_connexion` reliability
- `/founder/analytics` — add Build My Year + feature breakdown
