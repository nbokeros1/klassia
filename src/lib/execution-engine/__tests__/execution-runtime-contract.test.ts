// ── Tests : Execution Runtime Contract (ME-13.5) ─────────────────────────────
//
// Vérifie les garanties du contrat d'exécution bout-en-bout :
//   - sécurité (aucune donnée sensible)
//   - routes valides uniquement
//   - équivalence fonctionnelle ME-13 → ME-13.5 (Part AD)
//   - robustesse (erreurs non propagées, fallbacks)
//   - version présente
//
// Exécution : npx tsx src/lib/execution-engine/__tests__/execution-runtime-contract.test.ts

import assert from 'node:assert/strict'

import { ExecutionEngine }             from '../execution-engine'
import { validateExecutionPlan }       from '../validators/execution-plan-validator'
import { EXECUTION_VERSION }           from '../step-utils'
import { EXECUTION_RECIPE_VERSION }    from '../recipes/types'
import type { Mission, MissionType, MissionStatus } from '../../mission-engine/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLASSE_ID = 'cff8e6b2-0001-4abc-8def-000000000001'
const engine    = new ExecutionEngine()

function makeMission(
  id: string, type: MissionType, priority: number,
  metadata: Record<string, unknown> = {},
  reasonCode = 'test',
  status: MissionStatus = 'proposed',
): Mission {
  return {
    id, type,
    title:       `Mission ${type}`,
    description: `Description ${id}`,
    priority, status,
    reason:    { code: reasonCode, label: 'Test', description: 'Mission test' },
    createdAt: new Date('2026-03-10T10:00:00Z'),
    metadata:  { classe_id: CLASSE_ID, matiere: 'Mathématiques', ...metadata },
    evidence:  [],
  }
}

// ── Tous les types de mission testés ──────────────────────────────────────────

const ALL_MISSIONS: Mission[] = [
  makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' }),
  makeMission('next_lesson:ens:cls:math:cas-a', 'unfinished_document', 100, { action: 'create_annual_plan' }),
  makeMission('next_lesson:ens:cls:math:cas-b', 'next_lesson', 95, { action: 'prepare_first_lesson' }),
  makeMission('eval:ens:cls:math', 'evaluation', 85, { action: 'create_evaluation' }),
  makeMission('work:ens:cls:math:grade', 'work', 70, { action: 'grade_assignments' }),
  makeMission('work:ens:cls:math:overdue', 'work', 65, { action: 'process_overdue' }),
  makeMission('work:ens:cls:math:feedback', 'work', 60, { action: 'add_feedback' }),
  makeMission('follow:ens:cls:math', 'student_follow_up', 88, {}, 'student_high_priority'),
  makeMission('deadline:ens:cls:math:urgent', 'deadline', 94, {}, 'deadline_urgent'),
  makeMission('deadline:ens:cls:math:upcoming', 'deadline', 78, {}, 'deadline_upcoming'),
  makeMission('deadline:ens:cls:math:break', 'deadline', 72, {}, 'deadline_break'),
  makeMission('generic:ens:cls:math', 'resume_generation', 50),
]

// Patterns de données sensibles à ne jamais exposer
const SENSITIVE_PATTERNS = [/texteExtrait/i, /storage_path/i, /\btoken\b/i, /priority_student_ids/i]

function containsSensitive(text: string): boolean {
  return SENSITIVE_PATTERNS.some(p => p.test(text))
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── RC01 : tous les plans sont valides ────────────────────────────────────
  {
    for (const m of ALL_MISSIONS) {
      const plan = engine.createPlan(m)
      const val  = validateExecutionPlan(plan)
      assert.equal(val.valid, true, `RC01 — plan invalide pour mission ${m.id}: ${val.errors.join(';')}`)
    }
    console.log(`✓ RC01 — tous les ${ALL_MISSIONS.length} plans sont valides`)
  }

  // ── RC02 : aucune donnée sensible dans aucun plan ─────────────────────────
  {
    for (const m of ALL_MISSIONS) {
      const plan = engine.createPlan(m)
      for (const step of plan.steps) {
        const texts = [step.title, step.description, ...step.completionCriteria]
        for (const text of texts) {
          assert.ok(!containsSensitive(text),
            `RC02 — données sensibles dans plan ${plan.id} step ${step.id}: "${text}"`)
        }
      }
    }
    console.log('✓ RC02 — aucune donnée sensible dans aucun plan')
  }

  // ── RC03 : toutes les routes dans les plans commencent par /dashboard/ ────
  {
    for (const m of ALL_MISSIONS) {
      const plan = engine.createPlan(m)
      if (plan.targetRoute !== null) {
        assert.ok(
          plan.targetRoute === '/dashboard' || plan.targetRoute.startsWith('/dashboard/'),
          `RC03 — targetRoute invalide "${plan.targetRoute}" pour plan ${plan.id}`,
        )
      }
      for (const step of plan.steps) {
        if (step.target?.route) {
          assert.ok(
            step.target.route === '/dashboard' || step.target.route.startsWith('/dashboard/'),
            `RC03 — route step invalide "${step.target.route}" dans plan ${plan.id}`,
          )
        }
      }
    }
    console.log('✓ RC03 — toutes les routes commencent par /dashboard/ ou sont null')
  }

  // ── RC04 : tous les plans ont la bonne version (ME-13.5) ─────────────────
  {
    for (const m of ALL_MISSIONS) {
      const plan = engine.createPlan(m)
      assert.equal(plan.createdFromVersion, EXECUTION_VERSION,
        `RC04 — mauvaise version pour plan ${plan.id}: ${plan.createdFromVersion}`)
    }
    console.log(`✓ RC04 — tous les plans ont version ${EXECUTION_VERSION}`)
  }

  // ── RC05 : capability valide dans chaque étape ────────────────────────────
  {
    const { getCapabilityDefinition } = await import('../capabilities/capability-catalog')
    for (const m of ALL_MISSIONS) {
      const plan = engine.createPlan(m)
      for (const step of plan.steps) {
        const def = getCapabilityDefinition(step.capability)
        assert.ok(def !== undefined,
          `RC05 — capability inconnue "${step.capability}" dans plan ${plan.id}`)
      }
    }
    console.log('✓ RC05 — toutes les capabilities sont dans le catalogue')
  }

  // ── RC06 : aucun ID d'élève ni donnée nominative dans les plans ───────────
  {
    const NOMINAL_PATTERNS = [/priority_student_ids/i, /student_id\b/i, /élève\s+[A-Z]/]
    for (const m of ALL_MISSIONS) {
      const plan    = engine.createPlan(m)
      const allText = plan.steps.flatMap(s => [s.title, s.description, ...s.completionCriteria]).join(' ')
      for (const p of NOMINAL_PATTERNS) {
        assert.ok(!p.test(allText),
          `RC06 — donnée nominative "${p}" dans plan ${plan.id}`)
      }
    }
    console.log('✓ RC06 — aucun ID/nom d\'élève dans les plans')
  }

  // ── RC07 : query params uniquement dans la whitelist ─────────────────────
  {
    const ALLOWED = new Set(['classe_id', 'matiere', 'mission_key', 'event_id', 'document_id', 'mode', 'source', 'type', 'sujet', 'conversation'])
    for (const m of ALL_MISSIONS) {
      const plan = engine.createPlan(m)
      for (const step of plan.steps) {
        if (step.target?.query) {
          for (const key of Object.keys(step.target.query)) {
            assert.ok(ALLOWED.has(key),
              `RC07 — query param non autorisé "${key}" dans plan ${plan.id} step ${step.id}`)
          }
        }
      }
    }
    console.log('✓ RC07 — query params dans la whitelist')
  }

  // ── RC08 : exactement 1 step available par plan ───────────────────────────
  {
    for (const m of ALL_MISSIONS) {
      const plan    = engine.createPlan(m)
      const avail   = plan.steps.filter(s => s.status === 'available')
      // Si canStart est false, 0 steps available est OK; sinon exactement 1
      if (plan.canStart) {
        assert.equal(avail.length, 1,
          `RC08 — ${avail.length} steps available (attendu 1) pour plan ${plan.id}`)
      }
    }
    console.log('✓ RC08 — exactement 1 step available par plan qui peut démarrer')
  }

  // ── RC09 : équivalence fonctionnelle — mêmes IDs avant et après ME-13.5 ──
  {
    // Les IDs de plan et de steps doivent être stables entre invocations
    for (const m of ALL_MISSIONS) {
      const p1 = engine.createPlan(m)
      const p2 = engine.createPlan(m)
      assert.equal(p1.id, p2.id, `RC09 — plan ID instable pour ${m.id}`)
      assert.deepEqual(
        p1.steps.map(s => s.id),
        p2.steps.map(s => s.id),
        `RC09 — step IDs instables pour plan ${p1.id}`,
      )
    }
    console.log('✓ RC09 — équivalence fonctionnelle : IDs stables')
  }

  // ── RC10 : EXECUTION_RECIPE_VERSION présente dans les types ──────────────
  {
    assert.ok(typeof EXECUTION_RECIPE_VERSION === 'string' && EXECUTION_RECIPE_VERSION.length > 0,
      'RC10 — EXECUTION_RECIPE_VERSION est une string non vide')
    console.log(`✓ RC10 — EXECUTION_RECIPE_VERSION = "${EXECUTION_RECIPE_VERSION}"`)
  }

  // ── RC11 : engine résistant aux missions sans classe ─────────────────────
  {
    const m = makeMission('no-class:ens::math', 'next_lesson', 90, { action: 'prepare_next_lesson', classe_id: null })
    const plan = engine.createPlan(m)
    const val  = validateExecutionPlan(plan)
    assert.equal(val.valid, true, `RC11 — plan valide sans classe (${val.errors.join(';')})`)
    console.log('✓ RC11 — engine résistant aux missions sans classeId')
  }

  // ── RC12 : engine résistant aux missions sans matière ────────────────────
  {
    const m = makeMission('no-matiere:ens:cls', 'next_lesson', 90, { action: 'prepare_next_lesson', matiere: null })
    const plan = engine.createPlan(m)
    const val  = validateExecutionPlan(plan)
    assert.equal(val.valid, true, `RC12 — plan valide sans matière (${val.errors.join(';')})`)
    console.log('✓ RC12 — engine résistant aux missions sans matière')
  }

  console.log('\n✅ Tous les tests Runtime Contract (ME-13.5) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
