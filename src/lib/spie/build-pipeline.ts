// ─── SPIE-PERSISTENCE-01 — Build Pipeline Utilities ──────────────────────────
// Shared types and helpers for the "Construire mon année" pipeline.
// Every DB write must go through PERSIST → VERIFY before emitting success.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BetaEntitlement } from '@/lib/entitlements'
import type { TeachingPackStatut } from '@/lib/types/teaching-pack'

// ─── Step result ──────────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'success' | 'error' | 'skipped'

export type StepResult = {
  status:    StepStatus
  objectId?: string
  persisted: boolean
  verified:  boolean
  createdAt?: string
  error?:    string
}

export function stepSuccess(objectId?: string): StepResult {
  return { status: 'success', objectId, persisted: true, verified: true, createdAt: new Date().toISOString() }
}

export function stepError(error: string): StepResult {
  return { status: 'error', persisted: false, verified: false, error, createdAt: new Date().toISOString() }
}

export function stepSkipped(objectId?: string): StepResult {
  return { status: 'skipped', objectId, persisted: !!objectId, verified: !!objectId, createdAt: new Date().toISOString() }
}

// ─── BuildState ───────────────────────────────────────────────────────────────
// Persisted in teaching_packs.contenu_json.build_state.
// Survives refresh, logout/login, new tab.

export type BuildState = {
  buildId:          string
  startedAt:        string
  completedAt?:     string
  pack:             StepResult
  curriculum:       StepResult
  syllabus:         StepResult
  programme_annuel: StepResult
  plans_lecon:      StepResult
  premiere_lecon:   StepResult
  quiz:             StepResult
  finalized:        boolean
}

const pendingStep: StepResult = { status: 'pending', persisted: false, verified: false }

export function initBuildState(): BuildState {
  return {
    buildId:          crypto.randomUUID(),
    startedAt:        new Date().toISOString(),
    pack:             { ...pendingStep },
    curriculum:       { ...pendingStep },
    syllabus:         { ...pendingStep },
    programme_annuel: { ...pendingStep },
    plans_lecon:      { ...pendingStep },
    premiere_lecon:   { ...pendingStep },
    quiz:             { ...pendingStep },
    finalized:        false,
  }
}

// ─── Completeness ─────────────────────────────────────────────────────────────

export type CompletenessResult = {
  complete:        boolean
  missingElements: string[]
  status:          TeachingPackStatut
  counts: {
    sequences:       number
    plans_lecon:     number
    lecons_completes: number
    quiz:            number
  }
}

/**
 * Reads the database and returns the real completeness of a Teaching Pack.
 * Called after all build steps to determine the true final status.
 * Never trusts in-memory state — always reads from Supabase.
 */
export async function verifyTeachingPackCompleteness(
  supabase: SupabaseClient,
  packId:   string,
  classeId: string,
  entitlement: BetaEntitlement,
): Promise<CompletenessResult> {
  const missing: string[] = []
  const counts = { sequences: 0, plans_lecon: 0, lecons_completes: 0, quiz: 0 }

  // 1. Programme annuel lié au pack
  const { data: packRow } = await supabase
    .from('teaching_packs')
    .select('programme_annuel_id')
    .eq('id', packId)
    .single()

  if (!packRow?.programme_annuel_id) {
    missing.push('programme_annuel', 'syllabus', 'plan_annuel', 'sequences', 'plans_lecon')
  } else {
    const { data: prog } = await supabase
      .from('programme_annuel')
      .select('id, syllabus_json, contenu_json')
      .eq('id', packRow.programme_annuel_id)
      .single()

    if (!prog) {
      missing.push('programme_annuel', 'syllabus', 'plan_annuel', 'sequences', 'plans_lecon')
    } else {
      // Syllabus — doit avoir au minimum titre_cours et au moins 1 résultat d'apprentissage
      const syl = prog.syllabus_json as Record<string, unknown> | null
      if (!syl?.titre_cours || !(syl.resultats_apprentissage as unknown[])?.length) {
        missing.push('syllabus')
      }

      // Plan annuel + séquences + plans de leçon (tous embedded dans contenu_json)
      const contenu = prog.contenu_json as { unites?: { lecons?: unknown[] }[] } | null
      if (!contenu?.unites?.length) {
        missing.push('plan_annuel', 'sequences', 'plans_lecon')
      } else {
        counts.sequences   = contenu.unites.length
        counts.plans_lecon = contenu.unites.reduce((s, u) => s + (u.lecons?.length ?? 0), 0)
        if (counts.plans_lecon === 0) missing.push('plans_lecon')
      }
    }
  }

  // 2. Première leçon développée (si entitlement)
  if (entitlement.first_lesson_complete) {
    const { count: lc } = await supabase
      .from('fichiers_dossier')
      .select('id', { count: 'exact', head: true })
      .eq('classe_id', classeId)
      .eq('type_fichier', 'lecon_complete')
    counts.lecons_completes = lc ?? 0
    if (!lc) missing.push('premiere_lecon')
  }

  // 3. Quiz (si entitlement)
  if (entitlement.first_lesson_quiz) {
    const { count: qc } = await supabase
      .from('fichiers_dossier')
      .select('id', { count: 'exact', head: true })
      .eq('classe_id', classeId)
      .eq('type_fichier', 'quiz')
    counts.quiz = qc ?? 0
    if (!qc) missing.push('quiz')
  }

  const complete = missing.length === 0
  const status: TeachingPackStatut = complete
    ? 'pret'
    : missing.includes('programme_annuel')
      ? 'erreur'
      : 'partiellement_genere'

  return { complete, missingElements: missing, status, counts }
}
