# Founder RLS Audit — Validation des politiques de sécurité

---

## Résumé exécutif

| Table | Migration | Policy | Bug détecté | Statut après 034 |
|-------|-----------|--------|-------------|-----------------|
| `beta_feedback` | 031 | `admin_read_feedback` | `u.id = auth.uid()` ❌ | ✅ Corrigé |
| `beta_logs` | 031 | `admin_read_logs` | `u.id = auth.uid()` ❌ | ✅ Corrigé |
| `scorgia_roles` | 032 | `public_read_roles` | SELECT ALL — OK | ✅ Aucun bug |
| `audit_trail` | 032 | `founder_read_audit` | `u.id = auth.uid()` ❌ | ✅ Corrigé |
| `beta_invitations` | 032 | `founder_manage_invitations` | `u.id = auth.uid()` ❌ | ✅ Corrigé |
| `founder_products` | 033 | `bc_products_founder` | `u.user_id = auth.uid()` ✅ | ✅ Correct |
| `founder_roadmap` | 033 | `bc_roadmap_founder` | `u.user_id = auth.uid()` ✅ | ✅ Correct |
| `founder_notifications` | 033 | `bc_notif_founder` | `u.user_id = auth.uid()` ✅ | ✅ Correct |
| `founder_deployments` | 033 | `bc_deploy_founder` | `u.user_id = auth.uid()` ✅ | ✅ Correct |
| `company_info` | 033 | `bc_company_founder` | `u.user_id = auth.uid()` ✅ | ✅ Correct |

---

## Description du bug RLS (migrations 031 et 032)

### Cause
La table `utilisateurs` utilise deux colonnes UUID distinctes :
- `id` — clé primaire interne (UUID auto-généré)
- `user_id` — UUID de l'utilisateur Supabase Auth (`auth.uid()`)

Les migrations 031 et 032 écrivaient `u.id = auth.uid()` dans les policies RLS.
Comme `id ≠ auth.uid()`, la condition était toujours fausse → aucune ligne retournée.

### Impact réel
L'accès aux tables `audit_trail`, `beta_invitations`, `beta_feedback`, `beta_logs` via le client anon (pages côté navigateur) retournait 0 résultats silencieusement.

Les routes API qui utilisent `serviceClient()` (service_role) ne sont **pas affectées** — le service_role bypass toutes les RLS.

### Fix
Migration `034_fix_rls_policies.sql` : remplace `u.id = auth.uid()` par `u.user_id = auth.uid()` dans toutes les policies concernées.

---

## Architecture de sécurité Founder

### Couches de protection (du plus fort au plus faible)

```
1. API Routes (service_role)       — contournement RLS autorisé, auth vérifiée côté serveur
   └── createServerClient() lit la session cookie HTTP-only
   └── Vérification role dans utilisateurs
   └── SUPABASE_SERVICE_ROLE_KEY jamais exposé client

2. RLS Supabase (après 034)        — protection base de données directe
   └── Toutes les tables Founder ont RLS activé
   └── Policies corrigées : user_id = auth.uid()

3. Layout server-side (/founder)   — redirection avant rendu
   └── src/app/founder/layout.tsx vérifie role via session
   └── Redirige vers /login ou /dashboard si non autorisé

4. Sidebar / Navigation            — UX seulement, pas de sécurité
   └── Ne pas considérer comme couche de sécurité
```

### Ce qui NE constitue PAS une protection

- ❌ Afficher/masquer des liens dans la Sidebar
- ❌ Conditions CSS (`display: none`)
- ❌ Variables JavaScript `isAdmin`
- ❌ `localStorage` ou `sessionStorage`

---

## Tests de segmentation par rôle

| Scénario | Comportement attendu | Mécanisme |
|----------|---------------------|-----------|
| Teacher → GET /api/founder/users | 403 Non autorisé | `createServerClient()` vérifie role |
| Teacher → /founder/* | Redirect /dashboard | layout.tsx |
| Non connecté → /api/founder/* | 403 Non autorisé | `auth.getUser()` null |
| Founder → DELETE founder | 403 Impossible | Garde dans users route |
| Service_role → toutes tables | Accès complet | bypass RLS par design |
| beta_manager → /api/founder/beta | ✅ Autorisé | Route inclut 'beta_manager' |
| admin → /api/founder/roadmap | ✅ Autorisé | Route inclut 'admin' |
| admin → /api/founder/company | 403 | Route : founder/super_admin uniquement |

---

## Vérification : secrets et clés API

| Secret | Exposition | Statut |
|--------|-----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement, jamais `NEXT_PUBLIC_*` | ✅ Sécurisé |
| Clés API cloud (AWS, Stripe, etc.) | Non stockées dans la DB, non affichées en UI | ✅ Sécurisé |
| JWT Supabase utilisateurs | Cookie HTTP-only, jamais localStorage | ✅ Sécurisé |
| `NEXT_PUBLIC_SUPABASE_URL` | Exposé côté client — normal pour Supabase | ✅ Normal |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Exposé côté client — normal pour Supabase | ✅ Normal (RLS protège) |
