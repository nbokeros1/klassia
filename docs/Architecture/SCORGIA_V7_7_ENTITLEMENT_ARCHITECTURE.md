# SCORGIA V7.7 — Entitlement Architecture

## Design Principles

1. **Single source of truth**: `src/lib/entitlement/resolver.ts` — importable from server routes and client hooks.
2. **DB is billing record**: `utilisateurs.forfait` = commercial subscription. Never mutated for beta.
3. **Role is access override**: `utilisateurs.role = 'beta'` → effective `pro_plus` at runtime.
4. **No fake admin**: `is_admin` is never set `true` for beta teachers.

## `resolveEffectiveForfait(params)`

```typescript
// src/lib/entitlement/resolver.ts
export function resolveEffectiveForfait(params: {
  role?: string | null
  forfait?: string | null
  is_admin?: boolean | null
}): ForfaitEffectif
```

Priority chain:
1. `is_admin = true` → `'institution'`
2. `role = 'beta'` → `'pro_plus'`
3. Stored `forfait` value → mapped to `ForfaitEffectif`

## Propagation Map

| Layer | How it uses the resolver |
|-------|--------------------------|
| `useForfait(forfait, is_admin?, role?)` hook | Calls `resolveEffectiveForfait`, returns effective forfait |
| `CadenasForFait` component | Accepts `role` prop, passes to `useForfait` |
| `peutGenererContenu(profil)` | Picks `role` from profil, calls `hasUnlimitedAI` |
| `peutCreerClasse(profil, n)` | Picks `role`, calls `resolveEffectiveForfait` |
| `peutAjouterMatiere(profil, n)` | Picks `role`, calls `resolveEffectiveForfait` |
| `getBetaEntitlement(forfait, role?, is_admin?)` | Calls `resolveEffectiveForfait` |
| `/api/ia/generer` route | Selects `role`, calls `peutGenererContenu` |
| `/api/spie/build-year` route | Selects `role`, calls `getBetaEntitlement` |
| `/api/ia/importer-emploi-du-temps` route | Selects `role`, checks `role='beta'` inline |

## Source of Entitlement

```typescript
export type SourceEntitlement = 'admin' | 'beta' | 'commercial'

export function resolveEntitlementSource(params): SourceEntitlement
```

Returns the reason behind the effective forfait — useful for UI labeling (e.g., "Accès bêta" badge).

## What NOT to do

- Do NOT set `forfait = 'pro_plus'` in DB for beta teachers.
- Do NOT set `is_admin = true` for beta teachers.
- Do NOT create a parallel entitlement system — always go through `resolver.ts`.
- Do NOT expose `role = 'beta'` as equivalent to `role = 'admin'` (different code paths).
