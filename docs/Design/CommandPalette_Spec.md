# CommandPalette_Spec.md
## Spécification Command Palette — ScorgIA CTRL+K

**Date :** 2026-08-09  
**Composant :** `src/components/ui/CommandBar.tsx` (créé DESIGN-01)  
**Intégration :** `src/components/DashboardFloats.tsx`

---

## Objectif

La Command Palette permet aux enseignants de naviguer rapidement sans souris. Elle est accessible sur toutes les pages du dashboard via le raccourci **CTRL+K**.

---

## Raccourci clavier

| Raccourci | Action |
|-----------|--------|
| `CTRL+K` (Windows/Linux) | Ouvrir la palette |
| `CMD+K` (macOS) | Ouvrir la palette |
| `Escape` | Fermer |
| `↑ / ↓` | Naviguer dans les résultats |
| `Enter` | Valider la sélection |

---

## Sources de données

La palette fusionne 3 types de résultats :

### 1. Routes statiques

| Label | Route | Icône |
|-------|-------|-------|
| Tableau de bord | `/dashboard` | 🏠 |
| Mes classes | `/dashboard/classes` | 🎓 |
| Préparer | `/dashboard/gerer/preparer` | ✏️ |
| Enseigner | `/dashboard/gerer/enseigner` | 🖥️ |
| Bibliothèque | `/dashboard/bibliotheque` | 📚 |
| Paramètres | `/dashboard/profil` | ⚙️ |
| Calendrier | `/dashboard/calendrier` | 🗓️ |
| Outils | `/dashboard/outils` | 🛠️ |

### 2. Classes Supabase (dynamique)

Chargées depuis la table `classes` au moment de l'ouverture. Format :

```
[Nom classe] · [Niveau]
→ /dashboard/classes/[id]
```

### 3. Actions contextuelles (futur)

Prévu Phase 4 : actions disponibles selon la page courante (ex. "Exporter en Word", "Nouvelle leçon").

---

## Comportement de recherche

- Recherche fuzzy sur le label
- Tri : routes statiques → classes → actions
- Pas de résultat : message "Aucun résultat" (fr) / "No results" (en)

---

## CSS — Classes DS 2.0

```css
.ds-cmdk-overlay    /* Fond semi-transparent derrière la palette */
.ds-cmdk-modal      /* Conteneur flottant (max-width 560px) */
.ds-cmdk-input      /* Champ de recherche */
.ds-cmdk-list       /* Liste des résultats */
.ds-cmdk-item       /* Item résultat */
.ds-cmdk-item:hover /* État survol */
.ds-cmdk-group      /* En-tête de groupe */
.ds-cmdk-shortcut   /* Badge raccourci (CTRL+K) */
.ds-cmdk-empty      /* Message aucun résultat */
```

---

## Tokens utilisés

```css
--cmdk-bg: rgba(255,255,255,0.97)
--cmdk-border: rgba(15,35,65,0.09)
--cmdk-shadow: 0 24px 64px rgba(15,35,65,0.18)
--cmdk-input-bg: rgba(15,35,65,0.03)
--cmdk-item-hover: rgba(108,92,231,0.06)
--cmdk-item-active: rgba(108,92,231,0.1)
--cmdk-radius: 16px
```

Dark mode : overrides dans `[data-theme="dark"]`.

---

## Intégration DashboardFloats

La Command Palette est injectée une seule fois dans le layout dashboard via `DashboardFloats.tsx`. Elle n'est pas présente sur :
- `/dashboard/gerer/preparer` (workspace a son propre focus)
- Pages publiques (`/quiz/[code]`, `/sondage/[code]`)
- Pages d'authentification

---

## Contraintes

- **Ne jamais afficher sur les pages auth** (login, signup, onboarding)
- **Ne pas dupliquer** : une seule instance dans `DashboardFloats`
- **Accessibilité** : `role="dialog"`, `aria-modal="true"`, `aria-label="Recherche rapide"`
- **Performance** : les classes Supabase sont chargées lazy (à l'ouverture, pas au montage)

---

## Futur (Phase 4+)

- Actions contextuelles selon la page active
- Historique des recherches récentes (localStorage)
- Raccourcis directs depuis les résultats (ex. "Appuyer → pour aller à la classe")
