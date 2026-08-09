# Pre-Deployment GO / NO GO — Scorgia Bêta Privée

**Date :** 2026-07-27  
**Version plateforme :** SC-03N (post-validation)  
**Décision formelle :** voir section finale

---

## Checklist GO / NO GO

### Critère 1 — Migrations Supabase cohérentes

| Item | Verdict | Notes |
|------|---------|-------|
| Migration 031 complète et correcte | ⚠️ **Conditionnel** | Correcte SI 034 appliquée en plus |
| Migration 032 complète et correcte | ⚠️ **Conditionnel** | Correcte SI 034 appliquée en plus |
| Migration 033 prête à appliquer | ✅ **GO** | Testée, seeds inclus |
| Migration 034 prête à appliquer | ✅ **GO** | Correctif RLS documenté |

**Verdict Critère 1 : GO CONDITIONNEL — appliquer 034 + 033 avant tout utilisateur bêta**

---

### Critère 2 — Comptes Founder configurés

| Item | Verdict | Notes |
|------|---------|-------|
| Founder principal (enwaha22@gmail.com) | ✅ **GO** | Configuré dans 032 |
| Second Founder identifié et configuré | ⚠️ **Conditionnel** | Email non fourni — procédure dans `Founder_Roles_Setup.md` |

**Verdict Critère 2 : GO CONDITIONNEL — second Founder à configurer avant bêta multi-fondateur**

---

### Critère 3 — Espace enseignant sans régression

| Item | Verdict | Notes |
|------|---------|-------|
| 10 outils navigation principale | ✅ **GO** | Inventaire complet dans `Teacher_Tools_Inventory.md` |
| Outils secondaires (quiz, sondage, studio) | ✅ **GO** | Non modifiés |
| Pages de classe | ✅ **GO** | Non modifiées |
| API IA (assistant, action, curriculum) | ✅ **GO** | Périmètre protégé — non touché |
| Exports (PDF, DOCX, PPTX) | ✅ **GO** | Non modifiés |

**Verdict Critère 3 : GO**

---

### Critère 4 — Audit données réelles vs simulées

| Item | Verdict | Notes |
|------|---------|-------|
| Données réelles clairement identifiées | ✅ **GO** | 14 pages auditées |
| Données estimées ou statiques signalées | ✅ **GO** | Labellisées ESTIMÉ/STATIQUE/HONNÊTE |
| Aucune donnée simulée présentée comme réelle | ✅ **GO** | MRR/ARR = estimé, AWS = N/A affiché |

**Verdict Critère 4 : GO**

---

### Critère 5 — API Founder fonctionnelles

| Item | Verdict | Notes |
|------|---------|-------|
| Auth pattern corrigé (5 nouvelles routes) | ✅ **GO** | createServerClient() uniformisé |
| Whitelist champs PATCH (injection SQL) | ✅ **GO** | Toutes les routes PATCH utilisent liste blanche |
| Validation inputs (types, statuts, champs requis) | ✅ **GO** | CHECKs Supabase + validation JS |
| Fire-and-forget audit trail | ✅ **GO** | Pattern void+catch appliqué |
| SUPABASE_SERVICE_ROLE_KEY jamais exposé | ✅ **GO** | Server-only, jamais NEXT_PUBLIC_ |

**Verdict Critère 5 : GO**

---

### Critère 6 — RLS validées

| Item | Verdict | Notes |
|------|---------|-------|
| RLS activé sur toutes les tables Founder | ✅ **GO** | Confirmé 031+032+033 |
| Bug `u.id = auth.uid()` corrigé | ⚠️ **Conditionnel** | Corrigé par 034 — à appliquer |
| Tables 033 : policies correctes dès création | ✅ **GO** | `user_id` utilisé dès l'écriture |

**Verdict Critère 6 : GO CONDITIONNEL — migration 034 requise**

---

### Critère 7 — Tests cockpit fonctionnel

| Item | Verdict | Notes |
|------|---------|-------|
| /founder — Dashboard Exécutif | ✅ **GO** | Requêtes réelles, KPIs calculés |
| /founder/bi — Business Intelligence | ✅ **GO** | Calculs réels sur utilisateurs/lecons |
| /founder/roadmap — Kanban drag-and-drop | ✅ **GO** | HTML5 natif, PATCH on drop |
| /founder/deployment — Historique | ✅ **GO** | Données seeded, filtres OK |
| /founder/notifications — Centre | ✅ **GO** | Mark read, filtres, refresh |
| /founder/audit — Piste d'audit | ⚠️ **Conditionnel** | Requiert migration 034 |
| /founder/utilisateurs — Gestion | ✅ **GO** | service_role, whitelist, protection founder |

**Verdict Critère 7 : GO CONDITIONNEL — 034 requise pour audit**

---

### Critère 8 — Branding Scorgia

| Item | Verdict | Notes |
|------|---------|-------|
| Aucun "KlassIA" visible utilisateur | ✅ **GO** | Vérifié sur toutes les pages |
| Identifiants techniques protégés conservés | ✅ **GO** | Ne pas renommer (contrat interne) |
| Titre `<title>` correct | ✅ **GO** | "Scorgia — L'assistant intelligent des enseignants" |

**Verdict Critère 8 : GO**

---

### Critère 9 — Checklist déploiement bêta

| Item | Verdict | Notes |
|------|---------|-------|
| Variables d'environnement définies | ✅ **GO** | Supabase URL + ANON_KEY + SERVICE_ROLE + Anthropic |
| HTTPS obligatoire | ⏳ **Pending** | Requis pour cookies HTTP-only — à configurer |
| URLs de redirection auth Supabase | ⏳ **Pending** | Ajouter le domaine bêta dans Supabase Auth |
| 5–10 comptes bêta identifiés | ⏳ **Pending** | Processus d'invitation à lancer |

**Verdict Critère 9 : NO GO (3 items pending — pré-déploiement externe)**

---

### Critère 10 — Décision GO / NO GO globale

| Critère | Résultat |
|---------|----------|
| 1. Migrations | ⚠️ GO CONDITIONNEL |
| 2. Comptes Founder | ⚠️ GO CONDITIONNEL |
| 3. Outils enseignant | ✅ GO |
| 4. Données réelles/simulées | ✅ GO |
| 5. API Founder | ✅ GO |
| 6. RLS | ⚠️ GO CONDITIONNEL |
| 7. Cockpit fonctionnel | ⚠️ GO CONDITIONNEL |
| 8. Branding | ✅ GO |
| 9. Déploiement externe | ⏳ NO GO (pending infra) |
| 10. Décision globale | **GO CONDITIONNEL** |

---

## DÉCISION FORMELLE

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   DÉCISION : GO CONDITIONNEL                                 ║
║                                                              ║
║   La plateforme est prête techniquement sous réserve         ║
║   de l'exécution de 4 conditions avant mise en ligne :       ║
║                                                              ║
║   C1. Appliquer migration 034_fix_rls_policies.sql           ║
║   C2. Appliquer migration 033_business_center.sql            ║
║   C3. Configurer le second compte Founder                    ║
║   C4. Configurer HTTPS + URLs auth Supabase                  ║
║                                                              ║
║   Aucun bloqueur technique résiduel non documenté.           ║
║   Aucune régression sur l'espace enseignant.                 ║
║   Branding Scorgia confirmé côté utilisateur.                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Conditions levantes (C1–C4)

**C1 + C2 — Migrations** (30 min)
```sql
-- Dans Supabase SQL Editor, dans l'ordre :
\i supabase/migrations/034_fix_rls_policies.sql
\i supabase/migrations/033_business_center.sql
```

**C3 — Second Founder** (5 min après création de compte)
```sql
UPDATE utilisateurs SET role = 'founder', is_admin = true
WHERE email = '<EMAIL_SECOND_FOUNDER>';
```

**C4 — Infrastructure** (variable selon hébergeur)
- HTTPS : configurer sur AWS, Vercel, ou Cloudflare
- Supabase Auth → Settings → URL Configuration → ajouter `https://<domaine-beta>/**`

### Après les 4 conditions

La plateforme peut accueillir les premiers bêta testeurs.  
Le suivi s'effectue via `/founder/monitoring` et `/founder/bi`.  
Les feedbacks arrivent dans `beta_feedback` → visible dans `/founder/bi`.
