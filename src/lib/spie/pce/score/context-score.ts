// SPIE-03 — Context Score Engine
// Evaluates the completeness and quality of each context source.
// Returns a ContextScore used to decide if generation can proceed.

import type { ContextSourcesMap, ContextSourceType } from '../types/sources'
import type { ContextScore, SourceScore, SourceScoreLevel } from '../types/score'
import { SOURCE_WEIGHTS, MANDATORY_SOURCES, STALE_THRESHOLD_MS } from '../types/score'

// ─── Per-source scorers ────────────────────────────────────────────────────────

function isStale(loadedAt: string, sourceType: ContextSourceType): boolean {
  const age = Date.now() - new Date(loadedAt).getTime()
  return age > (STALE_THRESHOLD_MS[sourceType] ?? Infinity)
}

function levelFromScore(score: number, stale: boolean): SourceScoreLevel {
  if (stale) return 'stale'
  if (score >= 85) return 'excellent'
  if (score >= 60) return 'bon'
  if (score > 0) return 'incomplet'
  return 'absent'
}

function scoreCurriculum(sources: ContextSourcesMap): SourceScore {
  const src = sources.curriculum
  if (!src) return absent('curriculum')
  const stale = isStale(src.loadedAt, 'curriculum')
  const manquants: string[] = []
  let score = 100
  if (!src.outcomes || src.outcomes.length === 0) { manquants.push('outcomes'); score -= 40 }
  if (!src.graph) { manquants.push('knowledge_graph'); score -= 20 }
  if (!src.pacingModel) { manquants.push('pacing_model'); score -= 15 }
  if (!src.province) { manquants.push('province'); score -= 10 }
  if (!src.matiere) { manquants.push('matiere'); score -= 15 }
  return { sourceType: 'curriculum', score: Math.max(0, score), level: levelFromScore(score, stale), manquants, avertissements: [], stale, loadedAt: src.loadedAt }
}

function scoreCalendar(sources: ContextSourcesMap): SourceScore {
  const src = sources.calendar
  if (!src) return absent('calendar')
  const stale = isStale(src.loadedAt, 'calendar')
  const manquants: string[] = []
  let score = 100
  if (src.sessionsRestantes === 0) { manquants.push('sessions_disponibles'); score -= 30 }
  if (src.minutesRestantes === 0) { manquants.push('temps_restant'); score -= 30 }
  const avert: string[] = []
  if (src.sessionsRestantes < 5) avert.push(`Seulement ${src.sessionsRestantes} sessions restantes`)
  return { sourceType: 'calendar', score: Math.max(0, score), level: levelFromScore(score, stale), manquants, avertissements: avert, stale, loadedAt: src.loadedAt }
}

function scoreProgression(sources: ContextSourcesMap): SourceScore {
  const src = sources.progression
  if (!src) return absent('progression')
  const stale = isStale(src.loadedAt, 'progression')
  let score = 80   // Starts lower — hard to have complete progression data
  const manquants: string[] = []
  const avert: string[] = []
  if (src.avanceRetardSemaines < -2) avert.push(`${Math.abs(src.avanceRetardSemaines)} semaines de retard`)
  if (src.outcomesARenforcer.length > 3) avert.push(`${src.outcomesARenforcer.length} outcomes à renforcer`)
  return { sourceType: 'progression', score, level: levelFromScore(score, stale), manquants, avertissements: avert, stale, loadedAt: src.loadedAt }
}

function scoreHistorique(sources: ContextSourcesMap): SourceScore {
  const src = sources.historique
  if (!src) return absent('historique')
  const stale = isStale(src.loadedAt, 'historique')
  let score = 70
  const avert: string[] = []
  if (src.dernieresLecons.length === 0) { score -= 20; avert.push('Aucune leçon récente trouvée') }
  return { sourceType: 'historique', score: Math.max(0, score), level: levelFromScore(score, stale), manquants: [], avertissements: avert, stale, loadedAt: src.loadedAt }
}

function scoreTeacherProfile(sources: ContextSourcesMap): SourceScore {
  const src = sources.teacher_profile
  if (!src) return absent('teacher_profile')
  const stale = isStale(src.loadedAt, 'teacher_profile')
  let score = 60   // Basic profile = 60
  if (src.styleEnseignement) score += 15
  if (src.preferencesDifferentiation && src.preferencesDifferentiation.length > 0) score += 10
  if (src.province) score += 15
  return { sourceType: 'teacher_profile', score: Math.min(100, score), level: levelFromScore(score, stale), manquants: [], avertissements: [], stale, loadedAt: src.loadedAt }
}

function scoreClassProfile(sources: ContextSourcesMap): SourceScore {
  const src = sources.class_profile
  if (!src) return absent('class_profile')
  const stale = isStale(src.loadedAt, 'class_profile')
  let score = 70
  if (src.besoinsSpeciaux && src.besoinsSpeciaux > 0) score = Math.max(score, 80)
  return { sourceType: 'class_profile', score, level: levelFromScore(score, stale), manquants: [], avertissements: [], stale, loadedAt: src.loadedAt }
}

function scoreResources(sources: ContextSourcesMap): SourceScore {
  const src = sources.resources
  if (!src) return absent('resources')
  const stale = isStale(src.loadedAt, 'resources')
  const score = src.documentsRelevants.length > 0 ? 80 : 50
  return { sourceType: 'resources', score, level: levelFromScore(score, stale), manquants: [], avertissements: [], stale, loadedAt: src.loadedAt }
}

function scoreContraintes(sources: ContextSourcesMap): SourceScore {
  const src = sources.contraintes
  if (!src) return absent('contraintes')
  const stale = isStale(src.loadedAt, 'contraintes')
  return { sourceType: 'contraintes', score: 75, level: levelFromScore(75, stale), manquants: [], avertissements: [], stale, loadedAt: src.loadedAt }
}

function scoreStandards(sources: ContextSourcesMap): SourceScore {
  const src = sources.standards
  if (!src) return absent('standards')
  return { sourceType: 'standards', score: 80, level: 'bon', manquants: [], avertissements: [], stale: false, loadedAt: src.loadedAt }
}

function absent(sourceType: ContextSourceType): SourceScore {
  return { sourceType, score: 0, level: 'absent', manquants: ['entire_source'], avertissements: [], stale: false }
}

// ─── Main scorer ───────────────────────────────────────────────────────────────

export function calculateContextScore(sources: ContextSourcesMap): ContextScore {
  const allScores: Record<ContextSourceType, SourceScore> = {
    curriculum: scoreCurriculum(sources),
    calendar: scoreCalendar(sources),
    progression: scoreProgression(sources),
    historique: scoreHistorique(sources),
    teacher_profile: scoreTeacherProfile(sources),
    class_profile: scoreClassProfile(sources),
    resources: scoreResources(sources),
    contraintes: scoreContraintes(sources),
    standards: scoreStandards(sources),
  }

  // Weighted global score
  let global = 0
  for (const [type, score] of Object.entries(allScores)) {
    const weight = SOURCE_WEIGHTS[type as ContextSourceType] ?? 0
    global += score.score * weight
  }
  global = Math.round(global)

  // Check mandatory sources
  const missingMandatory = MANDATORY_SOURCES.filter(s => allScores[s].level === 'absent')

  // Quality level
  const qualite = global >= 85 ? 'excellent'
    : global >= 65 ? 'bon'
    : global >= 40 ? 'minimal'
    : 'insuffisant'

  // Recommendations
  const recommandations: string[] = []
  if (allScores.curriculum.level === 'absent') recommandations.push('Importer le curriculum provincial pour cette matière.')
  if (allScores.calendar.level === 'absent') recommandations.push('Configurer le calendrier scolaire pour obtenir les durées disponibles.')
  if (allScores.progression.level === 'absent') recommandations.push('Mettre à jour la progression pour voir ce qui a déjà été enseigné.')
  if (allScores.teacher_profile.level === 'absent') recommandations.push('Compléter le profil IA pour personnaliser la génération.')
  for (const [, score] of Object.entries(allScores)) {
    recommandations.push(...score.avertissements)
  }

  return {
    global,
    sources: allScores,
    readyForGeneration: global >= 30 && missingMandatory.length === 0,
    sourcesMandataires: MANDATORY_SOURCES,
    sourcesMandatairesMissing: missingMandatory,
    qualite,
    recommandations,
    calculatedAt: new Date().toISOString(),
  }
}
