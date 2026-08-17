// ─── ScorgIA V7.1 — Support Plan Quality Scorer (Mission 14) ───────────────
// Extension du Quality Engine V7.0 pour les plans de soutien pédagogique.
// Déterministe — aucune IA pour le calcul du score.
// Le score est INDICATIF — le jugement de l'enseignant reste souverain.
// "Ne pas fabriquer un score artificiellement précis si les données ne le permettent pas."
// ─────────────────────────────────────────────────────────────────────────────

import type { QualityLevel } from '../types/index'
import type { SupportPlanV71 } from './types'
import { validateMeasurableGoal } from './goal-validator'

// ════════════════════════════════════════════════════════════════════════════
// TYPES LOCAUX — dimensions spécifiques au plan de soutien
// ════════════════════════════════════════════════════════════════════════════

export type SupportPlanDimension =
  | 'BASELINE_PRESENT'
  | 'STRENGTHS_PRESENT'
  | 'NEED_DEFINED'
  | 'MEASURABLE_GOAL'
  | 'STRATEGY_LINKED_TO_GOAL'
  | 'INTERVENTION_FREQUENCY'
  | 'RESPONSIBLE_DEFINED'
  | 'MONITORING_METHOD'
  | 'REVIEW_DATE_DEFINED'
  | 'PROVENANCE_VALID'
  | 'PROTECTED_FIELDS_VERIFIED'

export type SupportPlanDimensionResult = {
  dimension:       SupportPlanDimension
  level:           QualityLevel
  score:           number         // 0–10
  evidence:        string[]
  missing:         string[]
  warnings:        string[]
  recommendations: string[]
}

export type SupportPlanQualityReport = {
  document_type:  'student_support_plan'
  document_id?:   string
  total_score:    number          // 0–100
  overall_level:  QualityLevel
  dimensions:     SupportPlanDimensionResult[]
  critical_gaps:  string[]
  strengths:      string[]
  next_steps:     string[]
  generated_at:   string
  // Avertissement : ce score est indicatif — jamais une note officielle
  disclaimer:     string
}

// ════════════════════════════════════════════════════════════════════════════
// POIDS PAR DIMENSION — somme = 1.0
// ════════════════════════════════════════════════════════════════════════════

const DIMENSION_WEIGHTS: Record<SupportPlanDimension, number> = {
  BASELINE_PRESENT:          0.10,
  STRENGTHS_PRESENT:         0.05,
  NEED_DEFINED:              0.15,
  MEASURABLE_GOAL:           0.20,
  STRATEGY_LINKED_TO_GOAL:   0.15,
  INTERVENTION_FREQUENCY:    0.10,
  RESPONSIBLE_DEFINED:       0.08,
  MONITORING_METHOD:         0.10,
  REVIEW_DATE_DEFINED:       0.05,
  PROVENANCE_VALID:          0.02,
  PROTECTED_FIELDS_VERIFIED: 0.00,  // Métadonnées de sécurité — n'affecte pas le score
}

// ════════════════════════════════════════════════════════════════════════════
// SCORER PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

function levelFromScore(score: number): QualityLevel {
  if (score >= 8.5) return 'STRONG'
  if (score >= 6.5) return 'READY'
  if (score >= 4.0) return 'NEEDS_REVIEW'
  return 'NOT_READY'
}

function dim(
  dimension: SupportPlanDimension,
  score:     number,
  evidence:  string[],
  missing:   string[],
  warnings:  string[],
  recs:      string[],
): SupportPlanDimensionResult {
  return { dimension, level: levelFromScore(score), score, evidence, missing, warnings, recommendations: recs }
}

/**
 * Score un plan de soutien pédagogique V7.1.
 * Retourne un rapport indicatif — jamais une décision ou une évaluation officielle.
 */
export function scoreSupportPlan(
  plan:         SupportPlanV71,
  document_id?: string,
): SupportPlanQualityReport {
  const results: SupportPlanDimensionResult[] = []

  // ── 1. BASELINE_PRESENT ──────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    let score = 0

    if (plan.baseline && plan.baseline.length > 20) {
      ev.push('Baseline documentée')
      score = 10
    } else if (plan.baseline) {
      ev.push('Baseline présente mais succincte')
      wa.push('Baseline trop courte pour être informative')
      score = 5
    } else {
      mi.push('Aucune baseline documentée')
      re.push('Documenter le niveau de départ observé — "En début d\'année, l\'élève peut..."')
    }

    if (!plan.sources_baseline || plan.sources_baseline.length === 0) {
      wa.push('Sources de la baseline non identifiées')
    } else {
      ev.push(`Sources : ${plan.sources_baseline.join(', ')}`)
    }

    results.push(dim('BASELINE_PRESENT', score, ev, mi, wa, re))
  }

  // ── 2. STRENGTHS_PRESENT ────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    const forces = plan.profil?.forces ?? []
    const score = forces.length >= 2 ? 10 : forces.length === 1 ? 6 : 0

    if (forces.length > 0) {
      ev.push(`${forces.length} force(s) documentée(s)`)
    } else {
      mi.push('Aucune force documentée')
      re.push('Identifier au moins 2 forces ou intérêts — le soutien pédagogique s\'appuie sur les forces.')
    }

    if (!plan.profil?.voix_eleve) {
      re.push('Envisager d\'inclure la voix de l\'élève sur ses propres forces et préférences.')
    } else {
      ev.push('Voix de l\'élève incluse')
    }

    results.push(dim('STRENGTHS_PRESENT', score, ev, mi, [], re))
  }

  // ── 3. NEED_DEFINED ─────────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    const besoins = plan.profil?.besoins ?? []
    let score = 0

    if (besoins.length === 0) {
      mi.push('Aucun besoin pédagogique documenté')
      re.push('Identifier et documenter les besoins observés — formulés pédagogiquement, pas médicalement.')
    } else {
      const nb_eleve = besoins.filter(b => b.priorite === 'elevee').length
      ev.push(`${besoins.length} besoin(s) documenté(s)`)
      if (nb_eleve > 0) ev.push(`${nb_eleve} priorité(s) élevée(s) identifiée(s)`)
      score = besoins.length >= 2 ? 10 : 6

      const sans_source = besoins.filter(b => !b.source)
      if (sans_source.length > 0) wa.push(`${sans_source.length} besoin(s) sans source identifiée`)
    }

    results.push(dim('NEED_DEFINED', score, ev, mi, wa, re))
  }

  // ── 4. MEASURABLE_GOAL ──────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    let score = 0

    const actifs = plan.objectifs.filter(g => g.statut === 'actif')

    if (actifs.length === 0) {
      mi.push('Aucun objectif actif documenté')
      re.push('Formuler au moins un objectif mesurable (comportement + condition + critère + échéance).')
    } else {
      let valid_count = 0
      for (const goal of actifs) {
        const result = validateMeasurableGoal(goal)
        if (result.is_valid) {
          valid_count++
          ev.push(`Objectif "${truncate(goal.formulation, 50)}" — valide`)
        } else {
          const codes = result.issues.map(i => i.code).join(', ')
          wa.push(`Objectif "${truncate(goal.formulation, 40)}" — issues : ${codes}`)
        }
      }

      const ratio = valid_count / actifs.length
      score = ratio >= 0.8 ? 10 : ratio >= 0.5 ? 7 : ratio > 0 ? 4 : 1
      ev.push(`${valid_count}/${actifs.length} objectif(s) mesurable(s)`)

      if (valid_count < actifs.length) {
        re.push('Reformuler les objectifs insuffisamment précis — utiliser la structure SMART.')
      }
    }

    results.push(dim('MEASURABLE_GOAL', score, ev, mi, wa, re))
  }

  // ── 5. STRATEGY_LINKED_TO_GOAL ──────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    let score = 0

    const actives = plan.interventions.filter(i => i.statut === 'active')
    const objectif_ids = new Set(plan.objectifs.map(g => g.id))
    const linked = actives.filter(i => objectif_ids.has(i.objectif_id))

    if (actives.length === 0) {
      mi.push('Aucune intervention active documentée')
      re.push('Documenter au moins une stratégie d\'intervention liée à un objectif.')
    } else {
      ev.push(`${actives.length} intervention(s) active(s)`)
      ev.push(`${linked.length}/${actives.length} liée(s) à un objectif`)
      score = linked.length === actives.length ? 10 : linked.length > 0 ? 6 : 2

      if (linked.length < actives.length) {
        wa.push(`${actives.length - linked.length} intervention(s) non liée(s) à un objectif`)
        re.push('Lier chaque intervention à un objectif spécifique.')
      }

      const sans_just = actives.filter(i => !i.strategie.justification)
      if (sans_just.length > 0) {
        wa.push(`${sans_just.length} intervention(s) sans justification pédagogique`)
        re.push('Documenter POURQUOI chaque stratégie est choisie pour ce besoin.')
      }
    }

    results.push(dim('STRATEGY_LINKED_TO_GOAL', score, ev, mi, wa, re))
  }

  // ── 6. INTERVENTION_FREQUENCY ────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    let score = 0

    const actives = plan.interventions.filter(i => i.statut === 'active')
    const avec_freq = actives.filter(i =>
      i.frequence.sessions_par_semaine > 0 && i.frequence.duree_minutes > 0,
    )

    if (actives.length > 0) {
      const ratio = avec_freq.length / actives.length
      score = ratio >= 1 ? 10 : ratio >= 0.5 ? 6 : 2
      ev.push(`${avec_freq.length}/${actives.length} intervention(s) avec fréquence définie`)

      if (avec_freq.length < actives.length) {
        mi.push(`${actives.length - avec_freq.length} intervention(s) sans fréquence définie`)
        re.push('Définir la fréquence (sessions/semaine) et la durée pour chaque intervention.')
      }
    }

    results.push(dim('INTERVENTION_FREQUENCY', score, ev, mi, [], re))
  }

  // ── 7. RESPONSIBLE_DEFINED ───────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    let score = 0

    const actives = plan.interventions.filter(i => i.statut === 'active')
    const avec_resp = actives.filter(i => !!i.responsable_role)

    if (actives.length === 0) {
      score = 5
    } else {
      const ratio = avec_resp.length / actives.length
      score = ratio >= 1 ? 10 : ratio >= 0.5 ? 5 : 0
      ev.push(`${avec_resp.length}/${actives.length} intervention(s) avec responsable défini`)

      if (avec_resp.length < actives.length) {
        mi.push(`${actives.length - avec_resp.length} intervention(s) sans responsable défini`)
        re.push('Identifier le rôle responsable pour chaque intervention (ex. : "enseignant", "orthopédagogue").')
      }
    }

    results.push(dim('RESPONSIBLE_DEFINED', score, ev, mi, [], re))
  }

  // ── 8. MONITORING_METHOD ─────────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], re: string[] = []
    let score = 0

    const actives = plan.interventions.filter(i => i.statut === 'active')
    const avec_obs = actives.filter(i => i.observations.length > 0)

    if (actives.length > 0) {
      const ratio = avec_obs.length / actives.length
      score = ratio >= 0.8 ? 10 : ratio >= 0.4 ? 5 : 1
      ev.push(`${avec_obs.length}/${actives.length} intervention(s) avec observations`)

      if (avec_obs.length < actives.length) {
        mi.push('Des interventions n\'ont pas encore d\'observations documentées')
        re.push('Enregistrer régulièrement des observations sur l\'efficacité de chaque intervention.')
      }
    }

    const total_obs = plan.interventions.reduce((sum, i) => sum + i.observations.length, 0)
    if (total_obs > 0) ev.push(`${total_obs} observation(s) au total`)

    results.push(dim('MONITORING_METHOD', score, ev, mi, [], re))
  }

  // ── 9. REVIEW_DATE_DEFINED ───────────────────────────────────────────────
  {
    const ev: string[] = [], mi: string[] = [], wa: string[] = [], re: string[] = []
    let score = 0

    if (plan.date_revision) {
      const revision = new Date(plan.date_revision)
      if (revision < new Date()) {
        wa.push('La date de révision est dépassée — révision requise')
        score = 4
        re.push('Planifier une nouvelle date de révision et documenter les décisions prises.')
      } else {
        ev.push(`Prochaine révision : ${plan.date_revision}`)
        score = 10
      }
    } else {
      mi.push('Aucune date de révision définie')
      re.push('Fixer une date de révision — recommandé : dans les 6-8 semaines.')
    }

    results.push(dim('REVIEW_DATE_DEFINED', score, ev, mi, wa, re))
  }

  // ── 10. PROVENANCE_VALID ─────────────────────────────────────────────────
  {
    const ev: string[] = [], wa: string[] = []
    let score = 10

    const ai_pending = (plan.ai_suggestions ?? []).filter(s => s.statut === 'pending')
    if (ai_pending.length > 0) {
      wa.push(`${ai_pending.length} suggestion(s) IA en attente de confirmation enseignant`)
      score = 7
    } else {
      ev.push('Toutes les suggestions IA ont été traitées par l\'enseignant')
    }

    results.push(dim('PROVENANCE_VALID', score, ev, [], wa, []))
  }

  // ── 11. PROTECTED_FIELDS_VERIFIED (poids 0 — métadonnées) ───────────────
  {
    const ev: string[] = [], wa: string[] = []

    if (plan.niveau_confidentialite) {
      ev.push(`Niveau de confidentialité défini : ${plan.niveau_confidentialite}`)
    } else {
      wa.push('Niveau de confidentialité non défini — REQUIS')
    }

    const designations = plan.support_data?.designations ?? []
    const non_verifiees = designations.filter(desgn => !desgn.verified)
    if (non_verifiees.length > 0) {
      wa.push(`${non_verifiees.length} désignation(s) non vérifiée(s) par une source officielle`)
    }

    results.push(dim('PROTECTED_FIELDS_VERIFIED', 0, ev, [], wa, []))
  }

  // ── Calcul du score global ────────────────────────────────────────────────

  let total_score = 0
  for (const r of results) {
    total_score += (r.score / 10) * DIMENSION_WEIGHTS[r.dimension] * 100
  }
  total_score = Math.round(total_score * 10) / 10

  const overall_level = levelFromScore(total_score / 10)

  const critical_gaps = results
    .filter(r => r.level === 'NOT_READY' && DIMENSION_WEIGHTS[r.dimension] >= 0.08)
    .flatMap(r => r.missing)

  const strengths = results
    .filter(r => r.level === 'STRONG')
    .flatMap(r => r.evidence.slice(0, 1))

  const next_steps = results
    .filter(r => r.level !== 'STRONG' && r.recommendations.length > 0)
    .sort((a, b) => DIMENSION_WEIGHTS[b.dimension] - DIMENSION_WEIGHTS[a.dimension])
    .slice(0, 3)
    .flatMap(r => r.recommendations.slice(0, 1))

  return {
    document_type:  'student_support_plan',
    document_id:    document_id ?? plan.id,
    total_score,
    overall_level,
    dimensions:     results,
    critical_gaps,
    strengths,
    next_steps,
    generated_at:   new Date().toISOString(),
    disclaimer:     QUALITY_SCORER_DISCLAIMER,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

const QUALITY_SCORER_DISCLAIMER =
  'Ce score est indicatif — il reflète la complétude du plan, pas la qualité de l\'enseignement. '
  + 'Un score élevé ne garantit pas qu\'un plan soit approprié pour cet élève. '
  + 'Le jugement professionnel de l\'enseignant reste souverain. '
  + 'Source : ScorgIA V7.1 — AI_SUGGESTION.'
