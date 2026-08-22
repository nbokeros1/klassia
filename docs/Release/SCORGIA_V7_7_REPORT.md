# SCORGIA V7.7 — Beta Teacher Fast Track Report

**Branch**: main (local only — DO NOT PUSH until PO approval)
**Date**: 2026-08-17
**Author**: Eddy Nwaha

## Summary

V7.7 delivers the beta teacher fast-track onboarding and entitlement architecture needed to let invited beta teachers reach working ScorgIA functionality in < 3 minutes.

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `src/lib/entitlement/resolver.ts` | Centralized entitlement resolver — single source of truth |
| `docs/Product/SCORGIA_V7_7_BETA_FAST_TRACK.md` | Product spec |
| `docs/Architecture/SCORGIA_V7_7_ENTITLEMENT_ARCHITECTURE.md` | Architecture decision record |
| `docs/Release/SCORGIA_V7_7_REPORT.md` | This file |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/types/database.ts` | Added `role?: string` to `Utilisateur` type |
| `src/lib/hooks/useForfait.ts` | `peutGenererContenu/peutCreerClasse/peutAjouterMatiere` accept `role`; `useForfait` accepts `role` |
| `src/lib/entitlements.ts` | `getBetaEntitlement` and `getEntitlementSummary` accept `role`; use resolver |
| `src/components/ui/CadenasForFait.tsx` | Added `role` prop, passes to `useForfait` |
| `src/app/api/ia/generer/route.ts` | Selects `role`, uses `hasUnlimitedAI` from resolver |
| `src/app/api/spie/build-year/route.ts` | Selects `role`, passes to `getBetaEntitlement` |
| `src/app/api/ia/importer-emploi-du-temps/route.ts` | Selects `role`, beta bypass in quota check |
| `src/app/onboarding/page.tsx` | **Full rewrite**: bienvenue step, curriculum removed, forfait removed for beta, progressive saves, Previous/Skip/Dashboard buttons on all steps |
| `src/app/dashboard/page.tsx` | Beta welcome banner + improved no-class empty state |
| `src/app/dashboard/forfaits/page.tsx` | Beta informational banner |

## PO Constraints Respected

- [x] No DB mutation (migrations proposed, not applied)
- [x] No `is_admin=true` set for beta users
- [x] No `forfait='pro_plus'` set in DB for beta users
- [x] No push, no deploy, no remote Supabase change
- [x] Legal V1.1 untouched
- [x] RLS not weakened
- [x] Founder/admin tools not exposed to beta role
- [x] Existing beta accounts not deleted or reset

## Acceptance Test Status

| Test | Expected | Notes |
|------|----------|-------|
| A — Beta signup → dashboard < 3 min | Pass | bienvenue → profil (skip) → dashboard |
| B — Refresh restores data | Pass | init from DB, not localStorage |
| C — Back buttons present | Pass | every step has ← Précédent |
| D — Skip buttons present | Pass | Passer pour l'instant on profil/chemin steps |
| E — Go to dashboard anytime | Pass | `goToDashboard()` sets `onboarding_complete=true` |
| F — No pricing for beta | Pass | forfait selector hidden for `role='beta'` |
| G — No curriculum in onboarding | Pass | removed from flow and profilValide |
| H — Beta entitlement active | Pass | `resolveEffectiveForfait({ role:'beta' })` → `pro_plus` |
| I — DB forfait unchanged | Pass | resolver only, no UPDATE on forfait |
| J — Non-beta flow unchanged | Pass | profilValide still requires all fields for non-beta |
| K — CadenasForFait: beta bypass | Pass | role prop flows to useForfait |
| L — API quota: beta bypass | Pass | server routes check role='beta' |
| M — Dashboard beta banner | Pass | shown when role='beta' && !onboarding_cascade_complete |
| N — Forfaits page beta banner | Pass | shown when role='beta' |
| O — Empty class state | Pass | "Vous n'avez pas encore créé de classe." |
