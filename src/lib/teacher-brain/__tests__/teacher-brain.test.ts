// ── Tests : Teacher Brain + Builders + Détecteurs (ME-08/ME-09) ──────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/teacher-brain/__tests__/teacher-brain.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { TeacherBrain, CONFIDENCE_THRESHOLD_SUGGEST } from '../teacher-brain'
import { ProgressBuilder }  from '../builders/progress-builder'
import { WorkloadBuilder }  from '../builders/workload-builder'
import { ClassroomBuilder } from '../builders/classroom-builder'
import { StudentBuilder }   from '../builders/student-builder'
import { detectNextLesson } from '../../mission-engine/detectors/next-lesson'
import { detectEvaluation } from '../../mission-engine/detectors/evaluation'
import { detectWork }       from '../../mission-engine/detectors/work'
import type { MissionDataContext, DocumentSnapshot } from '../../mission-engine/types'
import type { TeacherSituation } from '../types'
import type { ClassStudentSummary } from '../../pedagogy/students/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = new Date('2026-03-01T10:00:00Z')
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
    conversationIA: [],
    dateCourante: NOW,
    calendarEvents: [], calendarDeadlines: [],
    ...overrides,
  }
}

function makeDoc(id: string, nom: string, daysAgo = 0, type_fichier = 'application/pdf'): DocumentSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { id, nom, type_fichier, texteExtrait: null, createdAt: d, dossierType: 'lecon' }
}

function makeProgramme(content?: string): DocumentSnapshot {
  return {
    id: 'prog-001',
    nom: 'Programme annuel Sciences',
    type_fichier: 'text/plain',
    texteExtrait: content ?? `Unité 1 — Forces et mouvement\nCinématique\nDynamique\n\nUnité 2 — Énergie\nChaleur\nLumière`,
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

// ── Fixture ClassStudentSummary ───────────────────────────────────────────────

function makeEmptySummary(): ClassStudentSummary {
  return {
    analyses: [], totalStudents: 0, signalsCount: 0,
    highPrioritySignalsCount: 0, attendanceConcernCount: 0,
    performanceConcernCount: 0, missingWorkConcernCount: 0,
    averagePerformance: null, recentAttendanceRate: null,
    hasUsableData: false,
  }
}

function makeStudentsWithSignals(opts: {
  totalStudents?: number
  highPriority?: number
  attendance?: number
  performance?: number
  missingWork?: number
}): ClassStudentSummary {
  const attendanceConcernCount  = opts.attendance  ?? 0
  const performanceConcernCount = opts.performance ?? 0
  const missingWorkConcernCount = opts.missingWork ?? 0
  const highPrioritySignalsCount = opts.highPriority ?? 0
  const signalsCount = attendanceConcernCount + performanceConcernCount + missingWorkConcernCount

  return {
    analyses: [],
    totalStudents:            opts.totalStudents ?? 20,
    signalsCount,
    highPrioritySignalsCount,
    attendanceConcernCount,
    performanceConcernCount,
    missingWorkConcernCount,
    averagePerformance:       75,
    recentAttendanceRate:     92,
    hasUsableData:            true,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── TeacherBrain : contexte vide ────────────────────────────────────────────
  {
    const s = situate()
    assert.equal(s.confidence, 0.3, 'TB — confidence 0.3 sans données')
    assert.equal(s.progress.hasProgramme, false, 'TB — hasProgramme false')
    assert.equal(s.classroom.lessonsCount, 0, 'TB — lessonsCount 0')
    assert.equal(s.workload.pendingWork, 0, 'TB — pendingWork 0')
    console.log('✓ TeacherBrain — contexte vide')
  }

  // ── TeacherBrain : confidence scale ─────────────────────────────────────────
  {
    const s0 = situate()
    assert.equal(s0.confidence, 0.3, 'TB — conf 0.3 (rien)')

    const s1 = situate({ dernieresLecons: [makeDoc('l1', 'Cours 1')] })
    assert.equal(s1.confidence, 0.4, 'TB — conf 0.4 (leçons sans programme)')

    const s2 = situate({ programmeAnnuel: makeProgramme() })
    assert.equal(s2.confidence, 0.6, 'TB — conf 0.6 (programme seul)')

    const s3 = situate({ programmeAnnuel: makeProgramme(), dernieresLecons: [makeDoc('l1', 'Cours 1')] })
    assert.equal(s3.confidence, 0.7, 'TB — conf 0.7 (programme + 1 leçon)')

    const s4 = situate({ programmeAnnuel: makeProgramme(), dernieresLecons: [makeDoc('l1', 'Cours 1'), makeDoc('l2', 'Cours 2')] })
    assert.equal(s4.confidence, 0.9, 'TB — conf 0.9 (programme + 2+ leçons)')
    console.log('✓ TeacherBrain — confidence scale 0.3 → 0.9')
  }

  // ── TeacherBrain : references remplace raw (ME-09) ──────────────────────────
  {
    const prog = makeProgramme()
    const lecon = makeDoc('l1', 'Leçon 1', 2)
    const s = situate({ programmeAnnuel: prog, dernieresLecons: [lecon] })

    // raw n'existe plus
    assert.ok(!('raw' in s), 'TB — `raw` absent de TeacherSituation (ME-09)')

    // references contient les IDs
    assert.equal(s.references.programmeAnnuelId, 'prog-001', 'TB — references.programmeAnnuelId correct')
    assert.equal(s.references.latestLessonId,    'l1',       'TB — references.latestLessonId correct')
    assert.equal(s.references.latestLessonName,  'Leçon 1',  'TB — references.latestLessonName correct')
    assert.equal(s.references.latestEvaluationId, null,       'TB — references.latestEvaluationId null (aucune éval)')
    console.log('✓ TeacherBrain — references (ME-09) correctes')
  }

  // ── TeacherBrain : references — évaluation ───────────────────────────────────
  {
    const evalDoc = { ...makeDoc('ev1', 'Éval Unité 1', 5), dossierType: 'evaluation' }
    const s = situate({ programmeAnnuel: makeProgramme(), dernieresEvaluations: [evalDoc] })
    assert.equal(s.references.latestEvaluationId,   'ev1',         'TB — latestEvaluationId correct')
    assert.equal(s.references.latestEvaluationName, 'Éval Unité 1', 'TB — latestEvaluationName correct')
    console.log('✓ TeacherBrain — references évaluation correctes')
  }

  // ── TeacherBrain : students par défaut (hasUsableData = false) ──────────────
  {
    const s = situate()
    assert.equal(s.students.hasUsableData, false, 'TB — students.hasUsableData false sans données')
    assert.equal(s.students.totalStudents, 0,     'TB — students.totalStudents 0')
    assert.equal(s.students.signalsCount,  0,     'TB — students.signalsCount 0')
    assert.ok(Array.isArray(s.students.priorityStudents), 'TB — priorityStudents est un tableau')
    assert.equal(s.students.priorityStudents.length, 0,   'TB — priorityStudents vide')
    console.log('✓ TeacherBrain — students par défaut (hasUsableData = false)')
  }

  // ── ProgressBuilder : structure vide ────────────────────────────────────────
  {
    const pb = new ProgressBuilder()
    const p = pb.build(null, null, [], [])
    assert.equal(p.currentLesson, null, 'PB — currentLesson null')
    assert.equal(p.hasProgramme, false, 'PB — hasProgramme false')
    assert.equal(p.totalEvaluations, 0, 'PB — totalEvaluations 0')
    assert.equal(p.progressPercent, null, 'PB — progressPercent null')
    console.log('✓ ProgressBuilder — structure vide')
  }

  // ── ProgressBuilder : avec programme + leçons ───────────────────────────────
  {
    const pb = new ProgressBuilder()
    const p = pb.build(
      makeProgramme(),
      null,
      [makeDoc('l1', 'Cinématique', 10), makeDoc('l2', 'Dynamique', 5)],
      [],
    )
    assert.equal(p.hasProgramme, true, 'PB — hasProgramme true')
    assert.equal(p.completedLessons.length, 2, 'PB — 2 leçons complétées')
    assert.ok(p.progressPercent !== null, 'PB — progressPercent calculé')
    assert.equal(p.totalEvaluations, 0, 'PB — 0 évaluations')
    assert.equal(p.lessonsAfterLastEval, 2, 'PB — 2 leçons depuis dernière éval (aucune)')
    console.log('✓ ProgressBuilder — avec programme + leçons')
  }

  // ── WorkloadBuilder : travaux mixtes ────────────────────────────────────────
  {
    const wb = new WorkloadBuilder()
    const wl = wb.build([
      makeAssignment('t1', false, 0),   // pending
      makeAssignment('t2', false, 5),   // overdue
      makeAssignment('t3', true,  0),   // graded, no feedback
    ], NOW)
    assert.equal(wl.pendingWork, 1, 'WB — 1 pending')
    assert.equal(wl.overdueWork, 1, 'WB — 1 overdue')
    assert.equal(wl.feedbackBacklog, 1, 'WB — 1 feedback backlog')
    assert.ok(wl.estimatedCorrectionMinutes > 0, 'WB — estimatedCorrectionMinutes > 0')
    console.log('✓ WorkloadBuilder — travaux mixtes')
  }

  // ── ClassroomBuilder ────────────────────────────────────────────────────────
  {
    const cb = new ClassroomBuilder()
    const cl = cb.build(
      [makeDoc('l1', 'Leçon 1', 5), makeDoc('l2', 'Leçon 2', 2)],
      [makeDoc('e1', 'Éval 1', 10)],
      [makeAssignment('t1', false)],
    )
    assert.equal(cl.lessonsCount, 2, 'CB — 2 leçons')
    assert.equal(cl.evaluationsCount, 1, 'CB — 1 évaluation')
    assert.equal(cl.assignmentsCount, 1, 'CB — 1 travail')
    assert.ok(cl.recentActivity !== null, 'CB — recentActivity non null')
    console.log('✓ ClassroomBuilder — compte les éléments')
  }

  // ── ClassroomBuilder : recentActivity = doc le plus récent ─────────────────
  {
    const cb = new ClassroomBuilder()
    const recent = makeDoc('l_recent', 'Leçon récente', 1)
    const old    = makeDoc('l_old',    'Vieille leçon', 30)
    const cl = cb.build([recent, old], [], [])
    assert.equal(cl.recentActivity?.getTime(), recent.createdAt.getTime(), 'CB — recentActivity = doc le plus récent')
    console.log('✓ ClassroomBuilder — recentActivity correcte')
  }

  // ── StudentBuilder : summary vide → hasUsableData false ─────────────────────
  {
    const sb = new StudentBuilder()
    const insights = sb.build(makeEmptySummary())
    assert.equal(insights.hasUsableData, false, 'SB — hasUsableData false')
    assert.equal(insights.totalStudents, 0,     'SB — totalStudents 0')
    assert.equal(insights.confidence, 0.0,      'SB — confidence 0 (aucun élève)')
    assert.equal(insights.priorityStudents.length, 0, 'SB — priorityStudents vide')
    console.log('✓ StudentBuilder — summary vide')
  }

  // ── StudentBuilder : signaux → confidence ≥ 0.6 ─────────────────────────────
  {
    const sb = new StudentBuilder()
    const summary = makeStudentsWithSignals({ performance: 3, attendance: 2, missingWork: 1 })
    const insights = sb.build(summary)
    assert.equal(insights.hasUsableData, true, 'SB — hasUsableData true')
    assert.ok(insights.confidence >= 0.6, 'SB — confidence ≥ 0.6 avec données')
    assert.equal(insights.performanceConcernCount, 3, 'SB — performanceConcernCount 3')
    assert.equal(insights.attendanceConcernCount, 2,  'SB — attendanceConcernCount 2')
    console.log('✓ StudentBuilder — signaux → confidence ≥ 0.6')
  }

  // ── detectNextLesson : confidence < 0.40 → pas de sujet précis ──────────────
  {
    const s = situate()
    assert.ok(s.confidence < CONFIDENCE_THRESHOLD_SUGGEST, 'NL — confidence sous le seuil')
    const missions = await detectNextLesson(s)
    assert.equal(missions.length, 1, 'NL — 1 mission malgré confiance faible')
    assert.equal(missions[0].metadata['action'], 'create_annual_plan', 'NL — action create_annual_plan')
    console.log('✓ detectNextLesson — confidence faible, sans sujet précis')
  }

  // ── detectNextLesson : confidence ≥ 0.40, suggestedTopic visible ────────────
  {
    const s = situate({
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [makeDoc('l1', 'Cours introductif', 5)],
    })
    assert.ok(s.confidence >= CONFIDENCE_THRESHOLD_SUGGEST, 'NL — confidence au-dessus du seuil')
    const missions = await detectNextLesson(s)
    assert.equal(missions.length, 1, 'NL — 1 mission')
    assert.equal(missions[0].priority, 90, 'NL — priorité 90 (leçons existantes)')
    console.log('✓ detectNextLesson — confidence ok, sujet visible')
  }

  // ── detectEvaluation : via references (ME-09) ────────────────────────────────
  {
    const s = situate({
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [makeDoc('l1', 'Cinématique', 5), makeDoc('l2', 'Dynamique', 3)],
      dernieresEvaluations: [],
    })
    // Vérifier que references est utilisé (pas de raw)
    assert.equal(s.references.programmeAnnuelId, 'prog-001', 'DE — references.programmeAnnuelId présent')
    const missions = await detectEvaluation(s)
    assert.equal(missions.length, 1, 'DE — 1 mission')
    assert.equal(missions[0].priority, 85, 'DE — priorité 85 (aucune éval)')
    assert.equal(missions[0].reason.code, 'no_evaluation', 'DE — code no_evaluation')
    // Evidence utilise les IDs de references
    const evidenceSources = missions[0].evidence?.map(e => e.source) ?? []
    assert.ok(evidenceSources.includes('programme_annuel'), 'DE — evidence programme_annuel')
    assert.ok(evidenceSources.includes('derniere_lecon'), 'DE — evidence derniere_lecon')
    console.log('✓ detectEvaluation — Cas 3 via references (ME-09)')
  }

  // ── detectEvaluation : sans programme → [] ───────────────────────────────────
  {
    const s = situate({ dernieresLecons: [makeDoc('l1', 'Cours 1')] })
    const missions = await detectEvaluation(s)
    assert.deepEqual(missions, [], 'DE — sans programme → []')
    console.log('✓ detectEvaluation — sans programme → []')
  }

  // ── detectWork : via TeacherSituation ────────────────────────────────────────
  {
    const s = situate({ travaux: [makeAssignment('t1', false, 0), makeAssignment('t2', false, 0)] })
    const missions = await detectWork(s)
    assert.equal(missions.length, 1, 'DW — 1 mission')
    assert.equal(missions[0].priority, 88, 'DW — priorité 88')
    assert.equal(missions[0].reason.code, 'work_ungraded', 'DW — code work_ungraded')
    console.log('✓ detectWork — Cas 1 via TeacherSituation')
  }

  // ── detectWork : aucun travail → [] ──────────────────────────────────────────
  {
    const s = situate({ travaux: [] })
    const missions = await detectWork(s)
    assert.deepEqual(missions, [], 'DW — sans travaux → []')
    console.log('✓ detectWork — sans travaux → []')
  }

  // ── Intégration : Mission Engine via TeacherBrain ────────────────────────────
  {
    const s = situate({
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [makeDoc('l1', 'Cinématique', 10), makeDoc('l2', 'Dynamique', 5)],
    })
    const nextLesson  = await detectNextLesson(s)
    const evaluation  = await detectEvaluation(s)
    const work        = await detectWork(s)

    const all = [...nextLesson, ...evaluation, ...work].sort((a, b) => b.priority - a.priority)
    assert.ok(all.length >= 2, 'INT — au moins 2 missions générées')
    assert.ok(all[0].priority >= all[all.length - 1].priority, 'INT — triées par priorité décroissante')
    const types = all.map(m => m.type)
    assert.ok(types.includes('next_lesson'), 'INT — next_lesson présent')
    assert.ok(types.includes('evaluation'),  'INT — evaluation présent')
    console.log(`✓ Intégration — ${all.length} missions, priorités: ${all.map(m => m.priority).join(' > ')}`)
  }

  // ── Seuil de confiance CONFIDENCE_THRESHOLD_SUGGEST ──────────────────────────
  {
    assert.equal(CONFIDENCE_THRESHOLD_SUGGEST, 0.40, 'CONF — seuil = 0.40')
    console.log('✓ CONFIDENCE_THRESHOLD_SUGGEST = 0.40')
  }

  console.log('\n✅ Tous les tests Teacher Brain passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
