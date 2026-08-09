# SC-03N — Matrice Officielle des Rôles et Permissions

**Source de vérité :** `scorgia_roles` (migration 032) + policies RLS migration 035

---

## Rôles et niveaux

| Rôle | Label | Niveau | Description |
|---|---|---|---|
| `founder` | Fondateur | 100 | Propriétaire. Accès total, aucune restriction. |
| `super_admin` | Super Administrateur | 90 | Gestion complète sauf actions destructives réservées au fondateur. |
| `admin` | Administrateur | 70 | Gestion utilisateurs, contenus, bêta. Pas d'accès aux secrets système. |
| `beta_manager` | Gestionnaire bêta | 60 | Gère les invitations et le programme bêta. Lecture des comptes. |
| `support` | Support | 50 | Lecture des comptes, réponse aux feedbacks. |
| `teacher_premium` | Enseignant Premium | 20 | Fonctionnalités avancées Pro+. Aucun accès admin. |
| `teacher` | Enseignant | 10 | Compte enseignant standard. |
| `beta` | Bêta testeur | 15 | Accès bêta + droit d'envoi de feedback. |
| `read_only` | Lecture seule | 5 | Lecture de son propre compte uniquement. |

---

## Matrice des permissions par ressource

### `audit_trail`

| Rôle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `founder` | ✓ | ✓ (service) | ✗ | ✗ |
| `super_admin` | ✓ | ✓ (service) | ✗ | ✗ |
| `admin` | ✓ | ✗ | ✗ | ✗ |
| `beta_manager` | ✗ | ✗ | ✗ | ✗ |
| `teacher` / `beta` | ✗ | ✗ | ✗ | ✗ |
| Anonyme | ✗ | ✗ | ✗ | ✗ |

> Les insertions dans `audit_trail` se font via service_role (routes API), jamais directement par un utilisateur.

---

### `beta_invitations`

| Rôle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `founder` | ✓ | ✓ | ✓ | ✓ |
| `super_admin` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ |
| `beta_manager` | ✓ | ✓ | ✓ | ✓ |
| `teacher` / `beta` | ✗ | ✗ | ✗ | ✗ |
| Anonyme | ✗ | ✗ | ✗ | ✗ |

---

### `beta_feedback`

| Rôle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `founder` | ✓ | ✓ (service) | ✓ | ✗ |
| `super_admin` | ✓ | ✓ (service) | ✓ | ✗ |
| `admin` | ✓ | ✓ (service) | ✓ | ✗ |
| `beta_manager` | ✓ | ✓ (service) | ✓ | ✗ |
| `teacher` / `beta` | ✗ | ✓ (via API service) | ✗ | ✗ |
| Authentifié (tout rôle) | ✗ | ✓ (RLS: auth.uid() IS NOT NULL) | ✗ | ✗ |
| Anonyme | ✗ | ✗ | ✗ | ✗ |

> La route POST `/api/beta/feedback` utilise `service_role` et contourne le RLS INSERT. La policy `user_insert_feedback` couvre le cas d'un INSERT direct via SDK anon.

---

### `beta_logs`

| Rôle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `founder` | ✓ | ✓ (service) | ✗ | ✗ |
| `super_admin` | ✓ | ✓ (service) | ✗ | ✗ |
| `admin` | ✓ | ✓ (service) | ✗ | ✗ |
| `beta_manager` | ✗ | ✗ | ✗ | ✗ |
| `teacher` / `beta` | ✗ | ✗ | ✗ | ✗ |
| Anonyme | ✗ | ✗ | ✗ | ✗ |

> `beta_manager` n'a pas accès aux logs techniques. Intentionnel par sécurité.

---

### Business Center (`founder_products`, `founder_roadmap`, `founder_deployments`, `company_info`)

| Rôle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `founder` | ✓ | ✓ | ✓ | ✓ |
| `super_admin` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✗ | ✗ | ✗ | ✗ |
| `beta_manager` / autres | ✗ | ✗ | ✗ | ✗ |

### `founder_notifications`

| Rôle | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `founder` | ✓ | ✓ | ✓ | ✓ |
| `super_admin` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ | ✓ |
| `beta_manager` / autres | ✗ | ✗ | ✗ | ✗ |

---

### Pages Founder (côté client — `founder/layout.tsx`)

| Rôle | Accès à `/founder/**` |
|---|---|
| `founder` | ✓ |
| `super_admin` | ✓ |
| `is_admin = true` (legacy) | ✓ |
| `admin` (sans is_admin) | ✗ (vérification layout client uniquement sur role et is_admin) |
| Autres | ✗ |

> Note : le layout founder vérifie `role === 'founder' || role === 'super_admin' || is_admin === true`. Un utilisateur avec `role = 'admin'` mais `is_admin = false` n'accède pas aux pages Founder côté client. Les APIs Founder appliquent leurs propres guards côté serveur.

---

## Règle de vérification centralisée (api-auth.ts)

```typescript
// Founder + super_admin + admin + is_admin
requireFounderOrAdmin()

// Founder + super_admin + admin + beta_manager + is_admin
requireBetaManagerOrAdmin()

// Toute vérification admin legacy (is_admin uniquement)
requireAdmin()
```
