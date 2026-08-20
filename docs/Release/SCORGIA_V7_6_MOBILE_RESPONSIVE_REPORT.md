# SCORGIA V7.6 — Mobile Responsive Architecture Report

**Date:** 2026-08-20  
**Author:** Claude Sonnet 4.6 / Eddy Nwaha  
**Quality gates:** tsc 0 errors | build exit 0  
**Push status:** LOCAL ONLY — DO NOT PUSH before PO validation

---

## Executive Summary

Production Android was visually broken: main content was offset 240px to the right
(behind the viewport). Root cause: JS always set `--sidebar-w: 240px` regardless of
screen size; CSS media-query override cannot beat an inline style. This release fixes
the root cause in JS and adds a mobile drawer navigation pattern.

---

## P0 Defects Fixed

| ID | Defect | Root Cause | Fix |
|---|---|---|---|
| P0-01 | 240px left offset on all dashboard pages (Android) | `--sidebar-w` never reset to 0 by JS | Detect `window.matchMedia('(max-width: 768px)')` in Sidebar.tsx useEffect, set `0px` on mobile; add resize listener |
| P0-02 | AssistantFlottant panel overflows viewport on 375px phones | `width: 380` hardcoded | `width: 'min(380px, 100dvw)'` |
| P0-03 | Mon Année two-pane: 220px fixed left nav leaves ≤155px for content on 375px | `width: 220; flexShrink: 0` with no mobile handling | CSS drawer pattern + `navVisible` state toggle |

---

## Changes Summary

### `src/components/Sidebar.tsx`
- **`mobileOpen` state** added
- **useEffect** now calls `isMobile()` → sets `--sidebar-w: 0px` on mobile
- **Resize listener** closes drawer and resets `--sidebar-w` on viewport change
- **`toggleCompact`** guarded — no-op on mobile
- **Both returns** (admin mode + teacher mode) wrapped in `<>` fragment
- **Mobile header** (`<div className="mobile-header">`) added: hamburger (Menu/X icon) + logo + title
- **Overlay** (`<div className="mobile-drawer-overlay">`) conditionally rendered when `mobileOpen`
- **`sidebar--mobile-open`** class drives the CSS transform on mobile

### `src/app/globals.css`
- Old `display: none` mobile sidebar rule → replaced with `transform: translateX(-100%)` drawer pattern
- Added `.mobile-header` styles (fixed, 52px, z-index 30, dark glass background)
- Added `.mobile-drawer-overlay` styles
- Added `.prep-suggestion-grid { grid-template-columns: 1fr }` at 768px (was missing)
- Added `.c13-copilot-wrap`, `.c14-explorer-col`, `.c14-copilot-col { display: none !important }` at 768px
- Added `body { padding-bottom: env(safe-area-inset-bottom, 0) }`
- Added `@media (max-width: 480px)` block: single-column stats + reduced padding
- Added `.mon-annee-nav-toggle` + `.mon-annee-left-nav` CSS for Mon Année drawer

### `src/components/AssistantFlottant.tsx`
- Panel `width: 380` → `width: 'min(380px, 100dvw)'`

### `src/components/mon-annee/workspace/SchoolYearWorkspaceShell.tsx`
- Added `navVisible` state (default `false`)
- Added `mon-annee-nav-toggle` button in workspace header (☰, hidden on desktop)
- Left nav gets `mon-annee-left-nav` CSS class (and `--open` variant when `navVisible`)

---

## Quality Gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `next build` | exit 0 |
| No `overflow-x: hidden` as primary fix | PASS |
| No `transform: scale()` or zoom | PASS |
| No DB migration | PASS |
| No Supabase changes | PASS |
| No feature removal | PASS |

---

## What This Does NOT Fix (intentional scope limit)

- Topbar notifications hidden under mobile header (acceptable for beta)
- Tablet range (769–1023px) not explicitly addressed
- Typography `clamp()` scaling not yet applied
- Touch target 44px minimum not enforced
- Real device matrix (320–1920px) — pending PO review on physical device

---

## Risk Assessment

**LOW.** All changes are CSS/JS presentation layer only. No database, no API, no auth.
Rollback: revert `fix(ui): rebuild ScorgIA responsive architecture for mobile` commit.

---

## RECOMMENDATION: GO FOR PO DEVICE REVIEW

Test checklist for PO:
- [ ] Dashboard on Android — content visible without horizontal scroll
- [ ] Hamburger button opens sidebar drawer
- [ ] Tap overlay closes drawer
- [ ] AssistantFlottant opens without overflow on 375px phone
- [ ] Mon Année ☰ button shows/hides left navigation
- [ ] Desktop unchanged (sidebar compact toggle still works)
