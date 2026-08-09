// ── Tests : Workflow Progress (ME-14) ────────────────────────────────────────
//
// Exécution : npx tsx src/lib/workflow-runtime/__tests__/workflow-progress.test.ts

import assert from 'node:assert/strict'
import { calculateWorkflowProgress } from '../workflow-progress'
import type { WorkflowStepState, WorkflowStepStatus } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStep(
  stepId: string,
  order:  number,
  status: WorkflowStepStatus,
): WorkflowStepState {
  return {
    id:                 `state-${stepId}`,
    workflowInstanceId: 'wf-1',
    stepId,
    order,
    status,
    startedAt:    null,
    completedAt:  status === 'completed' ? new Date() : null,
    skippedAt:    status === 'skipped'   ? new Date() : null,
    completionNote: null,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── PG01 : 0 étape obligatoire → 0 % ─────────────────────────────────────
  {
    // Aucune étape dans le plan (invalide en pratique, mais le calcul doit résister)
    const result = calculateWorkflowProgress([], new Set())
    assert.equal(result.percent, 0, 'PG01 — 0 %')
    assert.equal(result.totalRequiredSteps, 0, 'PG01 — 0 requis')
    console.log('✓ PG01 — aucune étape → 0 %')
  }

  // ── PG02 : 0 étape terminée → 0 % ────────────────────────────────────────
  {
    const steps = [
      makeStep('s1', 1, 'available'),
      makeStep('s2', 2, 'pending'),
      makeStep('s3', 3, 'pending'),
    ]
    const result = calculateWorkflowProgress(steps, new Set())
    assert.equal(result.percent, 0, 'PG02 — 0 %')
    assert.equal(result.completedRequiredSteps, 0, 'PG02 — 0 complétées')
    assert.equal(result.totalRequiredSteps, 3, 'PG02 — 3 requises')
    console.log('✓ PG02 — 0 étape terminée → 0 %')
  }

  // ── PG03 : moitié des étapes obligatoires → 50 % ─────────────────────────
  {
    const steps = [
      makeStep('s1', 1, 'completed'),
      makeStep('s2', 2, 'completed'),
      makeStep('s3', 3, 'available'),
      makeStep('s4', 4, 'pending'),
    ]
    const result = calculateWorkflowProgress(steps, new Set())
    assert.equal(result.percent, 50, 'PG03 — 50 %')
    assert.equal(result.completedRequiredSteps, 2, 'PG03 — 2 complétées')
    assert.equal(result.totalRequiredSteps, 4, 'PG03 — 4 requises')
    console.log('✓ PG03 — moitié complétée → 50 %')
  }

  // ── PG04 : toutes obligatoires → 100 % ───────────────────────────────────
  {
    const steps = [
      makeStep('s1', 1, 'completed'),
      makeStep('s2', 2, 'completed'),
      makeStep('s3', 3, 'completed'),
    ]
    const result = calculateWorkflowProgress(steps, new Set())
    assert.equal(result.percent, 100, 'PG04 — 100 %')
    assert.equal(result.remainingRequiredSteps, 0, 'PG04 — 0 restantes')
    console.log('✓ PG04 — toutes obligatoires → 100 %')
  }

  // ── PG05 : optionnelle pending n'empêche pas 100 % ───────────────────────
  {
    const steps = [
      makeStep('s1',  1, 'completed'),
      makeStep('s2',  2, 'completed'),
      makeStep('opt', 3, 'pending'),    // optionnelle, non décidée
    ]
    const optionalIds = new Set(['opt'])
    const result = calculateWorkflowProgress(steps, optionalIds)
    assert.equal(result.percent, 100, 'PG05 — 100 % malgré optionnelle pending')
    console.log('✓ PG05 — optionnelle pending n\'empêche pas 100 %')
  }

  // ── PG06 : optionnelle completed → comptée séparément ────────────────────
  {
    const steps = [
      makeStep('s1',  1, 'completed'),
      makeStep('opt', 2, 'completed'),  // optionnelle completed
    ]
    const optionalIds = new Set(['opt'])
    const result = calculateWorkflowProgress(steps, optionalIds)
    assert.equal(result.percent, 100, 'PG06 — 100 %')
    assert.equal(result.completedOptionalSteps, 1, 'PG06 — 1 optionnelle completed')
    assert.equal(result.completedRequiredSteps, 1, 'PG06 — 1 requise completed')
    console.log('✓ PG06 — optionnelle completed comptée séparément')
  }

  // ── PG07 : optionnelle skipped → comptée séparément ─────────────────────
  {
    const steps = [
      makeStep('s1',  1, 'completed'),
      makeStep('opt', 2, 'skipped'),    // optionnelle ignorée
    ]
    const optionalIds = new Set(['opt'])
    const result = calculateWorkflowProgress(steps, optionalIds)
    assert.equal(result.percent, 100, 'PG07 — 100 %')
    assert.equal(result.skippedOptionalSteps, 1, 'PG07 — 1 optionnelle skipped')
    console.log('✓ PG07 — optionnelle skipped comptée séparément')
  }

  // ── PG08 : valeur bornée entre 0 et 100 ──────────────────────────────────
  {
    const steps = [makeStep('s1', 1, 'completed')]
    const result = calculateWorkflowProgress(steps, new Set())
    assert.ok(result.percent >= 0 && result.percent <= 100, 'PG08 — borné 0-100')
    console.log('✓ PG08 — valeur bornée entre 0 et 100')
  }

  // ── PG09 : ordre sans impact sur le résultat ──────────────────────────────
  {
    const steps1 = [makeStep('s1', 1, 'completed'), makeStep('s2', 2, 'pending')]
    const steps2 = [makeStep('s2', 2, 'pending'),   makeStep('s1', 1, 'completed')]
    const r1 = calculateWorkflowProgress(steps1, new Set())
    const r2 = calculateWorkflowProgress(steps2, new Set())
    assert.equal(r1.percent, r2.percent, 'PG09 — ordre sans impact')
    console.log('✓ PG09 — ordre des étapes sans impact sur le calcul')
  }

  // ── PG10 : calcul déterministe ────────────────────────────────────────────
  {
    const steps = [
      makeStep('s1', 1, 'completed'),
      makeStep('s2', 2, 'available'),
      makeStep('s3', 3, 'pending'),
    ]
    const r1 = calculateWorkflowProgress(steps, new Set())
    const r2 = calculateWorkflowProgress(steps, new Set())
    assert.equal(r1.percent, r2.percent, 'PG10 — déterministe')
    assert.deepEqual(r1, r2, 'PG10 — résultats identiques')
    console.log('✓ PG10 — calcul déterministe')
  }

  // ── PG11 : remainingRequiredSteps correct ─────────────────────────────────
  {
    const steps = [
      makeStep('s1', 1, 'completed'),
      makeStep('s2', 2, 'available'),
      makeStep('s3', 3, 'pending'),
    ]
    const result = calculateWorkflowProgress(steps, new Set())
    assert.equal(result.remainingRequiredSteps, 2, 'PG11 — 2 restantes')
    console.log('✓ PG11 — remainingRequiredSteps correct')
  }

  console.log('\n✅ Tous les tests Workflow Progress (ME-14) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
