# Breadcrumb_System.md
## Spécification système Breadcrumb — ScorgIA DS 2.0

**Date :** 2026-08-09  
**Composant :** `src/components/ui/Breadcrumb.tsx` (créé DESIGN-01)

---

## Philosophie

Le breadcrumb ScorgIA est **toujours visible, toujours cliquable, toujours minimal**. Il ne remplace pas la sidebar — il situe l'utilisateur dans la hiérarchie de la page courante.

- **Toujours visible** : non conditionnel à la présence de parents
- **Cliquable** : chaque segment est un lien fonctionnel
- **Minimal** : pas de chevron décoratif en excès, pas de couleur criarde

---

## Composant

```tsx
import Breadcrumb from '@/components/ui/Breadcrumb'

<Breadcrumb
  items={[
    { label: 'Mes classes', href: '/dashboard/classes' },
    { label: 'Secondaire 1 - Mathématiques' },
  ]}
/>
```

### Props

```typescript
interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string    // absent = dernier segment (non cliquable)
  }>
}
```

---

## Règles visuelles

- Séparateur : `/` ou `›` — légèrement atténué (opacity 0.4)
- Dernier segment : couleur `var(--text-primary)`, fontWeight 500
- Segments parents : couleur `var(--text-muted)`, cliquables, hover souligné
- Font-size : 12px
- Hauteur : 28px (ne comprime pas le contenu)

---

## Hiérarchie des pages

| URL | Breadcrumb |
|-----|-----------|
| `/dashboard` | (aucun — c'est la racine) |
| `/dashboard/classes` | Mes classes |
| `/dashboard/classes/[id]` | Mes classes › [Nom classe] |
| `/dashboard/classes/[id]/lecons` | Mes classes › [Nom classe] › Leçons |
| `/dashboard/classes/[id]/lecons/[leconId]` | Mes classes › [Nom classe] › Leçons › [Titre leçon] |
| `/dashboard/gerer/preparer` | Préparer |
| `/dashboard/gerer/enseigner` | Enseigner |
| `/dashboard/bibliotheque` | Bibliothèque |
| `/dashboard/outils` | Outils |
| `/dashboard/outils/quiz/[id]` | Outils › Quiz › [Nom quiz] |
| `/dashboard/calendrier` | Calendrier |
| `/dashboard/suivre` | Suivi |
| `/dashboard/profil` | Paramètres |

---

## Intégration (Phase 4 — après DESIGN-03 validé)

L'intégration sur chaque page se fait dans le layout local ou directement dans la page :

```tsx
// Exemple dans /dashboard/classes/[id]/page.tsx
<Breadcrumb items={[
  { label: isFr ? 'Mes classes' : 'My Classes', href: '/dashboard/classes' },
  { label: classe.nom },
]} />
```

**Ordre de migration prioritaire :**
1. `/dashboard/classes/[id]` — contexte classe fréquent
2. `/dashboard/classes/[id]/lecons/[leconId]` — navigation profonde
3. `/dashboard/gerer/preparer` — workspace principal
4. Autres pages dashboard

---

## CSS — Classes DS 2.0

```css
.ds-breadcrumb        /* Conteneur flex, gap 6px */
.ds-breadcrumb-item   /* Segment parent — cliquable */
.ds-breadcrumb-sep    /* Séparateur › */
.ds-breadcrumb-current /* Dernier segment — non cliquable */
```

Défini dans la section DS 2.0 de `globals.css`.

---

## États

| État | Comportement |
|------|-------------|
| Un seul segment | Affiché sans séparateur |
| Segment long | Tronqué à max 200px avec `text-overflow: ellipsis` |
| Hover sur lien | `text-decoration: underline` |
| Focus | `var(--focus-ring)` DS 2.0 |
