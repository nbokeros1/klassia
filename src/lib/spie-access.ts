// ─── SPIE Access — Vérification côté serveur des entitlements ────────────────
// M15 : Les droits DOIVENT être vérifiés côté serveur.
// Ne jamais se contenter de masquer un bouton côté client.
// Ce module est le point central de contrôle pour toutes les routes SPIE.

import type { ForfaitType } from '@/lib/types/database'
import type { BetaEntitlement } from '@/lib/entitlements'
import { getBetaEntitlement } from '@/lib/entitlements'
import { NextResponse } from 'next/server'

export type SpieAction =
  | 'build_year'
  | 'read_pack'
  | 'edit_syllabus'
  | 'edit_plan_annuel'
  | 'export_syllabus'
  | 'export_plan_annuel'
  | 'export_sequence'
  | 'view_full_lessons'
  | 'run_quality_gate'
  | 'preview_offer'
  // SPIE-BETA-03 — Leçon détaillée
  | 'generate_detailed_lesson'
  | 'view_detailed_lesson'
  | 'export_detailed_lesson'
  | 'regenerate_lesson_section'
  | 'send_to_enseigner'
  | 'create_quiz_from_lesson'

// ─── Matrice d'accès par action ───────────────────────────────────────────────
// Chaque action est mappée à un entitlement BetaEntitlement.
// Les actions non listées sont accessibles à tous les utilisateurs authentifiés.

const ACTION_TO_ENTITLEMENT: Partial<Record<SpieAction, keyof BetaEntitlement>> = {
  build_year:               'build_year_access',
  edit_syllabus:            'syllabus',
  edit_plan_annuel:         'annual_plan',
  export_syllabus:          'syllabus',
  export_plan_annuel:       'annual_plan',
  export_sequence:          'all_sequences_structured',
  view_full_lessons:        'all_lessons_complete',
  // SPIE-BETA-03 : leçon détaillée disponible pour TOUS pendant la bêta
  generate_detailed_lesson: 'first_lesson_complete',
  view_detailed_lesson:     'first_lesson_complete',
  // Export verrouillé — seulement Pro/Pro+/Institution
  export_detailed_lesson:   'all_lessons_complete',
  // Régénération ciblée disponible pour tous pendant la bêta
  regenerate_lesson_section: 'first_lesson_complete',
  // Enseigner + Quiz libres pour tous
  send_to_enseigner:         'first_lesson_complete',
  create_quiz_from_lesson:   'first_lesson_quiz',
}

// ─── Vérificateur principal ───────────────────────────────────────────────────

export function canPerformAction(action: SpieAction, forfait: ForfaitType | undefined | null, isFounder = false): boolean {
  // Les Founders peuvent tout faire (pour les tests)
  if (isFounder) return true

  const entKey = ACTION_TO_ENTITLEMENT[action]
  if (!entKey) return true // Action non restreinte

  const ent = getBetaEntitlement(forfait ?? 'gratuit')
  return !!ent[entKey]
}

// ─── Helper pour les routes API ──────────────────────────────────────────────

export function requireEntitlement(action: SpieAction, forfait: ForfaitType | undefined | null, isFounder = false) {
  if (!canPerformAction(action, forfait, isFounder)) {
    return NextResponse.json(
      {
        error: 'Accès non autorisé pour ce forfait',
        action,
        requis: ACTION_TO_ENTITLEMENT[action],
        code:   'ENTITLEMENT_DENIED',
      },
      { status: 403 },
    )
  }
  return null
}

// ─── Mode Founder — Prévisualisation d'offre ─────────────────────────────────
// Permet aux Founders de tester l'expérience d'un forfait sans modifier leur rôle.
// RÈGLE : Ce mode est journalisé et ne contourne pas la sécurité serveur.

export function isFounderPreview(profil: { is_admin?: boolean; role?: string } | null): boolean {
  if (!profil) return false
  return profil.is_admin === true || ['founder', 'super_admin', 'admin'].includes(profil.role ?? '')
}

// ─── Journal (SPIE-BETA-03 — spie_access_log, migration 038) ────────────────
// Non-bloquant : ne jamais faire planter une route à cause d'un log manqué.

export async function logSpieAccess(params: {
  enseignant_id: string
  action: string
  teaching_pack_id?: string | null
  fichier_id?: string | null
  statut?: string
  details?: Record<string, unknown>
  // Legacy params
  autorise?: boolean
  forfait?: string
  source?: string
}) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    await supabase.from('spie_access_log').insert({
      enseignant_id:    params.enseignant_id,
      action:           params.action,
      teaching_pack_id: params.teaching_pack_id ?? null,
      fichier_id:       params.fichier_id ?? null,
      statut:           params.statut ?? (params.autorise === false ? 'refuse' : 'ok'),
      details_json:     params.details ?? (params.forfait ? { forfait: params.forfait, source: params.source } : null),
    })
  } catch {
    // Non-bloquant — le log ne doit jamais faire planter la route
  }
}
