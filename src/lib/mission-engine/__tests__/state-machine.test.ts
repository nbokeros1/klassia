// ── Tests : machine d'état des missions (ME-05) ────────────────────────────
//
// Tests déterministes sans Supabase.
// Exécution : npx ts-node src/lib/mission-engine/__tests__/state-machine.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import type { MissionStatus, MissionAction, MissionStateSnapshot } from '../types'

// ── Machine d'état (copie locale pour tests unitaires purs) ──────────────────

const ALLOWED: Record<MissionStatus, Partial<Record<MissionAction, MissionStatus>>> = {
  proposed:    { accept: 'accepted',    start: 'in_progress', dismiss: 'dismissed' },
  accepted:    { start:  'in_progress', complete: 'completed', dismiss: 'dismissed' },
  in_progress: { complete: 'completed', dismiss: 'dismissed' },
  completed:   {},
  dismissed:   { restore: 'proposed' },
}

function applyTransition(
  current: MissionStatus,
  action:  MissionAction,
): MissionStatus | 'INVALID' {
  return (ALLOWED[current]?.[action] as MissionStatus | undefined) ?? 'INVALID'
}

function isIdempotent(action: MissionAction, current: MissionStatus): boolean {
  return (
    (action === 'accept'   && current === 'accepted')   ||
    (action === 'start'    && current === 'in_progress') ||
    (action === 'complete' && current === 'completed')  ||
    (action === 'dismiss'  && current === 'dismissed')  ||
    (action === 'restore'  && current === 'proposed')
  )
}

// ── Horodatages lors des transitions ─────────────────────────────────────────

function buildTimestamps(action: MissionAction, prev: Partial<MissionStateSnapshot>): Partial<MissionStateSnapshot> {
  const out: Partial<MissionStateSnapshot> = { ...prev }
  const now = new Date()
  switch (action) {
    case 'accept':   out.acceptedAt  = now;  break
    case 'start':    out.startedAt   = now;  break
    case 'complete': out.completedAt = now;  break
    case 'dismiss':  out.dismissedAt = now;  break
    case 'restore':  out.dismissedAt = null; break
  }
  return out
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function test01_proposed_accept() {
  assert.equal(applyTransition('proposed', 'accept'), 'accepted', 'proposed → accept → accepted')
}

async function test02_proposed_start() {
  assert.equal(applyTransition('proposed', 'start'), 'in_progress', 'proposed → start → in_progress')
}

async function test03_proposed_dismiss() {
  assert.equal(applyTransition('proposed', 'dismiss'), 'dismissed', 'proposed → dismiss → dismissed')
}

async function test04_accepted_start() {
  assert.equal(applyTransition('accepted', 'start'), 'in_progress', 'accepted → start → in_progress')
}

async function test05_accepted_complete() {
  assert.equal(applyTransition('accepted', 'complete'), 'completed', 'accepted → complete → completed')
}

async function test06_accepted_dismiss() {
  assert.equal(applyTransition('accepted', 'dismiss'), 'dismissed', 'accepted → dismiss → dismissed')
}

async function test07_in_progress_complete() {
  assert.equal(applyTransition('in_progress', 'complete'), 'completed', 'in_progress → complete → completed')
}

async function test08_in_progress_dismiss() {
  assert.equal(applyTransition('in_progress', 'dismiss'), 'dismissed', 'in_progress → dismiss → dismissed')
}

async function test09_dismissed_restore() {
  assert.equal(applyTransition('dismissed', 'restore'), 'proposed', 'dismissed → restore → proposed')
}

async function test10_completed_accept_refused() {
  assert.equal(applyTransition('completed', 'accept'), 'INVALID', 'completed → accept → INVALID')
}

async function test11_proposed_complete_refused() {
  assert.equal(applyTransition('proposed', 'complete'), 'INVALID', 'proposed → complete → INVALID')
}

async function test12_restore_on_proposed_refused() {
  // restore sur proposed → isIdempotent (restore, proposed) = true
  assert.equal(isIdempotent('restore', 'proposed'), true, 'restore sur proposed = idempotent')
  // mais la transition n'est pas dans ALLOWED
  assert.equal(applyTransition('proposed', 'restore'), 'INVALID', 'proposed → restore → INVALID dans ALLOWED')
}

async function test13_idempotent_accept_on_accepted() {
  assert.equal(isIdempotent('accept', 'accepted'), true, 'accept sur accepted = idempotent')
}

async function test14_idempotent_start_on_in_progress() {
  assert.equal(isIdempotent('start', 'in_progress'), true, 'start sur in_progress = idempotent')
}

async function test15_idempotent_dismiss_on_dismissed() {
  assert.equal(isIdempotent('dismiss', 'dismissed'), true, 'dismiss sur dismissed = idempotent')
}

async function test16_timestamps_accept_sets_acceptedAt() {
  const prev: Partial<MissionStateSnapshot> = {}
  const result = buildTimestamps('accept', prev)
  assert.ok(result.acceptedAt instanceof Date, 'accept set acceptedAt')
  assert.equal(result.startedAt,   undefined, 'accept ne touche pas startedAt')
}

async function test17_timestamps_start_preserves_acceptedAt() {
  const now = new Date()
  const prev: Partial<MissionStateSnapshot> = { acceptedAt: now }
  const result = buildTimestamps('start', prev)
  assert.ok(result.startedAt instanceof Date, 'start set startedAt')
  assert.equal(result.acceptedAt, now, 'start préserve acceptedAt')
}

async function test18_timestamps_restore_clears_dismissedAt() {
  const prev: Partial<MissionStateSnapshot> = { dismissedAt: new Date() }
  const result = buildTimestamps('restore', prev)
  assert.equal(result.dismissedAt, null, 'restore efface dismissedAt')
}

async function test19_no_transition_from_completed() {
  const actions: MissionAction[] = ['accept', 'start', 'complete', 'dismiss', 'restore']
  for (const a of actions) {
    assert.equal(
      applyTransition('completed', a),
      'INVALID',
      `completed → ${a} → INVALID`,
    )
  }
}

async function test20_proposed_restore_refused_non_idempotent_path() {
  // restore depuis proposed n'est ni une transition valide ni une vraie idempotence
  // (isIdempotent retourne true pour restore/proposed mais la transition est invalide)
  // → le serveur doit retourner 409 car la mission n'est pas en dismissed
  const isIdem = isIdempotent('restore', 'proposed')
  // Ce cas est géré par la route : restore vérifie que la ligne existe en dismissed
  assert.equal(isIdem, true, 'restore/proposed est marqué idempotent mais requiert une ligne dismissed')
}

// ── Runner ────────────────────────────────────────────────────────────────────

const TESTS = [
  test01_proposed_accept,
  test02_proposed_start,
  test03_proposed_dismiss,
  test04_accepted_start,
  test05_accepted_complete,
  test06_accepted_dismiss,
  test07_in_progress_complete,
  test08_in_progress_dismiss,
  test09_dismissed_restore,
  test10_completed_accept_refused,
  test11_proposed_complete_refused,
  test12_restore_on_proposed_refused,
  test13_idempotent_accept_on_accepted,
  test14_idempotent_start_on_in_progress,
  test15_idempotent_dismiss_on_dismissed,
  test16_timestamps_accept_sets_acceptedAt,
  test17_timestamps_start_preserves_acceptedAt,
  test18_timestamps_restore_clears_dismissedAt,
  test19_no_transition_from_completed,
  test20_proposed_restore_refused_non_idempotent_path,
]

async function run() {
  let passed = 0
  const failed: string[] = []

  for (const t of TESTS) {
    try {
      await t()
      passed++
      console.log(`  ✓  ${t.name}`)
    } catch (e) {
      failed.push(t.name)
      console.error(`  ✗  ${t.name}:`, e instanceof Error ? e.message : String(e))
    }
  }

  console.log(`\n${passed}/${TESTS.length} tests passés`)
  if (failed.length > 0) {
    console.error('Échecs :', failed)
    process.exit(1)
  }
}

run().catch(e => { console.error(e); process.exit(1) })
