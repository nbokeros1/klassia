// ── Tests : ExecutionPlanBuilder (ME-13.5) ────────────────────────────────────
//
// Exécution : npx tsx src/lib/execution-engine/__tests__/execution-plan-builder.test.ts

import assert from 'node:assert/strict'
import { ExecutionPlanBuilder }        from '../builders/execution-plan-builder'
import { validateExecutionPlan }       from '../validators/execution-plan-validator'
import { EXECUTION_RECIPE_VERSION }    from '../recipes/types'
import { EXECUTION_VERSION, makePlanId, makeStepId } from '../step-utils'
import { createExecutionRouteRegistry, buildExecutionContext } from '../execution-context'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'
import type { ExecutionContext } from '../execution-context'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROUTES  = createExecutionRouteRegistry()
const CONTEXT: ExecutionContext = buildExecutionContext({
  mission: null, bundle: null, routeRegistry: ROUTES,
})

const planBuilder = new ExecutionPlanBuilder()

function makeRecipeStep(
  code: string, overrides: Partial<ExecutionRecipeStep> = {},
): ExecutionRecipeStep {
  return {
    code,
    capability:         'generic_review',
    title:              `Étape ${code}`,
    description:        'Description.',
    completionCriteria: ['Critère.'],
    estimatedMinutes:   5,
    ...overrides,
  }
}

function makeRecipe(overrides: Partial<ExecutionRecipe> = {}): ExecutionRecipe {
  const sourceId = overrides.sourceId ?? 'test-source'
  return {
    id:          overrides.id ?? makePlanId(sourceId),
    sourceType:  'mission',
    sourceId,
    missionType: 'next_lesson',
    title:       'Recette test',
    objective:   'Tester le builder.',
    classeId:    null,
    matiere:     null,
    steps:       [makeRecipeStep('s1')],
    version:     EXECUTION_RECIPE_VERSION,
    ...overrides,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── PB01 : recette → plan ────────────────────────────────────────────────
  {
    const recipe = makeRecipe()
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.ok(plan !== null && plan !== undefined,              'PB01 — plan produit')
    assert.equal(plan.id, recipe.id,                           'PB01 — plan.id = recipe.id')
    assert.equal(plan.title, recipe.title,                     'PB01 — plan.title = recipe.title')
    console.log('✓ PB01 — recette → plan')
  }

  // ── PB02 : plan ID déterministe ──────────────────────────────────────────
  {
    const recipe = makeRecipe({ sourceId: 'my-mission-id' })
    const p1 = planBuilder.build(recipe, CONTEXT)
    const p2 = planBuilder.build(recipe, CONTEXT)
    assert.equal(p1.id, p2.id,                                 'PB02 — plan ID déterministe')
    assert.equal(p1.id, makePlanId('my-mission-id'),           'PB02 — plan ID = makePlanId(sourceId)')
    console.log('✓ PB02 — plan ID déterministe')
  }

  // ── PB03 : step IDs déterministes ────────────────────────────────────────
  {
    const sourceId = 'step-id-test'
    const recipe = makeRecipe({ sourceId, steps: [makeRecipeStep('code_a'), makeRecipeStep('code_b')] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    const planId = makePlanId(sourceId)
    assert.equal(plan.steps[0].id, makeStepId(planId, 'code_a'), 'PB03 — step[0].id correct')
    assert.equal(plan.steps[1].id, makeStepId(planId, 'code_b'), 'PB03 — step[1].id correct')
    console.log('✓ PB03 — step IDs déterministes')
  }

  // ── PB04 : ordre séquentiel ───────────────────────────────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('a'), makeRecipeStep('b'), makeRecipeStep('c')] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.deepEqual(plan.steps.map(s => s.order), [1, 2, 3],  'PB04 — ordres séquentiels (1, 2, 3)')
    console.log('✓ PB04 — ordres séquentiels')
  }

  // ── PB05 : capability propagée dans le step final ─────────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('nav', { capability: 'navigate_to_prepare' })] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].capability, 'navigate_to_prepare', 'PB05 — capability propagée')
    console.log('✓ PB05 — capability propagée dans le step final')
  }

  // ── PB06 : kind par défaut du catalogue ──────────────────────────────────
  {
    // navigate_to_prepare → defaultKind = 'navigate'
    const recipe = makeRecipe({ steps: [makeRecipeStep('nav', { capability: 'navigate_to_prepare' })] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].kind, 'navigate',               'PB06 — kind = defaultKind catalog')
    console.log('✓ PB06 — kind par défaut du catalogue')
  }

  // ── PB07 : kind override de la recette ────────────────────────────────────
  {
    // review_annual_plan → defaultKind='review', override kind='verify'
    const recipe = makeRecipe({ steps: [makeRecipeStep('prog', { capability: 'review_annual_plan', kind: 'verify' })] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].kind, 'verify',                 'PB07 — kind override depuis recette')
    console.log('✓ PB07 — kind override de la recette')
  }

  // ── PB08 : estimatedMinutes override depuis la recette ────────────────────
  {
    // generic_review → defaultEstimatedMinutes=2, override=7
    const recipe = makeRecipe({ steps: [makeRecipeStep('s1', { capability: 'generic_review', estimatedMinutes: 7 })] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].estimatedMinutes, 7,            'PB08 — estimatedMinutes override depuis recette')
    console.log('✓ PB08 — estimatedMinutes override depuis recette')
  }

  // ── PB09 : estimatedMinutes par défaut du catalogue ───────────────────────
  {
    // navigate_to_prepare → defaultEstimatedMinutes=2, pas d'override
    const recipe = makeRecipe({ steps: [makeRecipeStep('nav', { capability: 'navigate_to_prepare', estimatedMinutes: undefined })] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].estimatedMinutes, 2,            'PB09 — estimatedMinutes catalog par défaut')
    console.log('✓ PB09 — estimatedMinutes par défaut du catalogue')
  }

  // ── PB10 : optional par défaut = false ───────────────────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('s1', { optional: undefined })] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].optional, false,                'PB10 — optional défaut = false')
    console.log('✓ PB10 — optional par défaut = false')
  }

  // ── PB11 : requirements satisfaits → step non bloqué ─────────────────────
  {
    const step = makeRecipeStep('s1', {
      requirements: [{ code: 'r1', label: 'R1', satisfied: true, blocking: true }],
    })
    const recipe = makeRecipe({ steps: [step] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.notEqual(plan.steps[0].status, 'blocked',           'PB11 — requirement satisfait → non bloqué')
    console.log('✓ PB11 — requirements satisfaits → step non bloqué')
  }

  // ── PB12 : requirement bloquant non satisfait → step bloqué ──────────────
  {
    const step = makeRecipeStep('s1', {
      requirements: [{ code: 'r1', label: 'Manquant.', satisfied: false, blocking: true }],
    })
    const recipe = makeRecipe({ steps: [step] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].status, 'blocked',              'PB12 — requirement bloquant → step bloqué')
    assert.ok(plan.blockingReasons.includes('Manquant.'),      'PB12 — blockingReason dans le plan')
    console.log('✓ PB12 — requirement bloquant non satisfait → step bloqué')
  }

  // ── PB13 : premier step non bloqué → available ────────────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('a'), makeRecipeStep('b'), makeRecipeStep('c')] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.steps[0].status, 'available',            'PB13 — step 1 = available')
    assert.equal(plan.steps[1].status, 'pending',              'PB13 — step 2 = pending')
    assert.equal(plan.steps[2].status, 'pending',              'PB13 — step 3 = pending')
    console.log('✓ PB13 — premier step non bloqué → available')
  }

  // ── PB14 : exactement 1 step available ───────────────────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('a'), makeRecipeStep('b'), makeRecipeStep('c')] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    const avail  = plan.steps.filter(s => s.status === 'available')
    assert.equal(avail.length, 1,                              'PB14 — exactement 1 étape available')
    console.log('✓ PB14 — exactement 1 step available au démarrage')
  }

  // ── PB15 : summary correcte ───────────────────────────────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('a'), makeRecipeStep('b')] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.summary.totalSteps, 2,                   'PB15 — totalSteps = 2')
    assert.equal(plan.summary.actionableSteps, 2,              'PB15 — actionableSteps = 2 (available + pending)')
    assert.equal(plan.summary.blockedSteps, 0,                 'PB15 — blockedSteps = 0')
    assert.ok(plan.summary.firstActionLabel !== null,          'PB15 — firstActionLabel présent')
    console.log('✓ PB15 — summary correcte')
  }

  // ── PB16 : canStart true si ≥1 available ─────────────────────────────────
  {
    const recipe = makeRecipe()
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.canStart, true,                          'PB16 — canStart = true')
    console.log('✓ PB16 — canStart true si ≥1 available')
  }

  // ── PB17 : canStart false si tous bloqués ─────────────────────────────────
  {
    const req    = { code: 'r', label: 'Requis.', satisfied: false, blocking: true }
    const recipe = makeRecipe({
      steps: [
        makeRecipeStep('s1', { requirements: [req] }),
        makeRecipeStep('s2', { requirements: [req] }),
      ],
    })
    const plan = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.canStart, false,                         'PB17 — canStart false si tous bloqués')
    console.log('✓ PB17 — canStart false si tous les steps bloqués')
  }

  // ── PB18 : targetRoute propagée ───────────────────────────────────────────
  {
    const recipe = makeRecipe({ targetRoute: '/dashboard/gerer/preparer' })
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.targetRoute, '/dashboard/gerer/preparer', 'PB18 — targetRoute propagée')
    console.log('✓ PB18 — targetRoute propagée depuis la recette')
  }

  // ── PB19 : plan final validé (validateExecutionPlan) ─────────────────────
  {
    const recipe = makeRecipe({ steps: [makeRecipeStep('a'), makeRecipeStep('b')] })
    const plan   = planBuilder.build(recipe, CONTEXT)
    const val    = validateExecutionPlan(plan)
    assert.equal(val.valid, true,                              `PB19 — plan valide (${val.errors.join(';')})`)
    console.log('✓ PB19 — plan final valide selon validateExecutionPlan')
  }

  // ── PB20 : recette invalide → erreur dev / plan générique prod ────────────
  {
    const invalidRecipe = makeRecipe({ id: '' })
    if (process.env.NODE_ENV !== 'production') {
      assert.throws(
        () => planBuilder.build(invalidRecipe, CONTEXT),
        /Recette invalide/,
        'PB20 — erreur dev pour recette invalide',
      )
      console.log('✓ PB20 — recette invalide → erreur en dev')
    } else {
      // En production : fallback vers plan générique sans erreur
      const plan = planBuilder.build(invalidRecipe, CONTEXT)
      assert.ok(plan.steps.length > 0, 'PB20 — fallback générique produit')
      console.log('✓ PB20 — recette invalide → fallback générique en prod')
    }
  }

  // ── PB20b : createdFromVersion = EXECUTION_VERSION ────────────────────────
  {
    const recipe = makeRecipe()
    const plan   = planBuilder.build(recipe, CONTEXT)
    assert.equal(plan.createdFromVersion, EXECUTION_VERSION,   'PB20b — createdFromVersion correct')
    console.log('✓ PB20b — createdFromVersion = EXECUTION_VERSION')
  }

  console.log('\n✅ Tous les tests ExecutionPlanBuilder (ME-13.5) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
