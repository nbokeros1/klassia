# Beta Deployment Checklist — Préparation au déploiement bêta privée

> À compléter avant tout déploiement externe. Ne pas déployer sur AWS dans cette phase.

---

## 1. Variables d'environnement (serveur)

| Variable | Description | Statut |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase | ✅ Configuré |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | ✅ Configuré |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (JAMAIS public) | ✅ Configuré (server-only) |
| `ANTHROPIC_API_KEY` | Clé Claude API | ✅ À vérifier |
| `NEXTAUTH_SECRET` ou équivalent | Secret sessions (si applicable) | À vérifier |

---

## 2. Migrations Supabase

| Migration | Description | À appliquer |
|-----------|-------------|-------------|
| `031_beta_tables.sql` | beta_feedback, beta_logs | ✅ Appliquer si absent |
| `032_founder_platform.sql` | scorgia_roles, audit_trail, beta_invitations | ✅ Appliquer si absent |
| `033_business_center.sql` | 5 tables Business Center + seed | ✅ Appliquer |
| `034_fix_rls_policies.sql` | **Correctif RLS critique** | ✅ Appliquer en premier si 031/032 déjà en place |

### Procédure sécurisée
```sql
-- Vérifier les tables existantes AVANT d'appliquer
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN (
    'beta_feedback','beta_logs','scorgia_roles','audit_trail',
    'beta_invitations','founder_products','founder_roadmap',
    'founder_notifications','founder_deployments','company_info'
  );

-- Si toutes absentes : appliquer 031, 032, 033, 034 dans l'ordre
-- Si 031 et 032 présentes sans 034 : appliquer 034 puis 033
-- Ne jamais ré-exécuter une migration déjà appliquée (IF NOT EXISTS protège les tables, pas les policies)
```

---

## 3. Compte Founder

| Étape | Action | Statut |
|-------|--------|--------|
| Founder principal configuré | `enwaha22@gmail.com` → role=founder dans 032 | ✅ |
| Second Founder identifié | Identifier l'email du second Founder | ⏳ En attente |
| Second Founder configuré | `UPDATE utilisateurs SET role='founder', is_admin=true WHERE email='...'` | ⏳ En attente |
| Vérification accès `/founder` | Se connecter avec les deux comptes | ⏳ À tester |

---

## 4. Comptes bêta (5–10 enseignants)

| Étape | Action |
|-------|--------|
| Identifier les bêta testeurs | Noms, emails, niveau tech |
| Créer les invitations | Via `/founder/beta` → onglet Invitations |
| Envoyer les codes | Email manuel avec code d'invitation |
| Attribuer le rôle `beta` | Via `/founder/utilisateurs` après inscription |
| Vérifier l'accès | Confirmer que les bêta voient tous les outils enseignant |

---

## 5. Domaine et HTTPS

| Élément | Cible bêta | Statut |
|---------|-----------|--------|
| Domaine production | scorgia.app | ⏳ À configurer |
| Domaine bêta | beta.scorgia.app ou scorgia.app | ⏳ Décision requise |
| HTTPS | Obligatoire (cookies HTTP-only) | ⏳ Via AWS/Vercel/Cloudflare |
| CORS | Même domaine = pas de CORS requis | ✅ |

---

## 6. Auth Supabase

| Élément | Action |
|---------|--------|
| URL de redirection auth | Ajouter `https://beta.scorgia.app/**` dans Supabase Auth settings |
| Email de confirmation | Personnaliser le template avec branding Scorgia |
| Désactiver signup public | Optionnel : restreindre aux invitations uniquement |

---

## 7. Stockage Supabase (Storage)

| Bucket | Accès | Usage |
|--------|-------|-------|
| Documents enseignant | Privé, RLS | Pièces jointes chat Préparer |
| Exports | Privé par utilisateur | PDF/DOCX/PPTX |

Vérifier les politiques Storage avant la bêta.

---

## 8. Monitoring bêta

| Outil | Source |
|-------|--------|
| Erreurs client | `beta_logs` (level=error) → visible dans `/founder/monitoring` |
| Feedbacks | `beta_feedback` → visible dans `/founder/bi` (feedbacks reçus) |
| Activité IA | `generations_ia` → visible dans `/founder/ia` |
| Utilisateurs actifs | `utilisateurs.derniere_connexion` → `/founder` Dashboard |

---

## 9. Données de démonstration

Les migrations 033 incluent des seeds :
- 2 produits (Scorgia, MboaSchool)
- 11 items roadmap
- 3 notifications
- 4 déploiements
- 1 entrée company_info

Ces données sont réelles dans la base. Elles ne polluent pas les métriques enseignants.

---

## 10. Procédure de rollback

```sql
-- Si la migration 033 pose problème, rollback :
DROP TABLE IF EXISTS founder_notifications;
DROP TABLE IF EXISTS founder_deployments;
DROP TABLE IF EXISTS founder_roadmap;
DROP TABLE IF EXISTS founder_products;
DROP TABLE IF EXISTS company_info;

-- Si la migration 034 pose problème (rare), rollback des policies uniquement :
-- Voir 032_founder_platform.sql pour les policies originales (bugguées)
```

> Ne jamais rollback 031 ou 032 — ces migrations touchent la table `utilisateurs`.
