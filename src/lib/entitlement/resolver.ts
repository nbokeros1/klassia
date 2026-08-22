// ─── Centralized entitlement resolver — ScorgIA V7.7 ─────────────────────────
// Single source of truth for effective access level.
// Importable from both server routes and client hooks — no 'use client'.
//
// Rule: beta access and commercial subscription are separate concerns.
//   role='beta'  → effective access: pro_plus features
//   is_admin=true → effective access: institution (full)
//   stored forfait → unchanged (billing record, not access record)
//
// Never mutate utilisateurs.forfait to grant beta access.

export type ForfaitEffectif = 'gratuit' | 'pro' | 'pro_plus' | 'institution'
export type SourceEntitlement = 'admin' | 'beta' | 'commercial'

const VALID_FORFAITS = new Set<string>(['gratuit', 'pro', 'pro_plus', 'institution'])

function toForfaitEffectif(raw: string | null | undefined): ForfaitEffectif {
  return VALID_FORFAITS.has(raw ?? '') ? (raw as ForfaitEffectif) : 'gratuit'
}

// ─── Primary resolver ─────────────────────────────────────────────────────────

export function resolveEffectiveForfait(params: {
  role?:     string | null
  forfait?:  string | null
  is_admin?: boolean | null
}): ForfaitEffectif {
  if (params.is_admin) return 'institution'
  if (params.role === 'beta') return 'pro_plus'
  return toForfaitEffectif(params.forfait)
}

export function resolveSource(params: {
  role?:     string | null
  is_admin?: boolean | null
}): SourceEntitlement {
  if (params.is_admin) return 'admin'
  if (params.role === 'beta') return 'beta'
  return 'commercial'
}

// ─── Helpers used in quota checks ────────────────────────────────────────────

/** True if the account has full AI generation access (no quota cap). */
export function hasUnlimitedAI(params: {
  role?:     string | null
  forfait?:  string | null
  is_admin?: boolean | null
}): boolean {
  const f = resolveEffectiveForfait(params)
  return f === 'pro_plus' || f === 'institution'
}

/** True if the account is on the beta programme. */
export function isBetaUser(role?: string | null): boolean {
  return role === 'beta'
}
