# RELEASE-FIX-01 — Rapport de stabilisation
**ScorgIA Beta 0.9.2 · Bodingo AI Tech Inc. · 2026-08-07**

---

## Verdict final

> **RELEASE-FIX-01 VALIDÉ**

---

## 1. Origine de l'erreur React key

**Fichier :** `src/app/dashboard/ecole/page.tsx` — ligne ~600

**Code incriminé :**
```tsx
{HEATMAP.map((row, ri) => (
  <>
    <div key={`label-${ri}`}>...</div>
    {row.map((val, ci) => <div key={`${ri}-${ci}`}>...</div>)}
  </>
))}
```

**Cause :** Le `<>` (React.Fragment court) retourné directement par `.map()` n'avait pas de `key`. Seuls ses enfants avaient des clés — React avertit sur le fragment lui-même.

---

## 2. Correction appliquée

**Stratégie choisie :** Remplacement de la page entière par un redirect serveur.

**Raison :** La page `/dashboard/ecole` était l'ancien "Admin Terminal v2.1" (100% données fictives, design terminal/cyber). Corriger uniquement le Fragment tout en laissant le reste aurait maintenu l'interface illégale. La décision correcte était de supprimer la page.

**Fichier :** `src/app/dashboard/ecole/page.tsx`

```tsx
import { redirect } from 'next/navigation'

// Legacy admin terminal — replaced by the Founder Operating Center
export default function EcolePage() {
  redirect('/founder')
}
```

**Résultat :** 0 warning React key. La route `/dashboard/ecole` redirige immédiatement vers `/founder` (HTTP 307 server-side).

---

## 3. Audit `/dashboard/ecole`

| Élément | `/dashboard/ecole` (avant) | `/founder` | Décision |
|---------|---------------------------|-----------|---------|
| Design | Terminal cyber, `#000` background, font Courier New | Premium dark mode indigo FOC | Redirect |
| Branding | `KLASS//IA`, `ADMIN TERMINAL v2.1` | `Founder Operating Center · ScorgIA` | Redirect |
| Données | 100% statiques/fictives (MRR 14 200$, 312 enseignants, NPS 74...) | Réelles depuis Supabase | Redirect |
| Accès | `profil.type_compte === 'admin'` | `role === founder / super_admin / is_admin` | Redirect |
| Fonctionnalités uniques | Aucune | Toutes réelles | Aucune migration nécessaire |
| Ticker KPIs | Fictifs (MRR, sessions, NPS, conversion) | Pas de ticker (FOC statique) | Supprimé |
| Heatmap rétention | Données statiques | Pas de heatmap (FOC BI réel) | Supprimé |
| Géographie | Données statiques | Monitoring FOC | Supprimé |
| Activité live | Feed simulé (interval 10s) | Realtime Supabase (Overview) | Supprimé |

**Conclusion :** Aucune fonctionnalité unique utile existait dans `/dashboard/ecole`. Tout était fictif. Redirect propre vers `/founder`.

---

## 4. Décision de routing

| Route | Avant | Après |
|-------|-------|-------|
| `/dashboard/ecole` | Admin Terminal v2.1 (données fictives) | Redirect → `/founder` |
| `NAV_ADMIN[0]` dans Sidebar | "Vue d'ensemble" → `/dashboard/ecole` | "Founder Center" → `/founder` |
| `toggleAdminMode()` | → `/dashboard/ecole` | → `/founder` |
| `UserCard` en admin mode | → `/dashboard/ecole` | → `/founder` |
| "Administration" dans sidebar enseignant | → `/dashboard/admin/utilisateurs` | → `/founder` |

**Architecture résultante :**
- `/founder` = seul centre administratif Founder Operating Center
- `/dashboard/admin/utilisateurs`, `/dashboard/admin/inscriptions`, `/dashboard/admin/analytics` = conservés (données réelles, rôle admin)
- `/dashboard/ecole` = redirect transparent vers `/founder`

---

## 5. Legacy supprimé

| Élément | Fichier | Action |
|---------|---------|--------|
| `KLASS//IA` (UI) | `ecole/page.tsx` | Supprimé via redirect |
| `ADMIN TERMINAL v2.1` (UI) | `ecole/page.tsx` | Supprimé via redirect |
| Style terminal cyber (fond `#000`, Courier New) | `ecole/page.tsx` | Supprimé via redirect |
| Scanlines / grain overlay | `ecole/page.tsx` | Supprimé via redirect |
| TICKER_ITEMS fictifs | `ecole/page.tsx` | Supprimé via redirect |
| USERS fictifs (Marie Leblanc, Jean-Baptiste Martin...) | `ecole/page.tsx` | Supprimé via redirect |
| `KLASSIA_FLOW_PROFILE` / `KLASSIA_TL_*` (localStorage) | `useFlowEngine.ts`, `TeachingContext.tsx` | Conservés (clés internes non visibles) |
| `KlassIA+` dans commentaires de types | `timeline.ts`, `useAIAssistant.ts` | Conservés (historique interne) |

---

## 6. Données fictives supprimées

Tous les KPIs fictifs suivants sont définitivement éliminés :

| KPI fictif | Valeur fictive | Statut |
|------------|---------------|--------|
| MRR | 14 200 $ | ✅ Supprimé |
| MRR growth | +491% | ✅ Supprimé |
| Enseignants actifs | 312 | ✅ Supprimé |
| Churn | 1.8% | ✅ Supprimé |
| ARPU | 9.00$ | ✅ Supprimé |
| Sessions/jour | 1 247 | ✅ Supprimé |
| IA calls | 847 | ✅ Supprimé |
| NPS Score | 74 | ✅ Supprimé |
| Exports/jour | 234 | ✅ Supprimé |
| Conversion | 3.2% | ✅ Supprimé |
| Users fictifs | 8 noms inventés | ✅ Supprimé |
| Heatmap | 6×6 matrice statique | ✅ Supprimé |
| Géographie | 5 régions statiques | ✅ Supprimé |
| Activity feed | Événements simulés | ✅ Supprimé |

**Politique de données réelles (FOC) :** Toutes les métriques du Founder Operating Center proviennent directement de Supabase. Si une donnée n'est pas disponible, l'interface affiche "0" ou "Aucune donnée disponible" — jamais de valeur fictive.

---

## 7. Favicon

### Situation avant
- `src/app/favicon.ico` — binaire, contient le "K" de KlassIA
- `public/favicon.svg` — contient le "K" de KlassIA (polygones SVG)
- `layout.tsx` metadata → pointait vers `/favicon.ico`

### Actions effectuées
1. **Créé** `src/app/icon.svg` — ScorgIA "S" indigo (`#6366F1` → `#4F46E5`), fond rond carré `rx="20"`, lettre "S" blanche bold — Next.js App Router sert automatiquement ce fichier comme favicon moderne
2. **Remplacé** `public/favicon.svg` — même design "S" indigo
3. **Mis à jour** `layout.tsx` metadata — icons pointent vers `/icon.svg` et `/branding/scorgia-icon.png`

### Politique favicon
- `src/app/favicon.ico` reste intact (fichier binaire du "K", impossible de remplacer sans asset .ico)
- Les navigateurs modernes (Chrome 80+, Firefox 41+, Safari 12+) utiliseront `/icon.svg` en priorité
- Les navigateurs legacy tomberont sur `/favicon.ico` (K) — acceptable pour la bêta
- Asset officiel ScorgIA : `/branding/scorgia-icon.png` (utilisé par le composant `ScorgiaLogo`)

---

## 8. Metadata navigateur

### Avant
```tsx
title: 'Scorgia — L\'assistant intelligent des enseignants',
description: 'Scorgia aide...',
icons: { icon: '/favicon.ico', shortcut: '/favicon.ico', apple: '/favicon.ico' }
```

### Après
```tsx
title: {
  default:  'ScorgIA — L\'assistant intelligent des enseignants',
  template: '%s | ScorgIA',
},
description: 'ScorgIA aide les enseignants francophones à préparer et animer leurs leçons avec l\'IA',
applicationName: 'ScorgIA',
icons: {
  icon:     [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/branding/scorgia-icon.png', type: 'image/png' }],
  shortcut: '/branding/scorgia-icon.png',
  apple:    '/branding/scorgia-icon.png',
},
```

**Changements :**
- `Scorgia` → `ScorgIA` (casse officielle de la marque)
- Template `%s | ScorgIA` — les pages qui exportent leur propre `metadata.title` afficheront "Dashboard | ScorgIA", etc.
- `applicationName: 'ScorgIA'` — utilisé par PWA/mobile
- Aucune metadata "KlassIA" ne subsiste

---

## 9. Cache favicon — Instructions de test

Les navigateurs mettent fortement les favicons en cache (parfois plusieurs heures).

**Procédure de test après déploiement :**
1. Arrêter le serveur de développement (`Ctrl+C`) et le relancer (`npm run dev`)
2. Dans l'onglet navigateur : `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac) — hard refresh
3. Ouvrir un **nouvel onglet** — le favicon peut changer uniquement dans les nouveaux onglets
4. Tester en **navigation privée** — pas de cache
5. Dans Chrome : `F12` → Application → Storage → Clear site data → cocher "Favicon cache"
6. Dans Firefox : `about:cache` → Clear cache

**Note :** Si le favicon "K" persiste après hard refresh en navigation privée, vérifier que `/icon.svg` est bien servi par Next.js (`http://localhost:3000/icon.svg` doit retourner le SVG).

---

## 10. Tests visuels

| Page | Interface terminal | KLASSIA visible | Métriques fictives | Favicon S | React errors |
|------|-------------------|-----------------|--------------------|-----------|-------------|
| `/dashboard/ecole` | ✅ Supprimé (redirect) | ✅ Supprimé | ✅ Supprimé | N/A | N/A |
| `/founder` | ✅ FOC indigo premium | ✅ Absent | ✅ Données réelles | ⏳ Vérifier navigateur | ✅ 0 |
| `/founder/utilisateurs` | ✅ FOC indigo premium | ✅ Absent | ✅ Réelles Supabase | ⏳ | ✅ 0 |
| `/founder/beta` | ✅ FOC indigo premium | ✅ Absent | ✅ Réelles Supabase | ⏳ | ✅ 0 |
| `/founder/ia` | ✅ FOC indigo premium | ✅ Absent | ✅ Réelles Supabase | ⏳ | ✅ 0 |
| Dashboard enseignant | ✅ Dashboard standard | ✅ "ScorgIA" | N/A (pas de KPIs) | ⏳ | ✅ 0 |

*⏳ = vérifier en navigateur après déploiement (cache favicon)*

---

## 11. Console développement

**Après les corrections :**
- 0 erreur `Each child in a list should have a unique "key" prop` (source éliminée)
- 0 warning React `jsx-key` dans les fichiers Founder (confirmé FOUNDER-02A)
- Les warnings `react-hooks/set-state-in-effect` restants sont des patterns pré-existants côté admin

---

## 12. TypeScript

```bash
npx tsc --noEmit
```
**Résultat :** ✅ exit 0 — 0 erreur

---

## 13. Lint

```bash
npx eslint "src/app/dashboard/ecole/page.tsx" "src/components/Sidebar.tsx" "src/app/layout.tsx"
```

**Résultat :** `ecole/page.tsx` et `layout.tsx` → 0 erreur.

`Sidebar.tsx` → erreurs pré-existantes (non introduites par RELEASE-FIX-01) :
- `@typescript-eslint/no-explicit-any` ×2 — `profil: any` interface (`SidebarProps`, `UserCard`)
- `react-hooks/set-state-in-effect` ×1 — `setAdminMode` dans `useEffect`
- `react-hooks/static-components` ×2 — `NavItem` défini dans le render (pattern existant)
- `@typescript-eslint/no-unused-vars` ×1 — `SectionLabel` déclaré mais non utilisé

Ces erreurs existaient avant RELEASE-FIX-01. Aucune n'est une régression.

---

## 14. Build

```bash
npm run build
```
**Résultat :** ✅ BUILD_EXIT:0

```
✓ Compiled successfully in 29.4s
✓ Generating static pages (117/117) in 3.6s
```

117 pages compilées (116 précédentes + 1 page statique de redirect `/dashboard/ecole`).

---

## 15. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/app/dashboard/ecole/page.tsx` | Remplacé : server redirect → `/founder` |
| `src/components/Sidebar.tsx` | 4 références `/dashboard/ecole` → `/founder`, "Founder Center" dans NAV_ADMIN |
| `src/app/layout.tsx` | Titre `ScorgIA`, template `%s \| ScorgIA`, icons SVG + PNG |
| `public/favicon.svg` | Remplacé : "S" indigo ScorgIA |
| `src/app/icon.svg` | **Créé** : "S" indigo ScorgIA (Next.js App Router favicon) |
| `docs/Deployment/RELEASE-FIX-01_Report.md` | **Créé** : ce document |

---

## 16. Risques restants

| Risque | Niveau | Mitigation |
|--------|--------|-----------|
| Cache favicon "K" en production | Faible | Vider cache navigateur (procédure §9) |
| `favicon.ico` binaire contient encore "K" | Faible | Remplacer avec asset ScorgIA .ico avant lancement public |
| Admins qui cliquaient "Vue d'ensemble" → `/dashboard/ecole` | Aucun | Redirect transparent vers `/founder` |
| Admin toggle : `klassia_admin_mode` localStorage key | Cosmétique | Interne, pas visible utilisateur |
| `SectionLabel` unused dans Sidebar | Cosmétique | Supprimer si nettoyage futur |

---

## Checklist Product Owner

- [x] React key warning → éliminé (source de la page supprimée)
- [x] Interface terminal KLASS//IA → supprimée
- [x] Données fictives (MRR, NPS, sessions...) → supprimées
- [x] Routing admin → unifié vers `/founder`
- [x] Branding "Scorgia" → corrigé en "ScorgIA" dans metadata
- [x] Favicon SVG → ScorgIA "S" indigo créé
- [x] Metadata navigateur → title template, applicationName, icons
- [x] TypeScript → 0 erreur
- [x] Build → succès (117 pages, exit 0)
- [ ] Test visuel favicon en navigateur (après vidage cache)
- [ ] Remplacer `favicon.ico` binaire avant lancement public
