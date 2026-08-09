# Supabase Auth — Configuration bêta
> **Mission** : DEPLOY-BETA-01 · M6  
> **Date** : 2026-08-05  
> **Statut** : Référence officielle — configurer avant le premier déploiement Vercel

---

## Où configurer

Supabase Dashboard → Authentication → URL Configuration

---

## Site URL

| Environnement | Valeur |
|---------------|--------|
| Développement local | `http://localhost:3000` |
| Bêta Vercel | `https://scorgia-beta.vercel.app` (ou URL Vercel générée) |
| Futur domaine | `https://beta.scorgia.ca` *(ne pas configurer maintenant)* |

> La **Site URL** est l'URL par défaut pour les liens d'email (confirmation, reset mot de passe). Elle doit correspondre à l'environnement actif.

**Action avant déploiement bêta** : changer la Site URL de `http://localhost:3000` vers l'URL Vercel.

---

## Redirect URLs (liste d'autorisation)

Toutes ces URLs doivent être dans la liste blanche :

```
http://localhost:3000/auth/callback
http://localhost:3000/**
https://scorgia-beta.vercel.app/auth/callback
https://scorgia-beta.vercel.app/**
https://*.vercel.app/auth/callback
```

> Le `/**` couvre les previews Vercel dynamiques. Ne pas ajouter `https://beta.scorgia.ca/**` avant d'avoir le domaine.

---

## Callback OAuth

La route callback est `/auth/callback` — fichier : `src/app/auth/callback/route.ts`.

Comportement actuel :
- Échange le `code` Supabase contre une session
- Redirige vers `?next=` ou `/onboarding` par défaut
- Dérive l'`origin` dynamiquement depuis `request.url` — pas besoin de `NEXT_PUBLIC_APP_URL`

**Aucune modification du code n'est nécessaire** pour changer l'URL de déploiement.

---

## Confirmation email

Supabase Dashboard → Authentication → Email Templates

| Paramètre | Valeur recommandée |
|-----------|-------------------|
| Confirm signup | Activé |
| Secure email change | Activé |
| Double confirm changes | Activé |

> Pour la bêta privée (≤5 enseignants invités), la confirmation email peut rester activée — l'onboarding guidé aide les utilisateurs à valider leur email.

---

## Récupération de mot de passe

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

Ajouter :
```
https://scorgia-beta.vercel.app/auth/callback
```

Le flow de reset redirige vers `/auth/callback?code=...&next=/profil` — aucune modification requise.

---

## Onboarding post-inscription

1. L'utilisateur s'inscrit sur `/signup`
2. Supabase crée le compte + déclenche le trigger `utilisateurs`
3. `/auth/callback` reçoit le code et établit la session
4. Redirection vers `/onboarding` (valeur par défaut du `next` param)
5. L'enseignant complète son profil IA

---

## Logout

Le logout est géré côté client par `supabase.auth.signOut()` dans les composants.  
Après signOut, l'utilisateur est redirigé vers `/login`.  
Aucune configuration Supabase requise.

---

## Emails transactionnels

| Email | Déclenché par | Modèle à personnaliser |
|-------|--------------|------------------------|
| Confirmation inscription | `signUp()` | Authentication → Email Templates → Confirm signup |
| Reset mot de passe | `resetPasswordForEmail()` | Authentication → Email Templates → Reset password |
| Magic link | Non utilisé | — |

**Branding à vérifier dans les templates** :
- Remplacer toute référence à "Supabase" ou "KlassIA" par "ScorgIA"
- Vérifier l'absence de "Powered by Claude" ou mention d'Anthropic
- Pied de page : "Bodingo AI Tech Inc."

---

## Checklist Auth avant déploiement bêta

- [ ] Site URL mise à jour → URL Vercel bêta
- [ ] Redirect URLs mise à jour → URL Vercel bêta ajoutée
- [ ] Templates email vérifiés et personnalisés ScorgIA / Bodingo AI Tech Inc.
- [ ] Confirmation email activée
- [ ] Test complet : inscription → email → callback → onboarding → dashboard

---

*Document créé : DEPLOY-BETA-01 · M6 · 2026-08-05*
