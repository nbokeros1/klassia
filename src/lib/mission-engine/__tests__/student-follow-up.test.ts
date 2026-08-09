// ── Tests : detectStudentFollowUp (ME-09) ────────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/mission-engine/__tests__/student-follow-up.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { detectStudentFollowUp } from '../detectors/student-follow-up'
import { TeacherBrain }          from '../../teacher-brain/teacher-brain'
import type { MissionDataContext } from '../types'
import type { TeacherSituation, TeacherStudentInsights } from '../../teacher-brain/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW       = new Date('2026-04-01T10:00:00Z')
const CLASSE_ID = 'classe-001'
const MATIERE   = 'Mathématiques'

function makeCtx(overrides: Partial<MissionDataContext> = {}): MissionDataContext {
  return {
    enseignant: { id: 'teacher-001', prenom: 'Sophie', nom: 'Leblanc', province: 'QC', langue: 'fr' },
    classe: { id: CLASSE_ID, nom: '3e sec — A', niveau: 'secondaire', matiere: MATIERE, matieres: [MATIERE] },
    matiere:              MATIERE,
    programmeAnnuel:      null,
    curriculum:           null,
    dernieresLecons:      [],
    dernieresEvaluations: [],
    ressources:           [],
    travaux:              [],
    students:             [],
    attendance:           [],
    studentResults:       [],
    studentWork:          [],
    conversationIA:       [],
    dateCourante:         NOW,
    calendarEvents:       [],
    calendarDeadlines:    [],
    ...overrides,
  }
}

/**
 * Construit une TeacherSituation en injectant directement les students insights.
 * Permet de tester les cas sans passer par StudentInsightAnalyzer.
 */
function makeSituation(studentsOverride: Partial<TeacherStudentInsights> = {}): TeacherSituation {
  const base = new TeacherBrain().buildSituation(makeCtx())

  const defaultStudents: TeacherStudentInsights = {
    totalStudents:            20,
    signalsCount:             0,
    highPrioritySignalsCount: 0,
    attendanceConcernCount:   0,
    performanceConcernCount:  0,
    missingWorkConcernCount:  0,
    averagePerformance:       75,
    recentAttendanceRate:     95,
    priorityStudents:         [],
    confidence:               0.8,
    hasUsableData:            true,
  }

  return {
    ...base,
    students: { ...defaultStudents, ...studentsOverride },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── Cas 0 : pas de données utilisables → [] ──────────────────────────────
  {
    const situation = makeSituation({ hasUsableData: false })
    const missions = await detectStudentFollowUp(situation)
    assert.deepEqual(missions, [], 'Cas 0 — hasUsableData false → []')
    console.log('✓ Cas 0 — hasUsableData false → []')
  }

  // ── Cas 0b : confidence < 0.50 → [] ─────────────────────────────────────
  {
    const situation = makeSituation({ hasUsableData: true, confidence: 0.3 })
    const missions = await detectStudentFollowUp(situation)
    assert.deepEqual(missions, [], 'Cas 0b — confidence < 0.50 → []')
    console.log('✓ Cas 0b — confidence < 0.50 → []')
  }

  // ── Cas 0c : aucun élève → [] ────────────────────────────────────────────
  {
    const situation = makeSituation({ totalStudents: 0, hasUsableData: true })
    const missions = await detectStudentFollowUp(situation)
    assert.deepEqual(missions, [], 'Cas 0c — totalStudents 0 → []')
    console.log('✓ Cas 0c — totalStudents 0 → []')
  }

  // ── Cas 5 : données disponibles, aucun signal → [] ───────────────────────
  {
    const situation = makeSituation({
      signalsCount: 0, highPrioritySignalsCount: 0,
      attendanceConcernCount: 0, performanceConcernCount: 0, missingWorkConcernCount: 0,
    })
    const missions = await detectStudentFollowUp(situation)
    assert.deepEqual(missions, [], 'Cas 5 — aucun signal → []')
    console.log('✓ Cas 5 — données disponibles, aucun signal → []')
  }

  // ── Cas 1 : signaux haute priorité → priorité 92 ─────────────────────────
  {
    const situation = makeSituation({
      highPrioritySignalsCount: 3,
      attendanceConcernCount: 2,
      performanceConcernCount: 1,
    })
    const missions = await detectStudentFollowUp(situation)
    assert.equal(missions.length, 1, 'Cas 1 — 1 mission')
    assert.equal(missions[0].priority, 92, 'Cas 1 — priorité 92')
    assert.equal(missions[0].type, 'student_follow_up', 'Cas 1 — type student_follow_up')
    assert.equal(missions[0].reason.code, 'student_high_priority', 'Cas 1 — code student_high_priority')
    assert.ok(missions[0].id.startsWith('student_follow_up:'), 'Cas 1 — id préfixe correct')
    assert.equal(missions[0].metadata['high_priority_count'], 3, 'Cas 1 — high_priority_count 3')
    console.log('✓ Cas 1 — signaux haute priorité → priorité 92')
  }

  // ── Cas 1 : Cas 1 domine Cas 2/3/4 ─────────────────────────────────────
  {
    const situation = makeSituation({
      highPrioritySignalsCount: 1,
      missingWorkConcernCount:  3,
      attendanceConcernCount:   2,
      performanceConcernCount:  4,
    })
    const missions = await detectStudentFollowUp(situation)
    assert.equal(missions.length, 1, 'Cascade — 1 seule mission (Cas 1 domine)')
    assert.equal(missions[0].priority, 92, 'Cascade — priorité 92 (Cas 1)')
    console.log('✓ Cascade — Cas 1 (92) domine Cas 2/3/4')
  }

  // ── Cas 2 : travaux manquants (sans haute priorité) → priorité 87 ─────────
  {
    const situation = makeSituation({
      highPrioritySignalsCount: 0,
      missingWorkConcernCount:  4,
    })
    const missions = await detectStudentFollowUp(situation)
    assert.equal(missions.length, 1, 'Cas 2 — 1 mission')
    assert.equal(missions[0].priority, 87, 'Cas 2 — priorité 87')
    assert.equal(missions[0].reason.code, 'student_missing_work', 'Cas 2 — code student_missing_work')
    assert.ok(missions[0].id.includes('missing_work'), 'Cas 2 — id contient missing_work')
    assert.equal(missions[0].metadata['missing_work_count'], 4, 'Cas 2 — missing_work_count 4')
    console.log('✓ Cas 2 — travaux manquants → priorité 87')
  }

  // ── Cas 3 : présence (sans haute prio, sans missing work) → priorité 84 ───
  {
    const situation = makeSituation({
      highPrioritySignalsCount: 0,
      missingWorkConcernCount:  0,
      attendanceConcernCount:   5,
    })
    const missions = await detectStudentFollowUp(situation)
    assert.equal(missions.length, 1, 'Cas 3 — 1 mission')
    assert.equal(missions[0].priority, 84, 'Cas 3 — priorité 84')
    assert.equal(missions[0].reason.code, 'student_attendance', 'Cas 3 — code student_attendance')
    assert.ok(missions[0].id.includes('attendance'), 'Cas 3 — id contient attendance')
    console.log('✓ Cas 3 — absences répétées → priorité 84')
  }

  // ── Cas 4 : performance (sans haute prio, sans missing, sans présence) → 83
  {
    const situation = makeSituation({
      highPrioritySignalsCount: 0,
      missingWorkConcernCount:  0,
      attendanceConcernCount:   0,
      performanceConcernCount:  3,
    })
    const missions = await detectStudentFollowUp(situation)
    assert.equal(missions.length, 1, 'Cas 4 — 1 mission')
    assert.equal(missions[0].priority, 83, 'Cas 4 — priorité 83')
    assert.equal(missions[0].reason.code, 'student_performance', 'Cas 4 — code student_performance')
    assert.ok(missions[0].id.includes('performance'), 'Cas 4 — id contient performance')
    console.log('✓ Cas 4 — performance faible → priorité 83')
  }

  // ── Ordre cascade : 92 > 87 > 84 > 83 ────────────────────────────────────
  {
    const priorities = [92, 87, 84, 83]
    for (let i = 0; i < priorities.length - 1; i++) {
      assert.ok(priorities[i] > priorities[i + 1], `Cascade — ${priorities[i]} > ${priorities[i + 1]}`)
    }
    console.log('✓ Cascade — priorités 92 > 87 > 84 > 83')
  }

  // ── Metadata : priorité student_ids ne contient pas de noms ──────────────
  {
    const situation = makeSituation({
      highPrioritySignalsCount: 0,
      missingWorkConcernCount:  2,
      priorityStudents: [
        { studentId: 'uuid-s1', displayName: 'Jean Dupont', reasons: [{ type: 'missing_work', severity: 'medium', description: '2 travaux non remis', confidence: 0.9 }] },
      ],
    })
    const missions = await detectStudentFollowUp(situation)
    assert.equal(missions.length, 1, 'Privé — 1 mission')
    const meta = missions[0].metadata
    const ids = meta['priority_student_ids'] as string[]
    assert.ok(Array.isArray(ids), 'Privé — priority_student_ids est un tableau')
    assert.ok(ids.every(id => typeof id === 'string'), 'Privé — que des IDs (pas de noms)')
    // Le title/description contient le nom de la classe, pas des noms d'élèves
    assert.ok(!missions[0].title.includes('Jean'), 'Privé — titre sans nom d\'élève')
    assert.ok(!missions[0].description.includes('Jean'), 'Privé — description sans nom d\'élève')
    console.log('✓ Privé — noms d\'élèves absents du titre/description')
  }

  // ── Sans classe → [] ─────────────────────────────────────────────────────
  {
    const base = new TeacherBrain().buildSituation(makeCtx({ classe: null }))
    const situation: TeacherSituation = {
      ...base,
      students: {
        totalStudents: 20, signalsCount: 5, highPrioritySignalsCount: 2,
        attendanceConcernCount: 2, performanceConcernCount: 1, missingWorkConcernCount: 2,
        averagePerformance: 68, recentAttendanceRate: 90,
        priorityStudents: [], confidence: 0.8, hasUsableData: true,
      },
    }
    const missions = await detectStudentFollowUp(situation)
    assert.deepEqual(missions, [], 'Sans classe → []')
    console.log('✓ Sans classe → []')
  }

  console.log('\n✅ Tous les tests detectStudentFollowUp passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
