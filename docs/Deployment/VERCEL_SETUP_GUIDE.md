# Vercel — Guide de setup pas à pas (bêta)
> **Mission** : DEPLOY-BETA-01 · M16  
> **Date** : 2026-08-05  
> **Statut** : Guide pratique — À exécuter par le PO

---

## Avant de commencer

Lire en premier :
- `VERCEL_COMPATIBILITY_ASSESSMENT.md` — risques et plan Pro obligatoire
- `SCORGIA_BETA_ENVIRONMENT_VARIABLES.md` — toutes les variables à avoir sous la main
- `SUPABASE_AUTH_BETA_SETUP.md` — URL à configurer après déploiement

---

## Étape 1 — Souscrire Vercel Pro

1. vercel.com → Settings → Billing → Upgrade to Pro
2. Coût : ~$20/mois
3. Pourquoi Pro : timeout 300 s pour SSE (lesson-engine prend 90–180 s)

---

## Étape 2 — Ajouter `maxDuration` aux routes SSE

Avant de créer le projet Vercel, modifier ces deux fichiers :

**`src/app/api/spie/lesson-engine/route.ts`** — ajouter en haut du fichier (après les imports) :
```typescript
export const maxDuration = 300
```

**`src/app/api/spie/build-year/route.ts`** — même ajout :
```typescript
export const maxDuration = 300
```

Puis vérifier que le build passe : `npm run build`

---

## Étape 3 — Créer le projet Vercel

1. vercel.com → Dashboard → **Add New** → Project
2. **Import Git Repository** → sélectionner le repo `klassia`
3. Remplir les champs :

| Champ | Valeur |
|-------|--------|
| Project Name | `scorgia-beta` |
| Framework Preset | Next.js (auto-détecté) |
| Root Directory | `.` |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | `20.x` |

4. **Ne pas déployer encore** — cliquer sur "Configure Project" d'abord

---

## Étape 4 — Configurer les variables d'environnement

Dans la page de configuration du projet → **Environment Variables** :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | (depuis .env.local) | Production + Preview + Dev |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (depuis .env.local) | Production + Preview + Dev |
| `SUPABASE_SERVICE_ROLE_KEY` | (depuis .env.local) | **Production seulement** |
| `ANTHROPIC_API_KEY` | (depuis .env.local) | **Production seulement** |
| `NEXT_PUBLIC_APP_URL` | (laisser vide pour l'instant) | Production + Preview + Dev |
| `NEXT_PUBLIC_APP_NAME` | `ScorgIA` | Production + Preview + Dev |

---

## Étape 5 — Premier déploiement

1. Cliquer **Deploy**
2. Attendre 2–3 minutes (build ~90 s + déploiement)
3. Copier l'URL générée : `https://scorgia-beta-XXXXX.vercel.app` ou `https://scorgia-beta.vercel.app`

---

## Étape 6 — Mettre à jour les URLs

### Vercel

Retourner dans Settings → Environment Variables → `NEXT_PUBLIC_APP_URL` → mettre l'URL Vercel → Sauvegarder → Redéployer.

### Supabase Auth

Supabase Dashboard → Authentication → URL Configuration :
- **Site URL** : `https://scorgia-beta.vercel.app` (ou l'URL réelle)
- **Redirect URLs** : ajouter `https://scorgia-beta.vercel.app/auth/callback` et `https://scorgia-beta.vercel.app/**`

---

## Étape 7 — Smoke tests

Voir `BETA_SMOKE_TEST_MATRIX.md` — exécuter intégralement avant d'inviter les enseignants.

---

## Vérification rapide post-déploiement

```bash
# Vérifier que le site répond
curl -I https://scorgia-beta.vercel.app

# Doit retourner HTTP/2 200
```

---

## URL de référence

| Ressource | URL |
|-----------|-----|
| Vercel Dashboard | vercel.com/scorgia |
| Supabase Dashboard | supabase.com/dashboard/project/[project-id] |
| Anthropic Console | console.anthropic.com |

---

*Document créé : DEPLOY-BETA-01 · M16 · 2026-08-05*
