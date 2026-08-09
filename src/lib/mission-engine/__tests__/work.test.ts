// ── Tests : détecteur de travaux (ME-07) ─────────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/mission-engine/__tests__/work.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { detectWork }          from '../detectors/work'
import { AssignmentAnalyzer }  from '../../pedagogy/assignments/assignment-analyzer'
import { FeedbackAnalyzer }    from '../../pedagogy/feedback/feedback-analyzer'
import type { MissionDataContext, DocumentSnapshot } from '../types'
import { TeacherBrain } from '../../teacher-brain/teacher-brain'
import type { TeacherSituation } from '../../teacher-brain/types'

function situate(ctx: MissionDataContext): TeacherSituation {
  return new TeacherBrain().buildSituation(ctx)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENSEIGNANT_ID = 'teacher-001'
const CLASSE_ID     = 'classe-001'
const NOW           = new Date('2026-02-01T10:00:00Z')

function makeCtx(overrides: Partial<MissionDataContext>): MissionDataContext {
  return {
    enseignant: {
      id: ENSEIGNANT_ID, prenom: 'Marie', nom: 'Dupont', province: 'QC', langue: 'fr',
    },
    classe: {
      id: CLASSE_ID, nom: '3e sec — Gr. A', niveau: 'secondaire',
      matiere: 'Français', matieres: ['Français'],
    },
    matiere:              'Français',
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

/** travail pendingss — created 3 jours ago, no dueDate, not graded */
function makePending(id: string, daysAgo = 3): DocumentSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return {
    id, nom: `Devoir ${id}`, type_fichier: 'application/pdf',
    texteExtrait: null, createdAt: d, dossierType: 'travaux',
    metadata: { isGraded: false },
  }
}

/** travail en retard — created 20 jours ago, dueDate dépassée */
function makeOverdue(id: string): DocumentSnapshot {
  const created = new Date(NOW)
  created.setDate(created.getDate() - 20)
  const due = new Date(NOW)
  due.setDate(due.getDate() - 5)   // date limite dépassée
  return {
    id, nom: `Devoir ${id}`, type_fichier: 'application/pdf',
    texteExtrait: null, createdAt: created, dossierType: 'travaux',
    metadata: { isGraded: false, dueDate: due.toISOString() },
  }
}

/** travail corrigé sans rétroaction */
function makeGraded(id: string, hasFeedback = false): DocumentSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - 10)
  const gradedAt = new Date(NOW)
  gradedAt.setDate(gradedAt.getDate() - 2)
  return {
    id, nom: `Devoir ${id}`, type_fichier: 'application/pdf',
    texteExtrait: hasFeedback ? 'commentaire: très bon travail' : null,
    createdAt: d, dossierType: 'travaux',
    metadata: { isGraded: true, gradedAt: gradedAt.toISOString() },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests AssignmentAnalyzer
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {

  // ── AssignmentAnalyzer : aucun travail ──────────────────────────────────────
  {
    const analyzer = new AssignmentAnalyzer()
    const result = analyzer.analyze([], NOW)
    assert.equal(result.assignments.length, 0, 'AA — aucun travail : assignments vide')
    assert.equal(result.pendingAssignments.length, 0, 'AA — pendingAssignments vide')
    assert.equal(result.overdueAssignments.length, 0, 'AA — overdueAssignments vide')
    assert.equal(result.ungradedAssignments.length, 0, 'AA — ungradedAssignments vide')
    console.log('✓ AssignmentAnalyzer — aucun travail')
  }

  // ── AssignmentAnalyzer : travaux en attente ─────────────────────────────────
  {
    const analyzer = new AssignmentAnalyzer()
    const result = analyzer.analyze([makePending('t1'), makePending('t2')], NOW)
    assert.equal(result.assignments.length, 2, 'AA — 2 travaux')
    assert.equal(result.pendingAssignments.length, 2, 'AA — 2 pending')
    assert.equal(result.overdueAssignments.length, 0, 'AA — 0 overdue')
    assert.equal(result.ungradedAssignments.length, 2, 'AA — 2 ungraded')
    assert.equal(result.assignments[0].status, 'pending', 'AA — statut pending')
    console.log('✓ AssignmentAnalyzer — travaux en attente')
  }

  // ── AssignmentAnalyzer : travaux en retard ──────────────────────────────────
  {
    const analyzer = new AssignmentAnalyzer()
    const result = analyzer.analyze([makeOverdue('t1'), makeOverdue('t2')], NOW)
    assert.equal(result.overdueAssignments.length, 2, 'AA — 2 overdue')
    assert.equal(result.pendingAssignments.length, 0, 'AA — 0 pending')
    assert.ok(result.assignments.every(a => a.status === 'overdue'), 'AA — tous overdue')
    console.log('✓ AssignmentAnalyzer — travaux en retard')
  }

  // ── AssignmentAnalyzer : travaux corrigés avec/sans feedback ───────────────
  {
    const analyzer = new AssignmentAnalyzer()
    const result = analyzer.analyze([
      makeGraded('t1', false),
      makeGraded('t2', true),
    ], NOW)
    assert.equal(result.assignments.length, 2, 'AA — 2 travaux')
    assert.equal(result.ungradedAssignments.length, 0, 'AA — 0 ungraded')
    assert.ok(result.assignments.every(a => a.isGraded), 'AA — tous corrigés')
    assert.equal(result.assignments[0].hasFeedback, false, 'AA — t1 sans feedback')
    assert.equal(result.assignments[1].hasFeedback, true, 'AA — t2 avec feedback')
    console.log('✓ AssignmentAnalyzer — travaux corrigés avec/sans feedback')
  }

  // ── FeedbackAnalyzer : corrections sans rétroaction ────────────────────────
  {
    const analyzer = new AssignmentAnalyzer()
    const result = analyzer.analyze([makeGraded('t1', false), makeGraded('t2', false)], NOW)
    const fb = new FeedbackAnalyzer().analyze(result.assignments)
    assert.equal(fb.assignmentsWithoutFeedback.length, 2, 'FA — 2 sans feedback')
    assert.equal(fb.hasPendingFeedback, true, 'FA — hasPendingFeedback true')
    assert.equal(fb.totalChecked, 2, 'FA — totalChecked = 2')
    console.log('✓ FeedbackAnalyzer — corrections sans rétroaction')
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Tests detectWork
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Cas 4 : aucun travail → [] ──────────────────────────────────────────────
  {
    const ctx = makeCtx({ travaux: [] })
    const missions = await detectWork(situate(ctx))
    assert.deepEqual(missions, [], 'Cas 4 — aucun travail → []')
    console.log('✓ Cas 4 — aucun travail → []')
  }

  // ── Cas 4b : pas de classe → [] ─────────────────────────────────────────────
  {
    const ctx = makeCtx({ classe: null, travaux: [makePending('t1')] })
    const missions = await detectWork(situate(ctx))
    assert.deepEqual(missions, [], 'Cas 4b — sans classe → []')
    console.log('✓ Cas 4b — sans classe → []')
  }

  // ── Cas 1 : travaux non corrigés → priorité 88 ──────────────────────────────
  {
    const ctx = makeCtx({ travaux: [makePending('t1'), makePending('t2')] })
    const missions = await detectWork(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 1 — 1 mission')
    assert.equal(missions[0].priority, 88, 'Cas 1 — priorité 88')
    assert.equal(missions[0].type, 'work', 'Cas 1 — type work')
    assert.equal(missions[0].reason.code, 'work_ungraded', 'Cas 1 — code work_ungraded')
    assert.equal(missions[0].metadata['assignmentCount'], 2, 'Cas 1 — assignmentCount 2')
    assert.ok(missions[0].id.startsWith('work_ungraded:'), 'Cas 1 — id préfixe work_ungraded')
    console.log('✓ Cas 1 — travaux non corrigés → priorité 88')
  }

  // ── Cas 1 : non corrigés avec retards → priorité 88 (cas 1 domine) ─────────
  {
    const ctx = makeCtx({ travaux: [makePending('t1'), makeOverdue('t2')] })
    const missions = await detectWork(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 1+2 — 1 mission (Cas 1 domine)')
    assert.equal(missions[0].priority, 88, 'Cas 1+2 — priorité 88')
    const overdueCount = missions[0].metadata['overdueCount'] as number
    assert.ok(overdueCount >= 1, 'Cas 1+2 — overdueCount signalé dans metadata')
    console.log('✓ Cas 1 domine Cas 2 — priorité 88')
  }

  // ── Cas 2 : travaux en retard → priorité 86 ─────────────────────────────────
  {
    const ctx = makeCtx({ travaux: [makeOverdue('t1'), makeOverdue('t2')] })
    const missions = await detectWork(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 2 — 1 mission')
    assert.equal(missions[0].priority, 86, 'Cas 2 — priorité 86')
    assert.equal(missions[0].reason.code, 'work_overdue', 'Cas 2 — code work_overdue')
    assert.equal(missions[0].metadata['overdueCount'], 2, 'Cas 2 — overdueCount 2')
    assert.ok(missions[0].id.startsWith('work_overdue:'), 'Cas 2 — id préfixe work_overdue')
    console.log('✓ Cas 2 — travaux en retard → priorité 86')
  }

  // ── Cas 3 : corrections sans rétroaction → priorité 75 ──────────────────────
  {
    const ctx = makeCtx({ travaux: [makeGraded('t1', false), makeGraded('t2', false)] })
    const missions = await detectWork(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 3 — 1 mission')
    assert.equal(missions[0].priority, 75, 'Cas 3 — priorité 75')
    assert.equal(missions[0].reason.code, 'work_feedback_missing', 'Cas 3 — code feedback_missing')
    assert.equal(missions[0].metadata['feedbackCount'], 2, 'Cas 3 — feedbackCount 2')
    assert.ok(missions[0].id.startsWith('work_feedback:'), 'Cas 3 — id préfixe work_feedback')
    console.log('✓ Cas 3 — corrections sans rétroaction → priorité 75')
  }

  // ── Cas 3 : tout corrigé avec rétroaction → [] ──────────────────────────────
  {
    const ctx = makeCtx({ travaux: [makeGraded('t1', true), makeGraded('t2', true)] })
    const missions = await detectWork(situate(ctx))
    assert.deepEqual(missions, [], 'Cas 4 — tout corrigé avec feedback → []')
    console.log('✓ Cas 4 — tout corrigé avec rétroaction → []')
  }

  // ── Priorité : Cas 1 > Cas 2 > Cas 3 ──────────────────────────────────────
  {
    const all = [
      { priority: 88, code: 'work_ungraded' },
      { priority: 86, code: 'work_overdue' },
      { priority: 75, code: 'work_feedback_missing' },
    ]
    assert.ok(all[0].priority > all[1].priority, 'Priorité — Cas 1 > Cas 2')
    assert.ok(all[1].priority > all[2].priority, 'Priorité — Cas 2 > Cas 3')
    console.log('✓ Priorités — 88 > 86 > 75')
  }

  // ── Evidence : structure correcte ──────────────────────────────────────────
  {
    const ctx = makeCtx({ travaux: [makePending('t1')] })
    const missions = await detectWork(situate(ctx))
    const m = missions[0]
    assert.ok(Array.isArray(m.evidence), 'Evidence — est un tableau')
    assert.ok((m.evidence?.length ?? 0) >= 1, 'Evidence — au moins 1 preuve')
    const sources = m.evidence?.map(e => e.source) ?? []
    assert.ok(sources.includes('assignment'), 'Evidence — source assignment présente')
    console.log('✓ Evidence — structure correcte')
  }

  // ── Metadata : champs obligatoires ─────────────────────────────────────────
  {
    const ctx = makeCtx({ travaux: [makePending('t1')] })
    const missions = await detectWork(situate(ctx))
    const meta = missions[0].metadata
    assert.ok('assignmentCount' in meta, 'Metadata — assignmentCount présent')
    assert.ok('overdueCount'    in meta, 'Metadata — overdueCount présent')
    assert.ok('feedbackCount'   in meta, 'Metadata — feedbackCount présent')
    assert.ok('classe_id'       in meta, 'Metadata — classe_id présent')
    assert.ok('matiere'         in meta, 'Metadata — matiere présent')
    console.log('✓ Metadata — champs obligatoires présents')
  }

  console.log("\n✅ Tous les tests du détecteur de travaux passent.")
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
