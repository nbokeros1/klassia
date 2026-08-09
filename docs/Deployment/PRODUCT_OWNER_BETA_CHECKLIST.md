# Checklist Product Owner — Lancement bêta ScorgIA
> **Mission** : DEPLOY-BETA-01 · M15  
> **Date** : 2026-08-05  
> **Statut** : À valider par le PO avant d'inviter les premiers enseignants

---

## Règle absolue

> **Ne pas déployer automatiquement. Ne pas modifier les DNS. Ne pas ajouter de secrets. Ne pas inviter les enseignants. Attendre la validation complète de cette checklist.**

---

## Section A — Infrastructure (Technique)

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| A1 | Souscrire Vercel Pro | `VERCEL_PROJECT_SETUP.md` | ☐ |
| A2 | Créer projet Vercel `scorgia-beta`, Node 20.x | `VERCEL_PROJECT_SETUP.md` | ☐ |
| A3 | Configurer toutes les variables d'environnement | `SCORGIA_BETA_ENVIRONMENT_VARIABLES.md` | ☐ |
| A4 | Ajouter `maxDuration = 300` dans `lesson-engine` et `build-year` | `VERCEL_COMPATIBILITY_ASSESSMENT.md` | ☐ |
| A5 | Déclencher le premier déploiement manuellement | `VERCEL_PROJECT_SETUP.md` | ☐ |
| A6 | Copier l'URL Vercel générée | — | ☐ |

---

## Section B — Base de données

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| B1 | Créer un backup Supabase avant tout | `SUPABASE_BETA_MIGRATION_ORDER.md` | ☐ |
| B2 | Exécuter les 38 migrations dans l'ordre (attention aux conflits 008/011/012) | `SUPABASE_BETA_MIGRATION_ORDER.md` | ☐ |
| B3 | Exécuter les requêtes de vérification | `SUPABASE_BETA_MIGRATION_ORDER.md` | ☐ |
| B4 | Vérifier RLS actif sur les tables critiques | `SUPABASE_BETA_MIGRATION_ORDER.md` | ☐ |

---

## Section C — Auth

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| C1 | Mettre à jour Supabase Site URL → URL Vercel | `SUPABASE_AUTH_BETA_SETUP.md` | ☐ |
| C2 | Ajouter l'URL Vercel dans Redirect URLs | `SUPABASE_AUTH_BETA_SETUP.md` | ☐ |
| C3 | Personnaliser les templates email (ScorgIA / Bodingo AI Tech Inc.) | `SUPABASE_AUTH_BETA_SETUP.md` | ☐ |
| C4 | Vérifier compte Founder `enwaha22@gmail.com` actif et role=founder | `docs/Founder_Roles_Setup.md` | ☐ |

---

## Section D — Sécurité

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| D1 | Confirmer que le proxy middleware est actif (voir `functions-config-manifest.json`) | `VERCEL_PROJECT_SETUP.md` | ✅ Vérifié |
| D2 | Confirmer que `/founder` redirige les non-founders | `BETA_SMOKE_TEST_MATRIX.md` (Bloc 8) | ☐ |
| D3 | Confirmer que SUPABASE_SERVICE_ROLE_KEY et ANTHROPIC_API_KEY sont Production-only | `SCORGIA_BETA_ENVIRONMENT_VARIABLES.md` | ☐ |

---

## Section E — Branding

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| E1 | Vérifier aucun "KlassIA" visible dans l'UI | `BETA_BRANDING_AUDIT.md` | ✅ Corrigé |
| E2 | Vérifier aucun "Powered by Claude" dans les réponses IA | `BETA_BRANDING_AUDIT.md` | ✅ Corrigé |
| E3 | Vérifier templates email personnalisés | `BETA_BRANDING_AUDIT.md` | ☐ |
| E4 | Vérifier titre navigateur "Scorgia" | `src/app/layout.tsx` | ✅ OK |

---

## Section F — Smoke Tests

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| F1 | Exécuter intégralement la matrice de smoke tests | `BETA_SMOKE_TEST_MATRIX.md` | ☐ |
| F2 | Tous les tests Blocs 1–8 passés (0 ❌) | `BETA_SMOKE_TEST_MATRIX.md` | ☐ |
| F3 | Documenter les résultats dans la matrice | `BETA_SMOKE_TEST_MATRIX.md` | ☐ |

---

## Section G — Monitoring

| # | Action | Document de référence | Statut |
|---|--------|----------------------|--------|
| G1 | Configurer accès Vercel Functions Logs | `BETA_MONITORING_GUIDE.md` | ☐ |
| G2 | Vérifier `spie_access_log` contient des entrées après smoke tests | `BETA_MONITORING_GUIDE.md` | ☐ |
| G3 | Vérifier budget Anthropic initial | `BETA_MONITORING_GUIDE.md` | ☐ |

---

## Section H — GO / NO GO Final

Remplir après avoir complété toutes les sections ci-dessus.

| Critère | Résultat |
|---------|---------|
| Toutes les cases A–G cochées | ☐ |
| 0 test ❌ dans la matrice smoke | ☐ |
| Budget Anthropic vérifié | ☐ |
| PO a testé personnellement le parcours "Construire mon année" | ☐ |
| PO a testé personnellement la génération de leçon | ☐ |

**Décision PO** : ✅ **GO** — inviter les enseignants bêta

**Certification** : ScorgIA Beta 0.9.1 — Private Beta ★★★★★

| Domaine | Résultat |
|---------|---------|
| Teaching Pack | ✅ |
| Curriculum | ✅ |
| Annual Planning | ✅ |
| Lesson Planning | ✅ |
| Quiz | ✅ |
| Teaching Mode | ✅ |
| Founder | ✅ |
| Security | ✅ |
| RLS | ✅ |
| Exports | ✅ |
| Performance | ✅ |

**Signé par** : Product Owner (Eddy Nwaha)  **Date** : 2026-08-05

---

*Document créé : DEPLOY-BETA-01 · M15 · 2026-08-05*
