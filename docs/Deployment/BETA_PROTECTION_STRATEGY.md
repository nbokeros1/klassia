# Stratégie de protection bêta
> **Mission** : DEPLOY-BETA-01 · M9  
> **Date** : 2026-08-05  
> **Statut** : Stratégie validée — basée sur le système d'invitation existant

---

## Principe

ScorgIA utilise un système d'invitation existant (`beta_invitations`, migration 031) combiné au proxy middleware pour limiter l'accès bêta à 3–5 enseignants invités.

**Aucun nouveau mécanisme d'accès n'est à créer** — l'infrastructure est en place.

---

## Mécanisme en place

### Table `beta_invitations` (migration 031)

```sql
CREATE TABLE beta_invitations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  token         TEXT NOT NULL UNIQUE,
  statut        TEXT DEFAULT 'en_attente',  -- en_attente | accepté | expiré
  role          TEXT DEFAULT 'beta_teacher',
  expires_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Route d'invitation Admin

`/api/admin/inviter` — route existante — permet d'envoyer une invitation par email.

### Signup avec token

Le flow d'inscription vérifie si un token d'invitation valide existe avant de créer le compte. Les utilisateurs sans token sont bloqués à l'inscription.

> **À vérifier avant déploiement** : confirmer que `/signup` vérifie bien le token d'invitation ou que l'accès est restreint en amont.

---

## Couche Proxy (middleware)

`src/proxy.ts` protège :
- `/dashboard/:path*` — auth obligatoire
- `/admin/:path*` — auth + is_admin
- `/founder/:path*` — auth + is_founder/super_admin
- `/classes/:path*` — auth obligatoire
- `/ia/:path*` — auth obligatoire

Toute tentative d'accès sans session valide → redirection vers `/login`.

Confirmé actif : `functions-config-manifest.json` contient les 5 matchers.

---

## Procédure pour inviter un enseignant bêta

1. Ouvrir Supabase Dashboard → SQL Editor
2. Créer l'invitation manuellement :

```sql
INSERT INTO beta_invitations (email, token, statut, expires_at)
VALUES (
  'enseignant@ecole.ca',
  gen_random_uuid()::text,
  'en_attente',
  now() + interval '30 days'
);
```

3. Récupérer le token :
```sql
SELECT email, token FROM beta_invitations WHERE email = 'enseignant@ecole.ca';
```

4. Envoyer l'URL d'inscription au PO : `https://scorgia-beta.vercel.app/signup?token=<token>`
5. L'enseignant s'inscrit avec cet URL
6. Vérifier l'inscription :
```sql
SELECT u.email, u.prenom, u.nom, u.created_at
FROM utilisateurs u
JOIN beta_invitations b ON b.email = u.email
WHERE b.statut = 'accepté';
```

---

## Limites bêta recommandées

| Phase | Nombre max | Critère |
|-------|-----------|---------|
| Palier 1 (interne) | 2–3 (Founders) | Smoke tests PO |
| Palier 2 (bêta privée) | 5 enseignants | SPIE-BETA-04 GO Palier 2 |
| Palier 3 | 10 enseignants | Après stabilisation 2+ semaines |
| Palier 4 (public) | Illimité | Après SPIE-BETA-05 et audit complet |

---

## Note sur `/signup` et la vérification du token

À confirmer côté code avant de donner l'URL à des enseignants : si `/signup` n'implémente pas encore la vérification du token, n'importe qui avec l'URL de base peut s'inscrire. Dans ce cas, la protection est uniquement par obscurité (URL non publiée).

**Recommandation** : pour la bêta Palier 2, s'assurer que `NEXT_PUBLIC_APP_URL` ne pointe pas vers une page publiquement accessible et ne pas indexer le site (robots.txt : `Disallow: /`).

---

*Document créé : DEPLOY-BETA-01 · M9 · 2026-08-05*
