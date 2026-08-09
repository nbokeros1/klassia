// ── Tests : validateExecutionPlan (ME-13) ─────────────────────────────────────
//
// Exécution : npx tsx src/lib/execution-engine/__tests__/execution-plan-validator.test.ts

import assert from 'node:assert/strict'
import { validateExecutionPlan } from '../validators/execution-plan-validator'
import type { ExecutionPlan, ExecutionStep } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStep(overrides: Partial<ExecutionStep> & { id: string; order: number }): ExecutionStep {
  return {
    capability:         'generic_review',
    kind:               'review',
    title:              `Étape ${overrides.id}`,
    description:        'Description.',
    status:             'pending',
    target:             null,
    requirements:       [],
    completionCriteria: ['Critère de complétion.'],
    estimatedMinutes:   5,
    optional:           false,
    ...overrides,
  }
}

function makePlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  const steps = overrides.steps ?? [
    makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available' }),
    makeStep({ id: 'plan-1:step:s2', order: 2, status: 'pending' }),
  ]
  return {
    id:                 'plan-1',
    sourceType:         'mission',
    sourceId:           'mission-abc',
    missionType:        'next_lesson',
    title:              'Plan de test',
    objective:          'Objectif de test.',
    classeId:           'classe-uuid',
    matiere:            'Mathématiques',
    steps,
    summary: {
      totalSteps: steps.length,
      actionableSteps: steps.filter(s => s.status !== 'blocked').length,
      blockedSteps: 0,
      estimatedMinutes: 10,
      firstActionLabel: steps[0]?.title ?? null,
    },
    canStart:            true,
    blockingReasons:     [],
    targetRoute:         '/dashboard/gerer/preparer',
    createdFromVersion:  'ME-13.0',
    ...overrides,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── VP01 : plan valide → valid: true ──────────────────────────────────────
  {
    const result = validateExecutionPlan(makePlan())
    assert.equal(result.valid, true,          'VP01 — valid: true')
    assert.equal(result.errors.length, 0,     'VP01 — 0 erreurs')
    console.log('✓ VP01 — plan valide → valid: true')
  }

  // ── VP02 : ID manquant → erreur ───────────────────────────────────────────
  {
    const result = validateExecutionPlan(makePlan({ id: '' }))
    assert.equal(result.valid, false,         'VP02 — invalid')
    assert.ok(result.errors.some(e => e.includes('ID')), 'VP02 — erreur ID')
    console.log('✓ VP02 — ID manquant → erreur')
  }

  // ── VP03 : sourceId manquant → erreur ─────────────────────────────────────
  {
    const result = validateExecutionPlan(makePlan({ sourceId: '' }))
    assert.equal(result.valid, false,         'VP03 — invalid')
    assert.ok(result.errors.some(e => e.includes('sourceId')), 'VP03 — erreur sourceId')
    console.log('✓ VP03 — sourceId manquant → erreur')
  }

  // ── VP04 : aucune étape → erreur ──────────────────────────────────────────
  {
    const result = validateExecutionPlan(makePlan({ steps: [], summary: { totalSteps: 0, actionableSteps: 0, blockedSteps: 0, estimatedMinutes: null, firstActionLabel: null } }))
    assert.equal(result.valid, false,         'VP04 — invalid')
    assert.ok(result.errors.some(e => e.includes('aucune étape') || e.toLowerCase().includes('step')), 'VP04 — erreur étapes vides')
    console.log('✓ VP04 — aucune étape → erreur')
  }

  // ── VP05 : IDs d'étapes dupliqués → erreur ────────────────────────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:dup', order: 1, status: 'available' })
    const s2 = makeStep({ id: 'plan-1:step:dup', order: 2, status: 'pending' })
    const result = validateExecutionPlan(makePlan({ steps: [s1, s2] }))
    assert.equal(result.valid, false,         'VP05 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('dupliqu')), 'VP05 — erreur dupliqués')
    console.log('✓ VP05 — IDs étapes dupliqués → erreur')
  }

  // ── VP06 : ordres non séquentiels → erreur ────────────────────────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available' })
    const s3 = makeStep({ id: 'plan-1:step:s3', order: 3, status: 'pending' })  // manque 2
    const result = validateExecutionPlan(makePlan({ steps: [s1, s3] }))
    assert.equal(result.valid, false,         'VP06 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('séquentiel') || e.toLowerCase().includes('order')), 'VP06 — erreur ordres')
    console.log('✓ VP06 — ordres non séquentiels → erreur')
  }

  // ── VP07 : titre vide → erreur ────────────────────────────────────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available', title: '' })
    const s2 = makeStep({ id: 'plan-1:step:s2', order: 2, status: 'pending' })
    const result = validateExecutionPlan(makePlan({ steps: [s1, s2] }))
    assert.equal(result.valid, false,         'VP07 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('titre')), 'VP07 — erreur titre')
    console.log('✓ VP07 — titre vide → erreur')
  }

  // ── VP08 : route inventée → erreur ────────────────────────────────────────
  {
    const result = validateExecutionPlan(makePlan({ targetRoute: 'https://external.com/bad' }))
    assert.equal(result.valid, false,         'VP08 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('route')), 'VP08 — erreur route')
    console.log('✓ VP08 — route inventée → erreur')
  }

  // ── VP09 : deux étapes available → erreur ─────────────────────────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available' })
    const s2 = makeStep({ id: 'plan-1:step:s2', order: 2, status: 'available' })
    const result = validateExecutionPlan(makePlan({ steps: [s1, s2] }))
    assert.equal(result.valid, false,         'VP09 — invalid')
    assert.ok(result.errors.some(e => e.includes('available')), 'VP09 — erreur available count')
    console.log('✓ VP09 — 2 étapes available → erreur')
  }

  // ── VP10 : étape bloquée sans requirement bloquant → warning ──────────────
  {
    const s1 = makeStep({
      id: 'plan-1:step:s1', order: 1, status: 'blocked',
      requirements: [{ code: 'x', label: 'X', satisfied: true, blocking: true }],
    })
    const s2 = makeStep({ id: 'plan-1:step:s2', order: 2, status: 'available' })
    const result = validateExecutionPlan(makePlan({ steps: [s1, s2] }))
    assert.ok(result.warnings.some(w => w.includes('bloquée')), 'VP10 — warning étape bloquée sans raison')
    console.log('✓ VP10 — étape bloquée sans requirement → warning')
  }

  // ── VP11 : estimatedMinutes négatif → erreur ──────────────────────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available', estimatedMinutes: -5 })
    const result = validateExecutionPlan(makePlan({ steps: [s1] }))
    assert.equal(result.valid, false,         'VP11 — invalid')
    assert.ok(result.errors.some(e => e.includes('négatif')), 'VP11 — erreur minutes négatives')
    console.log('✓ VP11 — estimatedMinutes négatif → erreur')
  }

  // ── VP12 : étape obligatoire sans completionCriteria → warning ────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available', completionCriteria: [], optional: false })
    const result = validateExecutionPlan(makePlan({ steps: [s1] }))
    assert.ok(result.warnings.some(w => w.includes('critère')), 'VP12 — warning critères vides')
    console.log('✓ VP12 — étape obligatoire sans critère → warning')
  }

  // ── VP13 : étape optionnelle sans critère → pas d'erreur ──────────────────
  {
    const s1 = makeStep({ id: 'plan-1:step:s1', order: 1, status: 'available', completionCriteria: [], optional: true })
    const result = validateExecutionPlan(makePlan({ steps: [s1] }))
    const hasWarningForOptional = result.warnings.some(w => w.includes(s1.id) && w.includes('critère'))
    assert.equal(hasWarningForOptional, false, 'VP13 — pas de warning pour étape optionnelle')
    console.log('✓ VP13 — étape optionnelle sans critère → pas de warning')
  }

  // ── VP14 : données sensibles dans description → erreur ────────────────────
  {
    const s1 = makeStep({
      id: 'plan-1:step:s1', order: 1, status: 'available',
      description: 'Copier texteExtrait dans le formulaire.',
    })
    const result = validateExecutionPlan(makePlan({ steps: [s1] }))
    assert.equal(result.valid, false,         'VP14 — invalid')
    assert.ok(result.errors.some(e => e.includes('sensibles')), 'VP14 — erreur données sensibles')
    console.log('✓ VP14 — données sensibles dans description → erreur')
  }

  // ── VP15 : targetRoute null → valide ──────────────────────────────────────
  {
    const result = validateExecutionPlan(makePlan({ targetRoute: null }))
    assert.equal(result.valid, true, 'VP15 — targetRoute null autorisé')
    console.log('✓ VP15 — targetRoute null → valide')
  }

  console.log('\n✅ Tous les tests validateExecutionPlan passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
