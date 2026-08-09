# ScorgIA — Variables d'environnement bêta
> **Mission** : DEPLOY-BETA-01 · M3  
> **Date** : 2026-08-05  
> **Statut** : Référence officielle — Ne pas modifier sans validation PO

---

## Vue d'ensemble

6 variables définies dans `.env.local` (dev) / Vercel Environment Variables (prod).

| Variable | Portée | Type | Obligatoire |
|----------|--------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Serveur | Public | ✅ Oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Serveur | Public | ✅ Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur seulement | Secret | ✅ Oui |
| `ANTHROPIC_API_KEY` | Serveur seulement | Secret | ✅ Oui |
| `NEXT_PUBLIC_APP_URL` | Client + Serveur | Public | ⚠ Non utilisé dans le code |
| `NEXT_PUBLIC_APP_NAME` | Client + Serveur | Public | ⚠ Non utilisé dans le code |

---

## Détail par variable

### 1. `NEXT_PUBLIC_SUPABASE_URL`
- **Exemple** : `https://xxxxxxxxxxx.supabase.co`
- **Portée** : Disponible côté client ET serveur (préfixe `NEXT_PUBLIC_`)
- **Type** : Public — pas de risque à l'exposer
- **Environnement Vercel** : Production, Preview, Development
- **Fichiers consommateurs** : Tous les clients Supabase SSR/anon, `src/proxy.ts`, `src/lib/supabase/*.ts`
- **Conséquence si absent** : Crash au démarrage — toutes les routes API et pages authentifiées échouent

---

### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT très long)
- **Portée** : Disponible côté client ET serveur (préfixe `NEXT_PUBLIC_`)
- **Type** : Public — la clé anon est protégée par les RLS, pas par le secret
- **Environnement Vercel** : Production, Preview, Development
- **Fichiers consommateurs** : `src/proxy.ts`, tous les composants React avec `createBrowserClient`, toutes les Server Actions
- **Conséquence si absent** : Même crash que SUPABASE_URL — aucune authentification possible

---

### 3. `SUPABASE_SERVICE_ROLE_KEY`
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT, différent de l'anon key)
- **Portée** : Serveur seulement — JAMAIS exposer côté client
- **Type** : 🔐 SECRET — contourne les RLS, accès total à la DB
- **Environnement Vercel** : Production uniquement (ne pas mettre en Preview ni Development)
- **Fichiers consommateurs** : 41 fichiers — toutes les routes API qui font des writes privilégiés (SPIE, founder, beta, exports, logSpieAccess, admin)
- **Conséquence si absent** : Toutes les opérations privilégiées échouent silencieusement ou en erreur 500 — génération SPIE, exports, logs, analytics Founder

> ⚠ **Règle absolue** : Ne jamais utiliser `SUPABASE_SERVICE_ROLE_KEY` dans un fichier `.tsx` ou composant client. Uniquement dans les `route.ts` et `lib/*.ts` serveur.

---

### 4. `ANTHROPIC_API_KEY`
- **Exemple** : `sk-ant-api03-...`
- **Portée** : Serveur seulement
- **Type** : 🔐 SECRET — facturation directe à l'usage
- **Environnement Vercel** : Production uniquement
- **Fichiers consommateurs** : Toutes les routes IA — `src/app/api/ia/**`, `src/app/api/spie/**`, exports intelligents
- **Conséquence si absent** : Toutes les fonctionnalités IA échouent — génération de leçons, assistant, quiz, SPIE entier

> ⚠ **Rotation** : En cas de fuite, régénérer immédiatement dans la console Anthropic et mettre à jour Vercel.

---

### 5. `NEXT_PUBLIC_APP_URL`
- **Exemple** : `https://scorgia-beta.vercel.app`
- **Portée** : Client + Serveur (préfixe `NEXT_PUBLIC_`)
- **Type** : Public
- **Environnement Vercel** : Production, Preview, Development
- **Fichiers consommateurs** : **Aucun** — défini dans `.env.local` mais non consommé par `process.env.NEXT_PUBLIC_APP_URL` dans le code actuel
- **Conséquence si absent** : Aucune — variable réservée pour usage futur (emails, OG tags, etc.)
- **Note** : L'URL d'origine est dérivée dynamiquement via `request.url` dans `/auth/callback`. Conserver pour documenter l'URL cible.

---

### 6. `NEXT_PUBLIC_APP_NAME`
- **Exemple** : `ScorgIA`
- **Portée** : Client + Serveur
- **Type** : Public
- **Fichiers consommateurs** : **Aucun** — non consommé dans le code actuel
- **Conséquence si absent** : Aucune
- **Note** : Variable réservée pour les emails transactionnels et la personnalisation future.

---

## Configuration Vercel

### Variables à créer dans Vercel Dashboard → Settings → Environment Variables

| Variable | Environnement | Chiffré |
|----------|--------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview + Development | Non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview + Development | Non |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production uniquement** | ✅ Oui |
| `ANTHROPIC_API_KEY` | **Production uniquement** | ✅ Oui |
| `NEXT_PUBLIC_APP_URL` | Production + Preview + Development | Non |
| `NEXT_PUBLIC_APP_NAME` | Production + Preview + Development | Non |

> ⚠ `SUPABASE_SERVICE_ROLE_KEY` et `ANTHROPIC_API_KEY` ne doivent **jamais** être activés en Preview — les preview deployments sont accessibles à tous les collaborateurs Vercel.

---

## Vérification post-déploiement

```bash
# Vérifier que les vars sont bien définies (ne révèle pas les valeurs)
vercel env ls
```

Tester manuellement après déploiement :
1. `/signup` → créer un compte → onboarding → vérifier que Supabase reçoit bien l'utilisateur
2. `/dashboard/gerer/preparer` → envoyer un message → vérifier que Claude répond
3. `/api/spie/build-year` (via l'UI Construire mon année) → vérifier la génération SPIE

---

*Document créé : DEPLOY-BETA-01 · M3 · 2026-08-05*
