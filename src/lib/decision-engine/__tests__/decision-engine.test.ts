// ── Tests : Decision Engine (ME-12) ──────────────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/decision-engine/__tests__/decision-engine.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { DecisionEngine } from '../decision-engine'
import { PriorityRule }   from '../rules/priority-rule'
import { DuplicateRule }  from '../rules/duplicate-rule'
import { ConflictRule }   from '../rules/conflict-rule'
import { BundleRule }     from '../rules/bundle-rule'
import { CapacityRule }   from '../rules/capacity-rule'
import type { Mission, MissionType, MissionStatus } from '../../mission-engine/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMission(
  id: string,
  type: MissionType,
  priority: number,
  status: MissionStatus = 'proposed',
): Mission {
  return {
    id,
    type,
    title:       `Mission ${type} (${id})`,
    description: `Description de ${id}`,
    priority,
    status,
    reason:    { code: 'test', label: 'Test', description: 'Mission de test' },
    createdAt: new Date('2026-03-10T10:00:00Z'),
    metadata:  {},
  }
}

// Raccourcis pour les types les plus fréquents dans les tests
const lesson    = (id: string, p: number, s?: MissionStatus) => makeMission(id, 'next_lesson',       p, s)
const evaluation = (id: string, p: number, s?: MissionStatus) => makeMission(id, 'evaluation',        p, s)
const work       = (id: string, p: number, s?: MissionStatus) => makeMission(id, 'work',              p, s)
const deadline   = (id: string, p: number, s?: MissionStatus) => makeMission(id, 'deadline',          p, s)
const follow     = (id: string, p: number, s?: MissionStatus) => makeMission(id, 'student_follow_up', p, s)
const resume_m   = (id: string, p: number, s?: MissionStatus) => makeMission(id, 'resume_generation', p, s)

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {
  const engine = new DecisionEngine()

  // ── DE01 : entrée vide → plan vide ──────────────────────────────────────
  {
    const plan = engine.run([])
    assert.equal(plan.primaryMission,      null, 'DE01 — primaryMission null')
    assert.equal(plan.secondaryMissions.length, 0, 'DE01 — secondaryMissions vide')
    assert.equal(plan.deferredMissions.length,  0, 'DE01 — deferredMissions vide')
    assert.equal(plan.hiddenMissions.length,    0, 'DE01 — hiddenMissions vide')
    assert.equal(plan.bundles.length,           0, 'DE01 — bundles vide')
    console.log('✓ DE01 — entrée vide → plan vide')
  }

  // ── DE02 : mission unique → primary seule ──────────────────────────────
  {
    const plan = engine.run([lesson('l1', 75)])
    assert.ok(plan.primaryMission !== null,         'DE02 — primaryMission présente')
    assert.equal(plan.primaryMission!.id, 'l1',    'DE02 — id correct')
    assert.equal(plan.secondaryMissions.length, 0, 'DE02 — pas de secondary')
    assert.equal(plan.deferredMissions.length,  0, 'DE02 — pas de deferred')
    console.log('✓ DE02 — mission unique → primary seule')
  }

  // ── DE03 : 5 missions → 1 primary + 3 secondary + 1 deferred ──────────
  {
    const plan = engine.run([
      lesson('l1', 75),
      evaluation('e1', 90),
      work('w1', 60),
      follow('f1', 55),
      resume_m('r1', 50),
    ])
    assert.ok(plan.primaryMission !== null,              'DE03 — primary présente')
    assert.equal(plan.secondaryMissions.length, 3,      'DE03 — 3 secondary')
    assert.equal(plan.deferredMissions.length,  1,      'DE03 — 1 deferred')
    assert.equal(plan.summary.totalMissions,    5,      'DE03 — total 5')
    console.log('✓ DE03 — 5 missions → 1+3+1')
  }

  // ── DE04 : tri — la plus haute priorité devient primary ────────────────
  {
    const plan = engine.run([
      lesson('l1', 55),
      evaluation('e1', 90),
      work('w1', 70),
    ])
    assert.equal(plan.primaryMission?.id, 'e1',    'DE04 — evaluation (p=90) est primary')
    assert.equal(plan.secondaryMissions[0].id, 'w1', 'DE04 — work (p=70) est secondary[0]')
    assert.equal(plan.secondaryMissions[1].id, 'l1', 'DE04 — lesson (p=55) est secondary[1]')
    console.log('✓ DE04 — tri priorité : plus haute priorité → primary')
  }

  // ── DE05 : PriorityRule — tri isolé ────────────────────────────────────
  {
    const rule   = new PriorityRule()
    const result = rule.apply([lesson('l1', 50), evaluation('e1', 90), work('w1', 70)])
    assert.equal(result[0].id, 'e1', 'DE05 — index 0 = p=90')
    assert.equal(result[1].id, 'w1', 'DE05 — index 1 = p=70')
    assert.equal(result[2].id, 'l1', 'DE05 — index 2 = p=50')
    console.log('✓ DE05 — PriorityRule : tri décroissant')
  }

  // ── DE06 : DuplicateRule — même id → ne garder que le premier ─────────
  {
    const rule   = new DuplicateRule()
    const result = rule.apply([
      lesson('l1', 75),
      lesson('l1', 75),   // doublon exact
      work('w1', 60),
    ])
    assert.equal(result.length, 2, 'DE06 — doublon id supprimé')
    assert.equal(result[0].id, 'l1', 'DE06 — first l1 conservé')
    assert.equal(result[1].id, 'w1', 'DE06 — w1 conservé')
    console.log('✓ DE06 — DuplicateRule : même id → 1 seul')
  }

  // ── DE07 : DuplicateRule — même type → garder priorité la plus haute ──
  {
    const rule   = new DuplicateRule()
    // On passe en ordre décroissant (comme le ferait PriorityRule avant)
    const result = rule.apply([
      evaluation('e2', 90),  // e2 a priorité plus haute → conservé
      evaluation('e1', 70),  // même type 'evaluation' → supprimé
      work('w1', 60),
    ])
    assert.equal(result.length, 2,    'DE07 — doublon type supprimé')
    assert.equal(result[0].id, 'e2', 'DE07 — e2 (p=90) conservé')
    assert.equal(result[1].id, 'w1', 'DE07 — w1 conservé')
    console.log('✓ DE07 — DuplicateRule : même type → 1 seul (highest priority)')
  }

  // ── DE08 : mission completed → hiddenMissions ──────────────────────────
  {
    const plan = engine.run([
      evaluation('e1', 90, 'completed'),
      work('w1', 60),
    ])
    assert.equal(plan.hiddenMissions.length, 1,         'DE08 — 1 hidden')
    assert.equal(plan.hiddenMissions[0].id, 'e1',      'DE08 — e1 caché (completed)')
    assert.equal(plan.primaryMission?.id, 'w1',        'DE08 — w1 devient primary')
    console.log('✓ DE08 — completed → hiddenMissions')
  }

  // ── DE09 : mission dismissed → hiddenMissions ──────────────────────────
  {
    const plan = engine.run([
      lesson('l1', 75, 'dismissed'),
      work('w1', 60),
    ])
    assert.equal(plan.hiddenMissions.length, 1,       'DE09 — 1 hidden')
    assert.equal(plan.hiddenMissions[0].id, 'l1',    'DE09 — l1 caché (dismissed)')
    assert.equal(plan.primaryMission?.id, 'w1',      'DE09 — w1 primary')
    console.log('✓ DE09 — dismissed → hiddenMissions')
  }

  // ── DE10 : ConflictRule — next_lesson démise lors d'une deadline urgente
  {
    const rule   = new ConflictRule()
    const before = [deadline('d1', 94), lesson('l1', 85), work('w1', 70)]
    const after  = rule.apply(before)
    const dl     = after.find(m => m.id === 'l1')!
    assert.equal(dl.priority, 65, 'DE10 — next_lesson : 85-20=65')
    console.log('✓ DE10 — ConflictRule : next_lesson −20 lors de deadline urgente')
  }

  // ── DE11 : conflit intégré — next_lesson passe en deferred ────────────
  {
    // Sans conflit, lesson(85) serait secondary. Avec deadline(94) urgente, il passe à 65.
    // Le bundle eval+deadline crée 1 lead. Avec work(80)+follow(75)+resume(72) en secondary,
    // lesson(65) n'a plus de slot → deferred.
    const plan = engine.run([
      deadline('d1', 94),
      evaluation('e1', 90),
      work('w1', 80),
      follow('f1', 75),
      resume_m('r1', 72),    // remplit secondary[2]
      lesson('l1', 85),      // p=85 avant conflit, p=65 après → deferred
    ])
    const deferredIds = plan.deferredMissions.map(m => m.id)
    assert.ok(deferredIds.includes('l1'), 'DE11 — next_lesson glisse en deferred')
    console.log('✓ DE11 — conflit intégré : next_lesson → deferred quand deadline urgente')
  }

  // ── DE12 : BundleRule — evaluation + deadline → 1 bundle ──────────────
  {
    const rule   = new BundleRule()
    const result = rule.apply([evaluation('e1', 90), deadline('d1', 94), work('w1', 70)])
    assert.equal(result.bundles.length, 1,               'DE12 — 1 bundle créé')
    const b = result.bundles[0]
    assert.ok(b.id.startsWith('bundle:'),               'DE12 — bundle id préfixé bundle:')
    assert.ok(b.missions.some(m => m.id === 'e1'),      'DE12 — evaluation dans bundle')
    assert.ok(b.missions.some(m => m.id === 'd1'),      'DE12 — deadline dans bundle')
    assert.equal(b.priority, 94,                        'DE12 — priorité bundle = max(90,94)')
    console.log('✓ DE12 — BundleRule : evaluation + deadline → bundle (p=94)')
  }

  // ── DE13 : bundle — lead mission a le titre fusionné ──────────────────
  {
    const plan = engine.run([evaluation('e1', 90), deadline('d1', 94)])
    assert.equal(
      plan.primaryMission?.title,
      "Préparer et planifier l'évaluation",
      'DE13 — titre lead = titre bundle',
    )
    console.log("✓ DE13 — lead bundle title = Préparer et planifier l'évaluation")
  }

  // ── DE14 : bundle — missions originales absentes des slots visibles ────
  {
    const plan = engine.run([evaluation('e1', 90), deadline('d1', 94), work('w1', 70)])
    const visible = [
      plan.primaryMission,
      ...plan.secondaryMissions,
      ...plan.deferredMissions,
    ].filter(Boolean).map(m => m!.id)
    assert.ok(!visible.includes('e1'), 'DE14 — e1 (original) absent des slots visibles')
    assert.ok(!visible.includes('d1'), 'DE14 — d1 (original) absent des slots visibles')
    assert.ok( visible.includes('w1'), 'DE14 — w1 toujours présent')
    assert.equal(plan.bundles.length, 1, 'DE14 — bundle dans plan.bundles')
    console.log('✓ DE14 — missions bundlées absentes des slots visibles (dans bundles)')
  }

  // ── DE15 : summary — comptages corrects ──────────────────────────────
  {
    const plan = engine.run([
      evaluation('e1', 90, 'completed'),  // → hidden
      work('w1', 80),                      // → primary
      lesson('l1', 70),                    // → secondary
      follow('f1', 60),                    // → secondary
      resume_m('r1', 50),                  // → secondary
      makeMission('u1', 'unfinished_document', 40),  // → deferred
    ])
    assert.equal(plan.summary.primaryCount,   1, 'DE15 — primaryCount 1')
    assert.equal(plan.summary.secondaryCount, 3, 'DE15 — secondaryCount 3')
    assert.equal(plan.summary.deferredCount,  1, 'DE15 — deferredCount 1')
    assert.equal(plan.summary.hiddenCount,    1, 'DE15 — hiddenCount 1')
    assert.equal(plan.summary.totalMissions,  6, 'DE15 — totalMissions 6')
    console.log('✓ DE15 — summary comptages corrects')
  }

  // ── DE16 : summary — label format ──────────────────────────────────────
  {
    const plan = engine.run([
      work('w1', 80),
      lesson('l1', 70),
      follow('f1', 60),
      resume_m('r1', 50),
      makeMission('u1', 'unfinished_document', 40),
    ])
    const label = plan.summary.label
    assert.ok(label.startsWith("Aujourd'hui :"), 'DE16 — label commence par Aujourd\'hui :')
    assert.ok(label.includes('1 priorité absolue'),         'DE16 — label contient primary')
    assert.ok(label.includes('3 tâches secondaires'),       'DE16 — label contient secondary (pluriel)')
    assert.ok(label.includes('1 reportée'),                 'DE16 — label contient deferred')
    console.log('✓ DE16 — summary label format correct')
  }

  // ── DE17 : summary — label "Aucune tâche" si vide ─────────────────────
  {
    const plan = engine.run([])
    assert.equal(plan.summary.label, "Aucune tâche pour aujourd'hui", 'DE17 — label vide')
    console.log("✓ DE17 — summary label vide = Aucune tâche pour aujourd'hui")
  }

  // ── DE18 : summary — pluriel singulier pour 1 tâche secondaire ─────────
  {
    const plan = engine.run([work('w1', 80), lesson('l1', 70)])
    const label = plan.summary.label
    assert.ok(label.includes('1 tâche secondaire'), 'DE18 — singulier pour 1 secondary')
    console.log('✓ DE18 — summary singulier : 1 tâche secondaire')
  }

  // ── DE19 : CapacityRule — isolée ───────────────────────────────────────
  {
    const rule    = new CapacityRule()
    const missions = [
      work('w1', 90),
      lesson('l1', 80, 'completed'),
      follow('f1', 70),
      resume_m('r1', 60),
      makeMission('u1', 'unfinished_document', 50),
      makeMission('u2', 'create_evaluation', 40),
    ]
    const result = rule.apply(missions)
    assert.equal(result.primaryMission?.id, 'w1',      'DE19 — primary = w1')
    assert.equal(result.hiddenMissions.length, 1,      'DE19 — 1 hidden (completed)')
    assert.equal(result.secondaryMissions.length, 3,  'DE19 — 3 secondary')
    assert.equal(result.deferredMissions.length, 1,   'DE19 — 1 deferred')
    console.log('✓ DE19 — CapacityRule isolée')
  }

  // ── DE20 : plan complet — evaluation+deadline fusionnés + autres ───────
  {
    // Scénario réaliste : évaluation imminente + cours à préparer + travaux
    const plan = engine.run([
      deadline('d1', 94),
      evaluation('e1', 90),
      lesson('l1', 75),    // conflit: deadline urgente → l1 passe à 55
      work('w1', 65),
    ])
    // Le bundle evaluation+deadline prend la primary
    assert.equal(plan.bundles.length, 1,       'DE20 — 1 bundle')
    assert.equal(plan.summary.bundleCount, 1,  'DE20 — bundleCount 1')
    assert.ok(plan.primaryMission !== null,     'DE20 — primary présente')
    // La mission lead du bundle est la primary
    assert.ok(plan.primaryMission!.metadata['bundle_id'] !== undefined, 'DE20 — lead a bundle_id')
    console.log('✓ DE20 — plan complet : bundle en primary, conflit résolu')
  }

  console.log('\n✅ Tous les tests Decision Engine (ME-12) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
