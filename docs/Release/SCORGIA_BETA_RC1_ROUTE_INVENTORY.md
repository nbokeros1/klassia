# SCORGIA BETA-RC1 — Route Inventory

**Date:** 2026-08-20  
**Audited HEAD:** 519cba7b46bdaa68a753f1c9a62de57577b1001c  
**Status:** Pre-Beta RC1 Certification

---

## Legend

- **IMPLEMENTED** — Route exists, renders expected content
- **PARTIAL** — Route exists, core functionality present but incomplete/placeholder elements
- **REDIRECT** — Route exists, redirects elsewhere
- **DEAD** — Route file exists but renders stub/empty content
- **LEGACY** — Functional but replaced by newer route
- **BROKEN** — Route exists but fails at runtime

---

## PUBLIC

| Route | Status | Notes |
|-------|--------|-------|
| `/` | IMPLEMENTED | Landing page. Pre-existing mobile nav overflow (marketing page, V7.6 known). ScorgIA branding present. |
| `/signup` | IMPLEMENTED | Invite-only beta signup. 2-step form. Calls `/api/auth/beta-signup`. |
| `/login` | IMPLEMENTED | Standard Supabase auth. ScorgIA branding. |

## ONBOARDING

| Route | Status | Notes |
|-------|--------|-------|
| `/onboarding` | IMPLEMENTED | Multi-step wizard (pays, province, curriculum, class setup). ReactMarkdown used for generated content. |
| `/dashboard/classes/[id]/programme` | IMPLEMENTED | Build My Year wizard + Teaching Pack viewer. Tabs: Vue d'ensemble, Curriculum, Syllabus, Plan annuel, Séquences, Plans de leçon, Quiz, Gabarits, Qualité. |

## CORE DASHBOARD

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard` | IMPLEMENTED | Teacher cockpit. Stats, priorities, next actions. |
| `/dashboard/classes` | IMPLEMENTED | Class list. |
| `/dashboard/classes/[id]` | IMPLEMENTED | Class detail. 8-folder system. Preview panel. |
| `/dashboard/mon-annee` | IMPLEMENTED | Global Mon Année (no classeId). Uses SchoolYearWorkspaceShell. |
| `/dashboard/mon-annee/[classeId]` | IMPLEMENTED | Class-specific Mon Année workspace. |
| `/dashboard/mon-annee/[classeId]/eleves/[eleveId]` | PARTIAL | Student detail page. Depends on migration 042 (not applied). |
| `/dashboard/gerer/preparer` | IMPLEMENTED | Préparer — AI lesson/document factory. |
| `/dashboard/gerer/enseigner` | IMPLEMENTED | Teaching mode list. |
| `/dashboard/gerer/enseigner/[leconId]` | IMPLEMENTED | Teaching mode individual lesson. |
| `/dashboard/bibliotheque` | IMPLEMENTED | Class document library with folder system. |
| `/dashboard/suivre` | IMPLEMENTED | Teaching progress tracking. |
| `/dashboard/calendrier` | IMPLEMENTED | Calendar view. |

## OUTILS

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard/outils` | IMPLEMENTED | Teacher tools hub. |
| `/dashboard/outils/timer` | IMPLEMENTED | Pedagogical timer with phase mode. |
| `/dashboard/outils/quiz` | IMPLEMENTED | Quiz management. |
| `/dashboard/outils/quiz/[id]` | IMPLEMENTED | Individual quiz. |
| `/dashboard/outils/quiz/[id]/resultats` | IMPLEMENTED | Quiz results. |
| `/dashboard/outils/quiz/[id]/lancer` | IMPLEMENTED | Live quiz launch. |
| `/dashboard/outils/quiz-live` | IMPLEMENTED | Live quiz session. |
| `/dashboard/outils/sondage-qr` | IMPLEMENTED | QR survey tool. |
| `/dashboard/outils/projection-tbi` | IMPLEMENTED | Interactive whiteboard projection. |
| `/dashboard/outils/tableau-blanc` | IMPLEMENTED | Whiteboard. |
| `/dashboard/outils/nuage-de-mots` | IMPLEMENTED | Word cloud. |
| `/dashboard/outils/tirage-au-sort` | IMPLEMENTED | Random picker. |
| `/dashboard/outils/podium-quiz` | IMPLEMENTED | Quiz podium. |
| `/dashboard/studio-ia` | IMPLEMENTED | IA Studio — document generation hub. |

## MON ANNÉE TABS (within SchoolYearWorkspaceShell)

| Tab | Status | Notes |
|-----|--------|-------|
| Aperçu | IMPLEMENTED | Progress overview, metrics row. |
| Curriculum | IMPLEMENTED | Curriculum coverage display. |
| Syllabus | IMPLEMENTED | Syllabus viewer (SyllabusViewer component). |
| Plan annuel | IMPLEMENTED | Annual plan with unit/sequence tree. |
| Unités / Séquences | IMPLEMENTED | Hierarchical plan inspector. |
| Plans de leçon | IMPLEMENTED | Lesson registry two-pane UX. |
| Leçons | PARTIAL | Lesson content viewer. Depends on fichiers_dossier data. |
| Évaluations | PARTIAL | Shows upcoming evaluations from contenu_json. No dedicated DB table. |
| Élèves & Soutien | PARTIAL | Student list works (eleves table). Support plans require migration 042 (PROPOSED, not applied). |
| Documents | IMPLEMENTED | Class folder binding view. |

## FOUNDER / ADMIN

| Route | Status | Notes |
|-------|--------|-------|
| `/founder` | IMPLEMENTED | Founder dashboard. Role-gated (client-side check + DB verification). |
| `/founder/beta` | IMPLEMENTED | Beta invitation management. |
| `/founder/analytics` | IMPLEMENTED | Analytics. |
| `/founder/utilisateurs` | IMPLEMENTED | User management. |
| `/founder/audit` | IMPLEMENTED | Audit trail. |
| `/founder/deployment` | IMPLEMENTED | Deployment status. |
| `/founder/ia` | IMPLEMENTED | AI monitoring. |
| `/founder/finances` | IMPLEMENTED | Financial overview. |
| `/founder/bi` | IMPLEMENTED | Business intelligence. |
| `/founder/monitoring` | IMPLEMENTED | Infrastructure monitoring. |
| `/founder/parametres` | IMPLEMENTED | Environment variable inventory. |
| `/founder/roadmap` | IMPLEMENTED | Product roadmap. |
| `/founder/produits` | IMPLEMENTED | Product catalog. |
| `/founder/company` | IMPLEMENTED | Company settings. |
| `/founder/notifications` | IMPLEMENTED | Notification management. |
| `/founder/contenu` | IMPLEMENTED | Content management. |
| `/founder/vision` | IMPLEMENTED | Vision/strategy. |
| `/founder/infrastructure` | IMPLEMENTED | Infrastructure view. |
| `/dashboard/admin/inscriptions` | IMPLEMENTED | Enrollment admin. |
| `/dashboard/admin/analytics` | IMPLEMENTED | Analytics admin. |
| `/dashboard/admin/utilisateurs` | IMPLEMENTED | User admin panel. |

## PUBLIC / STUDENT-FACING

| Route | Status | Notes |
|-------|--------|-------|
| `/quiz/[code]` | IMPLEMENTED | Student quiz participation (no auth required by design). |
| `/sondage/[code]` | IMPLEMENTED | Student poll participation (no auth required by design). |
| `/partage/[token]` | IMPLEMENTED | Public document sharing via token. Server Component, uses admin client correctly. |

## LEGACY / HISTORICAL

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard/ressources` | DEAD | Page stub, no active content. Sidebar does not expose it. |
| `/dashboard/historique` | DEAD | Page stub, superseded by teaching_events. |
| `/dashboard/studio` | DEAD | Legacy Studio. Superseded by `/dashboard/studio-ia`. |
| `/dashboard/planification` | DEAD | Legacy planning. Superseded by Mon Année. |
| `/dashboard/communication` | DEAD | Legacy communications. |
| `/dashboard/sondage` | DEAD | Legacy survey management. |
| `/dashboard/profil-ia` | IMPLEMENTED | AI profile configuration. |
| `/dashboard/profil` | IMPLEMENTED | User profile. |
| `/dashboard/forfaits` | IMPLEMENTED | Subscription tiers page. |
| `/dashboard/ecole` | IMPLEMENTED | School management. |
| `/dashboard/workflows/[id]` | IMPLEMENTED | Workflow runner. |
| `/dashboard/communaute` | DEAD | Community stub. |
| `/dashboard/classes/[id]/lecons/[leconId]` | IMPLEMENTED | Lesson detail. |
| `/dashboard/classes/[id]/lecons/[leconId]/presenter` | IMPLEMENTED | Lesson presentation mode. |
| `/dashboard/classes/[id]/lecons/[leconId]/tableau` | IMPLEMENTED | Tableau de classe. |
| `/dashboard/classes/[id]/salle` | IMPLEMENTED | Virtual classroom. |

---

## API Routes

| Route | Auth | Notes |
|-------|------|-------|
| `POST /api/auth/beta-signup` | None (validates invitation) | Invite check via service role before creating account. |
| `POST /api/spie/build-year` | `requireAuth()` + entitlement | Streaming SSE. Service role for DB writes. |
| `POST /api/spie/mark-taught` | `requireAuth()` | Full ownership chain verification. Append-only. |
| `POST /api/spie/lesson-engine` | `requireAuth()` | Lesson generation. |
| `POST /api/spie/lesson-regenerate` | `requireAuth()` | Section regeneration. |
| `POST /api/spie/lesson-to-enseigner` | `requireAuth()` | Convert lesson to teaching mode. |
| `POST /api/spie/lesson-to-quiz` | `requireAuth()` | Convert lesson to quiz. |
| `POST /api/spie/syllabus-save` | `requireAuth()` | Syllabus persistence. |
| `POST /api/spie/verify-pack` | `requireAuth()` | Pack verification. |
| `POST /api/spie/quality-gate` | `requireAuth()` | Quality check. |
| `POST /api/spie/pack-export` | `requireAuth()` | Pack export. |
| `POST /api/ia/generer` | ⚠️ NONE | **P0: No auth check. Quota optional.** |
| `POST /api/ia/curriculum` | `requireAuth()` | Curriculum analysis. |
| `POST /api/ia/assistant` | needs review | IA assistant. |
| `POST /api/ia/action` | needs review | IA action. |
| `POST /api/documents/indexer` | needs review | Document indexing. |
| `POST /api/export/pdf` | needs review | PDF export. |
| `POST /api/export/docx` | needs review | DOCX export. |
| `POST /api/export/pptx` | needs review | PPTX export. |
| `GET/POST /api/founder/*` | `requireFounderOrAdmin()` | Founder panel APIs. Server-side gated. |
| `POST /api/beta/feedback` | Auth + service role | Beta feedback submission. |
| `POST /api/beta/log` | Service role | Beta event logging. |

---

*Document generated as part of SCORGIA BETA-RC1 pre-beta audit.*
