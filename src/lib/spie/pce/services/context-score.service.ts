// SPIE-03 — Context Score Service

import type { ContextSourcesMap } from '../types/sources'
import type { ContextScore } from '../types/score'
import { calculateContextScore } from '../score/context-score'

export class ContextScoreService {
  calculate(sources: ContextSourcesMap): ContextScore {
    return calculateContextScore(sources)
  }

  // Human-readable summary of the score
  summarize(score: ContextScore): string {
    const lines = [
      `Score global : ${score.global}/100 (${score.qualite})`,
    ]
    for (const [type, source] of Object.entries(score.sources)) {
      if (source.score < 100) {
        lines.push(`  ${type}: ${source.score}/100 [${source.level}]${source.stale ? ' ⚠️ stale' : ''}`)
        if (source.manquants.length > 0) {
          lines.push(`    Manquants: ${source.manquants.join(', ')}`)
        }
      }
    }
    if (!score.readyForGeneration) {
      lines.push(`❌ Pas prêt pour génération`)
      if (score.sourcesMandatairesMissing.length > 0) {
        lines.push(`   Sources obligatoires manquantes : ${score.sourcesMandatairesMissing.join(', ')}`)
      }
    } else {
      lines.push(`✅ Prêt pour génération`)
    }
    return lines.join('\n')
  }
}

export const contextScoreService = new ContextScoreService()
