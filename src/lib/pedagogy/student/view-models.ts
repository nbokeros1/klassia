// ─── ScorgIA V7.1 — UI ViewModels Foundation (Mission 18) ──────────────────
// Transforme les données brutes du plan de soutien en structures prêtes
// pour l'interface enseignant — V7.2 construira les composants UI dessus.
//
// PRINCIPE : Ces ViewModels ne doivent jamais contenir de données nominatives
// des élèves dans un contexte collectif — voir student-ai-context.ts pour
// la pseudonymisation avant transmission IA.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupportPlanV71, MeasurableGoal, Intervention, AISuggestion } from './types'
import type { SupportPlanQualityReport } from './quality-scorer'
import type { AuditTrailSummary } from './audit-trail'
import { validateMeasurableGoal } from './goal-validator'

// ════════════════════════════════════════════════════════════════════════════
// VIEWMODEL — PLAN DE SOUTIEN (vue enseignant)
// ════════════════════════════════════════════════════════════════════════════

export type SupportPlanViewModel = {
  // Identification — pas de données personnelles dans le ViewModel collectif
  plan_id?:          string
  statut:            SupportPlanV71['statut']
  annee_scolaire:    string
  date_creation:     string
  date_revision:     string
  date_revision_depasse: boolean

  // Profil pédagogique — résumé affichable
  nb_forces:         number
  nb_besoins:        number
  voix_eleve_present: boolean

  // Baseline
  baseline_presente:  boolean
  baseline_complete:  boolean   // > 20 caractères et source documentée

  // Objectifs — état de chaque objectif actif
  objectifs:          ObjectifViewModel[]
  nb_objectifs_actifs: number
  nb_objectifs_valides: number

  // Interventions — boucle d'intervention par objectif
  interventions:      InterventionViewModel[]
  nb_interventions_actives: number
  loop_completeness:  LoopCompletenessStatus

  // Suggestions IA en attente
  ai_suggestions_pending: AISuggestionViewModel[]
  nb_ai_pending:      number

  // Qualité — indicateur visuel
  qualite?:           QualityIndicator

  // Audit
  audit_summary?:     AuditTrailSummary

  // Confidentialité — toujours visible
  niveau_confidentialite: SupportPlanV71['niveau_confidentialite']
}

export type ObjectifViewModel = {
  id:              string
  formulation:     string
  domaine:         string
  statut:          MeasurableGoal['statut']
  echeance:        string
  echeance_depasse: boolean
  is_valid:        boolean
  validation_score: number   // 0–4
  issues:          string[]  // codes d'issues lisibles
  nb_interventions_liees: number
  has_progress:    boolean
}

export type InterventionViewModel = {
  id:                     string
  objectif_id:            string
  strategie_resume:       string   // 80 chars max
  frequence_resume:       string   // ex. "3×/sem — 30 min"
  responsable_role:       string
  statut:                 Intervention['statut']
  nb_observations:        number
  nb_preuves:             number
  derniere_decision?:     string
  necessite_attention:    boolean  // pas d'obs depuis 2 semaines ou décision "intensifier"
}

export type AISuggestionViewModel = {
  id:            string
  type:          AISuggestion['type']
  titre:         string
  contenu:       string
  justification: string
  statut:        AISuggestion['statut']
  expires_at?:   string
  is_expired:    boolean
  action_requise: boolean   // pending + not expired
}

export type QualityIndicator = {
  score:         number
  level:         'NOT_READY' | 'NEEDS_REVIEW' | 'READY' | 'STRONG'
  level_label:   string
  level_color:   'red' | 'orange' | 'green' | 'blue'
  next_step?:    string
  disclaimer:    string
}

// Complétude de la boucle d'intervention (BESOIN → OBJECTIF → STRATÉGIE → SUIVI)
export type LoopCompletenessStatus =
  | 'INCOMPLETE'     // Manque un maillon essentiel
  | 'STARTED'        // Objectif + stratégie présents, pas encore d'observation
  | 'IN_PROGRESS'    // Observations présentes
  | 'WELL_DOCUMENTED' // Observations + preuves + décisions

// ════════════════════════════════════════════════════════════════════════════
// BUILDER PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Transforme un SupportPlanV71 en SupportPlanViewModel.
 * Peut inclure un rapport qualité et un résumé audit.
 */
export function buildSupportPlanViewModel(
  plan:           SupportPlanV71,
  quality_report?: SupportPlanQualityReport,
  audit_summary?:  AuditTrailSummary,
): SupportPlanViewModel {
  const now = new Date()

  // ── Date révision ────────────────────────────────────────────────────────
  const date_revision_depasse = plan.date_revision
    ? new Date(plan.date_revision) < now
    : true

  // ── Profil pédagogique ───────────────────────────────────────────────────
  const forces = plan.profil?.forces ?? []
  const besoins = plan.profil?.besoins ?? []

  // ── Baseline ─────────────────────────────────────────────────────────────
  const baseline_presente = !!plan.baseline
  const baseline_complete = (
    baseline_presente
    && plan.baseline!.length > 20
    && (plan.sources_baseline?.length ?? 0) > 0
  )

  // ── Objectifs ────────────────────────────────────────────────────────────
  const objectifs_vms = plan.objectifs.map(buildObjectifViewModel.bind(null, plan))
  const actifs = objectifs_vms.filter(o => o.statut === 'actif')

  // ── Interventions ─────────────────────────────────────────────────────────
  const interventions_vms = plan.interventions.map(buildInterventionViewModel.bind(null, now))
  const interventions_actives = interventions_vms.filter(i => i.statut === 'active')

  // ── Boucle d'intervention ─────────────────────────────────────────────────
  const loop_completeness = assessLoopCompleteness(plan)

  // ── Suggestions IA ────────────────────────────────────────────────────────
  const ai_vms = (plan.ai_suggestions ?? []).map(s => buildAISuggestionViewModel(s, now))
  const pending_vms = ai_vms.filter(s => s.action_requise)

  // ── Qualité ──────────────────────────────────────────────────────────────
  const qualite = quality_report ? buildQualityIndicator(quality_report) : undefined

  return {
    plan_id:               plan.id,
    statut:                plan.statut,
    annee_scolaire:        plan.annee_scolaire,
    date_creation:         plan.date_creation,
    date_revision:         plan.date_revision,
    date_revision_depasse,

    nb_forces:             forces.length,
    nb_besoins:            besoins.length,
    voix_eleve_present:    !!plan.profil?.voix_eleve,

    baseline_presente,
    baseline_complete,

    objectifs:             objectifs_vms,
    nb_objectifs_actifs:   actifs.length,
    nb_objectifs_valides:  actifs.filter(o => o.is_valid).length,

    interventions:              interventions_vms,
    nb_interventions_actives:   interventions_actives.length,
    loop_completeness,

    ai_suggestions_pending: pending_vms,
    nb_ai_pending:          pending_vms.length,

    qualite,
    audit_summary,

    niveau_confidentialite: plan.niveau_confidentialite,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BUILDERS INTERNES
// ════════════════════════════════════════════════════════════════════════════

function buildObjectifViewModel(plan: SupportPlanV71, goal: MeasurableGoal): ObjectifViewModel {
  const validation = validateMeasurableGoal(goal)
  const now = new Date()

  const nb_interventions_liees = plan.interventions.filter(
    i => i.objectif_id === goal.id,
  ).length

  const has_progress = (goal.progression?.length ?? 0) > 0

  return {
    id:                     goal.id,
    formulation:            goal.formulation,
    domaine:                goal.domaine,
    statut:                 goal.statut,
    echeance:               goal.echeance,
    echeance_depasse:       goal.echeance ? new Date(goal.echeance) < now : false,
    is_valid:               validation.is_valid,
    validation_score:       validation.score,
    issues:                 validation.issues.map(i => i.message),
    nb_interventions_liees,
    has_progress,
  }
}

function buildInterventionViewModel(now: Date, intervention: Intervention): InterventionViewModel {
  const { frequence, strategie, responsable_role } = intervention

  const frequence_resume = frequence.sessions_par_semaine > 0 && frequence.duree_minutes > 0
    ? `${frequence.sessions_par_semaine}×/sem — ${frequence.duree_minutes} min`
    : 'Fréquence non définie'

  const strategie_resume = strategie.strategie.length > 80
    ? strategie.strategie.slice(0, 77) + '…'
    : strategie.strategie

  const derniere_obs = intervention.observations.at(-1)
  const derniere_decision = intervention.decisions.at(-1)?.decision

  // Attirer l'attention si : pas d'observation depuis 14 jours ou décision "intensifier"
  let necessite_attention = false
  if (derniere_obs) {
    const days_since_obs = (now.getTime() - new Date(derniere_obs.date).getTime()) / 86_400_000
    necessite_attention = days_since_obs > 14
  } else if (intervention.statut === 'active') {
    necessite_attention = true  // Intervention active sans aucune observation
  }
  if (derniere_decision === 'intensifier') necessite_attention = true

  return {
    id:                  intervention.id,
    objectif_id:         intervention.objectif_id,
    strategie_resume,
    frequence_resume,
    responsable_role:    responsable_role ?? 'Non défini',
    statut:              intervention.statut,
    nb_observations:     intervention.observations.length,
    nb_preuves:          intervention.preuves.length,
    derniere_decision,
    necessite_attention,
  }
}

function buildAISuggestionViewModel(suggestion: AISuggestion, now: Date): AISuggestionViewModel {
  const is_expired = suggestion.expires_at
    ? new Date(suggestion.expires_at) < now
    : false

  const action_requise = suggestion.statut === 'pending' && !is_expired

  return {
    id:            suggestion.id,
    type:          suggestion.type,
    titre:         suggestion.titre,
    contenu:       suggestion.contenu,
    justification: suggestion.justification,
    statut:        suggestion.statut,
    expires_at:    suggestion.expires_at,
    is_expired,
    action_requise,
  }
}

function buildQualityIndicator(report: SupportPlanQualityReport): QualityIndicator {
  const LEVEL_LABELS: Record<string, string> = {
    NOT_READY:    'Plan incomplet',
    NEEDS_REVIEW: 'À compléter',
    READY:        'Plan complet',
    STRONG:       'Plan solide',
  }
  const LEVEL_COLORS: Record<string, 'red' | 'orange' | 'green' | 'blue'> = {
    NOT_READY:    'red',
    NEEDS_REVIEW: 'orange',
    READY:        'green',
    STRONG:       'blue',
  }

  return {
    score:       report.total_score,
    level:       report.overall_level,
    level_label: LEVEL_LABELS[report.overall_level] ?? report.overall_level,
    level_color: LEVEL_COLORS[report.overall_level] ?? 'orange',
    next_step:   report.next_steps[0],
    disclaimer:  report.disclaimer,
  }
}

function assessLoopCompleteness(plan: SupportPlanV71): LoopCompletenessStatus {
  const has_goal = plan.objectifs.some(g => g.statut === 'actif')
  const has_intervention = plan.interventions.some(i => i.statut === 'active')

  if (!has_goal || !has_intervention) return 'INCOMPLETE'

  const total_obs = plan.interventions.reduce((s, i) => s + i.observations.length, 0)
  const total_preuves = plan.interventions.reduce((s, i) => s + i.preuves.length, 0)
  const total_decisions = plan.interventions.reduce((s, i) => s + i.decisions.length, 0)

  if (total_obs === 0) return 'STARTED'
  if (total_preuves > 0 && total_decisions > 0) return 'WELL_DOCUMENTED'
  return 'IN_PROGRESS'
}

// ════════════════════════════════════════════════════════════════════════════
// VIEWMODEL — LISTE DE PLANS (vue tableau de bord enseignant)
// ════════════════════════════════════════════════════════════════════════════

export type SupportPlanListItemViewModel = {
  plan_id?:              string
  statut:                SupportPlanV71['statut']
  annee_scolaire:        string
  nb_objectifs_actifs:   number
  nb_interventions_actives: number
  nb_ai_pending:         number
  loop_completeness:     LoopCompletenessStatus
  date_revision:         string
  date_revision_depasse: boolean
  necessite_attention:   boolean
}

/**
 * Construit un résumé léger pour l'affichage en liste.
 * Ne contient pas les données complètes — pour le tableau de bord.
 */
export function buildSupportPlanListItem(plan: SupportPlanV71): SupportPlanListItemViewModel {
  const now = new Date()

  const nb_objectifs_actifs    = plan.objectifs.filter(g => g.statut === 'actif').length
  const nb_interventions_actives = plan.interventions.filter(i => i.statut === 'active').length
  const nb_ai_pending          = (plan.ai_suggestions ?? []).filter(s => s.statut === 'pending').length
  const loop_completeness      = assessLoopCompleteness(plan)
  const date_revision_depasse  = plan.date_revision
    ? new Date(plan.date_revision) < now
    : true

  const necessite_attention = (
    date_revision_depasse
    || nb_ai_pending > 0
    || loop_completeness === 'INCOMPLETE'
    || plan.interventions.some(i =>
      i.statut === 'active'
      && i.observations.length === 0,
    )
  )

  return {
    plan_id:               plan.id,
    statut:                plan.statut,
    annee_scolaire:        plan.annee_scolaire,
    nb_objectifs_actifs,
    nb_interventions_actives,
    nb_ai_pending,
    loop_completeness,
    date_revision:         plan.date_revision,
    date_revision_depasse,
    necessite_attention,
  }
}
