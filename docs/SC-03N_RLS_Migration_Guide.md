# SC-03N-RLS — Guide d'exécution de la Migration 035

**Validation Product Owner requise avant exécution en production.**

---

## Prérequis

- Accès Supabase Dashboard → SQL Editor
- Sauvegarde confirmée (voir étape 1)
- Migrations 031, 032, 033, 034 déjà appliquées

---

## Étape 1 — Sauvegarder la base de données

Dans le Dashboard Supabase :
1. Aller dans **Database → Backups**
2. Cliquer sur **Download backup** (ou activer PITR si disponible)
3. Confirmer que le backup est téléchargé avant de continuer

---

## Étape 2 — Vérifier que 031, 032, 033, 034 sont appliquées

Exécuter dans SQL Editor :

```sql
-- Vérifier les policies existantes avant la migration 035
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_trail', 'beta_invitations', 'beta_feedback', 'beta_logs',
    'founder_products', 'founder_roadmap', 'founder_notifications',
    'founder_deployments', 'company_info'
  )
ORDER BY tablename, policyname;
```

**Résultat attendu :** vous devez voir les policies de 031-034 (avec ou sans les corrections de 034 selon si elle a été appliquée).

Si les tables `audit_trail`, `beta_invitations` etc. n'existent pas, les migrations 032-033 n'ont pas encore été appliquées — les exécuter d'abord.

---

## Étape 3 — Exécuter la migration 035

Dans SQL Editor, coller et exécuter le contenu de :

```
supabase/migrations/035_fix_founder_beta_rls_complete.sql
```

La migration utilise `DROP POLICY IF EXISTS` avant chaque `CREATE POLICY`, ce qui la rend idempotente — elle peut être ré-exécutée sans danger.

**Durée estimée :** < 5 secondes

---

## Étape 4 — Vérifier le résultat

Exécuter le script de vérification :

```
supabase/verification/verify_founder_beta_rls.sql
```

Ce script produit 7 résultats :

1. **Policies actives** — doit montrer les nouvelles policies avec les clauses USING et WITH CHECK correctes
2. **RLS activé** — toutes les tables doivent avoir `rls_active = true`
3. **Absence de policies incorrectes** — doit retourner **0 ligne** (aucune `u.id = auth.uid()` restante)
4. **Colonnes utilisateurs** — confirme l'existence de `id`, `user_id`, `role`, `is_admin`
5. **Rôles présents** — liste les rôles en base
6. **Compte founder** — confirme que `enwaha22@gmail.com` a `role = 'founder'` et `is_admin = true`
7. **WITH CHECK status** — toutes les policies FOR ALL / INSERT / UPDATE doivent afficher `OK`

---

## Étape 5 — Tester avec un compte Founder

1. Se connecter avec `enwaha22@gmail.com`
2. Aller sur `/founder/audit` → doit charger l'audit trail
3. Aller sur `/founder/beta` → doit charger les invitations
4. Créer une invitation bêta → doit réussir
5. Aller sur `/founder/bi` → doit charger les feedbacks
6. Modifier le statut d'un feedback → doit réussir

---

## Étape 6 — Tester avec un compte Teacher

1. Se connecter avec un compte enseignant standard (`role = 'teacher'`)
2. Tenter d'accéder à `/founder/*` → doit rediriger vers `/dashboard`
3. Tenter `GET /api/founder/audit` → doit retourner 403
4. Tenter `GET /api/founder/beta` → doit retourner 403
5. Tenter `PATCH /api/beta/feedback` → doit retourner 403
6. Tenter d'insérer directement dans `audit_trail` via SDK anon → doit être refusé par RLS

---

## Étape 7 — Revenir en arrière si nécessaire

La migration 035 ne supprime pas de données, elle ne crée pas de nouvelles tables. Pour revenir à l'état de 034 :

```sql
-- Rollback vers l'état 034 (correction partielle)

-- Rétablir audit_trail (034)
DROP POLICY IF EXISTS "founder_read_audit" ON audit_trail;
CREATE POLICY "founder_read_audit" ON audit_trail
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid()
      AND (u.role IN ('founder','super_admin','admin') OR u.is_admin = true))
  );

-- Rétablir beta_invitations (034, sans WITH CHECK)
DROP POLICY IF EXISTS "founder_manage_invitations" ON beta_invitations;
CREATE POLICY "founder_manage_invitations" ON beta_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid()
      AND (u.role IN ('founder','super_admin','admin','beta_manager') OR u.is_admin = true))
  );

-- Rétablir beta_feedback (034)
DROP POLICY IF EXISTS "admin_read_feedback"   ON beta_feedback;
DROP POLICY IF EXISTS "admin_update_feedback" ON beta_feedback;
DROP POLICY IF EXISTS "user_insert_feedback"  ON beta_feedback;
CREATE POLICY "admin_read_feedback" ON beta_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND u.is_admin = true)
  );

-- Rétablir beta_logs (034)
DROP POLICY IF EXISTS "admin_read_logs" ON beta_logs;
CREATE POLICY "admin_read_logs" ON beta_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND u.is_admin = true)
  );

-- Rétablir business center (033, sans WITH CHECK)
DROP POLICY IF EXISTS "bc_products_founder"  ON founder_products;
DROP POLICY IF EXISTS "bc_roadmap_founder"   ON founder_roadmap;
DROP POLICY IF EXISTS "bc_notif_founder"     ON founder_notifications;
DROP POLICY IF EXISTS "bc_deploy_founder"    ON founder_deployments;
DROP POLICY IF EXISTS "bc_company_founder"   ON company_info;
CREATE POLICY "bc_products_founder"  ON founder_products      FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_roadmap_founder"   ON founder_roadmap       FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_notif_founder"     ON founder_notifications  FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_deploy_founder"    ON founder_deployments    FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
CREATE POLICY "bc_company_founder"   ON company_info           FOR ALL USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.user_id = auth.uid() AND (u.role IN ('founder','super_admin') OR u.is_admin)));
```

---

## Notes importantes

- La migration 035 est **idempotente** : elle peut être exécutée plusieurs fois sans effet secondaire.
- Elle n'affecte **aucune table métier** (leçons, classes, élèves, etc.).
- Les routes API utilisent `service_role` pour la plupart des opérations et contournent le RLS — la migration 035 renforce la protection pour les accès directs via SDK anon ou SDK client.
- **Ne pas exécuter automatiquement en production** sans validation du Product Owner.
