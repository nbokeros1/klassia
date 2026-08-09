// ── Tests : Workflow State Machine (ME-14) ────────────────────────────────────
//
// Exécution : npx tsx src/lib/workflow-runtime/__tests__/workflow-state-machine.test.ts

import assert from 'node:assert/strict'

import {
  applyWorkflowTransition,
  applyStepTransition,
  validateStepCanStart,
  validateStepCanComplete,
  validateStepCanSkip,
  evaluateWorkflowBlockingState,
  isWorkflowComplete,
  findNextActivatableStep,
} from '../workflow-state-machine'
import type { WorkflowStepState } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStep(overrides: Partial<WorkflowStepState> & { stepId: string; order: number }): WorkflowStepState {
  return {
    id:                 `state-${overrides.stepId}`,
    workflowInstanceId: 'wf-1',
    status:             'pending',
    startedAt:          null,
    completedAt:        null,
    skippedAt:          null,
    completionNote:     null,
    ...overrides,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── SM01 : not_started → in_progress ─────────────────────────────────────
  {
    const r = applyWorkflowTransition('not_started', 'start')
    assert.ok(r.ok,                    'SM01 — ok')
    assert.equal(r.ok && r.data, 'in_progress', 'SM01 — → in_progress')
    console.log('✓ SM01 — not_started → in_progress')
  }

  // ── SM02 : in_progress → paused ──────────────────────────────────────────
  {
    const r = applyWorkflowTransition('in_progress', 'pause')
    assert.ok(r.ok,                    'SM02 — ok')
    assert.equal(r.ok && r.data, 'paused', 'SM02 — → paused')
    console.log('✓ SM02 — in_progress → paused')
  }

  // ── SM03 : paused → in_progress ──────────────────────────────────────────
  {
    const r = applyWorkflowTransition('paused', 'resume')
    assert.ok(r.ok,                    'SM03 — ok')
    assert.equal(r.ok && r.data, 'in_progress', 'SM03 — → in_progress')
    console.log('✓ SM03 — paused → in_progress')
  }

  // ── SM04 : in_progress → completed ───────────────────────────────────────
  {
    const r = applyWorkflowTransition('in_progress', 'complete')
    assert.ok(r.ok,                    'SM04 — ok')
    assert.equal(r.ok && r.data, 'completed', 'SM04 — → completed')
    console.log('✓ SM04 — in_progress → completed')
  }

  // ── SM05 : in_progress → cancelled ───────────────────────────────────────
  {
    const r = applyWorkflowTransition('in_progress', 'cancel')
    assert.ok(r.ok,                    'SM05 — ok')
    assert.equal(r.ok && r.data, 'cancelled', 'SM05 — → cancelled')
    console.log('✓ SM05 — in_progress → cancelled')
  }

  // ── SM06 : blocked → in_progress ─────────────────────────────────────────
  {
    const r = applyWorkflowTransition('blocked', 'resume')
    assert.ok(r.ok,                    'SM06 — ok')
    assert.equal(r.ok && r.data, 'in_progress', 'SM06 — → in_progress')
    console.log('✓ SM06 — blocked → in_progress')
  }

  // ── SM07 : completed refuse les transitions ───────────────────────────────
  {
    const r = applyWorkflowTransition('completed', 'start')
    assert.ok(!r.ok,                   'SM07 — !ok')
    assert.equal(!r.ok && r.error.code, 'WORKFLOW_ALREADY_COMPLETED', 'SM07 — code correct')
    console.log('✓ SM07 — completed refuse les transitions')
  }

  // ── SM08 : cancelled refuse les transitions ───────────────────────────────
  {
    const r = applyWorkflowTransition('cancelled', 'start')
    assert.ok(!r.ok,                   'SM08 — !ok')
    assert.equal(!r.ok && r.error.code, 'WORKFLOW_CANCELLED', 'SM08 — code correct')
    console.log('✓ SM08 — cancelled refuse les transitions')
  }

  // ── SM09 : transition invalide retourne le bon code ───────────────────────
  {
    const r = applyWorkflowTransition('not_started', 'complete')
    assert.ok(!r.ok,                   'SM09 — !ok')
    assert.equal(!r.ok && r.error.code, 'INVALID_WORKFLOW_TRANSITION', 'SM09 — code correct')
    console.log('✓ SM09 — transition invalide retourne INVALID_WORKFLOW_TRANSITION')
  }

  // ── SM10 : not_started → cancelled autorisé ──────────────────────────────
  {
    const r = applyWorkflowTransition('not_started', 'cancel')
    assert.ok(r.ok,                    'SM10 — ok')
    assert.equal(r.ok && r.data, 'cancelled', 'SM10 — → cancelled')
    console.log('✓ SM10 — not_started → cancelled autorisé')
  }

  // ── SM11 : validateStepCanStart — step pending → STEP_NOT_AVAILABLE ───────
  {
    const step = makeStep({ stepId: 's1', order: 1, status: 'pending' })
    const err  = validateStepCanStart(step, [step])
    assert.ok(err !== null,            'SM11 — erreur présente')
    assert.equal(err?.code, 'STEP_NOT_AVAILABLE', 'SM11 — STEP_NOT_AVAILABLE')
    console.log('✓ SM11 — step pending → STEP_NOT_AVAILABLE')
  }

  // ── SM12 : validateStepCanStart — step available → ok ─────────────────────
  {
    const step = makeStep({ stepId: 's1', order: 1, status: 'available' })
    const err  = validateStepCanStart(step, [step])
    assert.equal(err, null,            'SM12 — pas d\'erreur')
    console.log('✓ SM12 — step available → peut démarrer')
  }

  // ── SM13 : validateStepCanStart — autre step in_progress → PREVIOUS_STEP_INCOMPLETE
  {
    const s1 = makeStep({ stepId: 's1', order: 1, status: 'in_progress' })
    const s2 = makeStep({ stepId: 's2', order: 2, status: 'available' })
    const err = validateStepCanStart(s2, [s1, s2])
    assert.ok(err !== null,            'SM13 — erreur présente')
    assert.equal(err?.code, 'PREVIOUS_STEP_INCOMPLETE', 'SM13 — code correct')
    console.log('✓ SM13 — autre step in_progress → PREVIOUS_STEP_INCOMPLETE')
  }

  // ── SM14 : validateStepCanComplete — step blocked → WORKFLOW_BLOCKED ──────
  {
    const step = makeStep({ stepId: 's1', order: 1, status: 'blocked' })
    const err  = validateStepCanComplete(step)
    assert.ok(err !== null,            'SM14 — erreur présente')
    assert.equal(err?.code, 'WORKFLOW_BLOCKED', 'SM14 — WORKFLOW_BLOCKED')
    console.log('✓ SM14 — step blocked → WORKFLOW_BLOCKED')
  }

  // ── SM15 : validateStepCanSkip — étape obligatoire → STEP_NOT_OPTIONAL ────
  {
    const step = makeStep({ stepId: 's1', order: 1, status: 'available' })
    const err  = validateStepCanSkip(step, false)
    assert.ok(err !== null,            'SM15 — erreur présente')
    assert.equal(err?.code, 'STEP_NOT_OPTIONAL', 'SM15 — STEP_NOT_OPTIONAL')
    console.log('✓ SM15 — étape obligatoire → STEP_NOT_OPTIONAL')
  }

  // ── SM16 : validateStepCanSkip — étape optionnelle → ok ──────────────────
  {
    const step = makeStep({ stepId: 's1', order: 1, status: 'available' })
    const err  = validateStepCanSkip(step, true)
    assert.equal(err, null,            'SM16 — pas d\'erreur')
    console.log('✓ SM16 — étape optionnelle → peut être ignorée')
  }

  // ── SM17 : evaluateWorkflowBlockingState — aucune étape active → blocked ──
  {
    const steps = [
      makeStep({ stepId: 's1', order: 1, status: 'blocked' }),
      makeStep({ stepId: 's2', order: 2, status: 'pending' }),
    ]
    const labels = new Map([['s1', ['Classe manquante']]])
    const result = evaluateWorkflowBlockingState(steps, new Set(), labels)
    assert.ok(result.blocked,          'SM17 — blocked')
    assert.ok(result.blockingStepIds.includes('s1'), 'SM17 — stepId bloquant inclus')
    assert.ok(result.reasons.includes('Classe manquante'), 'SM17 — raison incluse')
    console.log('✓ SM17 — aucune étape active + étape bloquée → workflow bloqué')
  }

  // ── SM18 : evaluateWorkflowBlockingState — étape available → non bloqué ──
  {
    const steps = [
      makeStep({ stepId: 's1', order: 1, status: 'available' }),
      makeStep({ stepId: 's2', order: 2, status: 'blocked' }),
    ]
    const result = evaluateWorkflowBlockingState(steps, new Set(), new Map())
    assert.ok(!result.blocked,         'SM18 — non bloqué')
    console.log('✓ SM18 — étape available → workflow non bloqué')
  }

  // ── SM19 : isWorkflowComplete — toutes obligatoires completed ────────────
  {
    const steps = [
      makeStep({ stepId: 's1', order: 1, status: 'completed' }),
      makeStep({ stepId: 's2', order: 2, status: 'completed' }),
      makeStep({ stepId: 'opt', order: 3, status: 'pending' }),
    ]
    const opt = new Set(['opt'])
    assert.ok(isWorkflowComplete(steps, opt), 'SM19 — workflow terminé')
    console.log('✓ SM19 — toutes obligatoires completed → workflow terminé')
  }

  // ── SM20 : isWorkflowComplete — obligatoire pending → non terminé ─────────
  {
    const steps = [
      makeStep({ stepId: 's1', order: 1, status: 'completed' }),
      makeStep({ stepId: 's2', order: 2, status: 'pending' }),
    ]
    assert.ok(!isWorkflowComplete(steps, new Set()), 'SM20 — non terminé')
    console.log('✓ SM20 — obligatoire pending → workflow non terminé')
  }

  // ── SM21 : findNextActivatableStep — retourne le premier pending non bloqué
  {
    const steps = [
      makeStep({ stepId: 's1', order: 1, status: 'completed' }),
      makeStep({ stepId: 's2', order: 2, status: 'pending' }),
      makeStep({ stepId: 's3', order: 3, status: 'pending' }),
    ]
    const next = findNextActivatableStep(steps, () => false)
    assert.ok(next !== null,           'SM21 — étape trouvée')
    assert.equal(next?.stepId, 's2',   'SM21 — c\'est s2 (le premier pending)')
    console.log('✓ SM21 — findNextActivatableStep retourne le premier pending non bloqué')
  }

  // ── SM22 : findNextActivatableStep — null si premier pending est bloqué ───
  {
    const steps = [
      makeStep({ stepId: 's1', order: 1, status: 'completed' }),
      makeStep({ stepId: 's2', order: 2, status: 'pending' }),
    ]
    const next = findNextActivatableStep(steps, (sid) => sid === 's2')
    assert.equal(next, null,           'SM22 — null car s2 est bloqué')
    console.log('✓ SM22 — findNextActivatableStep null si le suivant est bloqué')
  }

  // ── SM23 : transitions étapes — available → completed ────────────────────
  {
    const r = applyStepTransition('available', 'complete')
    assert.ok(r.ok,                    'SM23 — ok')
    assert.equal(r.ok && r.data, 'completed', 'SM23 — → completed')
    console.log('✓ SM23 — available → completed')
  }

  // ── SM24 : transitions étapes — completed → reopen → available ────────────
  {
    const r = applyStepTransition('completed', 'reopen')
    assert.ok(r.ok,                    'SM24 — ok')
    assert.equal(r.ok && r.data, 'available', 'SM24 — → available')
    console.log('✓ SM24 — completed → reopen → available')
  }

  console.log('\n✅ Tous les tests Workflow State Machine (ME-14) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
