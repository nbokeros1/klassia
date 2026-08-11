# Motion Guidelines — ScorgIA DS 2.0
## Guide des animations et transitions

**Version :** 2.0 Phase 1  
**Date :** 2026-08-09  
**Philosophie :** Discret, utile, jamais gadget.

---

## Principe fondamental

> Une animation doit **renforcer la compréhension**, jamais la détourner.

Chaque animation doit répondre à une de ces questions :
- "Où suis-je maintenant ?" → Transition de navigation
- "Qu'est-ce qui vient de changer ?" → Animation de feedback
- "Que se passe-t-il ?" → Animation d'état (loading, building)
- "Est-ce que j'interagis correctement ?" → Micro-interaction hover/focus

Aucune animation décorative pure.

---

## Durées

| Token | Valeur | Usage |
|-------|--------|-------|
| `--dur-fast` | 100ms | Hover, focus rings, opacité subtile |
| `--dur-base` | 180ms | Transitions de cartes, boutons, shows/hides |
| `--dur-slow` | 300ms | Modales, overlays, panneaux latéraux |
| `--dur-enter` | 220ms | Entrée d'éléments dans le DOM |

**Règle :** Ne jamais dépasser 350ms pour un élément interactif.  
**Règle :** Les loaders peuvent être infinis mais leur vitesse doit être douce (1s–1.6s).

---

## Easing

| Token | Valeur | Usage |
|-------|--------|-------|
| `--ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | La majorité des transitions |
| `--ease-in` | `cubic-bezier(0.4, 0.0, 1.0, 1)` | Sortie (fermeture, disparition) |
| `--ease-inout` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Changements d'état dans la page |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Apparition des overlays, modales |

**Règle :** Ne jamais utiliser `ease` ou `linear` pour les éléments UI (trop mécanique).  
**Exception :** `linear` accepté pour les spinners de chargement (rotation continue).

---

## Keyframes définis

```css
/* Entrée (éléments qui apparaissent dans le DOM) */
@keyframes ds-slide-up     /* Glissement + scale — overlays, Command Bar */
@keyframes ds-scale-in     /* Scale uniquement — tooltips, dropdowns */
@keyframes ds-fade-in      /* Opacité — overlays légers, listes */

/* Loading */
@keyframes ds-shimmer      /* Skeleton loading horizontal */
@keyframes ds-spin-gentle  /* Spinner discret */
@keyframes ds-dot-pulse    /* 3 points pulsants (IATimeline active) */
@keyframes ds-progress-bar /* Barre de progression (futur) */

/* States */
@keyframes pulse           /* Global — déjà défini, pulsation douce */
@keyframes prepDots        /* Chat préparer — typing indicator */
```

---

## Règles par catégorie

### Cartes

```css
.ds-card {
  transition: border-color 180ms ease-out,
              box-shadow   180ms ease-out,
              transform    180ms ease-out;
}
.ds-card:hover {
  transform: translateY(-2px);     /* Élévation douce */
}
```

**Règle :** Jamais `translateY > -4px`. L'élévation est subtile.

### Boutons

```css
button {
  transition: all 150ms ease-out;
}
button:hover {
  transform: translateY(-1px);     /* Micro-lift */
}
button:active {
  transform: translateY(0);        /* Reset au clic */
}
```

**Règle :** Jamais `scale()` sur les boutons texte. Réservé aux FABs.

### Overlays (Command Bar, Modales)

```css
.overlay-enter {
  animation: ds-fade-in   100ms ease-out both;
}
.panel-enter {
  animation: ds-slide-up  220ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

**Règle :** L'overlay s'ouvre en `100ms`, le panneau en `220ms` — ils ne bougent pas en même temps.

### Focus rings

```css
.ds-focus:focus-visible {
  box-shadow: var(--focus-ring);
  /* 0 0 0 3px rgba(108, 92, 231, 0.35) */
}
```

**Règle :** Focus ring sur TOUS les éléments interactifs. Pas de `outline: none` sans alternative.

### IATimeline

- Step `active` → spinner 800ms + dots pulsants 1.4s
- Step `done` → transition couleur vers vert `--dur-base`
- Step `error` → pas d'animation (feedback immédiat)

### Sidebars et panneaux

- Ouverture : `translateX(-100%)` → `translateX(0)` en `250ms ease-out`
- Fermeture : `translateX(0)` → `translateX(-100%)` en `180ms ease-in`

---

## Anti-patterns

| ❌ Ne pas faire | ✅ Faire |
|----------------|---------|
| `animation-duration: 600ms` pour un hover | `100–180ms` |
| `bounce` sur des éléments fonctionnels | Réservé aux celebrations (quiz réussi) |
| Animer la `width` ou la `height` directement | Utiliser `transform: scale()` |
| `animation: spin 0.5s linear infinite` sur un spinner UI | `1s linear` minimum |
| `transition: all 0.3s` sur des inputs | Cibler uniquement `border-color, box-shadow` |
| Animations sur des listes de >20 items | Limiter aux 5 premiers items visibles |

---

## Contexte pédagogique — Règle spéciale

Les animations dans le contexte de **génération IA** (IATimeline) doivent être :
- Rassurantes (pas trop rapides — le cerveau pense que ça va trop vite)
- Progressives (chaque étape est visible)
- Non-bloquantes (l'enseignant peut faire autre chose pendant)

Le spinner IA tourne à **0.8s** (plus lent qu'un spinner technique standard de 0.5s).

---

## Voir aussi

- [Design_System_2.0_Phase1.md](Design_System_2.0_Phase1.md) — Spécification complète
- [Design_Decisions.md](Design_Decisions.md) — Décisions de design
