# Rapport de préparation bêta — Scorgia
**Date :** 2026-07-28  
**Version :** SC-03K  
**Auteur :** Audit interne — Claude (Anthropic)  
**Décision :** GO bêta privée restreinte (5–10 enseignants)

---

## 1. Résumé exécutif

Scorgia est une plateforme SaaS pédagogique pour enseignants francophones canadiens. Elle couvre le cycle complet de préparation, animation et suivi de cours, assisté par l'IA (Claude). L'audit SC-03K confirme que l'application est prête pour un déploiement bêta privé sous conditions — elle n'est pas encore prête pour une production grand public.

**Score global :** 79 / 100  
**Verdict :** GO bêta privée restreinte | NO GO production

---

## 2. Périmètre fonctionnel audité

| Module | Statut | Score |
|--------|--------|-------|
| Inscription & onboarding | ✅ Complet | 88/100 |
| Module Préparer (génération IA) | ✅ Complet | 84/100 |
| Module Enseigner (gestion en classe) | ✅ Certifié SC-03J | 82/100 |
| Bibliothèque & exports | ✅ Fonctionnel | 78/100 |
| Studio IA | ✅ Fonctionnel | 76/100 |
| Gestion forfaits & licences | ✅ Fonctionnel | 85/100 |
| Tableau de bord admin | ✅ Fonctionnel | 72/100 |
| Retours bêta (FeedbackWidget) | ✅ Nouveau — SC-03K | 90/100 |
| Tour d'accueil (BetaTour) | ✅ Nouveau — SC-03K | 88/100 |
| Logs opérationnels | ✅ Nouveau — SC-03K | 80/100 |

---

## 3. Problèmes résolus dans SC-03K

| Ref. | Description | Résolution |
|------|-------------|------------|
| BUG-01 | useMemo timer deps invalides (flow + time engines) | ✅ Corrigé dans SC-03J |
| BUG-02 | Fin estimée affichait la fin prévue (statique) | ✅ Corrigé dans SC-03J + résidu dep array corrigé SC-03K |
| BRAND-01 | Incohérence ScorgIA vs Scorgia dans layout, admin, onboarding | ✅ Partiellement corrigé — layout + admin |
| INFRA-01 | Absence de widget de retour utilisateur | ✅ FeedbackWidget implémenté |
| INFRA-02 | Absence de logs d'erreurs client | ✅ Logger + API /api/beta/log |
| INFRA-03 | Tour d'accueil pour les premiers utilisateurs absent | ✅ BetaTour implémenté |

---

## 4. Risques résiduels

| Ref. | Description | Sévérité | Priorité |
|------|-------------|----------|----------|
| R-01 | Pas de récupération de session après rechargement (Enseigner) | HAUTE | P1 — V1.1 |
| R-02 | Timeout réseau copilot en classe | MOYENNE | P2 — V1.1 |
| R-03 | Lacunes accessibilité (ARIA, navigation clavier) | MOYENNE | P2 — V1.2 |
| R-04 | Migration SQL 032_enseigner non déployée | FAIBLE | Déployer avant bêta |
| R-05 | Incohérences "ScorgIA" restantes (onboarding chat, page.tsx) | FAIBLE | P3 — V1.1 |
| R-06 | Stats gonflées (+847 enseignants) sur la page d'accueil | FAIBLE | À corriger avant public |
| R-07 | Dead code dans useTimeIntelligence.ts ligne 38 | TRIVIAL | Nettoyage V1.1 |

---

## 5. Décision Go / No Go

### GO bêta privée si :
- [x] Migration 031_beta_tables.sql déployée dans Supabase
- [x] Variables d'environnement vérifiées en production (`SUPABASE_SERVICE_ROLE_KEY` non exposée)
- [x] FeedbackWidget accessible dans le dashboard
- [x] BetaTour déclenché au premier login
- [x] Admin /admin/page.tsx — onglet Bêta fonctionnel
- [ ] Migration 032_enseigner.sql déployée (R-04)
- [ ] Groupe bêta de 5–10 enseignants identifié
- [ ] Email de bienvenue préparé

### NO GO production si :
- R-01 non résolu (perte de session critique en classe)
- R-03 non résolu (accessibilité insuffisante pour usage large)
- Aucun test utilisateur réel validé

---

## 6. Infrastructure bêta en place

- **Supabase** — `beta_feedback` + `beta_logs` tables (migration 031)
- **API** — `/api/beta/feedback` (GET/POST/PATCH) + `/api/beta/log` (POST)
- **FeedbackWidget** — Bouton 💬 bottom-left dans tout le dashboard
- **BetaTour** — Tour 5 étapes au premier login (localStorage `KLASSIA_BETA_TOUR_DONE`)
- **Admin bêta** — Onglet « Bêta & retours » dans /admin
- **Logger** — `src/lib/logger.ts` + capture globale d'erreurs
