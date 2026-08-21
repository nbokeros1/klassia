# SCORGIA BETA-RC1 — Pre-Beta Readiness Report

**Date:** 2026-08-20  
**Audited HEAD:** 519cba7b46bdaa68a753f1c9a62de57577b1001c  
**Audit method:** Static code analysis · Schema inspection · Route inventory · TSC + Build

---

```
SCORGIA BETA-RC1 — PRE-BETA READINESS REPORT
============================================

PRODUCTION HEAD:
519cba7b46bdaa68a753f1c9a62de57577b1001c

AUDITED HEAD:
519cba7b46bdaa68a753f1c9a62de57577b1001c
(local HEAD = remote HEAD = production HEAD — clean)

PHYSICAL ANDROID:
PASS — PO validated V7.6.1

REPOSITORY:
PASS
Branch: main
Local = Remote = Production HEAD
Working tree: untracked docs/migrations only, no uncommitted modifications
Unpushed commits: NONE
Versions confirmed: V7.4.x ✓ V7.5 ✓ V7.5.1 ✓ V7.5.2/3 ✓ V7.6 ✓ V7.6.1 ✓

PUBLIC ENTRY:
PARTIAL
- Signup: PASS (invite-only, invitation validated server-side)
- Login: PASS
- Landing: PARTIAL (pre-existing mobile overflow on marketing nav)

SIGNUP:
PASS
- Invite-only: beta_invitations check before account creation
- role: 'beta' assigned on utilisateurs
- Invitation marked 'acceptee' on activation

LOGIN:
PASS
- Supabase auth, JWT validated via getUser()

BETA ACCESS:
PASS
- Explicit invite-only model
- beta_invitations table managed by founder
- RLS: founder/admin/beta_manager only (migration 035)
- Arbitrary public users cannot enter production

NEW TEACHER JOURNEY:
PASS (core path) / PARTIAL (student support)
- Signup → Onboarding → Build My Year → Mon Année: complete and functional
- Estimated time to first printable syllabus: 15–20 min
- Student support plans: F3 friction (not persistent, table 042 not applied)

CLASS MODEL:
PASS
- Classes isolated by enseignant_id FK
- All RLS policies use correct utilisateurs.id chain
- Cross-class contamination: not found

CURRICULUM UPLOAD:
PASS
- PDF/DOCX extraction working
- Empty extraction guard blocks build before wasting AI credits
- Fallback to raw text (8,000 chars) on SPIE-02 failure

SPIE-02:
PASS
- extractOutcomesFromText() → NormalizedOutcome[]
- Outcome codes from source document where available
- Fallback to descriptive codes — no invented RAG codes blocked
- AYDTE bridge activated when outcomes extracted

ANTI-PLACEHOLDER:
PASS
- validatePedagogicalProgramme() called BEFORE DB write
- Blocks "Unité 1", "Leçon 1", "Objectif principal", "Contenu à définir"
- Second line of defence after AI prompt instructions

AYDTE:
PASS
- Academic Year Digital Twin Engine produces SequenceBlock[] with week allocation
- Scaffolds unit/sequence/lesson IDs used in AI prompt
- Graceful fallback if SPIE-02 returns 0 outcomes

PEDAGOGICAL QUALITY:
7.3 / 10
Evidence:
- Curriculum fidelity: 7 (RAG codes referenced; occasional AI-invented codes)
- Logical sequencing: 7 (AYDTE produces coherent progression)
- Age/grade appropriateness: 8 (Secondary 4 expectations appropriate)
- Learning progression: 7 (sequence-level strong; lesson-level less explicit)
- Lesson coherence: 7 (titles specific, objectives measurable)
- Assessment coherence: 6 (evaluation_prevue present; not always outcome-aligned)
- Outcome coverage: 7 (4–8 curriculum_outcomes at programme level)
- Title quality: 9 (anti-placeholder enforced; all titles descriptive)
- Teacher usability: 8 (Mon Année navigable; syllabus immediately printable)
- Overall credibility: 7 (credible scaffold, not a professional replacement)

SYLLABUS:
PASS
- Two-attempt generation with truncation recovery
- Policy fields explicitly templated "À compléter par l'enseignant"
- Syllabus locked for AI write on political/policy fields
- Not hallucinating school policy

MON ANNÉE:
PARTIAL
- Aperçu, Curriculum, Syllabus, Plan annuel, Plans de leçon, Documents: PASS
- Évaluations: PARTIAL (read-only from JSON, no management)
- Élèves & Soutien: PARTIAL (student list works; support plans table not applied)

TEACHING EVENTS:
PASS
- Append-only INSERT architecture confirmed
- No UPDATE/DELETE RLS policies on teaching_events
- Ownership chain: auth.uid() → utilisateurs.id → classe → pack → programme_annuel
- lesson_taught_cancelled correctly implements undo without deleting history

PRÉPARER:
PARTIAL
- AI generation functional
- /api/ia/generer: NO authentication guard (P0-01) — unauth users can access
- Pending fix makes this PASS

DOCUMENT ENGINE:
PASS
- Upload → extraction → indexer → fichiers_dossier
- Failed extraction visible (no silent "indexed" state)
- MIME type handling in indexer

STUDENTS:
PASS
- eleves table present, class-scoped
- Student list isolated per class
- Search and filter UI present

STUDENT PRIVACY:
FAIL
- buildSafeStudentAIContext() and PROTECTED_FIELDS defined (V7.1)
- NOT CALLED in /api/ia/generer — raw profil_type/besoins/notes sent to Claude
- Privacy architecture is dead code at API boundary (P0-02)

EVALUATIONS:
PARTIAL
- Upcoming evaluations derived from contenu_json.unites[].evaluation_prevue
- No dedicated evaluations table
- No creation/editing UI

MOBILE:
PASS
- V7.6.1 responsive architecture
- PO physical Android: PASS
- No regression found in code audit

DESKTOP:
PASS
- 1440px: sidebar correct, no mobile bleed
- .mobile-header { display: none } base rule confirmed

ACCESSIBILITY BASELINE:
PARTIAL
- Keyboard nav: buttons focusable, forms have labels
- Mobile touch targets: 44px not formally audited but most CTAs ≥ 40px
- Modal close: overlay tap closes drawers
- ARIA labels: present on hamburger button; not systematically audited
- Hover-only actions: not found in critical paths

RLS:
PASS (with noted P2 exception)
- All core tables use correct utilisateurs.id chain
- teaching_events: append-only enforced at DB level
- beta_invitations: restricted to founder/admin (migration 035)
- liste_attente: any authenticated user can read (P2-01 — non-blocking)

SERVICE ROLE SAFETY:
PASS
- SUPABASE_SERVICE_ROLE_KEY never in NEXT_PUBLIC_
- All usages in server-side API routes only
- spie-access.ts imports next/server — confirms server-side only

API SECURITY:
PARTIAL
- build-year, mark-taught, syllabus-save, lesson-engine: PASS
- /api/ia/generer: FAIL (P0-01 — no auth)
- All founder routes: PASS (requireFounderOrAdmin)

DATABASE HEALTH:
PARTIAL
- unites: ghost table, 0 rows — not blocking
- canonical tables (pedagogical_units/sequences/lessons): not created (044 not applied)
- Shadow-write silently fails (warns to Vercel logs) — contenu_json path remains primary
- No orphan rows or broken FK assumptions found in applied schema

OBSERVABILITY:
PARTIAL
- Structured logs in build-year pipeline (tagged keys with packId/classeId)
- Vercel function logs capture all server console output
- No external error aggregator (Sentry, Datadog)
- No user-visible error reference codes for support
- Adequate for 50-user controlled beta; insufficient for scale

RECOVERY:
PASS
- Reprendre la génération: BuildState tracked, step-level resume
- All write operations verified post-insert
- Folder binding errors non-blocking (logged, not fatal)
- Mark-taught: atomic INSERT, no partial state possible

LEGACY COMPATIBILITY:
PASS
- V2 JSON programmes readable from contenu_json.unites[]
- schema_version field distinguishes V2/V3
- Toxic legacy placeholder data identifiable via validator

TSC:
0 ERRORS / PASS
Confirmed: npx tsc --noEmit → exit 0

BUILD:
SUCCESS
Confirmed: npm run build → exit 0

--------------------------------------------

BLOCKERS

P0: 2
  P0-01: /api/ia/generer — no authentication (unauthenticated AI generation)
  P0-02: Student privacy guards dead code (defined but never called at AI boundary)

P1: 5
  P1-01: Canonical shadow-write tables not created (044/045 not applied)
  P1-02: Student support plans table not applied (042 not applied)
  P1-03: No rate limiting on build-year (per-user daily limit absent)
  P1-04: Landing page mobile overflow (pre-existing)
  P1-05: Founder layout client-side role check only

P2: 5
  P2-01: liste_attente RLS — any authenticated user can read
  P2-02: /api/ia/generer quota check uses getSession() (becomes N/A after P0-01 fix)
  P2-03: Evaluations tab — no dedicated DB table or creation UI
  P2-04: Password minimum 6 characters (weak)
  P2-05: No legal/privacy policy links on signup page

P3: 5
  P3-01 to P3-05: Font inconsistency, dead routes, UX polish

TOP 10 ISSUES:
1. P0-01: /api/ia/generer unauthenticated — open AI endpoint, direct cost exposure
2. P0-02: Student privacy guards not wired in — LPRPDE compliance risk
3. P1-01: Canonical tables not created — shadow-write fails silently every build
4. P1-02: Student support plans not persistent — F3 confusion for beta testers
5. P1-03: No per-user build rate limit — spam risk with multiple classes
6. P1-04: Landing page mobile overflow — marketing page unusable on phone
7. P1-05: Founder layout RBAC client-side only — UI flash for unauthorized users
8. P2-01: Waitlist readable by any auth user — data minimization gap
9. P2-03: Evaluations partial — creates false expectation of full management
10. P2-04: 6-character password minimum — below 2026 security standards

--------------------------------------------

MIGRATION 045 RECOMMENDATION:

A — DEFER UNTIL AFTER INITIAL BETA

Reason:
All current reads and writes use programme_annuel.contenu_json (V3 JSON path).
Shadow-write to canonical tables degrades gracefully (non-blocking, warning logged).
Migration 044 introduces 3 new tables with RLS — a risk to introduce during first
beta week with live teachers. No user-visible benefit from canonical tables in RC1.
Post-beta migration from JSON → canonical tables is well-defined.
Decision can be revisited after beta data patterns are observed.

--------------------------------------------

BETA PRODUCT CONTRACT

READY (persists, fully functional):
- Invite-only signup + login
- Onboarding wizard
- Class creation and management
- Curriculum upload (PDF/DOCX) + official curriculum selection
- Build My Year (syllabus, annual plan, première leçon)
- Mon Année: Aperçu, Curriculum, Syllabus, Plan annuel, Plans de leçon, Documents
- Mark as taught (teaching events — append-only)
- Préparer AI generation (pending P0-01 fix)
- Class folders / Bibliothèque
- Timer, Quiz, QR Poll, Whiteboard tools
- Teaching progress tracking

BETA / PARTIAL (functional but limited):
- Lesson content viewer (fichiers_dossier data required)
- Evaluations tab (read-only from JSON)
- Student list (eleves table OK; support plans not persistent)
- Export tools (API present; UI coverage varies)
- Calendar (exists; not auto-populated from annual plan)

NOT READY / COMING LATER:
- Student support plan persistence (migration 042 not applied)
- Canonical pedagogical tables (migration 044/045 not applied)
- Privacy policy / Terms of Service pages
- In-app support channel
- Rate limiting (per-user build limit)
- Evaluations creation/management

--------------------------------------------

FINAL BETA VERDICT

B — CONDITIONAL GO

Small targeted BETA-RC1 FIX sprint required before opening beta to external teachers.

Required fixes (2 items, P0):

1. P0-01: Add `requireAuth()` at the top of /api/ia/generer
   File: src/app/api/ia/generer/route.ts
   Effort: 1 line + import
   
2. P0-02: Wire profils_eleves through buildSafeStudentAIContext() before Claude prompt
   File: src/app/api/ia/generer/route.ts
   Effort: ~20 lines, import from existing lib

After these two fixes: no P0 blocker remains.
P1–P3 items are documented for the post-RC1 sprint.

CONFIDENCE: 72 / 100

Confidence is 72 (not 85+) because:
- Teaching events (mark-taught) was not tested live — confirmed only by code + schema audit
- Student support persistence failure (F3) will create real friction for beta testers
- No runtime browser console audit was possible (auth required for dashboard)
- Pedagogical quality rated 7.3 — strong enough for beta, not strong enough to claim parity with a curriculum specialist

NEXT RECOMMENDED RELEASE:
BETA-RC1-FIX → Close P0-01 and P0-02 → BETA OPEN
Followed by BETA-RC2 after first 2 weeks of teacher feedback

--------------------------------------------

DATABASE CHANGES: NONE
MIGRATIONS EXECUTED: NONE
PRODUCTION DATA DELETED: NONE
PUSH: NO
DEPLOYMENT: NO

STOP.
WAIT FOR PRODUCT OWNER.
```
