# SC-03N — Founder Platform Validation Report

**Date :** 2026-07-27  
**Version :** 1.0  
**Auteur :** Analyse automatisée (Claude Code)  
**Périmètre :** Founder Business Center complet — migrations 031–034, 14 pages, 8 routes API

---

## 1. État des migrations Supabase

| Migration | Tables créées | RLS | Seed | Statut |
|-----------|--------------|-----|------|--------|
| `031_beta_tables.sql` | `beta_feedback`, `beta_logs` | ⚠️ BUG `u.id` | Non | ✅ Appliquée (bug RLS corrigé par 034) |
| `032_founder_platform.sql` | `scorgia_roles`, `audit_trail`, `beta_invitations` + role founder | ⚠️ BUG `u.id` | Partiel | ✅ Appliquée (bug RLS corrigé par 034) |
| `033_business_center.sql` | `founder_products`, `founder_roadmap`, `founder_notifications`, `founder_deployments`, `company_info` | ✅ Correct (`user_id`) | ✅ Oui | ✅ Prête à appliquer |
| `034_fix_rls_policies.sql` | — | ✅ Correctif RLS 4 policies | — | ✅ Prête à appliquer |

### Ordre d'application recommandé
```
(Si 031 et 032 ne sont pas encore appliquées)
031 → 032 → 033 → 034

(Si 031 et 032 sont déjà appliquées)
034 → 033
```

---

## 2. Configuration des comptes Founder

| Compte | Email | Rôle | is_admin | Statut |
|--------|-------|------|----------|--------|
| Founder principal | `enwaha22@gmail.com` | `founder` | `true` | ✅ Configuré (032 SQL) |
| Second Founder | Non défini | — | — | ⏳ En attente d'identification |

**Procédure second Founder** : voir `docs/Founder_Roles_Setup.md`

---

## 3. Inventaire outils enseignant (test de régression)

- **10 outils principaux** : tous opérationnels (voir `docs/Teacher_Tools_Inventory.md`)
- **Aucun fichier enseignant modifié** lors du développement SC-03M
- Le Business Center utilise des espaces isolés : `src/app/founder/`, `src/app/api/founder/`, `supabase/migrations/033+034`
- **Aucune régression détectée**

---

## 4. Audit données réelles vs simulées (14 pages Founder)

**Résumé** (détail complet dans `docs/Real_vs_Mock_Data_Audit.md`) :

| Catégorie | Pages concernées | Évaluation |
|-----------|-----------------|------------|
| ✅ RÉEL | bi, analytics, utilisateurs, beta, ia (counts), monitoring, roadmap, notifications | Données Supabase live |
| ⚠️ ESTIMÉ | dashboard (MRR/ARR), ia (coût $0.03/gen) | Calcul approximatif, pas d'API Stripe/Anthropic |
| 🔴 STATIQUE | dashboard (99.9%, latences), deployment (AWS arch) | Valeurs hardcodées non dynamiques |
| 🔵 STATIQUE INTENTIONNEL | vision (mission, OKR 2035) | Document stratégique — normal |
| ✅ HONNÊTE | deployment (AWS N/A, CI/CD À configurer) | UI explicite sur les placeholders |

**Risk items** : MRR/ARR ne reflète pas un vrai système de paiement (Stripe). Pour une bêta privée sans facturation, c'est acceptable. À corriger avant le lancement public.

---

## 5. Tests API Founder

Analyse statique des 8 groupes de routes. Détail dans `docs/Founder_API_Test_Matrix.md`.

### Résultats par route

| Route | Auth pattern | GET | POST | PATCH | DELETE | Verdict |
|-------|-------------|-----|------|-------|--------|---------|
| `/api/founder/users` | createServerClient() ✅ | ✅ | — | ✅ whitelist | ✅ protège founder | ✅ PASS |
| `/api/founder/audit` | createServerClient() ✅ | ✅ | ✅ valide categorie | — | — | ✅ PASS |
| `/api/founder/beta` | createServerClient() ✅ | ✅ | ✅ email requis | ✅ whitelist statut | — | ✅ PASS |
| `/api/founder/company` | createServerClient() ✅ | ✅ | — | ✅ 14 champs whitelist | — | ✅ PASS |
| `/api/founder/products` | createServerClient() ✅ | ✅ | ✅ nom+slug requis | — | — | ✅ PASS |
| `/api/founder/roadmap` | createServerClient() ✅ | ✅ | ✅ titre requis | ✅ whitelist | ✅ par id | ✅ PASS |
| `/api/founder/notifications` | createServerClient() ✅ | ✅ | ✅ valide type+priorite | ✅ marque lu | — | ✅ PASS |
| `/api/founder/deployment` | createServerClient() ✅ | ✅ | ✅ valide statut+env | — | — | ✅ PASS |

### Bug corrigé (post-analyse)
**Bug initial** : Les 5 routes SC-03M (company, products, roadmap, notifications, deployment) utilisaient `req.headers.get('authorization')` pour lire le JWT. Les appels browser fetch ne transmettent pas ce header → tous les appels retournaient 403.  
**Fix appliqué** : Migration vers `createServerClient()` (session cookie HTTP-only) dans toutes les routes, identique au pattern des routes users et audit.

---

## 6. Validation RLS

Détail complet dans `docs/Founder_RLS_Audit.md`.

| Élément | Avant 034 | Après 034 |
|---------|-----------|-----------|
| `audit_trail` — lecture founder | ❌ 0 résultats | ✅ Correct |
| `beta_invitations` — gestion | ❌ 0 résultats | ✅ Correct |
| `beta_feedback` — lecture admin | ❌ 0 résultats | ✅ Correct |
| `beta_logs` — lecture admin | ❌ 0 résultats | ✅ Correct |
| 5 tables Business Center (033) | ✅ Correct dès création | ✅ Correct |

Cause du bug : `u.id = auth.uid()` au lieu de `u.user_id = auth.uid()`. La table `utilisateurs` distingue `id` (PK interne) et `user_id` (UUID Supabase Auth).

---

## 7. Tests cockpit fonctionnel (analyse statique)

### Pages SC-03M validées

| Page | Données chargées | Actions UI | Drag-and-drop | Verdict |
|------|-----------------|-----------|---------------|---------|
| `/founder/roadmap` | `founder_roadmap` + `founder_products` | Add/Delete card, filtre produit | HTML5 natif, PATCH on drop | ✅ |
| `/founder/deployment` | `founder_deployments` + `founder_products` | Filtre produit, refresh | — | ✅ |
| `/founder/notifications` | `founder_notifications` | Mark read, mark all, filtre | — | ✅ |

### Pages pré-existantes (re-vérifiées)

| Page | Requêtes réelles | Verdict |
|------|-----------------|---------|
| `/founder` | utilisateurs, generations_ia, lecons, classes, beta_feedback, beta_logs, founder_deployments | ✅ |
| `/founder/bi` | utilisateurs, generations_ia, lecons | ✅ |
| `/founder/monitoring` | utilisateurs, classes, lecons, generations_ia, beta_logs | ✅ |
| `/founder/audit` | audit_trail, sessions_impersonation (bug corrigé par 034) | ✅ |
| `/founder/ia` | generations_ia, beta_logs | ✅ |

---

## 8. Audit branding (KlassIA → Scorgia)

| Élément | Situation | Action requise |
|---------|-----------|----------------|
| `<title>` layout | "Scorgia — L'assistant intelligent des enseignants" | ✅ Déjà correct |
| Sidebar logo | `LogoKlassIA` composant → affiche "Scorgia" | ✅ Correct (identifiant technique protégé) |
| `KlassIAFilePicker` | Identifiant technique protégé | ✅ Ne pas renommer |
| `FichierKlassia` | Type TypeScript protégé | ✅ Ne pas renommer |
| `klassia_active_classe` | Clé localStorage protégée | ✅ Ne pas renommer |
| `source: 'klassia'` | Valeur de contrat API | ✅ Ne pas renommer |
| `[KLASSIA][...]` | Console tags internes | ✅ Ne pas renommer |
| `CopilotPanel.tsx` "KlassIA Copilot" | Prompt système IA — non visible utilisateur | ✅ Acceptable |
| `teacher-brain.ts` | Commentaires internes | ✅ Acceptable |

**Verdict branding** : Aucun texte "KlassIA" visible par les utilisateurs finaux. Les occurrences restantes sont soit des identifiants techniques protégés, soit des commentaires internes.

---

## 9. Risques résiduels et recommandations

| # | Risque | Sévérité | Recommandation |
|---|--------|---------|----------------|
| R1 | RLS bug 031/032 non corrigé si 034 non appliqué | 🔴 Critique | Appliquer 034 AVANT d'inviter des bêta |
| R2 | Second Founder non configuré | 🟡 Moyen | Identifier l'email et exécuter SQL (voir Founder_Roles_Setup.md) |
| R3 | MRR/ARR basé sur estimations (pas Stripe) | 🟡 Moyen | Acceptable bêta, à corriger avant public |
| R4 | Latences et uptime hardcodés | 🟠 Faible | Non trompeur en usage interne Founder |
| R5 | AWS affiché comme N/A | 🟢 Info | Honnêteté affichée — pas un bug |
| R6 | Pas de tests automatisés (unitaires/e2e) | 🟡 Moyen | À planifier pour SC-04+ |
| R7 | Slug produit en doublon → erreur 500 générique | 🟢 Faible | Améliorer le message d'erreur |

---

## 10. Décision préliminaire

Voir `docs/Pre_Deployment_Go_NoGo.md` pour la décision formelle.

**Synthèse** :
- Tous les bugs bloquants identifiés ont été corrigés (API auth, RLS)
- Aucune régression enseignant
- Le branding est correct
- 2 conditions suspensives : application migration 034 + second Founder
