// ── Tests : ExecutionRecipe / validateExecutionRecipe (ME-13.5) ──────────────
//
// Exécution : npx tsx src/lib/execution-engine/__tests__/execution-recipe.test.ts

import assert from 'node:assert/strict'
import { validateExecutionRecipe }   from '../recipes/recipe-validator'
import { EXECUTION_RECIPE_VERSION }  from '../recipes/types'
import type { ExecutionRecipe, ExecutionRecipeStep } from '../recipes/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStep(overrides: Partial<ExecutionRecipeStep> & { code: string }): ExecutionRecipeStep {
  return {
    capability:         'generic_review',
    title:              `Étape ${overrides.code}`,
    description:        'Description de l\'étape.',
    completionCriteria: ['Critère de complétion.'],
    ...overrides,
  }
}

function makeRecipe(overrides: Partial<ExecutionRecipe> = {}): ExecutionRecipe {
  return {
    id:          'execution:test-recipe',
    sourceType:  'mission',
    sourceId:    'test-recipe',
    missionType: 'next_lesson',
    title:       'Recette de test',
    objective:   'Tester la validation de recette.',
    classeId:    'classe-uuid',
    matiere:     'Mathématiques',
    steps:       [makeStep({ code: 'step1' })],
    version:     EXECUTION_RECIPE_VERSION,
    ...overrides,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── RE01 : recette valide → valid: true ───────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe())
    assert.equal(result.valid, true,                            `RE01 — valid: true (${result.errors.join(';')})`)
    assert.equal(result.errors.length, 0,                      'RE01 — 0 erreurs')
    console.log('✓ RE01 — recette valide → valid: true')
  }

  // ── RE02 : id absent → erreur ─────────────────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe({ id: '' }))
    assert.equal(result.valid, false,                          'RE02 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('id')), 'RE02 — erreur id')
    console.log('✓ RE02 — id absent → erreur')
  }

  // ── RE03 : sourceId absent → erreur ──────────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe({ sourceId: '' }))
    assert.equal(result.valid, false,                          'RE03 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('sourceid')), 'RE03 — erreur sourceId')
    console.log('✓ RE03 — sourceId absent → erreur')
  }

  // ── RE04 : titre vide → erreur ────────────────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe({ title: '' }))
    assert.equal(result.valid, false,                          'RE04 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('titre') || e.toLowerCase().includes('title')), 'RE04 — erreur titre')
    console.log('✓ RE04 — titre vide → erreur')
  }

  // ── RE05 : objectif vide → erreur ─────────────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe({ objective: '' }))
    assert.equal(result.valid, false,                          'RE05 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('objectif') || e.toLowerCase().includes('objective')), 'RE05 — erreur objectif')
    console.log('✓ RE05 — objectif vide → erreur')
  }

  // ── RE06 : aucune étape → erreur ──────────────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe({ steps: [] }))
    assert.equal(result.valid, false,                          'RE06 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('étape') || e.toLowerCase().includes('step')), 'RE06 — erreur steps vides')
    console.log('✓ RE06 — aucune étape → erreur')
  }

  // ── RE07 : codes d'étapes vides → erreur ─────────────────────────────────
  {
    const result = validateExecutionRecipe(makeRecipe({ steps: [makeStep({ code: '' })] }))
    assert.equal(result.valid, false,                          'RE07 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('code')), 'RE07 — erreur code vide')
    console.log('✓ RE07 — code d\'étape vide → erreur')
  }

  // ── RE08 : codes d'étapes dupliqués → erreur ─────────────────────────────
  {
    const steps = [makeStep({ code: 'dup' }), makeStep({ code: 'dup' })]
    const result = validateExecutionRecipe(makeRecipe({ steps }))
    assert.equal(result.valid, false,                          'RE08 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('dupliqu') || e.toLowerCase().includes('unique')), 'RE08 — erreur codes dupliqués')
    console.log('✓ RE08 — codes d\'étapes dupliqués → erreur')
  }

  // ── RE09 : capability inconnue → erreur ──────────────────────────────────
  {
    const step = makeStep({ code: 's1', capability: 'capability_that_does_not_exist' as any })
    const result = validateExecutionRecipe(makeRecipe({ steps: [step] }))
    assert.equal(result.valid, false,                          'RE09 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('capability')), 'RE09 — erreur capability inconnue')
    console.log('✓ RE09 — capability inconnue → erreur')
  }

  // ── RE10 : titre d'étape vide → erreur ────────────────────────────────────
  {
    const step = makeStep({ code: 's1', title: '' })
    const result = validateExecutionRecipe(makeRecipe({ steps: [step] }))
    assert.equal(result.valid, false,                          'RE10 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('titre') || e.toLowerCase().includes('title')), 'RE10 — erreur titre étape')
    console.log('✓ RE10 — titre d\'étape vide → erreur')
  }

  // ── RE11 : route invalide dans target → erreur ────────────────────────────
  {
    const step = makeStep({ code: 's1', target: { type: 'route', route: 'https://external.com/bad', query: {}, referenceId: null } })
    const result = validateExecutionRecipe(makeRecipe({ steps: [step] }))
    assert.equal(result.valid, false,                          'RE11 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('route')), 'RE11 — erreur route invalide')
    console.log('✓ RE11 — route invalide dans target → erreur')
  }

  // ── RE12 : estimatedMinutes négatif → erreur ──────────────────────────────
  {
    const step = makeStep({ code: 's1', estimatedMinutes: -3 })
    const result = validateExecutionRecipe(makeRecipe({ steps: [step] }))
    assert.equal(result.valid, false,                          'RE12 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('minutes') || e.toLowerCase().includes('négatif')), 'RE12 — erreur minutes négatives')
    console.log('✓ RE12 — estimatedMinutes négatif → erreur')
  }

  // ── RE13 : données sensibles → erreur ─────────────────────────────────────
  {
    const step = makeStep({ code: 's1', description: 'Copier le texteExtrait dans le formulaire.' })
    const result = validateExecutionRecipe(makeRecipe({ steps: [step] }))
    assert.equal(result.valid, false,                          'RE13 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('sensibles') || e.toLowerCase().includes('sensible')), 'RE13 — erreur données sensibles')
    console.log('✓ RE13 — données sensibles dans description → erreur')
  }

  // ── RE14 : plus de 10 étapes → erreur ────────────────────────────────────
  {
    const steps = Array.from({ length: 11 }, (_, i) =>
      makeStep({ code: `s${i + 1}`, capability: 'generic_review' }),
    )
    const result = validateExecutionRecipe(makeRecipe({ steps }))
    assert.equal(result.valid, false,                          'RE14 — invalid')
    assert.ok(result.errors.some(e => e.toLowerCase().includes('max') || e.toLowerCase().includes('10') || e.toLowerCase().includes('étapes')), 'RE14 — erreur max steps')
    console.log('✓ RE14 — >10 étapes → erreur')
  }

  // ── RE15 : recette valide → déterministe (même entrée, même validation) ───
  {
    const recipe = makeRecipe({
      steps: [
        makeStep({ code: 'step_a', capability: 'navigate_to_prepare' }),
        makeStep({ code: 'step_b', capability: 'create_lesson' }),
        makeStep({ code: 'step_c', capability: 'confirm_completion' }),
      ],
    })
    const r1 = validateExecutionRecipe(recipe)
    const r2 = validateExecutionRecipe(recipe)
    assert.equal(r1.valid, r2.valid,                           'RE15 — résultat identique')
    assert.deepEqual(r1.errors, r2.errors,                     'RE15 — erreurs identiques')
    console.log('✓ RE15 — validation déterministe')
  }

  console.log('\n✅ Tous les tests ExecutionRecipe (ME-13.5) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
