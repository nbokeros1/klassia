// SPIE-03 — Decision Engine
// Answers pedagogical questions based on the PedagogicalContext.
// Purely deterministic — no AI calls. Fast, synchronous.

import type { DecisionQuery, DecisionResult, DecisionReport, DecisionAlert } from '../types/decisions'
import type { PedagogicalContext } from '../types/context'
import type { ContextMemory } from '../types/memory'

// ─── Individual decision handlers ─────────────────────────────────────────────

function decideProchainLecon(ctx: PedagogicalContext): DecisionResult {
  const memory = ctx.memory
  const outcomes = ctx.sources.curriculum?.outcomes ?? []

  if (!memory || outcomes.length === 0) {
    return {
      type: 'prochaine_lecon',
      decision: null,
      justification: 'Contexte insuffisant pour recommander une prochaine leçon (curriculum ou mémoire manquant).',
      recommandations: ['Importer le curriculum', 'Mettre à jour la progression'],
      confidence: 'faible',
      donneesAppui: {},
    }
  }

  // Priority 1: outcomes à_renforcer (review needed)
  if (memory.aRenforcer.length > 0) {
    const outcomeId = memory.aRenforcer[0]
    const outcome = outcomes.find(o => o.id === outcomeId)
    return {
      type: 'prochaine_lecon',
      decision: outcomeId,
      justification: `L'outcome "${outcome?.code ?? outcomeId}" a été identifié comme nécessitant un renforcement.`,
      recommandations: ['Prévoir une activité de révision', 'Varier l\'approche pédagogique'],
      confidence: 'haute',
      donneesAppui: { outcomeId, source: 'memory.aRenforcer' },
    }
  }

  // Priority 2: next non-taught outcome in curriculum order
  const prochainRestant = memory.restants[0]
  if (prochainRestant) {
    const outcome = outcomes.find(o => o.id === prochainRestant)
    return {
      type: 'prochaine_lecon',
      decision: prochainRestant,
      justification: `Prochain outcome curriculaire non enseigné : "${outcome?.code ?? prochainRestant}".`,
      recommandations: ['Vérifier les prérequis avant d\'enseigner cet outcome'],
      confidence: 'haute',
      donneesAppui: { outcomeId: prochainRestant, source: 'memory.restants' },
    }
  }

  // All taught
  return {
    type: 'prochaine_lecon',
    decision: 'curriculum_complet',
    justification: 'Tous les outcomes curriculaires ont été enseignés.',
    recommandations: ['Prévoir des activités de consolidation ou d\'enrichissement'],
    confidence: 'haute',
    donneesAppui: { progressPercent: memory.stats.progressPercent },
  }
}

function decidePeutProgresser(ctx: PedagogicalContext): DecisionResult {
  const memory = ctx.memory
  const score = ctx.score

  if (!memory) {
    return {
      type: 'peut_progresser',
      decision: true,
      justification: 'Aucune donnée de progression — autorisation de continuer par défaut.',
      recommandations: [],
      confidence: 'faible',
      donneesAppui: {},
    }
  }

  const blockingReasons: string[] = []
  if (memory.aRenforcer.length > 2) {
    blockingReasons.push(`${memory.aRenforcer.length} outcomes nécessitent un renforcement`)
  }
  if (memory.stats.avanceRetardSemaines < -3) {
    blockingReasons.push(`Retard de ${Math.abs(memory.stats.avanceRetardSemaines)} semaines sur le rythme prévu`)
  }

  const peutProgresser = blockingReasons.length === 0

  return {
    type: 'peut_progresser',
    decision: peutProgresser,
    justification: peutProgresser
      ? 'La classe peut progresser vers les prochains outcomes.'
      : `Progression bloquée : ${blockingReasons.join('; ')}.`,
    recommandations: peutProgresser
      ? ['Continuer selon la progression prévue']
      : ['Prévoir des séances de révision ciblées avant de progresser'],
    confidence: 'moyenne',
    donneesAppui: { blockingReasons, stats: memory.stats },
  }
}

function decideRalentir(ctx: PedagogicalContext): DecisionResult {
  const memory = ctx.memory

  const shouldSlowDown = memory
    ? memory.aRenforcer.length > 1 || memory.stats.avanceRetardSemaines < -1
    : false

  return {
    type: 'ralentir',
    decision: shouldSlowDown,
    justification: shouldSlowDown
      ? 'Le rythme actuel est trop rapide compte tenu du nombre d\'outcomes à renforcer et du retard accumulé.'
      : 'Le rythme actuel semble approprié.',
    recommandations: shouldSlowDown
      ? ['Réduire le nombre d\'outcomes par leçon', 'Prévoir plus de pratique guidée']
      : [],
    confidence: memory ? 'moyenne' : 'faible',
    donneesAppui: { memory: memory?.stats },
  }
}

function decideAlertRetard(ctx: PedagogicalContext): DecisionResult {
  const memory = ctx.memory
  const calendar = ctx.sources.calendar

  const retardSemaines = memory?.stats.avanceRetardSemaines ?? 0
  const sessionsRestantes = calendar?.sessionsRestantes ?? Infinity

  const enRetardCritique: boolean = retardSemaines < -4 ||
    (sessionsRestantes < 10 && memory != null && memory.stats.progressPercent < 50)

  return {
    type: 'alerter_retard',
    decision: enRetardCritique,
    justification: enRetardCritique
      ? `Alerte : ${Math.abs(retardSemaines)} semaines de retard avec seulement ${sessionsRestantes} sessions restantes.`
      : 'Aucun retard critique détecté.',
    recommandations: enRetardCritique
      ? ['Identifier les outcomes prioritaires à couvrir absolument', 'Envisager de regrouper certains outcomes similaires']
      : [],
    confidence: memory && calendar ? 'haute' : 'faible',
    donneesAppui: { retardSemaines, sessionsRestantes, progressPercent: memory?.stats.progressPercent },
  }
}

function decideCurriculumCoverage(ctx: PedagogicalContext): DecisionResult {
  const memory = ctx.memory
  const progressPercent = memory?.stats.progressPercent ?? 0
  const total = memory?.stats.total ?? 0

  return {
    type: 'curriculum_coverage',
    decision: `${progressPercent}%`,
    justification: `${progressPercent}% du curriculum a été couvert (${memory?.stats.enseigne ?? 0}/${total} outcomes enseignés).`,
    recommandations: progressPercent < 50
      ? ['Accélérer la couverture des outcomes prioritaires']
      : progressPercent >= 90
      ? ['Envisager des activités d\'enrichissement']
      : [],
    confidence: memory ? 'haute' : 'faible',
    donneesAppui: { progressPercent, total, enseigne: memory?.stats.enseigne },
  }
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export class DecisionEngine {
  decide(ctx: PedagogicalContext, query: DecisionQuery): DecisionResult {
    switch (query.type) {
      case 'prochaine_lecon': return decideProchainLecon(ctx)
      case 'peut_progresser': return decidePeutProgresser(ctx)
      case 'ralentir': return decideRalentir(ctx)
      case 'alerter_retard': return decideAlertRetard(ctx)
      case 'curriculum_coverage': return decideCurriculumCoverage(ctx)
      case 'besoin_revision':
        return {
          type: 'besoin_revision',
          decision: (ctx.memory?.aRenforcer.length ?? 0) > 0,
          justification: ctx.memory?.aRenforcer.length
            ? `${ctx.memory.aRenforcer.length} outcomes nécessitent une révision.`
            : 'Aucune révision immédiate recommandée.',
          recommandations: [],
          confidence: ctx.memory ? 'haute' : 'faible',
          donneesAppui: { aRenforcer: ctx.memory?.aRenforcer },
        }
      default:
        return {
          type: query.type,
          decision: null,
          justification: `Décision "${query.type}" non encore implémentée.`,
          recommandations: [],
          confidence: 'faible',
          donneesAppui: {},
        }
    }
  }

  generateReport(ctx: PedagogicalContext): DecisionReport {
    const allDecisionTypes: DecisionQuery['type'][] = [
      'prochaine_lecon',
      'peut_progresser',
      'ralentir',
      'alerter_retard',
      'curriculum_coverage',
      'besoin_revision',
    ]

    const decisions = allDecisionTypes.map(type => this.decide(ctx, { type }))

    const alertes: DecisionAlert[] = []
    const alertRetard = decisions.find(d => d.type === 'alerter_retard')
    if (alertRetard?.decision === true) {
      alertes.push({
        type: 'alerter_retard',
        severite: 'critique',
        message: alertRetard.justification,
        action: alertRetard.recommandations[0],
      })
    }
    const revision = decisions.find(d => d.type === 'besoin_revision')
    if (revision?.decision === true) {
      alertes.push({
        type: 'besoin_revision',
        severite: 'majeur',
        message: revision.justification,
        action: revision.recommandations[0],
      })
    }

    // Health score: context score weighted with pedagogical signals
    const contextScoreGlobal = ctx.score.global
    const retardPenalty = Math.max(0, Math.abs(ctx.memory?.stats.avanceRetardSemaines ?? 0) * 5)
    const santePedagogique = Math.max(0, Math.min(100, contextScoreGlobal - retardPenalty))

    return {
      classeId: ctx.classeId,
      matiereId: ctx.matiereId,
      decisions,
      santePedagogique,
      alertes,
      calculatedAt: new Date().toISOString(),
    }
  }
}

export const decisionEngine = new DecisionEngine()
