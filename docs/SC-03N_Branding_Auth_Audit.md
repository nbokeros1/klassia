# SC-03N — Audit & Correction du Branding Auth/Onboarding

**Date :** 2026-08-03
**Statut :** Complété

---

## 1. Occurrences trouvées (avant correction)

| Fichier | Occurrence | Type |
|---|---|---|
| `src/app/login/page.tsx` | Icône `K` en div inline + texte `KlassIA+` + slogan « Ton quartier général pédagogique » | Branding visible |
| `src/app/signup/page.tsx` | Icône `K` en div inline + texte `KlassIA` + slogan « Crée ton espace pédagogique gratuit » | Branding visible |
| `src/app/onboarding/page.tsx` (étape `profil`) | Texte JSX `Klass<span>IA</span><span>+</span>` + sous-titre | Branding visible |
| `src/app/onboarding/page.tsx` (étape `chemin`) | Texte JSX `Klass<span>IA</span><span>+</span>` | Branding visible |
| `src/components/ui/LogoKlassIA.tsx` | Composant SVG nommé LogoKlassIA, aria-label="ScorgIA", wordmark "ScorgIA" — **déjà partiellement corrigé** | Technique |
| `src/components/preparer/KlassIAFilePicker.tsx` | Nom de composant technique interne | Hors périmètre Auth |
| `buf.indexOf('\n__KLASSIA_ACTIONS__\n')` (onboarding) | Délimiteur de protocole interne — non modifié intentionnellement | Technique, non visible |
| 70+ fichiers dans `src/lib/`, `src/types/`, etc. | Occurrences dans noms de types, constantes, commentaires internes | Hors périmètre Auth |

### Note sur le grep
Les occurrences dans les pages Auth étaient en JSX splitté (`Klass<span>IA</span>`) et n'ont pas été captées par un grep littéral `KlassIA`. Audit réalisé par lecture directe des fichiers.

---

## 2. Fichiers créés

| Fichier | Action | Détail |
|---|---|---|
| `src/components/auth/AuthBranding.tsx` | **Créé** | Composant partagé de branding Scorgia pour les pages Auth et Onboarding |

### Composant AuthBranding

Props :
- `theme?: 'dark' | 'light'` — `dark` (défaut) pour login/signup, `light` pour onboarding
- `slogan?: string` — texte sous le logo
- `logoHeight?: number` — hauteur du logo en px (défaut : 44)
- `style?: React.CSSProperties` — surcharge de l'espace extérieur

Assets utilisés :
- `theme="dark"` → `/branding/scorgia-logo-dark.png`
- `theme="light"` → `/branding/scorgia-logo-light.png`

---

## 3. Fichiers modifiés

### `src/app/login/page.tsx`
- Import ajouté : `AuthBranding`
- Supprimé : div avec icône `K` + texte `KlassIA+` + slogan ancien
- Ajouté : `<AuthBranding slogan="Votre espace pédagogique intelligent" style={{ marginBottom: '32px' }} />`

### `src/app/signup/page.tsx`
- Import ajouté : `AuthBranding`
- Supprimé : div avec icône `K` + texte `KlassIA` + slogan ancien
- Ajouté : `<AuthBranding slogan="Créez votre espace pédagogique gratuit" style={{ marginBottom: '28px' }} />`

### `src/app/onboarding/page.tsx`
- Import ajouté : `AuthBranding`
- Supprimé (étape `profil`) : span JSX `KlassIA+` + sous-titre
- Ajouté (étape `profil`) : `<AuthBranding theme="light" slogan="Configurons votre profil" style={{ marginBottom: 24 }} />`
- Supprimé (étape `chemin`) : span JSX `KlassIA+`
- Ajouté (étape `chemin`) : `<AuthBranding theme="light" style={{ marginBottom: 20 }} />`
- **Conservé tel quel** : header de chat ScorgIA (ligne 747), placeholder « Répondez à ScorgIA », description Chemin B « ScorgIA crée tout automatiquement » — déjà corrects

---

## 4. Assets vérifiés

| Asset | Statut |
|---|---|
| `public/branding/scorgia-logo-dark.png` | Présent ✓ |
| `public/branding/scorgia-logo-light.png` | Présent ✓ |
| `public/branding/scorgia-icon.png` | Présent ✓ |
| `public/favicon.ico` | Présent ✓ |

---

## 5. Métadonnées vérifiées

`src/app/layout.tsx` :
```
title: 'Scorgia — L'assistant intelligent des enseignants'
description: 'Scorgia aide les enseignants francophones à préparer et animer leurs leçons avec l'IA'
```
→ Déjà corrects, aucune modification nécessaire.

---

## 6. Routes vérifiées

| Route | Statut branding |
|---|---|
| `/login` | Corrigé ✓ |
| `/signup` | Corrigé ✓ |
| `/onboarding` (étape profil) | Corrigé ✓ |
| `/onboarding` (étape chemin) | Corrigé ✓ |
| `/onboarding` (chat IA / génération) | Déjà correct ✓ |
| `/auth/callback` | Pas de branding visible |
| `/dashboard` | Hors périmètre Auth |

---

## 7. Occurrences historiques conservées (non modifiées)

- `__KLASSIA_ACTIONS__` : délimiteur de protocole API interne entre le texte et les actions IA dans les réponses streaming. Modifier ce délimiteur casserait la communication entre le client onboarding et l'API assistant.
- `KlassIAFilePicker` : nom de composant interne non visible dans l'interface Auth.
- `LogoKlassIA` : nom technique du composant SVG. Le wordmark affiché dit déjà « ScorgIA ». Renommage hors périmètre de ce ticket.
- Occurrences dans `src/lib/`, `src/types/`, `src/hooks/` : noms techniques, types, constantes non visibles dans les pages Auth.

---

## 8. Résultat TypeScript

```
npx tsc --noEmit → 0 erreur
```

---

## 9. Critères d'acceptation — bilan

| Critère | Résultat |
|---|---|
| Aucun KlassIA visible dans Auth/Onboarding | ✓ |
| Aucun logo K visible | ✓ |
| Login corrigé | ✓ |
| Signup corrigé | ✓ |
| Première connexion / Onboarding corrigé | ✓ |
| Branding partagé via AuthBranding | ✓ |
| Logo Scorgia compact (44px) | ✓ |
| Metadata corrigées | ✓ (déjà OK) |
| Favicon Scorgia | ✓ (déjà OK) |
| TypeScript : 0 erreur | ✓ |
| Aucune régression Auth | ✓ (logique inchangée) |
