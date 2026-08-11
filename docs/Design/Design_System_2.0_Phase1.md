# ScorgIA Design System 2.0 — Phase 1
## Pedagogical Operating System — Référence système

**Version :** 2.0 Phase 1  
**Date :** 2026-08-09  
**Auteur :** ScorgIA Product  
**Statut :** LIVRÉ — En attente de validation Product Owner

---

## Vision

ScorgIA n'affiche pas des pages. ScorgIA raconte une **progression pédagogique**.

Chaque écran répond à une seule question. Le logiciel guide naturellement.

Inspirations : Apple, Linear, Figma, Cursor, Raycast, Notion, Vercel.  
**Identité :** propre à ScorgIA. Aucune copie.

---

## Philosophie

### Hiérarchie narrative

```
Contexte → Titre → Progression → Action principale → Contenu → Actions secondaires
```

### Principes cardinaux

| Principe | Application |
|----------|------------|
| **Une question par écran** | Jamais deux actions principales |
| **Respiration** | Espacement généreux, bruit visuel réduit |
| **WOW en 5 secondes** | L'utilisateur comprend l'écran en moins de 5 secondes |
| **Guidance permanente** | Le logiciel guide toujours, jamais l'utilisateur perdu |
| **Premium sans opulence** | Élégance minimaliste, pas ostentatoire |

---

## Architecture des tokens

### Fichier source : `src/app/globals.css`

La section `/* DS 2.0 — DESIGN SYSTEM 2.0 — PHASE 1 */` ajoute les tokens
sans remplacer les tokens existants.

#### Spacing scale

```css
--sp-1: 4px   --sp-2: 8px   --sp-3: 12px
--sp-4: 16px  --sp-5: 20px  --sp-6: 24px
--sp-8: 32px  --sp-10: 40px --sp-12: 48px  --sp-16: 64px
```

#### Typography scale

```css
--text-xs: 11px   --text-sm: 12px   --text-base: 14px
--text-lg: 16px   --text-xl: 18px   --text-2xl: 22px
--text-3xl: 28px  --text-4xl: 36px
```

#### Easing & Duration

```css
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1)
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
--dur-fast: 100ms   --dur-base: 180ms   --dur-slow: 300ms
```

#### Focus ring

```css
--focus-ring: 0 0 0 3px rgba(108, 92, 231, 0.35)
```

---

## Composants créés

### 1. CommandBar (`src/components/ui/CommandBar.tsx`)

**Mission 3 — Command Bar**

Déclencheur : `Ctrl+K` ou `Cmd+K`  
Intégration : `src/components/DashboardFloats.tsx` → actif sur toutes les pages dashboard

Fonctionnalités :
- Recherche fuzzy avec mise en évidence
- Chargement dynamique des classes Supabase
- Navigation clavier : `↑↓` + `Enter`
- Groupement par catégorie
- Fermeture sur `Échap` ou clic overlay

Commandes statiques :
- Navigation (Dashboard, Classes, Bibliothèque, Calendrier, Outils, Profil, Forfaits)
- Actions IA (Préparer une leçon, Créer une évaluation, Créer un quiz, Studio IA)
- Classes dynamiques (chargées depuis Supabase à l'ouverture)

### 2. Badge (`src/components/ui/Badge.tsx`)

**Mission 10 — Bibliothèque de badges**

Usage : `<Badge variant="ready" />` ou `<Badge variant="pret" dot />`

Variants statuts Teaching Pack :
- `pret` / `ready` → vert
- `generation_en_cours` / `building` → violet pulsant
- `partiellement_genere` / `partial` → ambre
- `erreur` / `error` → rouge
- `brouillon` / `draft` / `configuration` → gris
- `archive` / `archived` → gris désaturé

Variants métier :
- `curriculum`, `alberta` → bleu
- `pro`, `pro_plus` → violet
- `free` → gris

### 3. TeachingPackCard (`src/components/ui/TeachingPackCard.tsx`)

**Mission 4 — Carte Teaching Pack signature**

Affiche :
- Anneau de progression SVG animé (% complétion)
- Titre, matière, niveau
- Badge statut
- Barre de progression linéaire
- Stats : séquences / plans / leçons
- Meta : version, dernière modification
- CTA adaptatif : Continuer / Ouvrir / Reprendre

Effet signature : bordure supérieure violet-to-blue au hover (`.ds-pack-card::before`)

### 4. IATimeline (`src/components/ui/IATimeline.tsx`)

**Mission 7 — IA vivante**

Remplace les loaders classiques. Affiche les étapes du pipeline IA :
- `done` : cercle vert ✓
- `active` : cercle violet avec spinner discret + dots pulsants
- `pending` : cercle vide
- `error` : cercle rouge ✕
- `skipped` : cercle gris désaturé

Usage dans le wizard `BuildMyYearWizard` (remplacement futur des étapes texte).

### 5. EmptyState (`src/components/ui/EmptyState.tsx`)

**Mission 9 — États vides utiles**

Jamais "Aucun contenu." — toujours un message contextuel + actions.

Props : `icon`, `title`, `description`, `actions[]`, `compact`

### 6. Breadcrumb (`src/components/ui/Breadcrumb.tsx`)

**Mission 11 — Fil d'Ariane intelligent**

Usage :
```tsx
<Breadcrumb items={[
  { label: 'Mes classes', href: '/dashboard/classes', icon: '🎓' },
  { label: 'Mathématiques G9', href: '/dashboard/classes/uuid' },
  { label: 'Mon année scolaire' },
]} />
```

### 7. ResumeWidget (`src/components/ui/ResumeWidget.tsx`)

**Mission 6 — Reprendre là où vous étiez**

Carte cliquable affichant la dernière ressource travaillée.
Types : `classe`, `lecon`, `sequence`, `programme`

---

## CSS utilitaires

Définis dans `globals.css` section DS 2.0 :

| Classe | Effet |
|--------|-------|
| `.ds-card` | Carte premium avec hover élévation |
| `.ds-card-flat` | Carte sans hover |
| `.ds-focus` | Focus ring violet au clavier |
| `.ds-text-gradient` | Texte violet → lavande |
| `.ds-shimmer` | Skeleton loading |
| `.ds-slide-up` | Entrée glissement vers le haut |
| `.ds-scale-in` | Entrée scale |
| `.ds-fade-in` | Entrée fondu |
| `.ds-spin` | Rotation continue (loading) |
| `.ds-badge` | Badge unifié |
| `.ds-breadcrumb` | Fil d'Ariane |
| `.ds-empty` | Conteneur état vide |
| `.ds-timeline` | Timeline IA |
| `.ds-cmdk-*` | Styles Command Bar |
| `.ds-pack-*` | Styles Teaching Pack Card |

---

## Identité couleur

Le violet `#6C5CE7 / #7F77DD` reste la couleur de l'action.

| Rôle | Couleur |
|------|---------|
| Action principale | Violet `#6C5CE7` |
| Surfaces | Neutres (blanc/gris clair en light, dark navy en dark) |
| Respiration | Blanc pur |
| Structure | Gris (`--color-text-muted`) |
| Succès | Vert `#059669` |
| Attention | Ambre `#D97706` |
| Erreur | Rouge `#DC2626` |

---

## Missions Phase 1 — Statut

| Mission | Description | Statut |
|---------|-------------|--------|
| M1 | Nouvelle hiérarchie visuelle (tokens + utilitaires) | ✅ LIVRÉ |
| M2 | Header signature ScorgIA | 📋 Phase 2 |
| M3 | Command Bar (Ctrl+K) | ✅ LIVRÉ |
| M4 | Carte Teaching Pack premium | ✅ LIVRÉ |
| M5 | Dashboard cockpit | 📋 Phase 2 |
| M6 | "Reprendre là où vous étiez" | ✅ LIVRÉ |
| M7 | IA Timeline vivante | ✅ LIVRÉ |
| M8 | Cohérence cartes (tokens partagés) | ✅ LIVRÉ (tokens) |
| M9 | Empty states utiles | ✅ LIVRÉ |
| M10 | Bibliothèque badges | ✅ LIVRÉ |
| M11 | Breadcrumb intelligent | ✅ LIVRÉ |
| M12 | Micro-interactions | ✅ LIVRÉ (CSS transitions) |
| M13 | Responsive premium | ✅ LIVRÉ (tokens + media queries) |
| M14 | Design tokens centralisés | ✅ LIVRÉ |
| M15 | Identité ScorgIA | ✅ LIVRÉ |
| M16 | Audit global | ✅ Voir `Component_Audit.md` |

---

## DESIGN-03 — Navigation 3.0 (2026-08-09)

### Tokens mis à jour

```css
--sidebar-w: 240px;   /* était 260px */
```

### Sidebar 3.0 — Nouvelles règles CSS

```css
.sidebar-label    { font-size: 10px; padding: 10px 14px 3px; }
.sidebar-item     { font-size: 13px; gap: 10px; padding: 8px 11px; border-left: 2px; }
.sidebar-item.active { background: rgba(108,92,231,0.14); }  /* était 0.22 */
.sidebar-item-icon   { display: flex; align-items: center; justify-content: center; opacity: 0.85; }
```

### Composants modifiés

| Composant | Nature |
|-----------|--------|
| `src/components/Sidebar.tsx` | Réécriture complète — Sidebar 3.0 |
| `src/components/Topbar.tsx` | Suppression IaRing + pill crédits |

### Missions DESIGN-03 — Statut

| Mission | Description | Statut |
|---------|-------------|--------|
| M1 | Sidebar 3.0 — Lucide, 240px, 3 sections | ✅ LIVRÉ |
| M2 | Hiérarchie 3 blocs nav | ✅ LIVRÉ |
| M3 | État actif premium | ✅ LIVRÉ |
| M4 | Breadcrumb (composant déjà en DESIGN-01) | ✅ Disponible |
| M5 | Topbar simplifiée (suppression ring crédits) | ✅ LIVRÉ |
| M6 | Command Palette CTRL+K | ✅ DESIGN-01 |
| M7 | Audit icônes (-30% emoji) | ✅ LIVRÉ (sidebar) |
| M8–M17 | Dividers, typo, densité, motion, a11y | ✅ CSS LIVRÉ |

---

## Voir aussi

- [Component_Audit.md](Component_Audit.md) — Audit de cohérence visuelle
- [Visual_Consistency_Report.md](Visual_Consistency_Report.md) — Rapport de cohérence
- [Design_Decisions.md](Design_Decisions.md) — Décisions de design
- [Motion_Guidelines.md](Motion_Guidelines.md) — Guide des animations
- [DESIGN-01_Report.md](DESIGN-01_Report.md) — Rapport de livraison Phase 1
- [DESIGN-03_Pedagogical_Navigation.md](DESIGN-03_Pedagogical_Navigation.md) — Rapport de livraison Phase 3
- [DESIGN-04_Pedagogical_Workspace_Canvas.md](DESIGN-04_Pedagogical_Workspace_Canvas.md) — Rapport de livraison Phase 4

---

## DESIGN-04 — Pedagogical Workspace Canvas (2026-08-09)

### Nouveaux tokens CSS (globals.css)

Section `/* WORKSPACE CANVAS — DS 2.0 DESIGN-04 */` ajoutée :

```css
/* BuildDot — états de construction */
.ws-build-dot[data-state="pret"]    { color: #34D399; }
.ws-build-dot[data-state="partial"] { color: #FBC34A; }
.ws-build-dot[data-state="active"]  { color: #A78BFA; animation: ws-dot-pulse 1.4s infinite; }
.ws-build-dot[data-state="error"]   { color: #F87171; }
.ws-build-dot[data-state="todo"]    { color: rgba(255,255,255,0.18); }

/* Quick Actions */
.ws-doc-row:hover .ws-quick-menu { opacity: 1; pointer-events: all; }
.ws-quick-btn { background: rgba(108,92,231,0.18); color: #c4b5fd; }

/* Context chips */
.ws-pack-chip { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.38); }

/* Focus Mode */
.ws-focus-btn[data-active="true"] { background: rgba(108,92,231,0.1); color: var(--violet); }

@keyframes ws-dot-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
```

### Composants modifiés

| Composant | Nature |
|-----------|--------|
| `src/components/preparer/explorer/PedagogiqueExplorer.tsx` | BuildDot, province/year chips, quick actions, progression |
| `src/components/preparer/workspace/WorkspaceHeader.tsx` | Props `focusMode` + `onToggleFocus`, bouton Focus Mode |
| `src/components/preparer/assistant/AIAssistantPanel.tsx` | Largeur 300→268px |
| `src/app/dashboard/gerer/preparer/page.tsx` | `focusMode` state + `handleToggleFocus` |

### Missions DESIGN-04 — Statut

| Mission | Description | Statut |
|---------|-------------|--------|
| M1 | Canvas 3 zones (Explorer/Document/Assistant) | ✅ LIVRÉ |
| M2 | Explorateur vivant (province, année) | ✅ LIVRÉ |
| M3 | Progression intégrée (séquences, BuildDot) | ✅ LIVRÉ |
| M4 | Contexte permanent (chips province/année/statut) | ✅ LIVRÉ |
| M5 | Document central (espace +32px) | ✅ LIVRÉ |
| M6 | Assistant contextuel réduit (268px) | ✅ LIVRÉ |
| M7 | Navigation entre documents | ✅ Existant conservé |
| M8 | Build states ●◐✓⚠ | ✅ LIVRÉ |
| M9 | Quick Actions au survol (Leçon, Quiz) | ✅ LIVRÉ |
| M10 | Zéro bruit visuel | ✅ LIVRÉ |
| M11 | Motion utile (ws-dot-pulse, transitions) | ✅ LIVRÉ |
| M12 | Focus Mode mémorisé (localStorage) | ✅ LIVRÉ |
| M13–16 | Responsive, identité, performance, audit | ✅ LIVRÉ |

---

## DESIGN-06 — Invisible Intelligence

**Date :** 2026-08-10

### Philosophie

> L'IA n'est jamais le personnage principal. Elle se ressent, elle ne se montre pas.

### Composants modifiés

| Composant | Nature |
|-----------|--------|
| `src/app/globals.css` | Section `ii-*` CSS — Context Bar, Suggestion Strip, AI Levels |
| `src/components/preparer/workspace/WorkspaceHeader.tsx` | Suppression dead code IaRing + creditsIa, ajout contextBar + suggestion |
| `src/components/preparer/assistant/AIAssistantPanel.tsx` | docType prop, 4 actions contextuelles |
| `src/app/dashboard/gerer/preparer/page.tsx` | localStorage copilot, contextBar, docType, suggestion |
| `src/app/dashboard/page.tsx` | Suppression `✨` décoratif CTA |

### Missions DESIGN-06 — Statut

| Mission | Description | Statut |
|---------|-------------|--------|
| M1  | Context Bar | ✅ LIVRÉ |
| M3  | Suggestion Strip | ✅ LIVRÉ |
| M6  | Copilot Collapsed + localStorage | ✅ LIVRÉ |
| M8  | Quick prompts contextuels (docType) | ✅ LIVRÉ |
| M11 | Smart Empty States (CSS) | ✅ LIVRÉ |
| M14 | Quiet success toast (CSS) | ✅ LIVRÉ |
| M20 | Audit bruit IA | ✅ LIVRÉ |
| M21 | Design Language AI Visibility Levels | ✅ LIVRÉ |

---

## DESIGN-07 — Build My Year Experience 2.0

**Date :** 2026-08-10

### Philosophie

> « Votre année prend forme. » Pas « Étape 3 sur 5 ».

### Composants modifiés

| Composant | Nature |
|-----------|--------|
| `src/app/globals.css` | Section `d7-*` CSS — Stepper, Timeline, Success, Error |
| `src/components/build-year/BuildMyYearWizard.tsx` | StepIndicator, StepContexte, StepResume, BuildProgressView |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | handleOpenWorkspace, handoff workspace |

### Missions DESIGN-07 — Statut

| Mission | Description | Statut |
|---------|-------------|--------|
| M2  | Step Navigation redesign | ✅ LIVRÉ |
| M3  | Context Step (5 primaires + avancées) | ✅ LIVRÉ |
| M7  | Review Step minimal | ✅ LIVRÉ |
| M8  | Build Screen timeline | ✅ LIVRÉ |
| M9  | Live Year Preview (chips) | ✅ LIVRÉ |
| M10 | No Full-Screen Spinner | ✅ LIVRÉ |
| M12 | Error Experience | ✅ LIVRÉ |
| M13 | Final Success calme | ✅ LIVRÉ |
| M14 | Direct Workspace Handoff | ✅ LIVRÉ |
| M16 | Progressive Disclosure (`<details>`) | ✅ LIVRÉ |
| M17 | Copywriting simplifié | ✅ LIVRÉ |

---

## DESIGN-08 — Classes Experience 2.0

**Date :** 2026-08-10

### Philosophie

> « En moins de trois secondes, l'enseignant comprend l'état de chaque classe. »

Chaque carte devient un résumé pédagogique intelligent : statut, activité réelle, et une seule action claire.

### Composants modifiés

| Composant | Nature |
|-----------|--------|
| `src/app/globals.css` | Section `c8-*` CSS — Grid, Card, Search, Sort, Dropdown |
| `src/app/dashboard/classes/page.tsx` | Refonte complète de la grille + contrôles |

### Missions DESIGN-08 — Statut

| Mission | Description | Statut |
|---------|-------------|--------|
| M1  | Nom + Matière + Année + Statut + Progression + Activité | ✅ LIVRÉ |
| M2  | Statut pédagogique discret (✓/○/●) | ✅ LIVRÉ |
| M3  | ONE CTA smart par classe | ✅ LIVRÉ |
| M4  | Activité réelle (`updated_at` leçons) | ✅ LIVRÉ |
| M5  | Indicateurs discrets | ✅ LIVRÉ |
| M6  | Tri (4 options) | ✅ LIVRÉ |
| M7  | Recherche instantanée client-side | ✅ LIVRÉ |
| M8  | Hover preview (shadow couleur classe) | ✅ LIVRÉ |
| M9  | Menu rapide max 5 actions | ✅ LIVRÉ |
| M10 | Design premium (moins de bruit) | ✅ LIVRÉ |
| M11 | Layout responsive auto-fill | ✅ LIVRÉ |
| M12 | Animations hover/dropdown subtiles | ✅ LIVRÉ |
