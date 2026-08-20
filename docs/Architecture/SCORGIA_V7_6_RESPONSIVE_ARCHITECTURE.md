# SCORGIA V7.6 — Responsive Architecture

**Status:** IMPLEMENTED — pending Product Owner device review  
**Date:** 2026-08-20  
**Commit:** TBD (fix(ui): rebuild ScorgIA responsive architecture for mobile)

---

## 1. Root Cause Analysis

### P0 Defect (critical — all pages broken on Android)

The JS `useEffect` in `Sidebar.tsx` always called:
```ts
document.documentElement.style.setProperty('--sidebar-w', '240px')
```
CSS inline-style rules override `@media { :root { --sidebar-w: 0 } }` — the stylesheet
breakpoint rule was always losing to the JS inline assignment. Every page using
`marginLeft: 'var(--sidebar-w)'` remained offset by 240px even when the sidebar
was `display: none`.

**Additional P0 items:**
- `AssistantFlottant` panel: `width: 380` (px) — on a 375px phone overflows by 5px
- `SchoolYearWorkspaceShell` left nav: `width: 220; flexShrink: 0` — on 375px only 155px
  remains for content

---

## 2. Breakpoint Contract

| Range | Label | CSS selector |
|---|---|---|
| 0 – 768px | mobile | `@media (max-width: 768px)` |
| 769px – 1023px | tablet | (not yet defined) |
| 1024px+ | desktop | default |
| 0 – 480px | small phone | `@media (max-width: 480px)` |

---

## 3. Architecture Changes

### 3.1 Sidebar — JS fix (`src/components/Sidebar.tsx`)

**Before:**
```ts
useEffect(() => {
  const stored = localStorage.getItem('sidebar_compact') === 'true'
  document.documentElement.style.setProperty('--sidebar-w', stored ? '64px' : '240px')
}, [])
```

**After:**
```ts
useEffect(() => {
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches
  document.documentElement.style.setProperty(
    '--sidebar-w',
    isMobile() ? '0px' : stored ? '64px' : '240px',
  )
  const onResize = () => {
    if (isMobile()) {
      document.documentElement.style.setProperty('--sidebar-w', '0px')
      setMobileOpen(false)
    } else {
      document.documentElement.style.setProperty('--sidebar-w', c ? '64px' : '240px')
    }
  }
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [])
```

`toggleCompact` now guards against mobile: `if (isMobile()) return`.

### 3.2 Sidebar — Mobile drawer

Added `mobileOpen` state. Both admin and teacher returns are now `<>` fragments:

```tsx
return (
  <>
    <div className="mobile-header">  {/* fixed top bar, 52px */}
      <button onClick={() => setMobileOpen(prev => !prev)}>
        {mobileOpen ? <X /> : <Menu />}
      </button>
      <ScorgiaLogo variant="icon" />
      <span>ScorgIA</span>
    </div>
    {mobileOpen && <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar${mobileOpen ? ' sidebar--mobile-open' : ''}...`}>
      {/* existing sidebar content */}
    </aside>
  </>
)
```

### 3.3 CSS changes (`src/app/globals.css`)

**Old mobile block:**
```css
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .page-content { padding: 16px; }
}
```

**New mobile block:** sidebar transitions to slide-in drawer via `transform`.
- `.sidebar { transform: translateX(-100%); transition: 0.26s; width: 280px !important; z-index: 1001 }`
- `.sidebar--mobile-open { transform: translateX(0) }`
- `.mobile-header` visible on mobile (fixed top bar, z-index 30)
- `.mobile-drawer-overlay` visible when open (semi-transparent backdrop, z-index 1000)
- `.main-content { margin-left: 0 }` (redundant safety, real fix is JS `--sidebar-w: 0px`)
- `.prep-suggestion-grid { grid-template-columns: 1fr }` (was missing breakpoint)
- `.c13-copilot-wrap, .c14-explorer-col, .c14-copilot-col { display: none !important }` (prevent overflow)
- `body { padding-bottom: env(safe-area-inset-bottom, 0) }`
- `@media (max-width: 480px)` — single-column stats/content

### 3.4 AssistantFlottant (`src/components/AssistantFlottant.tsx`)

```ts
// Before
width: 380,
// After
width: 'min(380px, 100dvw)',
```

Panel now respects the full viewport width on any phone size.

### 3.5 SchoolYearWorkspaceShell (`src/components/mon-annee/workspace/SchoolYearWorkspaceShell.tsx`)

Added `navVisible` state. Left nav gains CSS class `mon-annee-left-nav` (and `--open` variant).
Mobile toggle button (☰) added to workspace header — hidden on desktop via CSS.

CSS in `globals.css`:
```css
@media (max-width: 768px) {
  .mon-annee-nav-toggle { display: flex !important; }
  .mon-annee-left-nav {
    position: fixed !important; left: -240px !important;
    width: 240px !important; height: 100vh !important;
    z-index: 1002; transition: left 0.24s;
  }
  .mon-annee-left-nav--open { left: 0 !important; }
}
```

---

## 4. Files Modified

| File | Type | Change |
|---|---|---|
| `src/components/Sidebar.tsx` | Modified | Mobile detect, drawer, fragment wrap |
| `src/app/globals.css` | Modified | Mobile breakpoint block, drawer CSS, Mon Année CSS |
| `src/components/AssistantFlottant.tsx` | Modified | Panel width `min(380px, 100dvw)` |
| `src/components/mon-annee/workspace/SchoolYearWorkspaceShell.tsx` | Modified | `navVisible` state, toggle button, nav CSS class |

---

## 5. What Was NOT Changed

- No DB migrations
- No Supabase changes
- No feature removal
- No `overflow-x: hidden` as primary fix
- No `transform: scale()` or zoom hacks
- Dashboard page.tsx, all other pages — untouched (fix is in `Sidebar.tsx` JS, affects all via CSS variable)

---

## 6. Known Remaining Gaps (post-beta)

- Topbar notifications inaccessible on mobile (overlaid by mobile header at same z-height)
- Tablet layout (769–1023px) — not explicitly addressed
- Typography `clamp()` not yet applied
- Touch target 44px audit not done
- Real device matrix test (320–1920px) not yet completed (pending PO device review)
