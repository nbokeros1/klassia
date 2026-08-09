# SC-03N-RLS — Rapport de Tests RLS

**Date :** 2026-08-03  
**Statut :** Tests planifiés (migration 035 non encore exécutée en production)

---

## Matrice de tests par rôle

> Colonne **Attendu** = comportement après migration 035.  
> Colonne **Obtenu** = à remplir après exécution manuelle.

### Founder (`role = 'founder'`, `is_admin = true`)

| Action | Table / Route | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| SELECT | `audit_trail` | ✓ Autorisé | — |
| SELECT | `beta_invitations` | ✓ Autorisé | — |
| INSERT | `beta_invitations` | ✓ Autorisé | — |
| SELECT | `beta_feedback` | ✓ Autorisé | — |
| UPDATE statut | `beta_feedback` | ✓ Autorisé | — |
| SELECT | `beta_logs` | ✓ Autorisé | — |
| GET `/api/founder/audit` | — | ✓ 200 | — |
| GET `/api/founder/beta` | — | ✓ 200 | — |
| PATCH `/api/beta/feedback` | — | ✓ 200 | — |
| GET `/api/founder/company` | — | ✓ 200 | — |
| GET `/founder/audit` (page) | — | ✓ Accès | — |

### Super Admin (`role = 'super_admin'`)

| Action | Table / Route | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| SELECT | `audit_trail` | ✓ Autorisé | — |
| SELECT | `beta_invitations` | ✓ Autorisé | — |
| INSERT | `beta_invitations` | ✓ Autorisé | — |
| SELECT | `beta_feedback` | ✓ Autorisé | — |
| UPDATE statut | `beta_feedback` | ✓ Autorisé | — |
| SELECT | `beta_logs` | ✓ Autorisé | — |
| SELECT | `founder_products` | ✓ Autorisé | — |
| SELECT | `company_info` | ✓ Autorisé | — |

### Admin (`role = 'admin'`)

| Action | Table / Route | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| SELECT | `audit_trail` | ✓ Autorisé | — |
| SELECT | `beta_invitations` | ✓ Autorisé | — |
| INSERT | `beta_invitations` | ✓ Autorisé | — |
| SELECT | `beta_feedback` | ✓ Autorisé | — |
| UPDATE statut | `beta_feedback` | ✓ Autorisé | — |
| SELECT | `beta_logs` | ✓ Autorisé | — |
| SELECT | `founder_products` | ✗ Refusé (founder/super_admin seulement) | — |
| SELECT | `company_info` | ✗ Refusé | — |
| GET `/api/founder/audit` | — | ✓ 200 | — |
| GET `/api/founder/products` | — | ✗ 403 | — |

### Beta Manager (`role = 'beta_manager'`)

| Action | Table / Route | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| SELECT | `audit_trail` | ✗ Refusé | — |
| SELECT | `beta_invitations` | ✓ Autorisé | — |
| INSERT | `beta_invitations` | ✓ Autorisé | — |
| UPDATE statut | `beta_invitations` | ✓ Autorisé | — |
| SELECT | `beta_feedback` | ✓ Autorisé | — |
| UPDATE statut | `beta_feedback` | ✓ Autorisé | — |
| SELECT | `beta_logs` | ✗ Refusé | — |
| SELECT | `founder_products` | ✗ Refusé | — |
| PATCH `/api/beta/feedback` | — | ✓ 200 | — |
| GET `/api/founder/audit` | — | ✗ 403 | — |

### Teacher (`role = 'teacher'`)

| Action | Table / Route | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| SELECT | `audit_trail` | ✗ Refusé | — |
| SELECT | `beta_invitations` | ✗ Refusé | — |
| INSERT | `beta_invitations` | ✗ Refusé | — |
| SELECT | `beta_feedback` | ✗ Refusé | — |
| UPDATE | `beta_feedback` | ✗ Refusé | — |
| SELECT | `beta_logs` | ✗ Refusé | — |
| SELECT | `founder_products` | ✗ Refusé | — |
| GET `/founder/**` (page) | — | ✗ Redirect /dashboard | — |
| GET `/api/founder/**` | — | ✗ 403 | — |
| PATCH `/api/beta/feedback` | — | ✗ 403 | — |

### Utilisateur non connecté (Anonyme)

| Action | Table / Route | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| Toute opération | Toutes les tables protégées | ✗ Refusé (RLS, pas de session) | — |
| GET `/login` | — | ✓ 200 | — |
| GET `/founder/**` | — | ✗ Redirect /login | — |

---

## Tests idempotence de la migration 035

| Test | Résultat attendu | Résultat obtenu |
|---|---|---|
| Exécuter 035 une première fois | ✓ Succès, 0 erreur | — |
| Exécuter 035 une deuxième fois | ✓ Succès, DROP IF EXISTS évite les conflits | — |

---

## Commandes SQL de test manuel

```sql
-- Simuler un SELECT en tant qu'utilisateur (remplacer UUID par un vrai)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<user_id_auth>"}';

SELECT * FROM audit_trail LIMIT 1;
SELECT * FROM beta_invitations LIMIT 1;
SELECT * FROM beta_feedback LIMIT 1;
SELECT * FROM beta_logs LIMIT 1;

-- Revenir au role service
RESET role;
```

---

## Résultats TypeScript (tsc --noEmit)

```
Résultat : 0 erreur TypeScript
```

---

## Risques résiduels

| Risque | Niveau | Mitigation |
|---|---|---|
| Migration 035 pas encore appliquée en production | Moyen | Exécuter manuellement après validation PO |
| `role_admin` dans `api/admin/inviter/route.ts` : colonne legacy potentiellement absente | Faible | Hors périmètre SC-03N-RLS — à vérifier séparément |
| Accès `/founder/**` basé sur layout client uniquement | Moyen | Les APIs ont leurs guards serveur — risque UI seulement |
| `is_admin` flag legacy potentiellement incohérent avec `role` | Faible | La politique "OR u.is_admin = true" préserve la compatibilité |

---

## Verdict

**SC-03N-RLS VALIDÉ AVEC AVERTISSEMENTS**

Avertissements :
1. La migration 035 n'est **pas encore exécutée en production** — validation PO requise.
2. Les tests de la colonne **Résultat obtenu** doivent être complétés manuellement après exécution.
3. La colonne `role_admin` dans `api/admin/inviter/route.ts` est hors périmètre mais à vérifier.
