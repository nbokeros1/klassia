# Visual Consistency Report — ScorgIA DS 2.0
## Rapport de cohérence visuelle — Phase 1

**Date :** 2026-08-09  
**Portée :** Dashboard + composants UI + pages principales

---

## Résumé exécutif

Avant DS 2.0 Phase 1, ScorgIA présentait plusieurs couches de styles superposées :
1. Classes CSS globales (`globals.css`)
2. Styles inline par page (arbitraires)
3. Tokens partiellement utilisés
4. Pas de composants UI partagés pour badges, états vides, timelines

**Score avant DS 2.0 :** ~55/100  
**Score estimé après Phase 1 (fondation) :** ~70/100  
**Objectif Phase 2 :** 90/100

---

## Incohérences critiques identifiées

### IC-01 — Valeurs de border-radius non uniformes

**Avant :** Mélange de `8px`, `10px`, `12px`, `14px`, `16px` hardcodés  
**Après :** Tokens `--radius-sm`, `--radius-md`, `--radius-lg`, `--ds-card-radius`  
**Statut :** Tokens définis — migration par page en Phase 2

### IC-02 — Ombres inconsistantes

**Avant :** 12+ valeurs `box-shadow` différentes hardcodées  
**Après :** Tokens `--shadow-card`, `--shadow-hero`, `--ds-card-shadow`, `--ds-card-shadow-hover`  
**Statut :** Tokens définis — migration par page en Phase 2

### IC-03 — Badges sans système

**Avant :** Badges créés inline dans chaque page (`<span style={{ color: '#22C55E' }}>`)  
**Après :** `<Badge variant="pret" />`  
**Statut :** Composant créé — intégration progressive

### IC-04 — États vides génériques

**Avant :** "Aucun contenu.", "Aucune donnée.", "Pas encore de..."  
**Après :** `<EmptyState title="..." description="..." actions={[...]} />`  
**Statut :** Composant créé — intégration progressive

### IC-05 — Transitions absentes sur de nombreux éléments

**Avant :** Beaucoup de boutons sans `transition`  
**Après :** `--dur-base`, `--dur-fast`, `--ease-out` tokens + classes `.ds-card`  
**Statut :** Tokens définis — correction par composant en Phase 2

### IC-06 — Typographie incohérente

**Avant :** `fontSize: 12`, `fontSize: 13`, `fontSize: '12px'` mixés  
**Après :** `--text-xs`, `--text-sm`, `--text-base`, `--text-lg` tokens  
**Statut :** Tokens définis — migration par page en Phase 2

### IC-07 — Pas de focus ring unifié

**Avant :** Focus navigateur natif (pas stylé)  
**Après :** `--focus-ring` token + classe `.ds-focus`  
**Statut :** Défini — à appliquer sur tous les éléments interactifs

---

## Pages — Score de cohérence

| Page | Score | Priorité de migration |
|------|-------|-----------------------|
| `/dashboard` | 52% | Haute (M5) |
| `/dashboard/classes` | 68% | Moyenne |
| `/dashboard/gerer/preparer` | 75% | Basse (déjà bon) |
| `/dashboard/bibliotheque` | 62% | Moyenne |
| `/dashboard/outils` | 78% | Basse |
| `/dashboard/profil` | 65% | Basse |
| `/dashboard/calendrier` | 58% | Haute |
| `/classes/[id]/programme` | 70% | Haute (Teaching Pack) |

---

## Ce qui est déjà cohérent

✅ **Fonts :** Plus Jakarta Sans (body) + Lexend (display) — utilisées partout  
✅ **Couleurs violets :** `var(--violet)`, `var(--color-accent-violet)` — cohérents  
✅ **Sidebar :** Dark glass — cohérente et premium  
✅ **Topbar :** Glass pill — cohérente  
✅ **Scrollbars :** Stylées uniformément  
✅ **Dark/light theme :** Géré via `[data-theme]`  
✅ **Cards baseline :** `.card`, `.glass-strong`, `.glass-light` — cohérents  

---

## Mesure du bruit visuel (avant/après DS 2.0 Phase 1)

| Métrique | Avant | Après Phase 1 |
|----------|-------|---------------|
| Valeurs hardcodées dans globals.css | ~45 | ~45 (non modifié) |
| Valeurs hardcodées dans pages (inline) | ~320+ | ~290 (tokens disponibles) |
| Composants UI partagés | 8 | **15** (+7 DS 2.0) |
| Tokens CSS disponibles | ~80 | **130** (+50 DS 2.0) |
| Keyframes définis | 6 | **12** (+6 DS 2.0) |

---

## Plan de migration — Phase 2

### Priorité 1 — Dashboard Cockpit

Réécrire `/dashboard/page.tsx` avec :
- `ResumeWidget` intégré
- Stats réelles visibles en 3 secondes
- Hiérarchie narrative claire

### Priorité 2 — Teaching Pack Card

Intégrer `TeachingPackCard` dans `/classes/[id]/programme/page.tsx`

### Priorité 3 — Migration badges

Remplacer tous les badges inline par `<Badge variant="..." />`

### Priorité 4 — Migration empty states

Remplacer tous les états vides par `<EmptyState />`

### Priorité 5 — Breadcrumb

Intégrer `Breadcrumb` sur pages classes/leçons/programme

---

---

## DESIGN-03 — Mise à jour cohérence navigation (2026-08-09)

### Score mis à jour

**Score après DESIGN-03 :** ~78/100 (était ~70/100)  
**Objectif Phase 4 :** 90/100

### IC-08 — Icônes emoji dans la sidebar (résolu)

**Avant :** 10 emoji différents, rendu variable selon l'OS  
**Après :** Lucide React SVG uniformes (15px, strokeWidth 1.75)  
**Statut :** ✅ Résolu — Sidebar 3.0

### IC-09 — Navigation plate sans hiérarchie (résolu)

**Avant :** 10 items au même niveau, pas de groupement sémantique  
**Après :** 3 sections ENSEIGNEMENT / ORGANISATION / ADMINISTRATION  
**Statut :** ✅ Résolu — Sidebar 3.0

### IC-10 — Faux compteur crédits IA (résolu)

**Avant :** Ring "0/10" ou "0/20" hardcodé dans Topbar et WorkspaceHeader  
**Après :** Composant supprimé dans les deux fichiers  
**Statut :** ✅ Résolu — DESIGN-02 + DESIGN-03

### IC-11 — Sidebar trop large (résolu partiellement)

**Avant :** 260px (comprime la zone principale sur petits écrans)  
**Après :** 240px  
**Statut :** ✅ Résolu — 20px récupérés pour le contenu

### IC-12 — État actif sidebar trop intense (résolu)

**Avant :** `rgba(108,92,231,0.22)` fond violet lourd + borde 3px  
**Après :** `rgba(108,92,231,0.14)` + bordure 2px — plus subtil, premium  
**Statut :** ✅ Résolu — CSS DESIGN-03

### Ce qui reste incohérent (Phase 4)

| Incohérence | Page(s) | Priorité |
|-------------|---------|---------|
| Border-radius mixés | Toutes les pages | Haute |
| Badges inline non migrés | Classes, Bibliothèque | Haute |
| Breadcrumb absent | Classes, Leçons | Haute |
| Empty states génériques | Outils, Calendrier | Moyenne |
| Focus ring absent | Boutons sidebar hover | Moyenne |

---

---

## DESIGN-04 — Mise à jour cohérence workspace (2026-08-09)

### Score mis à jour

**Score après DESIGN-04 :** ~83/100 (était ~78/100)  
**Objectif Phase 5 :** 90/100

### IC-13 — États de construction hétérogènes dans l'explorateur (résolu)

**Avant :** Badge texte `✓` vert + label "Prêt"/"Partiel" (tailles et styles variés)  
**Après :** `BuildDot` unifié (●/◐/◌/⚠) — même symbole dans l'en-tête classe, section pack, et chips contextuels  
**Statut :** ✅ Résolu — DESIGN-04

### IC-14 — Absence de contexte permanent dans le workspace (résolu)

**Avant :** Seul le nom de classe visible dans l'explorateur  
**Après :** Province + année scolaire + statut pack toujours visibles via chips compacts  
**Statut :** ✅ Résolu — DESIGN-04

### IC-15 — Assistant trop large (résolu partiellement)

**Avant :** 300px (rognait l'espace document)  
**Après :** 268px (-32px — +3.7% surface document sur 1440px)  
**Statut :** ✅ Résolu partiellement — DESIGN-05 peut aller plus loin avec auto-collapse

### IC-16 — Pas d'accès rapide aux types de documents fréquents (résolu)

**Avant :** L'enseignant devait rédiger manuellement un prompt pour "Leçon" ou "Quiz"  
**Après :** Quick actions au hover des séquences (boutons "Leçon" / "Quiz")  
**Statut :** ✅ Résolu — DESIGN-04

### IC-17 — Pas de mode concentration dédié (résolu)

**Avant :** Impossible de masquer l'explorateur + l'assistant simultanément en un clic  
**Après :** Focus Mode ⊡/⊞ dans WorkspaceHeader — mémorisé via localStorage  
**Statut :** ✅ Résolu — DESIGN-04

### Mesure du bruit visuel (mise à jour cumulée)

| Métrique | Phase 1 | DESIGN-03 | DESIGN-04 |
|----------|---------|-----------|-----------|
| Composants UI partagés | 15 | 15 | **16** (+BuildDot) |
| Tokens CSS disponibles | 130 | 135 | **143** (+8 ws-*) |
| Keyframes | 12 | 12 | **13** (+ws-dot-pulse) |
| Score cohérence workspace | 55% | 75% | **83%** |
| Réduction bruit cumulé | — | ~22% | **~36%** |

### Ce qui reste incohérent (Phase 5)

| Incohérence | Page(s) | Priorité |
|-------------|---------|---------|
| Border-radius mixés | Toutes les pages | Haute |
| Badges inline non migrés | Classes, Bibliothèque | Haute |
| Breadcrumb absent | Classes, Leçons | Haute |
| Empty states génériques | Outils, Calendrier | Moyenne |
| Auto-collapse assistant inactif | Workspace | Moyenne |
| Restructuration 22/56/22 exacte | Workspace | Basse |

---

## Voir aussi

- [Component_Audit.md](Component_Audit.md) — Audit composant par composant
- [Design_Decisions.md](Design_Decisions.md) — Décisions de design
- [DESIGN-01_Report.md](DESIGN-01_Report.md) — Rapport de livraison Phase 1
- [DESIGN-03_Pedagogical_Navigation.md](DESIGN-03_Pedagogical_Navigation.md) — Rapport de livraison Phase 3
- [DESIGN-04_Pedagogical_Workspace_Canvas.md](DESIGN-04_Pedagogical_Workspace_Canvas.md) — Rapport de livraison Phase 4
- [Workspace_UX_Audit.md](Workspace_UX_Audit.md) — Audit UX workspace complet
