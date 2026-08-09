# SC-03N-RLS — Audit des Policies RLS Founder / Admin / Beta

**Date :** 2026-08-03  
**Statut :** Corrigé — Migration 035 prête (non encore exécutée)

---

## 1. Schéma de la table `utilisateurs` — champs clés

| Colonne | Type | Rôle |
|---|---|---|
| `id` | UUID (PK) | Identifiant interne de la ligne — **NE PAS** utiliser dans les policies RLS |
| `user_id` | UUID | `auth.users.id` = `auth.uid()` — **Seul champ valide pour les policies RLS** |
| `email` | TEXT | Email de l'utilisateur |
| `role` | TEXT (FK → scorgia_roles) | Rôle dans la plateforme (founder, super_admin, admin, beta_manager…) |
| `is_admin` | BOOLEAN | Flag legacy de compatibilité (toujours vérifier en conjonction avec `role`) |
| `created_at` | TIMESTAMPTZ | Date de création |

**Règle universelle :**
```sql
EXISTS (
  SELECT 1 FROM utilisateurs u
  WHERE u.user_id = auth.uid()  -- et non u.id
  AND …
)
```

---

## 2. Tableau des policies auditées

| Table | Policy | Condition avant correction | Problème | Correction dans 035 |
|---|---|---|---|---|
| `audit_trail` | `founder_read_audit` | `u.id = auth.uid()` (032) | Mauvais champ — toujours rejeté | `u.user_id = auth.uid()` |
| `beta_invitations` | `founder_manage_invitations` | `u.id = auth.uid()` (032), pas de WITH CHECK (034) | Mauvais champ + WITH CHECK absent | `u.user_id = auth.uid()` + WITH CHECK complet |
| `beta_feedback` | `admin_read_feedback` | `u.id = auth.uid() AND is_admin` (031) | Mauvais champ, pas de rôle | `u.user_id = auth.uid()` + roles |
| `beta_feedback` | `admin_update_feedback` | Absente | Admins ne peuvent pas modifier le statut via RLS | Créée avec USING + WITH CHECK |
| `beta_feedback` | `user_insert_feedback` | Absente | INSERT bloqué si pas service_role | Créée : `auth.uid() IS NOT NULL` |
| `beta_logs` | `admin_read_logs` | `u.id = auth.uid() AND is_admin` (031) | Mauvais champ | `u.user_id = auth.uid()` + roles |
| `founder_products` | `bc_products_founder` | `u.user_id = auth.uid()` (033, correct) | WITH CHECK absent | WITH CHECK ajouté |
| `founder_roadmap` | `bc_roadmap_founder` | `u.user_id = auth.uid()` (033, correct) | WITH CHECK absent | WITH CHECK ajouté |
| `founder_notifications` | `bc_notif_founder` | `u.user_id = auth.uid()` (033, correct) | WITH CHECK absent | WITH CHECK ajouté |
| `founder_deployments` | `bc_deploy_founder` | `u.user_id = auth.uid()` (033, correct) | WITH CHECK absent | WITH CHECK ajouté |
| `company_info` | `bc_company_founder` | `u.user_id = auth.uid()` (033, correct) | WITH CHECK absent | WITH CHECK ajouté |

### Policies déjà correctes (non modifiées)

| Table | Policy | Source | Statut |
|---|---|---|---|
| `sessions_impersonation` | `admins_only_*` | 017 | ✓ `u.user_id = auth.uid()` |
| `lecons` | `user_own_lecons` | 001 | ✓ `u.user_id = auth.uid()` |
| `plans_sequence` | `user_own_plans_sequence` | 001 | ✓ `u.user_id = auth.uid()` |
| `scorgia_roles` | `public_read_roles` | 032 | ✓ `USING (true)` (lecture publique intentionnelle) |

---

## 3. Bugs TypeScript corrigés

### Bug CRITIQUE — `PATCH /api/beta/feedback` (ligne 73)

**Avant :**
```typescript
const { data: profil } = await supabase.from('utilisateurs').select('is_admin').eq('id', user.id).single()
```

**Problème :** `user.id` = `auth.uid()` = `utilisateurs.user_id`, pas `utilisateurs.id`. La requête ne trouve jamais de résultat → `profil` est `null` → tous les PATCH `/api/beta/feedback` retournent 403.

**Après :**
```typescript
const { data: profil } = await supabase
  .from('utilisateurs')
  .select('is_admin, role')
  .eq('user_id', user.id)
  .single()
const peutModifier =
  profil?.is_admin === true ||
  ['founder', 'super_admin', 'admin', 'beta_manager'].includes(profil?.role ?? '')
```

---

### Bug — `POST /api/beta/feedback` et `POST /api/beta/log` (utilisateur_id)

**Avant :**
```typescript
utilisateur_id = user?.id ?? null  // auth UUID ≠ utilisateurs.id
```

**Problème :** `beta_feedback.utilisateur_id` et `beta_logs.utilisateur_id` référencent `utilisateurs(id)` (UUID interne). Stocker `user.id` (auth UUID) viole la FK ou pointe vers la mauvaise ligne.

**Après :**
```typescript
const { data: profil } = await supabase
  .from('utilisateurs')
  .select('id')
  .eq('user_id', user.id)
  .single()
utilisateur_id = profil?.id ?? null
```

---

## 4. Fonction centralisée ajoutée — `src/lib/api-auth.ts`

Deux nouvelles fonctions server-side :

| Fonction | Rôles autorisés | Usage |
|---|---|---|
| `requireFounderOrAdmin()` | founder, super_admin, admin + is_admin | Routes réservées aux admins |
| `requireBetaManagerOrAdmin()` | founder, super_admin, admin, beta_manager + is_admin | Routes bêta |

Ces fonctions utilisent `user_id` (champ correct) et retournent `{ error, profil, supabase }` cohérent avec `requireAuth()` existant.

---

## 5. Fichiers créés ou modifiés

| Fichier | Action | Description |
|---|---|---|
| `supabase/migrations/035_fix_founder_beta_rls_complete.sql` | Créé | Migration corrective complète |
| `supabase/verification/verify_founder_beta_rls.sql` | Créé | Script de vérification (lecture seule) |
| `src/app/api/beta/feedback/route.ts` | Modifié | Bug `.eq('id')` + `utilisateur_id` + check role |
| `src/app/api/beta/log/route.ts` | Modifié | Bug `utilisateur_id` |
| `src/lib/api-auth.ts` | Modifié | Ajout `requireFounderOrAdmin` + `requireBetaManagerOrAdmin` |

---

## 6. Migrations historiques — ce qui a été fait

| Migration | Contenu | Champ utilisé | Statut |
|---|---|---|---|
| 031 | `admin_read_feedback`, `admin_read_logs` | `u.id` | ⚠️ Incorrect — corrigé par 034 + 035 |
| 032 | `founder_read_audit`, `founder_manage_invitations` | `u.id` | ⚠️ Incorrect — corrigé par 034 + 035 |
| 033 | 5 policies Business Center | `u.user_id` | ✓ Correct, WITH CHECK ajouté par 035 |
| 034 | Fix partiel 031+032 | `u.user_id` | ✓ Correct mais incomplet (sans WITH CHECK, sans beta_manager) |
| **035** | **Correction complète** | `u.user_id` | **À exécuter** |
