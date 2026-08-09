# Vercel — Configuration du projet bêta
> **Mission** : DEPLOY-BETA-01 · M8  
> **Date** : 2026-08-05  
> **Statut** : Guide de configuration — À exécuter par le PO, pas automatiquement

---

## Règle absolue

> **Ne pas déployer automatiquement. Ne pas modifier les DNS. Attendre la validation du Product Owner.**

---

## 1. Prérequis

- [ ] Compte Vercel **Pro** (requis — voir `VERCEL_COMPATIBILITY_ASSESSMENT.md`)
- [ ] Accès au dépôt GitHub `klassia` (ou équivalent)
- [ ] Variables d'environnement prêtes (voir `SCORGIA_BETA_ENVIRONMENT_VARIABLES.md`)
- [ ] Migrations Supabase exécutées (voir `SUPABASE_BETA_MIGRATION_ORDER.md`)

---

## 2. Création du projet Vercel

1. Vercel Dashboard → **Add New Project**
2. Import depuis GitHub → sélectionner le repo `klassia`
3. **Project Name** : `scorgia-beta`
4. **Framework Preset** : Next.js (détecté automatiquement)

---

## 3. Paramètres de build

| Paramètre | Valeur |
|-----------|--------|
| Framework | Next.js |
| Root Directory | `.` (racine du repo) |
| Build Command | `next build` |
| Output Directory | `.next` (par défaut) |
| Install Command | `npm install` |
| Node.js Version | **20.x** |

> **Ne pas** utiliser `npm run build` — utiliser `next build` directement pour que Vercel détecte correctement le projet.

---

## 4. Branche de déploiement

| Branche | Environnement | Auto-déploiement |
|---------|--------------|-----------------|
| `main` | Production | ✅ Activé |
| Autres branches | Preview | ✅ Activé (previews uniquement) |

> Les previews **ne doivent pas** avoir accès à `SUPABASE_SERVICE_ROLE_KEY` ni `ANTHROPIC_API_KEY` — configurer ces variables uniquement en "Production" dans Vercel.

---

## 5. Variables d'environnement

Configurer dans Vercel Dashboard → Settings → Environment Variables :

| Variable | Environnements |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview + Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview + Development |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production uniquement** |
| `ANTHROPIC_API_KEY` | **Production uniquement** |
| `NEXT_PUBLIC_APP_URL` | Production + Preview + Development |
| `NEXT_PUBLIC_APP_NAME` | Production + Preview + Development |

---

## 6. Domaine

Pour la bêta, utiliser l'URL Vercel générée automatiquement :
```
https://scorgia-beta.vercel.app
```
ou l'URL unique générée par Vercel lors de la création du projet.

> **Ne pas configurer de domaine personnalisé** (`beta.scorgia.ca`, etc.) pour l'instant. Le DNS sera configuré lors du lancement public — hors périmètre bêta.

---

## 7. Après le premier déploiement

1. Copier l'URL Vercel générée
2. Mettre à jour Supabase Auth → Site URL (voir `SUPABASE_AUTH_BETA_SETUP.md`)
3. Mettre à jour `NEXT_PUBLIC_APP_URL` dans Vercel → Environment Variables
4. Redéployer si `NEXT_PUBLIC_APP_URL` a changé
5. Exécuter la matrice de smoke tests (`BETA_SMOKE_TEST_MATRIX.md`)

---

## 8. `next.config.ts` — État actuel

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],  // requis pour l'export PDF
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',        value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}
```

**Aucune modification nécessaire pour le déploiement bêta.** Les headers de sécurité sont déjà configurés.

---

## 9. Checklist déploiement initial

- [ ] Projet `scorgia-beta` créé dans Vercel
- [ ] Node.js 20.x sélectionné
- [ ] Toutes les variables d'environnement configurées
- [ ] Premier déploiement déclenché manuellement
- [ ] URL Vercel copiée et mise dans `NEXT_PUBLIC_APP_URL`
- [ ] Supabase Auth → Site URL mise à jour
- [ ] Smoke tests exécutés
- [ ] PO informé de l'URL bêta

---

*Document créé : DEPLOY-BETA-01 · M8 · 2026-08-05*
