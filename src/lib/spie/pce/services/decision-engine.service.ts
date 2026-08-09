// SPIE-03 — Decision Engine Service

import type { DecisionQuery, DecisionResult, DecisionReport } from '../types/decisions'
import type { PedagogicalContext } from '../types/context'
import { decisionEngine } from '../decisions/decision-engine'

export class DecisionEngineService {
  decide(context: PedagogicalContext, query: DecisionQuery): DecisionResult {
    return decisionEngine.decide(context, query)
  }

  generateReport(context: PedagogicalContext): DecisionReport {
    return decisionEngine.generateReport(context)
  }

  // Shortcut: what should the next lesson be about?
  getNextLesson(context: PedagogicalContext): DecisionResult {
    return decisionEngine.decide(context, { type: 'prochaine_lecon' })
  }

  // Shortcut: is the class ready to move forward?
  canProceed(context: PedagogicalContext): DecisionResult {
    return decisionEngine.decide(context, { type: 'peut_progresser' })
  }

  // Shortcut: are we on track?
  checkPace(context: PedagogicalContext): { ralentir: DecisionResult; alerte: DecisionResult } {
    return {
      ralentir: decisionEngine.decide(context, { type: 'ralentir' }),
      alerte: decisionEngine.decide(context, { type: 'alerter_retard' }),
    }
  }
}

export const decisionEngineService = new DecisionEngineService()
