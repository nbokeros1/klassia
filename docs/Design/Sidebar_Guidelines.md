# Sidebar_Guidelines.md
## Guide d'implémentation — Sidebar 3.0 (DESIGN-03)

**Date :** 2026-08-09  
**Fichier :** `src/components/Sidebar.tsx`

---

## Architecture du composant

```
Sidebar (export default)
├── Logo (ScorgiaLogo + badge forfait)
├── Nav (3 sections filtrées)
│   ├── NavItem (composant interne réutilisable)
│   │   ├── Icon (LucideIcon, 15px, strokeWidth 1.75)
│   │   ├── Label (fr/en selon profil.langue)
│   │   └── Badge optionnel (notif count, rouge)
│   └── ...
├── Bottom
│   ├── ThemeToggle (si FEATURE_DARK_MODE_ENABLED)
│   ├── UserCard (avatar + forfait + logout)
│   └── AdminToggle (si isAdmin)
```

---

## Props

```typescript
interface SidebarProps {
  profil:      any           // Profil Supabase (utilisateurs table)
  activeHref:  string        // usePathname() depuis le layout parent
  onLogout?:   () => void    // Handler déconnexion Supabase
  notifCount?: number        // Badge rouge sur "Suivi" (0 = masqué)
}
```

---

## Icônes — Mapping complet

| Route | Lucide Icon | Justification sémantique |
|-------|-------------|--------------------------|
| `/dashboard` | `LayoutDashboard` | Tableau de bord = dashboard layout |
| `/dashboard/classes` | `GraduationCap` | Classes = enseignement |
| `/dashboard/gerer/preparer` | `PenLine` | Préparer = écrire/rédiger |
| `/dashboard/gerer/enseigner` | `Monitor` | Enseigner = présenter sur écran |
| `/dashboard/bibliotheque` | `Library` | Bibliothèque = ressources |
| `/dashboard/suivre` | `TrendingUp` | Suivi = progression/tendances |
| `/dashboard/calendrier` | `Calendar` | Calendrier = dates |
| `/dashboard/outils` | `Wrench` | Outils = utilitaires |
| `/dashboard/communaute` | `Globe` | Communauté = réseau mondial |
| `/dashboard/profil` | `Settings` | Paramètres = configuration |
| `/founder` | `Shield` | Admin = protection/sécurité |
| Déconnexion | `LogOut` | Standard universel |

**Règle :** Maximum 1 icône par entrée. Jamais d'emoji dans la sidebar.

---

## Détection état actif

```typescript
const isActive = (href: string) => {
  if (href === '/dashboard') return activeHref === '/dashboard'
  return activeHref === href || activeHref.startsWith(href + '/')
}
```

`/dashboard` est **exact match** pour éviter qu'il soit actif sur toutes les sous-pages.

---

## CSS — Classes utilisées

| Classe | Rôle |
|--------|------|
| `.sidebar` | Conteneur principal (240px, fixed, dark) |
| `.sidebar-logo` | Zone logo + badge forfait |
| `.sidebar-brand` | Texte "ScorgIA" |
| `.sidebar-label` | En-tête de section (ENSEIGNEMENT, ORGANISATION, ADMINISTRATION) |
| `.sidebar-item` | Item nav (inactif) |
| `.sidebar-item.active` | Item nav actif (fond violet subtil + barre gauche) |
| `.sidebar-item-icon` | Wrapper icône (18×18, display flex, centrage SVG) |
| `.sidebar-user` | Carte utilisateur (bas de sidebar) |
| `.sidebar-avatar` | Avatar initiales (32px, dégradé) |

---

## CSS — Tokens mis à jour

```css
--sidebar-w: 240px;  /* était 260px */

.sidebar-label {
  font-size: 10px;           /* était 10.5px */
  padding: 10px 14px 3px;   /* était 14px 16px 4px */
}

.sidebar-item {
  font-size: 13px;           /* était 13.5px */
  gap: 10px;                 /* était 11px */
  padding: 8px 11px;         /* était 9px 12px */
  border-left: 2px solid;    /* était 3px */
  color: rgba(255,255,255,0.52);  /* était 0.62 */
}

.sidebar-item.active {
  background: rgba(108,92,231,0.14);  /* était 0.22 */
}

.sidebar-item-icon {
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.85;             /* 1.0 quand active */
}
```

---

## Filtrage conditionnel

```typescript
// Founder — admin uniquement
{ adminOnly: true }   →  if (item.adminOnly && !isAdmin) return false

// Communauté — feature flag
{ communaute: true }  →  if (item.communaute && !FEATURE_COMMUNAUTE_VISIBLE) return false
```

---

## Badge notifications

```tsx
// Sur "Suivi" uniquement (notifBadge: true dans NAV_SECTIONS)
{notifCount > 0 && (
  <span style={{ fontSize: 9, background: '#F87171', borderRadius: 99, ... }}>
    {notifCount > 99 ? '99+' : notifCount}
  </span>
)}
```

---

## Mode admin

Le mode admin est géré par `localStorage.getItem('klassia_admin_mode')`.

Quand `adminMode === true`, la sidebar affiche `NAV_ADMIN` à la place des sections habituelles. Les routes admin (`/founder`, `/dashboard/admin/*`) ne sont pas dans `NAV_SECTIONS` pour éviter la confusion.

**Ne pas exposer les routes admin à un utilisateur non-admin** : le filtre `adminOnly` sur l'item Founder dans ADMINISTRATION protège l'affichage côté sidebar. L'accès réel est protégé côté route.

---

## Ajouter un item nav

1. Ajouter l'entrée dans `NAV_SECTIONS` (section concernée)
2. Vérifier que l'icône Lucide existe dans `node_modules/lucide-react/dist/lucide-react.d.ts`
3. Importer l'icône en haut du fichier
4. Si condition d'accès : ajouter `adminOnly` ou `communaute` ou créer un nouveau flag

---

## Ce qu'il ne faut PAS faire

- ❌ Utiliser un emoji comme icône nav
- ❌ Dépasser 1 icône par item
- ❌ Modifier la logique `useSupabase` / `onLogout` dans Sidebar
- ❌ Créer une sous-navigation accordéon sans validation PO
- ❌ Accéder à Supabase directement depuis Sidebar (passer via props)
