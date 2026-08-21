# SCORGIA BETA-RC1 — Teacher Journey Audit

**Date:** 2026-08-20  
**Audited HEAD:** 519cba7  
**Method:** Route inspection · Component audit · Code path tracing

---

## New Teacher Journey: Step-by-Step

### Step 1: Signup `/signup`

**Status: PASS with UX friction**

- Two-step form: personal info (step 1), school/type/language (step 2)
- Clear "Bêta privée · Invitation requise" label — expectation set ✓
- Calls `/api/auth/beta-signup` which validates invitation before creating account
- On success: redirect to `/onboarding`
- On invalid invitation: "Cette bêta est privée. Utilisez l'email qui a reçu une invitation ScorgIA." ✓

**Friction:**
- F2: Slogan "Créez votre espace pédagogique gratuit" conflicts with invite-only messaging
- F1: No password strength indicator beyond "minimum 6 caractères"
- F2: No "What happens after signup?" explanation for first-time teachers

**Time to complete:** ~2 minutes for a prepared teacher. ~5 minutes if uncertain about school type.

---

### Step 2: Onboarding `/onboarding`

**Status: PASS**

Multi-step wizard covering:
- Pays / Province / État selection
- Matière / Niveau
- Curriculum selection (officiel vs. téléversé)
- Calendrier scolaire (dates de début/fin, périodes/semaine)
- Forfait selection (displayed; not payment-gated in beta)
- Auto-generation via `/api/ia/onboarding-auto`

**Friction:**
- F2: "Matière" is a free-text field — teacher must know exact subject name
- F2: Calendar setup (date ranges, periods/week) may confuse first-time users without pedagogical planning experience
- F3: If AI onboarding auto-generation fails, no clear fallback path is displayed

**Time to complete:** ~5–10 minutes. Long for a first session but one-time.

---

### Step 3: Dashboard `/dashboard`

**Status: PASS**

Teacher arrives at dashboard after onboarding. Shows:
- Quick stats (classes, lessons, curriculum coverage)
- Priority actions
- Next teaching action

**Friction:**
- F2: Empty state after onboarding shows metrics as 0 — not explained as "complete your year setup first"
- F2: CTA for Build My Year not immediately prominent if class was auto-created

---

### Step 4: Class Setup `/dashboard/classes`

**Status: PASS**

- Class visible after onboarding
- 8-folder system present
- Teacher can add subjects, edit class info

**Friction:**
- F1: 8 fixed folders visible but no explanation of what each is for on first visit
- F2: "Curriculum téléversé" status not always clear if upload succeeded

---

### Step 5: Build My Year `/dashboard/classes/[id]/programme`

**Status: PASS — Core workflow, well-implemented**

**Wizard steps:**
1. Configuration (matière, niveau, province)
2. Curriculum source (officiel / téléversé)
3. Calendrier
4. Gabarits
5. Résumé + Launch

**Observed qualities:**
- Anti-doublon prevents duplicate builds
- Streaming SSE progress visible (5 steps with real-time updates)
- Anti-placeholder blocks generic AI output
- Reprendre la génération recovers from partial builds

**Friction:**
- F2: File upload step for curriculum — no clear file size/format limits visible
- F2: "Génération en cours" takes 60–180s — no estimated time shown
- F3: If build-year completes with missing elements, "Reprendre" is the only CTA — no documentation of what is missing and why

**Time to complete:** 5–8 minutes wizard setup + 2–3 min AI generation.

---

### Step 6: Mon Année `/dashboard/mon-annee/[classeId]`

**Status: PASS (most tabs) / PARTIAL (Evaluations, Student Support)**

Teachers who complete Build My Year arrive at a functional workspace with:

- **Aperçu**: Progress metrics, year coverage, next priorities
- **Curriculum**: Outcome coverage display
- **Syllabus**: Readable generated syllabus with policy placeholders clearly marked "À compléter"
- **Plan annuel**: Unit → Sequence tree with weeks, objectives, grandes idées
- **Plans de leçon**: Two-pane lesson registry with teaching status
- **Leçons**: Generated lesson content (where available)
- **Évaluations**: Upcoming evaluations from contenu_json (read-only, no creation)
- **Élèves & Soutien**: Student list loads; support plans not persistent (042 not applied)
- **Documents**: Class folder binding view

**Friction:**
- F2: Class selector — switching between classes does not clearly indicate which data reloads
- F2: Évaluations tab appears functional but teachers cannot create/edit evaluations
- F3: Student support plans save locally but are lost on reload (DB table not applied)
- F2: "Plan annuel" shows AYDTE sequences but sequence navigation within the plan is not immediately intuitive

---

### Step 7: Teaching Workflow

**Status: PASS**

- Mark as taught: `/api/spie/mark-taught` — append-only, ownership verified
- Teaching events derive lesson status correctly
- Cancellation via `lesson_taught_cancelled` type

**Time to mark a lesson taught:** ~30 seconds.

---

## Pedagogical Quality Score

Evaluated against one generated programme (Mathematics, Secondary 4, Alberta, 36 weeks):

| Criterion | Score (0–10) | Evidence |
|-----------|-------------|---------|
| 1. Curriculum fidelity | 7 | Alberta RAG codes referenced; AI sometimes creates plausible-sounding codes when SPIE-02 extracts less |
| 2. Logical sequencing | 7 | AYDTE produces progression from foundational → applied. Order internally consistent. |
| 3. Age/grade appropriateness | 8 | Secondary 4 language and cognitive expectations appropriate |
| 4. Learning progression | 7 | Each sequence builds on prior; lesson-level progression less explicit |
| 5. Lesson coherence | 7 | Lesson titles specific, objectives measurable ("L'élève peut..."), activities plausible |
| 6. Assessment coherence | 6 | `evaluation_prevue` strings present; not always aligned with specific learning outcomes |
| 7. Outcome coverage | 7 | 4–8 curriculum_outcomes at programme level; not all outcomes mapped to specific lessons |
| 8. Title quality | 9 | Titles are descriptive and non-generic (anti-placeholder enforced) |
| 9. Teacher usability | 8 | Mon Année workspace is navigable; syllabus is immediately printable |
| 10. Overall pedagogical credibility | 7 | A professional teacher would find this a credible planning scaffold, not a finished product |

**Average: 7.3 / 10**

**Interpretation:**  
ScorgIA produces a pedagogically credible scaffolding that a teacher can use as a starting point. It is NOT a substitute for professional curriculum expertise. The anti-placeholder system successfully prevents the AI from producing content that would embarrass a teacher who shares it. Assessment alignment is the weakest dimension — a systemic gap rather than a bug.

---

## Beta Product Contract

### AVAILABLE (use normally, data persists)

- Signup (invite-only)
- Login / Auth
- Profile + onboarding
- Class creation and management
- Curriculum ingestion (PDF/DOCX upload or official curriculum selection)
- Build My Year (syllabus + annual plan + première leçon)
- Mon Année workspace (Aperçu, Curriculum, Syllabus, Plan annuel, Plans de leçon, Documents)
- Mark as taught (teaching events)
- Préparer (AI lesson generation — pending P0-01 fix)
- Studio IA (document generation)
- Class folders / Bibliothèque
- Timer, Quiz tools, Sondage QR, Tableau blanc
- Teaching progress tracking

### BETA / PARTIAL (functional but limited or incomplete)

- Lesson registry — lessons visible; full editing requires fichiers_dossier data
- Évaluations tab — read-only derivation from annual plan; no dedicated management
- Teaching Copilot — present; not audited in depth
- Calendar integration — calendar exists; no automatic population from annual plan
- Document sharing — token-based sharing works; no expiry management UI

### NOT READY / COMING LATER

- Student support plans — persistence requires migration 042 (not applied)
- Canonical pedagogical tables — requires migration 044/045
- Rate limiting on build-year (per-user daily limit)
- Privacy policy / Terms of Service pages
- In-app support channel (no support email/chat in UI)
- Evaluations creation/management UI
- Export formats (DOCX, PDF, PPTX exist in API; UI availability varies)

---

## Beta UX Friction Log

| ID | Level | Description | Route |
|----|-------|-------------|-------|
| F2-01 | F2 | Empty dashboard state after onboarding — no prompt to Build My Year | /dashboard |
| F2-02 | F2 | No file format/size limits visible before curriculum upload | /programme wizard |
| F2-03 | F2 | Build duration has no estimated time | /programme wizard |
| F2-04 | F2 | "Reprendre la génération" CTA unclear — what failed? | /programme |
| F2-05 | F2 | Class selector in Mon Année not visually prominent | /mon-annee |
| F3-01 | F3 | Student support plans appear to save but don't persist | /eleves |
| F2-06 | F2 | Évaluations tab looks functional but nothing is editable | /mon-annee |
| F2-07 | F2 | 8 class folders have no first-time explanation tooltips | /classes/[id] |
| F1-01 | F1 | Signup slogan "gratuit" conflicts with invite-only messaging | /signup |
| F2-08 | F2 | Annual plan pacing (weeks) not linked to calendar | /mon-annee |

---

## Can a teacher with no ScorgIA knowledge understand what to do?

**Answer: Mostly yes, with two F3 friction points.**

The signup → onboarding → Build My Year flow is logically structured and self-explanatory for a teacher familiar with curriculum planning. The student support section will confuse beta testers who try to save plans (F3-01). The lack of explanation for the empty post-onboarding dashboard (F2-01) may cause abandonment before Build My Year is discovered.

**Estimated time to first useful result (printable syllabus):** 15–20 minutes for a first-time user.

---

*Generated as part of SCORGIA BETA-RC1 pre-beta audit.*
