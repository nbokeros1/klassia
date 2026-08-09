# Founder Roles Setup — Procédure d'attribution et révocation

## Contexte

Le système de rôles est défini dans `supabase/migrations/032_founder_platform.sql`.
La table `scorgia_roles` contient 9 niveaux (5 à 100). Le rôle `founder` (niveau 100) est le plus élevé.

La colonne `utilisateurs.role` référence `scorgia_roles.id` avec FK `ON DELETE SET DEFAULT` (défaut : `teacher`).

---

## Attribution du rôle Founder

### Prérequis
- L'utilisateur doit avoir un compte Supabase Auth existant.
- L'utilisateur doit s'être connecté au moins une fois (ligne présente dans `utilisateurs`).

### Vérifier l'existence du compte

```sql
SELECT id, user_id, email, prenom, nom, role, is_admin
FROM utilisateurs
WHERE email = 'email@exemple.com';
```

### Attribuer le rôle Founder

```sql
UPDATE utilisateurs
SET
  role     = 'founder',
  is_admin = true
WHERE email = 'email@exemple.com';
```

> **Note** : `is_admin = true` est nécessaire en plus de `role = 'founder'` car certaines vérifications legacy utilisent `is_admin` directement.

### Vérifier l'attribution

```sql
SELECT email, role, is_admin
FROM utilisateurs
WHERE role = 'founder';
```

---

## Founders actuellement configurés

| Email | Rôle | Source |
|-------|------|--------|
| enwaha22@gmail.com | founder | Migration 032 automatique |
| (Second Founder) | À configurer | Via procédure SQL ci-dessus |

> Pour configurer le second Founder, exécuter le SQL d'attribution avec son email après sa première connexion.

---

## Accès garanti aux Founders

| Type d'accès | Vérification | Source |
|---|---|---|
| Pages Founder (`/founder/*`) | Layout server-side via Supabase session | `src/app/founder/layout.tsx` |
| API Founder | `createServerClient()` + role check | Toutes les routes `/api/founder/*` |
| Outils enseignant | Même accès qu'un `teacher` (role FK n'affecte pas le dashboard enseignant) | `src/app/dashboard/layout.tsx` |
| Quotas IA | Aucun quota — `founder` est exclu des vérifications forfait | `useForfait` hook + `CadenasForFait` |

---

## Révocation du rôle Founder

```sql
-- Rétrograder à super_admin (jamais supprimer un Founder sans rétrogradation)
UPDATE utilisateurs
SET
  role     = 'super_admin',
  is_admin = true
WHERE email = 'email@exemple.com';
```

> **Règle absolue** : ne jamais révoquer `is_admin` d'un Founder en production sans avoir d'abord vérifié qu'au moins un autre Founder est actif.

---

## Permissions jamais accordées côté client

Toutes les vérifications de rôle Founder se font :
1. Côté serveur dans `src/app/founder/layout.tsx` (lecture Supabase session)
2. Dans chaque route API via `createServerClient()` avant toute opération

Aucune permission n'est accordée via une variable JavaScript côté navigateur ou une condition CSS.

---

## Journalisation des actions Founder

Toutes les actions sensibles déclenchent une écriture dans `audit_trail` :
- `user.update` — modification d'un utilisateur
- `user.delete` — suppression d'un utilisateur (avec garde anti-Founder)
- Les actions de rôle doivent être journalisées manuellement via `/api/founder/audit` POST
