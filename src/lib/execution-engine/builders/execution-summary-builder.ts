// ── Execution Summary Builder (ME-13.5) ───────────────────────────────────────

import type { ExecutionStep, ExecutionPlanSummary } from '../types'

function sumMinutes(steps: ExecutionStep[]): number | null {
  const known = steps.map(s => s.estimatedMinutes).filter((m): m is number => m != null)
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) : null
}

export function buildExecutionPlanSummary(steps: ExecutionStep[]): ExecutionPlanSummary {
  const firstAvailable = steps.find(s => s.status === 'available')
  return {
    totalSteps:       steps.length,
    actionableSteps:  steps.filter(s => s.status === 'available' || s.status === 'pending').length,
    blockedSteps:     steps.filter(s => s.status === 'blocked').length,
    estimatedMinutes: sumMinutes(steps),
    firstActionLabel: firstAvailable?.title ?? null,
  }
}
