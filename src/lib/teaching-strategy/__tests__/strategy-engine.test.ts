// ── Tests : Teaching Strategy Engine (ME-10) ─────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/teaching-strategy/__tests__/strategy-engine.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { TeachingStrategyEngine, applyStrategyWeights } from '../strategy-engine'
import { ProgressStrategyBuilder } from '../builders/progress-strategy'
import { WorkloadStrategyBuilder } from '../builders/workload-strategy'
import { StudentStrategyBuilder }  from '../builders/student-strategy'
import { TEACHING_MODE_PRIORITY, MODE_PRIORITY_ADJUSTMENTS } from '../types'
import { TeacherBrain } from '../../teacher-brain/teacher-brain'
import type { MissionDataContext, DocumentSnapshot, Mission } from '../../mission-engine/types'
import type { TeacherSituation } from '../../teacher-brain/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW           = new Date('2026-04-15T10:00:00Z')
const ENSEIGNANT_ID = 'teacher-001'
const CLASSE_ID     = 'classe-001'

function makeCtx(overrides: Partial<MissionDataContext> = {}): MissionDataContext {
  return {
    enseignant: { id: ENSEIGNANT_ID, prenom: 'Alice', nom: 'Martin', province: 'QC', langue: 'fr' },
    classe: { id: CLASSE_ID, nom: '4e sec — A', niveau: 'secondaire', matiere: 'Sciences', matieres: ['Sciences'] },
    matiere: 'Sciences',
    programmeAnnuel: null, curriculum: null,
    dernieresLecons: [], dernieresEvaluations: [],
    ressources: [], travaux: [],
    students: [], attendance: [], studentResults: [], studentWork: [],
    conversationIA: [], dateCourante: NOW,
    calendarEvents: [], calendarDeadlines: [],
    ...overrides,
  }
}

function makeDoc(id: string, nom: string, daysAgo = 0): DocumentSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { id, nom, type_fichier: 'application/pdf', texteExtrait: null, createdAt: d, dossierType: 'lecon' }
}

function makeProgramme(units: string[], lessonNoms: string[] = []): DocumentSnapshot {
  return {
    id: 'prog-001',
    nom: 'Programme annuel',
    type_fichier: 'text/plain',
    texteExtrait: units.join('\n'),
    createdAt: new Date('2025-09-01'),
    dossierType: 'plan_annuel',
  }
}

function makeAssignment(id: string, isGraded: boolean, daysOverdue = 0): DocumentSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - (daysOverdue + 5))
  const meta: Record<string, unknown> = { isGraded }
  if (daysOverdue > 0) {
    const due = new Date(NOW)
    due.setDate(due.getDate() - daysOverdue)
    meta['dueDate'] = due.toISOString()
  }
  return { id, nom: `Travail ${id}`, type_fichier: 'application/pdf', texteExtrait: null, createdAt: d, dossierType: 'travaux', metadata: meta }
}

function situate(overrides: Partial<MissionDataContext> = {}): TeacherSituation {
  return new TeacherBrain().buildSituation(makeCtx(overrides))
}

function makeMission(type: Mission['type'], priority: number): Mission {
  return {
    id:          `${type}:test`,
    type,
    title:       `Mission ${type}`,
    description: '',
    priority,
    status:      'proposed',
    reason:      { code: 'test', label: 'Test', description: '' },
    createdAt:   NOW,
    metadata:    {},
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── T01 : contexte vide → NORMAL_PROGRESS ────────────────────────────────
  {
    const engine   = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate())
    assert.equal(strategy.mode, 'NORMAL_PROGRESS', 'T01 — contexte vide → NORMAL_PROGRESS')
    assert.equal(strategy.priority, 50, 'T01 — priority 50')
    assert.deepEqual(strategy.modeWeights, {}, 'T01 — modeWeights vide')
    console.log('✓ T01 — contexte vide → NORMAL_PROGRESS')
  }

  // ── T02 : travaux en retard → REDUCE_BACKLOG ──────────────────────────────
  {
    const engine = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate({
      travaux: [makeAssignment('t1', false, 5), makeAssignment('t2', false, 3)],
    }))
    assert.equal(strategy.mode, 'REDUCE_BACKLOG', 'T02 — retards → REDUCE_BACKLOG')
    assert.equal(strategy.priority, 80, 'T02 — priority 80')
    console.log('✓ T02 — travaux en retard → REDUCE_BACKLOG')
  }

  // ── T03 : ≥ 3 travaux en attente → REDUCE_BACKLOG ────────────────────────
  {
    const engine = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate({
      travaux: [
        makeAssignment('t1', false, 0),
        makeAssignment('t2', false, 0),
        makeAssignment('t3', false, 0),
      ],
    }))
    assert.equal(strategy.mode, 'REDUCE_BACKLOG', 'T03 — 3 pending → REDUCE_BACKLOG')
    console.log('✓ T03 — 3 travaux en attente → REDUCE_BACKLOG')
  }

  // ── T04 : ≥ 5 leçons depuis dernière éval → ASSESSMENT_PHASE ─────────────
  {
    const engine = new TeachingStrategyEngine()
    // 5 leçons, aucune évaluation → lessonsAfterLastEval = 5
    const strategy = engine.buildStrategy(situate({
      programmeAnnuel: makeProgramme(['Unité A', 'Unité B', 'Unité C']),
      dernieresLecons: [
        makeDoc('l1', 'Leçon 1', 50),
        makeDoc('l2', 'Leçon 2', 40),
        makeDoc('l3', 'Leçon 3', 30),
        makeDoc('l4', 'Leçon 4', 20),
        makeDoc('l5', 'Leçon 5', 10),
      ],
    }))
    assert.equal(strategy.mode, 'ASSESSMENT_PHASE', 'T04 — 5 leçons → ASSESSMENT_PHASE')
    assert.equal(strategy.priority, 70, 'T04 — priority 70')
    console.log('✓ T04 — 5 leçons sans éval → ASSESSMENT_PHASE')
  }

  // ── T05 : END_OF_UNIT (unité couverte, évaluation existante) ─────────────
  {
    const engine = new TeachingStrategyEngine()
    const evalDoc = { ...makeDoc('ev1', 'Évaluation précédente', 40), dossierType: 'evaluation' }
    const strategy = engine.buildStrategy(situate({
      programmeAnnuel: makeProgramme(['Unité A\nSous-thème 1', 'Unité B']),
      dernieresLecons: [makeDoc('l1', 'Unité A', 20), makeDoc('l2', 'Sous-thème 1', 15)],
      dernieresEvaluations: [evalDoc],
    }))
    assert.equal(strategy.mode, 'END_OF_UNIT', 'T05 — unité couverte + éval existante → END_OF_UNIT')
    assert.equal(strategy.priority, 65, 'T05 — priority 65')
    console.log('✓ T05 — unité couverte non évaluée → END_OF_UNIT')
  }

  // ── T06 : REMEDIATION (signal haute priorité élèves) ──────────────────────
  {
    const engine = new TeachingStrategyEngine()
    const baseSituation = situate()
    const withStudents: TeacherSituation = {
      ...baseSituation,
      students: {
        ...baseSituation.students,
        totalStudents:            20,
        hasUsableData:            true,
        highPrioritySignalsCount: 3,
        signalsCount:             5,
        confidence:               0.8,
      },
    }
    const strategy = engine.buildStrategy(withStudents)
    assert.equal(strategy.mode, 'REMEDIATION', 'T06 — signaux haute prio → REMEDIATION')
    assert.equal(strategy.priority, 90, 'T06 — priority 90')
    console.log('✓ T06 — signaux haute priorité → REMEDIATION')
  }

  // ── T07 : REMEDIATION (≥ 3 concerns performance) ─────────────────────────
  {
    const engine = new TeachingStrategyEngine()
    const base = situate()
    const withStudents: TeacherSituation = {
      ...base,
      students: {
        ...base.students,
        totalStudents:            25,
        hasUsableData:            true,
        highPrioritySignalsCount: 0,
        performanceConcernCount:  4,
        confidence:               0.7,
      },
    }
    const strategy = engine.buildStrategy(withStudents)
    assert.equal(strategy.mode, 'REMEDIATION', 'T07 — 4 perf concerns → REMEDIATION')
    console.log('✓ T07 — 4 élèves en difficulté → REMEDIATION')
  }

  // ── T08 : REMEDIATION domine REDUCE_BACKLOG ───────────────────────────────
  {
    assert.ok(
      TEACHING_MODE_PRIORITY['REMEDIATION'] > TEACHING_MODE_PRIORITY['REDUCE_BACKLOG'],
      'T08 — REMEDIATION (6) > REDUCE_BACKLOG (5)',
    )
    console.log('✓ T08 — hiérarchie REMEDIATION > REDUCE_BACKLOG')
  }

  // ── T09 : REDUCE_BACKLOG domine END_OF_UNIT ───────────────────────────────
  {
    assert.ok(
      TEACHING_MODE_PRIORITY['REDUCE_BACKLOG'] > TEACHING_MODE_PRIORITY['END_OF_UNIT'],
      'T09 — REDUCE_BACKLOG (5) > END_OF_UNIT (4)',
    )
    console.log('✓ T09 — hiérarchie REDUCE_BACKLOG > END_OF_UNIT')
  }

  // ── T10 : pondération REDUCE_BACKLOG — work+15, next_lesson-15 ───────────
  {
    const missions: Mission[] = [
      makeMission('work',        70),
      makeMission('next_lesson', 90),
      makeMission('evaluation',  80),
    ]
    const engine = new TeachingStrategyEngine()
    const base = situate({ travaux: [makeAssignment('t1', false, 5)] })
    const strategy = engine.buildStrategy(base)
    assert.equal(strategy.mode, 'REDUCE_BACKLOG', 'T10 — mode REDUCE_BACKLOG')
    const weighted = applyStrategyWeights(missions, strategy)
    const work     = weighted.find(m => m.type === 'work')!
    const lesson   = weighted.find(m => m.type === 'next_lesson')!
    const eval_    = weighted.find(m => m.type === 'evaluation')!
    assert.equal(work.priority,   85, 'T10 — work 70+15=85')
    assert.equal(lesson.priority, 75, 'T10 — next_lesson 90-15=75')
    assert.equal(eval_.priority,  80, 'T10 — evaluation inchangée')
    console.log('✓ T10 — REDUCE_BACKLOG : work+15, next_lesson-15')
  }

  // ── T11 : pondération ASSESSMENT_PHASE — evaluation+20 ───────────────────
  {
    const weights = MODE_PRIORITY_ADJUSTMENTS['ASSESSMENT_PHASE']
    assert.equal(weights['evaluation'], 20, 'T11 — evaluation +20 dans ASSESSMENT_PHASE')

    const missions: Mission[] = [makeMission('evaluation', 60)]
    const strategy = {
      mode: 'ASSESSMENT_PHASE' as const,
      priority: 70, confidence: 0.7, reasons: [], recommendedActions: [],
      modeWeights: weights,
    }
    const weighted = applyStrategyWeights(missions, strategy)
    assert.equal(weighted[0].priority, 80, 'T11 — evaluation 60+20=80')
    console.log('✓ T11 — ASSESSMENT_PHASE : evaluation+20')
  }

  // ── T12 : NORMAL_PROGRESS — aucun ajustement ──────────────────────────────
  {
    const weights = MODE_PRIORITY_ADJUSTMENTS['NORMAL_PROGRESS']
    assert.deepEqual(weights, {}, 'T12 — NORMAL_PROGRESS poids vide')

    const missions: Mission[] = [
      makeMission('next_lesson', 90),
      makeMission('evaluation',  80),
      makeMission('work',        70),
    ]
    const strategy = {
      mode: 'NORMAL_PROGRESS' as const,
      priority: 50, confidence: 0.5, reasons: [], recommendedActions: [],
      modeWeights: weights,
    }
    const weighted = applyStrategyWeights(missions, strategy)
    assert.equal(weighted[0].priority, 90, 'T12 — next_lesson inchangée')
    assert.equal(weighted[1].priority, 80, 'T12 — evaluation inchangée')
    assert.equal(weighted[2].priority, 70, 'T12 — work inchangée')
    console.log('✓ T12 — NORMAL_PROGRESS : aucun changement de priorité')
  }

  // ── T13 : priorité clampée à [0, 100] ────────────────────────────────────
  {
    const missions: Mission[] = [
      makeMission('next_lesson', 10),   // 10 - 15 = -5 → clampé à 0
      makeMission('evaluation',  95),   // 95 + 20 = 115 → clampé à 100
    ]
    const strategy = {
      mode: 'NORMAL_PROGRESS' as const,
      priority: 50, confidence: 0.5, reasons: [], recommendedActions: [],
      modeWeights: { next_lesson: -15, evaluation: +20 } as Record<string, number>,
    }
    const weighted = applyStrategyWeights(missions, strategy)
    const lesson = weighted.find(m => m.type === 'next_lesson')!
    const eval_  = weighted.find(m => m.type === 'evaluation')!
    assert.equal(lesson.priority, 0,   'T13 — priorité minimum 0')
    assert.equal(eval_.priority,  100, 'T13 — priorité maximum 100')
    console.log('✓ T13 — priorité clampée à [0, 100]')
  }

  // ── T14 : structure TeachingStrategy complète ─────────────────────────────
  {
    const engine   = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate())
    assert.ok('mode'               in strategy, 'T14 — mode présent')
    assert.ok('priority'           in strategy, 'T14 — priority présent')
    assert.ok('confidence'         in strategy, 'T14 — confidence présent')
    assert.ok('reasons'            in strategy, 'T14 — reasons présent')
    assert.ok('recommendedActions' in strategy, 'T14 — recommendedActions présent')
    assert.ok('modeWeights'        in strategy, 'T14 — modeWeights présent')
    assert.ok(Array.isArray(strategy.reasons), 'T14 — reasons est un tableau')
    assert.ok(Array.isArray(strategy.recommendedActions), 'T14 — recommendedActions est un tableau')
    console.log('✓ T14 — structure TeachingStrategy complète')
  }

  // ── T15 : reasons — signaux multiples préservés ───────────────────────────
  {
    const engine = new TeachingStrategyEngine()
    // Déclencher workload + progress signals simultanément
    const strategy = engine.buildStrategy(situate({
      travaux: [makeAssignment('t1', false, 5)],
      programmeAnnuel: makeProgramme(['Unité A', 'Unité B', 'Unité C']),
      dernieresLecons: [
        makeDoc('l1', 'L1', 50), makeDoc('l2', 'L2', 40),
        makeDoc('l3', 'L3', 30), makeDoc('l4', 'L4', 20),
        makeDoc('l5', 'L5', 10),
      ],
    }))
    // REDUCE_BACKLOG (prio 5) > ASSESSMENT_PHASE (prio 3) → mode = REDUCE_BACKLOG
    assert.equal(strategy.mode, 'REDUCE_BACKLOG', 'T15 — REDUCE_BACKLOG domine')
    // Les deux reasons sont présentes
    assert.ok(strategy.reasons.length >= 2, 'T15 — multiple reasons préservées')
    const sources = strategy.reasons.map(r => r.source)
    assert.ok(sources.includes('workload'),  'T15 — reason workload présente')
    assert.ok(sources.includes('progress'),  'T15 — reason progress présente')
    console.log('✓ T15 — signaux multiples : reasons préservées, mode dominant sélectionné')
  }

  // ── T16 : ProgressStrategyBuilder — isolation ────────────────────────────
  {
    const builder = new ProgressStrategyBuilder()

    // Sans données → null
    const noData = { hasProgramme: false, progressPercent: null, unevaluatedUnits: [], totalEvaluations: 0, lessonsAfterLastEval: 0 }
    assert.equal(builder.analyze(noData as unknown as Parameters<typeof builder.analyze>[0]), null, 'PB — null sans données')

    // ACCELERATE_PROGRESS
    const highProgress = { hasProgramme: true, progressPercent: 85, unevaluatedUnits: [], totalEvaluations: 2, lessonsAfterLastEval: 1 }
    const signal = builder.analyze(highProgress as unknown as Parameters<typeof builder.analyze>[0])
    assert.equal(signal?.mode, 'ACCELERATE_PROGRESS', 'PB — ACCELERATE_PROGRESS à 85%')
    console.log('✓ T16 — ProgressStrategyBuilder isolation')
  }

  // ── T17 : WorkloadStrategyBuilder — isolation ─────────────────────────────
  {
    const builder = new WorkloadStrategyBuilder()

    // Pas de travaux → null
    const noWork = { overdueWork: 0, pendingWork: 0 }
    assert.equal(builder.analyze(noWork as unknown as Parameters<typeof builder.analyze>[0]), null, 'WB — null sans travaux')

    // Overdue → REDUCE_BACKLOG
    const overdue = { overdueWork: 2, pendingWork: 0 }
    const signal = builder.analyze(overdue as unknown as Parameters<typeof builder.analyze>[0])
    assert.equal(signal?.mode, 'REDUCE_BACKLOG', 'WB — REDUCE_BACKLOG (overdue)')
    console.log('✓ T17 — WorkloadStrategyBuilder isolation')
  }

  // ── T18 : StudentStrategyBuilder — no data → null ─────────────────────────
  {
    const builder = new StudentStrategyBuilder()
    const noData = { hasUsableData: false, totalStudents: 20, highPrioritySignalsCount: 5, performanceConcernCount: 5 }
    const signal = builder.analyze(noData as unknown as Parameters<typeof builder.analyze>[0])
    assert.equal(signal, null, 'T18 — hasUsableData false → null')
    console.log('✓ T18 — StudentStrategyBuilder : hasUsableData false → null')
  }

  console.log('\n✅ Tous les tests Teaching Strategy Engine passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
