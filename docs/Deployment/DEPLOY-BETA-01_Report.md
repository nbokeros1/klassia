# DEPLOY-BETA-01 — Rapport final
> **Mission** : Préparer ScorgIA pour le premier déploiement Vercel bêta contrôlé (3–5 enseignants)  
> **Date** : 2026-08-05  
> **Statut** : ✅ PRÉPARATION COMPLÈTE — En attente de validation PO

---

## Décision finale

| Dimension | Statut |
|-----------|--------|
| Code — Build ✅ | ✅ GO |
| Sécurité — Proxy middleware | ✅ GO |
| Sécurité — Routes protégées | ✅ GO |
| Branding — ScorgIA cohérent | ✅ GO |
| Infrastructure — Docs déploiement | ✅ GO |
| Actions PO requises avant lancement | ⚠ EN ATTENTE PO |

**Verdict : PRÊT POUR DÉPLOIEMENT — Le PO doit exécuter la checklist `PRODUCT_OWNER_BETA_CHECKLIST.md`.**

---

## Ce qui a été fait dans DEPLOY-BETA-01

### Corrections de code

| # | Fichier | Correction | Référence |
|---|---------|-----------|-----------|
| 1 | `src/proxy.ts` | Ajout protection `/founder` + vérification rôle founder | DEC-044 |
| 2 | `src/proxy.ts` | Ajout `/founder/:path*` dans le matcher | DEC-044 |
| 3 | `src/app/dashboard/sondage/page.tsx` | Watermark "KlassIA" → "ScorgIA" | DEC-045 |
| 4 | `src/components/enseigner/copilot/CopilotPanel.tsx` | "KlassIA Copilot" → "ScorgIA Copilot" | DEC-045 |

### Découvertes techniques

| Découverte | Impact | Référence |
|------------|--------|-----------|
| `proxy.ts` = middleware natif Next.js 16 (pas `middleware.ts`) | Sécurité confirmée | DEC-043 |
| `functions-config-manifest.json` = autorité réelle (pas `middleware-manifest.json`) | Architecture | DEC-043 |
| Plan Vercel Pro obligatoire (SSE 90–180 s > 60 s Hobby) | Infra requise avant déploiement | DEC-046 |
| `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_APP_NAME` inutilisés dans le code | Variables réservées | M3 |
| Conflits de numérotation migrations 008/011/012 | À gérer à la main | M4 |

### Documents créés

| Document | Mission |
|----------|---------|
| `docs/Deployment/SCORGIA_BETA_ENVIRONMENT_VARIABLES.md` | M3 |
| `docs/Deployment/SUPABASE_BETA_MIGRATION_ORDER.md` | M4 |
| `docs/Deployment/SUPABASE_AUTH_BETA_SETUP.md` | M6 |
| `docs/Deployment/VERCEL_COMPATIBILITY_ASSESSMENT.md` | M7 |
| `docs/Deployment/VERCEL_PROJECT_SETUP.md` | M8 |
| `docs/Deployment/BETA_PROTECTION_STRATEGY.md` | M9 |
| `docs/Deployment/BETA_BRANDING_AUDIT.md` | M11 |
| `docs/Deployment/BETA_SMOKE_TEST_MATRIX.md` | M12 |
| `docs/Deployment/BETA_MONITORING_GUIDE.md` | M13 |
| `docs/Deployment/BETA_ROLLBACK_PLAN.md` | M14 |
| `docs/Deployment/PRODUCT_OWNER_BETA_CHECKLIST.md` | M15 |
| `docs/Deployment/DEPLOY-BETA-01_Report.md` | M16 |
| `docs/Deployment/VERCEL_SETUP_GUIDE.md` | M16 |

---

## M10 — Curriculum officiel

**Statut : déjà implémenté dans SPIE-BETA-02/03.**

`BuildMyYearWizard.tsx` ligne 411 :
```typescript
const hasOfficiel = false // Pour la bêta, aucun curriculum officiel n'est encore validé
```

La carte "Curriculum officiel ScorgIA" est cliquable mais affiche un message clair + bouton de retour. L'API `/api/spie/official-curricula` retourne une liste vide avec le même message. Aucune modification requise.

---

## M5 — Compte Founder

Le compte Founder `enwaha22@gmail.com` est configuré via migration 032.  
Procédure pour un second Founder : voir `docs/Founder_Roles_Setup.md`.

---

## Actions restantes (pour le PO)

1. **Souscrire Vercel Pro** (bloquant pour SSE)
2. **Ajouter `maxDuration = 300`** dans `lesson-engine/route.ts` et `build-year/route.ts`
3. **Créer le projet Vercel** `scorgia-beta`
4. **Configurer les variables d'environnement** Vercel
5. **Exécuter les 38 migrations** Supabase dans l'ordre
6. **Mettre à jour l'auth Supabase** (Site URL + Redirect URLs + Email templates)
7. **Exécuter la matrice de smoke tests**
8. **Valider la checklist PO** → Décision GO/NO GO
9. **Inviter les enseignants bêta** (seulement après GO)

---

## Décisions log

DEC-043, DEC-044, DEC-045, DEC-046 — voir `docs/SPIE/Decision_Log.md`

---

*Rapport créé : DEPLOY-BETA-01 · M16 · 2026-08-05*
