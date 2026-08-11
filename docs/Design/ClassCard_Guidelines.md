# ClassCard Guidelines
## Règles de design des cartes de classe — DS 2.0 DESIGN-08

**Date :** 2026-08-10

---

## Principes

1. **Une carte = un état** — La carte reflète l'état réel de la classe, pas un état idéalisé.
2. **Un CTA = une action** — Jamais deux boutons d'action primaire. Une seule direction claire.
3. **Discret, pas absent** — Les indicateurs de statut sont visibles sans être intrusifs.
4. **Données réelles uniquement** — Aucun chiffre inventé, aucun pourcentage fictif.

---

## CSS Préfixe

Toutes les classes DESIGN-08 utilisent le préfixe `c8-`.

```
c8-grid          — grille auto-fill, minmax(298px, 1fr), gap 16px
c8-card          — carte principale, cursor pointer, transition hover
c8-card-accent   — bande couleur 4px en haut
c8-card-body     — padding 16px, corps de la carte
c8-card-header   — flex row : avatar + info + pill + menu
c8-avatar        — 38×38px, border-radius 10px, letter bold
c8-card-info     — flex col : title + sub
c8-card-title    — 14px, 700, ellipsis
c8-card-sub      — 11px, muted, ellipsis
c8-pill          — 9px, 700, border-radius 99px
c8-pill--ok      — vert #34D399 (Année ✓)
c8-pill--info    — bleu #60A5FA (Curriculum ✓)
c8-pill--warn    — jaune #FBC34A (À configurer)
c8-chips         — flex wrap, gap 4px, chips matières
c8-chip          — 10px, violet, border-radius 99px
c8-ped-row       — flex wrap, gap 6px 10px, statut pédagogique
c8-ped-item      — 11px, flex row gap 3px
c8-ped--ok       — #10B981 (vert)
c8-ped--empty    — text-muted (gris)
c8-ped--neutral  — text-secondary (neutre)
c8-prog          — 3px, border-radius 99px, overflow hidden
c8-prog-fill     — transition width 0.6s, gradient ou vert
c8-activity      — 11px, muted, margin-bottom 11px
c8-cta           — 100% width, 8px padding, font 12px 700
c8-menu-wrap     — position relative
c8-menu-btn      — 26×26px, 7px border-radius, transparent
c8-dropdown      — position absolute, z-index 200, animation c8-drop-in
c8-dropdown-item — flex row, 12px, hover violet
c8-controls      — flex row, gap 12px, margin-bottom 20px
c8-search        — flex input + icon, border-radius 9px, 7px padding
c8-sort-tabs     — flex row, gap 3px
c8-sort-tab      — 11px, 600, border-radius 7px, hover
c8-sort-tab--active — violet background
c8-empty-search  — centré, 40px padding, muted
```

---

## Dimensions

| Élément | Valeur |
|---------|--------|
| Largeur min carte | 298px |
| Bande couleur | 4px |
| Avatar | 38×38px |
| Barre progression | 3px |
| Pill statut | 9px, padding 2px 7px |
| Dropdown z-index | 200 |
| Menu btn | 26×26px |

---

## Hover

```
c8-card:hover → transform: translateY(-2px)
onMouseEnter  → boxShadow: 0 8px 32px {accent}33
onMouseLeave  → boxShadow: var(--shadow-card)
```

La `boxShadow` dynamique (couleur de la classe) est gérée en inline style car elle dépend de `cls.couleur`.

---

## Animation dropdown

```css
@keyframes c8-drop-in {
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

Durée : 0.12s — suffisamment rapide pour ne pas gêner l'interaction.

---

## Menu rapide — règles

- Fermé par défaut. S'ouvre au clic sur `···`.
- Se ferme automatiquement sur tout clic extérieur (window `click` listener dans `useEffect`).
- Maximum 5 actions — ne jamais dépasser.
- `stopPropagation()` sur le container pour ne pas déclencher la navigation de la carte.
- L'ordre des actions : le plus fréquent en premier.

### Actions disponibles (dans l'ordre)

1. 📂 Ouvrir la classe → `/dashboard/classes/[id]`
2. ✍️ Préparer une leçon → `localStorage.setItem('klassia_active_classe', id)` + `/dashboard/gerer/preparer`
3. ▶ Enseigner → `/dashboard/gerer/enseigner?classe=[id]`
4. 📅 Programme annuel → `/dashboard/classes/[id]/programme`
5. 🎓 Salle de classe → `/dashboard/classes/[id]/salle`

---

## Responsive (M11)

La grille `auto-fill` avec `minmax(298px, 1fr)` s'adapte automatiquement :
- 1 colonne < 630px
- 2 colonnes 630–940px
- 3 colonnes > 940px

---

## Dark mode

Les overrides dark mode dans `globals.css` ciblent :
- `.c8-search` — fond et bordure
- `.c8-dropdown` — fond et bordure

Les autres éléments héritent des tokens CSS (`var(--text-primary)`, `var(--shadow-card)`, etc.) déjà mode-aware.

---

## Ce qu'il ne faut pas faire

- **Ne pas afficher deux boutons d'action** dans la carte (le menu ··· est le point d'accès aux actions secondaires)
- **Ne pas inventer de données** (ex. afficher "75% de progression" quand le compte est 0/0)
- **Ne pas placer le dropdown en position `fixed`** — il doit rester dans le flux de la carte
- **Ne pas ouvrir plusieurs menus à la fois** — `activeMenu` est une string, pas un tableau
