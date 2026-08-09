// SPIE-03 — PedagogicalContextBuilder
// The main orchestrator. Assembles all context sources into a PedagogicalContext.
// This is the MANDATORY entry point for ALL AI generation in ScorgIA.
//
// Rule: No plan, no sequence, no lesson is generated without a PedagogicalContext.

import type {
  PedagogicalContext,
  PedagogicalContextInput,
  ContextBuildResult,
  ContextPromptSummary,
} from '../types/context'
import type { ContextSourcesMap, ContextSourceType } from '../types/sources'
import { calculateContextScore } from '../score/context-score'
import { buildContextMemory } from '../memory/context-memory'

let contextIndex = 0
function makeContextId(): string {
  return `pce_${Date.now()}_${++contextIndex}`
}

// ─── Prompt summary builder ───────────────────────────────────────────────────

function buildPromptSummary(ctx: Omit<PedagogicalContext, 'promptSummary'>): ContextPromptSummary {
  const parts: string[] = []

  if (ctx.sources.curriculum) {
    const c = ctx.sources.curriculum
    parts.push(`CURRICULUM : ${c.matiere ?? 'Matière inconnue'} — Province ${c.province ?? '?'} — Niveaux ${c.niveaux?.join(', ') ?? '?'}`)
    parts.push(`Outcomes : ${c.outcomes?.length ?? 0} au total`)
  }

  if (ctx.memory) {
    const m = ctx.memory.stats
    parts.push(`PROGRESSION : ${m.progressPercent}% du curriculum couvert (${m.enseigne} enseignés, ${m.aRenforcer} à renforcer, ${m.enRetard} en retard)`)
    if (m.avanceRetardSemaines < -1) parts.push(`⚠️ Retard de ${Math.abs(m.avanceRetardSemaines)} semaines`)
    if (m.avanceRetardSemaines > 1) parts.push(`✅ Avance de ${m.avanceRetardSemaines} semaines`)
  }

  if (ctx.sources.calendar) {
    const cal = ctx.sources.calendar
    parts.push(`CALENDRIER : ${cal.sessionsRestantes} sessions restantes (${Math.round(cal.minutesRestantes / 60)}h disponibles)`)
    if (cal.prochaineSession) parts.push(`Prochaine session : ${cal.prochaineSession.date} (${cal.prochaineSession.dureeMinutes} min)`)
  }

  if (ctx.sources.class_profile) {
    const cp = ctx.sources.class_profile
    parts.push(`CLASSE : ${cp.classeNom} — ${cp.nbEleves} élèves — Niveau ${cp.niveauClasse ?? '?'}`)
    if (cp.besoinsSpeciaux) parts.push(`Élèves avec besoins particuliers : ${cp.besoinsSpeciaux}`)
  }

  if (ctx.sources.teacher_profile) {
    const tp = ctx.sources.teacher_profile
    if (tp.styleEnseignement) parts.push(`PROFIL ENSEIGNANT : Style "${tp.styleEnseignement}"`)
    if (tp.preferencesDifferentiation?.length) parts.push(`Préférences : ${tp.preferencesDifferentiation.join(', ')}`)
  }

  const bloc = parts.join('\n')
  const blocCourt = parts.slice(0, 3).join('\n')
  const tokensEstimes = Math.round(bloc.length / 4)

  return { bloc, blocCourt, tokensEstimes }
}

// ─── PedagogicalContextBuilder ────────────────────────────────────────────────

export class PedagogicalContextBuilder {
  // Build a PedagogicalContext from the given input.
  // Sources are loaded by the caller — the builder assembles and scores them.
  build(
    input: PedagogicalContextInput,
    sources: ContextSourcesMap,
  ): ContextBuildResult {
    const startMs = Date.now()
    const failedSources: Array<keyof ContextSourcesMap> = []

    try {
      // Calculate context score
      const score = calculateContextScore(sources)

      // If mandatory sources are missing, return a partial context anyway
      // (PCE always returns a context — the caller decides whether to proceed)
      const partial = score.sourcesMandatairesMissing.length > 0

      // Build context memory if we have the data
      const outcomes = sources.curriculum?.outcomes ?? []
      let memory = undefined
      if (outcomes.length > 0) {
        try {
          memory = buildContextMemory(
            input.classeId ?? 'unknown',
            input.matiereId,
            input.academicYear ?? new Date().getFullYear().toString(),
            outcomes,
            sources.progression,
            sources.historique,
          )
        } catch {
          failedSources.push('progression')
        }
      }

      const contextBase: Omit<PedagogicalContext, 'promptSummary'> = {
        id: makeContextId(),
        enseignantId: input.enseignantId,
        classeId: input.classeId,
        matiereId: input.matiereId,
        province: input.province ?? sources.curriculum?.province,
        niveaux: input.niveaux ?? sources.curriculum?.niveaux,
        langue: input.langue ?? sources.teacher_profile?.langue ?? 'fr',
        academicYear: input.academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        sources,
        score,
        memory,
        builtAt: new Date().toISOString(),
        builderVersion: '1.0.0',
      }

      const promptSummary = buildPromptSummary(contextBase)
      const context: PedagogicalContext = { ...contextBase, promptSummary }

      return {
        success: true,
        context,
        partial,
        failedSources,
        durationMs: Date.now() - startMs,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la construction du contexte',
        partial: true,
        failedSources,
        durationMs: Date.now() - startMs,
      }
    }
  }

  // Convenience: build a minimal context with only a curriculum source (for quick generation)
  buildMinimal(
    curriculumId: string,
    province: string,
    matiere: string,
    niveaux: string[],
  ): ContextBuildResult {
    return this.build(
      { province, matiereId: matiere, niveaux },
      {
        curriculum: {
          sourceType: 'curriculum',
          curriculumId,
          province,
          matiere,
          niveaux,
          loadedAt: new Date().toISOString(),
        },
      },
    )
  }
}

export const pedagogicalContextBuilder = new PedagogicalContextBuilder()
