// ── Tests : Capability Catalog (ME-13.5) ─────────────────────────────────────
//
// Exécution : npx tsx src/lib/execution-engine/__tests__/capability-catalog.test.ts

import assert from 'node:assert/strict'
import {
  EXECUTION_CAPABILITY_CATALOG,
  getCapabilityDefinition,
  getAllCapabilityDefinitions,
} from '../capabilities/capability-catalog'
import type { ExecutionCapability } from '../capabilities/execution-capability'

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── CC01 : capabilities uniques ───────────────────────────────────────────
  {
    const capabilities = EXECUTION_CAPABILITY_CATALOG.map(d => d.capability)
    const unique = new Set(capabilities)
    assert.equal(unique.size, capabilities.length,              'CC01 — toutes les capabilities sont uniques')
    console.log('✓ CC01 — capabilities uniques')
  }

  // ── CC02 : couverture — au moins 36 capabilities ─────────────────────────
  {
    assert.ok(EXECUTION_CAPABILITY_CATALOG.length >= 36,        `CC02 — au moins 36 capabilities (${EXECUTION_CAPABILITY_CATALOG.length})`)
    console.log(`✓ CC02 — couverture : ${EXECUTION_CAPABILITY_CATALOG.length} capabilities`)
  }

  // ── CC03 : aucune estimatedMinutes négative ────────────────────────────────
  {
    for (const def of EXECUTION_CAPABILITY_CATALOG) {
      if (def.defaultEstimatedMinutes !== null) {
        assert.ok(def.defaultEstimatedMinutes >= 0,             `CC03 — ${def.capability} : minutes ≥ 0`)
      }
    }
    console.log('✓ CC03 — aucune estimatedMinutes négative')
  }

  // ── CC04 : catégories valides ─────────────────────────────────────────────
  {
    const VALID_CATS = new Set(['review', 'selection', 'navigation', 'creation', 'correction', 'verification', 'confirmation'])
    for (const def of EXECUTION_CAPABILITY_CATALOG) {
      assert.ok(VALID_CATS.has(def.category),                   `CC04 — ${def.capability} : catégorie "${def.category}" valide`)
    }
    console.log('✓ CC04 — toutes les catégories sont valides')
  }

  // ── CC05 : navigate_to_prepare a defaultKind 'navigate' ───────────────────
  {
    const def = getCapabilityDefinition('navigate_to_prepare')
    assert.ok(def !== undefined,                                'CC05 — navigate_to_prepare existe')
    assert.equal(def!.defaultKind, 'navigate',                 'CC05 — navigate_to_prepare defaultKind = navigate')
    assert.equal(def!.category,    'navigation',               'CC05 — navigate_to_prepare catégorie = navigation')
    console.log('✓ CC05 — navigate_to_prepare → navigate / navigation')
  }

  // ── CC06 : create_evaluation a defaultKind 'prepare' (équivalence ME-13) ──
  {
    const def = getCapabilityDefinition('create_evaluation')
    assert.ok(def !== undefined,                                'CC06 — create_evaluation existe')
    assert.equal(def!.defaultKind, 'prepare',                  'CC06 — create_evaluation defaultKind = prepare')
    assert.equal(def!.requiresExplicitConfirmation, true,      'CC06 — create_evaluation requiresExplicitConfirmation')
    console.log('✓ CC06 — create_evaluation → prepare / requiresExplicitConfirmation')
  }

  // ── CC07 : confirm_completion requiert une confirmation explicite ──────────
  {
    const def = getCapabilityDefinition('confirm_completion')
    assert.ok(def !== undefined,                                'CC07 — confirm_completion existe')
    assert.equal(def!.requiresExplicitConfirmation, true,      'CC07 — confirm_completion requiresExplicitConfirmation')
    assert.equal(def!.defaultKind, 'confirm',                  'CC07 — confirm_completion defaultKind = confirm')
    console.log('✓ CC07 — confirm_completion → confirm / requiresExplicitConfirmation')
  }

  // ── CC08 : immutabilité — le catalogue est gelé au runtime ──────────────
  {
    // Object.freeze() garantit que le tableau ne peut pas être muté
    assert.ok(Object.isFrozen(EXECUTION_CAPABILITY_CATALOG), 'CC08 — CATALOG est gelé (Object.freeze)')
    // getAllCapabilityDefinitions() retourne la même référence (readonly)
    assert.ok(Object.isFrozen(getAllCapabilityDefinitions()),  'CC08 — getAllCapabilityDefinitions gelé')
    console.log('✓ CC08 — catalogue gelé au runtime (Object.freeze)')
  }

  // ── CC09 : getCapabilityDefinition retourne undefined pour l'inconnu ───────
  {
    const def = getCapabilityDefinition('unknown_capability_that_does_not_exist' as ExecutionCapability)
    assert.equal(def, undefined,                               'CC09 — undefined pour capability inconnue')
    console.log('✓ CC09 — getCapabilityDefinition → undefined pour inconnue')
  }

  // ── CC10 : aucune valeur user-text dans le catalogue ─────────────────────
  {
    // Les champs du catalogue sont des identifiants et valeurs sémantiques
    // — pas des labels/descriptions UI (qui seraient en français)
    for (const def of EXECUTION_CAPABILITY_CATALOG) {
      assert.ok(typeof def.capability === 'string',             `CC10 — ${def.capability} : capability est une string`)
      assert.ok(def.capability === def.capability.toLowerCase(), `CC10 — ${def.capability} : capability en snake_case`)
      assert.ok(!def.capability.includes(' '),                 `CC10 — ${def.capability} : pas d'espace dans la capability`)
    }
    console.log('✓ CC10 — toutes les capabilities sont des identifiants snake_case')
  }

  console.log('\n✅ Tous les tests Capability Catalog (ME-13.5) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
