// ── Tests : StudentInsightAnalyzer (ME-09) ───────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/pedagogy/students/__tests__/student-insight-analyzer.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { StudentInsightAnalyzer } from '../student-insight-analyzer'
import type {
  StudentSnapshot,
  StudentAttendanceSnapshot,
  StudentResultSnapshot,
  StudentWorkSnapshot,
} from '../types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-03-15T10:00:00Z')
const CLASSE_ID = 'classe-001'

function makeStudent(id: string): StudentSnapshot {
  return {
    id,
    firstName:   'Élève',
    lastName:    id,
    displayName: `Élève ${id}`,
    classeId:    CLASSE_ID,
    active:      true,
  }
}

function makeAbsence(studentId: string, daysAgo: number): StudentAttendanceSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { studentId, date: d, status: 'absent' }
}

function makeLateness(studentId: string, daysAgo: number): StudentAttendanceSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { studentId, date: d, status: 'late' }
}

function makeResult(studentId: string, percentage: number, evalId: string, daysAgo = 10): StudentResultSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return {
    studentId,
    evaluationId: evalId,
    score:        percentage,
    maxScore:     100,
    percentage,
    submittedAt:  d,
    gradedAt:     d,
  }
}

function makeWorkMissing(studentId: string, assignmentId: string): StudentWorkSnapshot {
  return {
    studentId,
    assignmentId,
    status:      'missing',
    dueDate:     new Date(NOW),
    submittedAt: null,
    gradedAt:    null,
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

async function main() {

  // ── T01 : aucun élève → summary vide ─────────────────────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const summary = analyzer.analyze([], [], [], [], NOW)
    assert.equal(summary.totalStudents, 0, 'T01 — totalStudents 0')
    assert.equal(summary.hasUsableData, false, 'T01 — hasUsableData false')
    assert.equal(summary.signalsCount, 0, 'T01 — signalsCount 0')
    assert.deepEqual(summary.analyses, [], 'T01 — analyses vide')
    console.log('✓ T01 — aucun élève → summary vide')
  }

  // ── T02 : élèves sans données (hasUsableData = false) ────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const summary = analyzer.analyze([makeStudent('s1'), makeStudent('s2')], [], [], [], NOW)
    assert.equal(summary.totalStudents, 2, 'T02 — totalStudents 2')
    assert.equal(summary.hasUsableData, false, 'T02 — hasUsableData false (pas de données)')
    assert.equal(summary.signalsCount, 0, 'T02 — aucun signal sans données')
    assert.deepEqual(summary.analyses, [], 'T02 — pas d\'analyses sans données')
    console.log('✓ T02 — élèves sans données → hasUsableData false')
  }

  // ── T03 : absence répétée → signal repeated_absence ──────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const students = [makeStudent('s1')]
    const attendance: StudentAttendanceSnapshot[] = [
      makeAbsence('s1', 5),
      makeAbsence('s1', 10),
      makeAbsence('s1', 15),  // 3 absences → seuil atteint
    ]
    const summary = analyzer.analyze(students, attendance, [], [], NOW)
    assert.equal(summary.hasUsableData, true, 'T03 — hasUsableData true')
    assert.equal(summary.attendanceConcernCount, 1, 'T03 — 1 élève avec concern présence')
    const analysis = summary.analyses[0]
    assert.ok(analysis, 'T03 — analyse présente pour s1')
    const signal = analysis.signals.find(s => s.type === 'repeated_absence')
    assert.ok(signal, 'T03 — signal repeated_absence détecté')
    assert.ok(signal!.description.includes('3'), 'T03 — description mentionne le nombre')
    console.log('✓ T03 — absence répétée → signal repeated_absence')
  }

  // ── T04 : 2 absences (sous le seuil de 3) → pas de signal ───────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const attendance: StudentAttendanceSnapshot[] = [
      makeAbsence('s1', 5),
      makeAbsence('s1', 10),  // 2 absences → sous le seuil
    ]
    const summary = analyzer.analyze([makeStudent('s1')], attendance, [], [], NOW)
    assert.equal(summary.attendanceConcernCount, 0, 'T04 — 0 concern (2 < seuil 3)')
    assert.equal(summary.analyses.length, 0, 'T04 — pas d\'analyse générée')
    console.log('✓ T04 — 2 absences (sous seuil) → pas de signal')
  }

  // ── T05 : retards répétés → signal repeated_lateness ─────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const attendance: StudentAttendanceSnapshot[] = [
      makeLateness('s1', 3),
      makeLateness('s1', 7),
      makeLateness('s1', 12),
    ]
    const summary = analyzer.analyze([makeStudent('s1')], attendance, [], [], NOW)
    const signal = summary.analyses[0]?.signals.find(s => s.type === 'repeated_lateness')
    assert.ok(signal, 'T05 — signal repeated_lateness détecté')
    console.log('✓ T05 — retards répétés → signal repeated_lateness')
  }

  // ── T06 : performance faible → signal low_performance ────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const results: StudentResultSnapshot[] = [
      makeResult('s1', 45, 'ev1', 20),
      makeResult('s1', 50, 'ev2', 10),  // moy 47.5 < seuil 60
    ]
    const summary = analyzer.analyze([makeStudent('s1')], [], results, [], NOW)
    assert.equal(summary.performanceConcernCount, 1, 'T06 — 1 concern performance')
    const signal = summary.analyses[0]?.signals.find(s => s.type === 'low_performance')
    assert.ok(signal, 'T06 — signal low_performance détecté')
    assert.ok(signal!.description.includes('%'), 'T06 — description contient le pourcentage')
    console.log('✓ T06 — performance faible → signal low_performance')
  }

  // ── T07 : 1 seul résultat (sous minimum) → pas de signal perf ────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const results: StudentResultSnapshot[] = [
      makeResult('s1', 30, 'ev1', 10),  // 1 seul résultat, minimum = 2
    ]
    const summary = analyzer.analyze([makeStudent('s1')], [], results, [], NOW)
    assert.equal(summary.performanceConcernCount, 0, 'T07 — 0 concern (1 < min 2 résultats)')
    console.log('✓ T07 — 1 résultat (sous minimum) → pas de signal perf')
  }

  // ── T08 : performance en déclin → signal declining_performance ───────────
  {
    const analyzer = new StudentInsightAnalyzer()
    // 4 résultats : anciens 80/80, récents 50/55 → déclin ≈ 28pts (high)
    const results: StudentResultSnapshot[] = [
      makeResult('s1', 80, 'ev1', 40),
      makeResult('s1', 80, 'ev2', 35),
      makeResult('s1', 55, 'ev3', 5),
      makeResult('s1', 50, 'ev4', 2),
    ]
    const summary = analyzer.analyze([makeStudent('s1')], [], results, [], NOW)
    const signal = summary.analyses[0]?.signals.find(s => s.type === 'declining_performance')
    assert.ok(signal, 'T08 — signal declining_performance détecté')
    assert.ok(['medium', 'high'].includes(signal!.severity), 'T08 — sévérité medium ou high (déclin ≈ 28pts)')
    console.log('✓ T08 — performance en déclin → signal declining_performance')
  }

  // ── T09 : travaux manquants → signal missing_work ─────────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const work: StudentWorkSnapshot[] = [
      makeWorkMissing('s1', 'a1'),
      makeWorkMissing('s1', 'a2'),  // 2 manquants → seuil atteint
    ]
    const summary = analyzer.analyze([makeStudent('s1')], [], [], work, NOW)
    assert.equal(summary.missingWorkConcernCount, 1, 'T09 — 1 concern travaux manquants')
    const signal = summary.analyses[0]?.signals.find(s => s.type === 'missing_work')
    assert.ok(signal, 'T09 — signal missing_work détecté')
    console.log('✓ T09 — travaux manquants → signal missing_work')
  }

  // ── T10 : 1 travail manquant (sous seuil de 2) → pas de signal ───────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const work: StudentWorkSnapshot[] = [makeWorkMissing('s1', 'a1')]
    const summary = analyzer.analyze([makeStudent('s1')], [], [], work, NOW)
    assert.equal(summary.missingWorkConcernCount, 0, 'T10 — 0 concern (1 < seuil 2)')
    console.log('✓ T10 — 1 travail manquant (sous seuil) → pas de signal')
  }

  // ── T11 : multiple élèves — agrégats corrects ──────────────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const students = [makeStudent('s1'), makeStudent('s2'), makeStudent('s3')]
    const attendance: StudentAttendanceSnapshot[] = [
      makeAbsence('s1', 5), makeAbsence('s1', 10), makeAbsence('s1', 15),
    ]
    const results: StudentResultSnapshot[] = [
      makeResult('s2', 40, 'ev1', 20),
      makeResult('s2', 45, 'ev2', 10),
    ]
    const work: StudentWorkSnapshot[] = [
      makeWorkMissing('s3', 'a1'),
      makeWorkMissing('s3', 'a2'),
    ]
    const summary = analyzer.analyze(students, attendance, results, work, NOW)
    assert.equal(summary.totalStudents, 3, 'T11 — 3 élèves total')
    assert.equal(summary.attendanceConcernCount, 1, 'T11 — 1 concern présence (s1)')
    assert.equal(summary.performanceConcernCount, 1, 'T11 — 1 concern performance (s2)')
    assert.equal(summary.missingWorkConcernCount, 1, 'T11 — 1 concern travaux (s3)')
    assert.equal(summary.analyses.length, 3, 'T11 — 3 analyses (1 par élève avec signal)')
    console.log('✓ T11 — multiple élèves, agrégats corrects')
  }

  // ── T12 : absences hors fenêtre ignorées ──────────────────────────────────
  {
    const analyzer = new StudentInsightAnalyzer()
    const attendance: StudentAttendanceSnapshot[] = [
      makeAbsence('s1', 35),   // hors fenêtre (> 30 jours)
      makeAbsence('s1', 40),
      makeAbsence('s1', 45),
    ]
    const summary = analyzer.analyze([makeStudent('s1')], attendance, [], [], NOW)
    assert.equal(summary.attendanceConcernCount, 0, 'T12 — absences hors fenêtre ignorées')
    console.log('✓ T12 — absences hors fenêtre (> 30 j) ignorées')
  }

  // ── T13 : config personnalisable ──────────────────────────────────────────
  {
    // Seuil d'absences à 2 (au lieu de 3 par défaut)
    const analyzer = new StudentInsightAnalyzer({ repeatedAbsenceThreshold: 2 })
    const attendance: StudentAttendanceSnapshot[] = [
      makeAbsence('s1', 5),
      makeAbsence('s1', 10),  // 2 absences → atteint le seuil personnalisé
    ]
    const summary = analyzer.analyze([makeStudent('s1')], attendance, [], [], NOW)
    assert.equal(summary.attendanceConcernCount, 1, 'T13 — seuil personnalisé (2) respecté')
    console.log('✓ T13 — config personnalisable (seuil absences = 2)')
  }

  console.log('\n✅ Tous les tests StudentInsightAnalyzer passent.')
}

main().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
