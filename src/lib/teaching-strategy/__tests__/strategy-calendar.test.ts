// ── Tests : CalendarStrategyBuilder + StrategyEngine calendrier (ME-11) ───────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/teaching-strategy/__tests__/strategy-calendar.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { CalendarStrategyBuilder } from '../builders/calendar-strategy'
import { TeachingStrategyEngine }  from '../strategy-engine'
import { TeacherBrain }            from '../../teacher-brain/teacher-brain'
import type { MissionDataContext } from '../../mission-engine/types'
import type { CalendarDeadlineSnapshot, CalendarEventSnapshot } from '../../mission-engine/types'
import type { TeacherCalendar } from '../../teacher-brain/types'

const NOW       = new Date('2026-03-10T10:00:00Z')
const CLASSE_ID = 'classe-001'

function makeBaseCtx(overrides: Partial<MissionDataContext> = {}): MissionDataContext {
  return {
    enseignant: { id: 'teacher-001', prenom: 'Alice', nom: 'Martin', province: 'QC', langue: 'fr' },
    classe: { id: CLASSE_ID, nom: '4e sec — A', niveau: 'secondaire', matiere: 'Sciences', matieres: ['Sciences'] },
    matiere: 'Sciences',
    programmeAnnuel: null, curriculum: null,
    dernieresLecons: [], dernieresEvaluations: [],
    ressources: [], travaux: [],
    students: [], attendance: [], studentResults: [], studentWork: [],
    conversationIA: [], dateCourante: NOW,
    calendarEvents:    [],
    calendarDeadlines: [],
    ...overrides,
  }
}

function makeDeadline(urgencyDays: number, type: CalendarDeadlineSnapshot['type'] = 'evaluation'): CalendarDeadlineSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + urgencyDays)
  return { id: `dl-${urgencyDays}`, titre: 'Test deadline', date: d, type, urgencyDays, classeId: CLASSE_ID, matiere: null }
}

function makeEvent(daysFromNow: number, type: CalendarEventSnapshot['type']): CalendarEventSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return {
    id: `evt-${daysFromNow}`, titre: `Event`, dateDebut: d, dateFin: null,
    heureDebut: null, heureFin: null, type, scope: 'school',
    classeId: null, matiere: null, couleur: null,
  }
}

function makeCalendar(overrides: Partial<TeacherCalendar> = {}): TeacherCalendar {
  return {
    hasUsableData: false, upcomingDeadlines: [], upcomingBreaks: [],
    urgentDeadlineCount: 0, urgentEvalDeadlineCount: 0, urgentSubmissionCount: 0,
    nearestDeadlineDays: null, nearestBreakDays: null, confidence: 0.0,
    ...overrides,
  }
}

function situate(overrides: Partial<MissionDataContext> = {}) {
  return new TeacherBrain().buildSituation(makeBaseCtx(overrides))
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── SC01 : CalendarStrategyBuilder — sans données → null ──────────────────
  {
    const builder  = new CalendarStrategyBuilder()
    const calendar = makeCalendar()
    const signal   = builder.analyze(calendar)
    assert.equal(signal, null, 'SC01 — hasUsableData false → null')
    console.log('✓ SC01 — sans données calendrier → null')
  }

  // ── SC02 : éval urgente (≤ 3j) → ASSESSMENT_PHASE ────────────────────────
  {
    const builder  = new CalendarStrategyBuilder()
    const calendar = makeCalendar({
      hasUsableData: true, urgentEvalDeadlineCount: 1, nearestDeadlineDays: 2,
    })
    const signal = builder.analyze(calendar)
    assert.equal(signal?.mode, 'ASSESSMENT_PHASE', 'SC02 — éval urgente → ASSESSMENT_PHASE')
    assert.equal(signal?.reason.source, 'calendar',  'SC02 — source calendar')
    assert.equal(signal?.reason.code, 'urgent_evaluation_deadline', 'SC02 — code correct')
    console.log('✓ SC02 — éval urgente → ASSESSMENT_PHASE')
  }

  // ── SC03 : congé imminent (≤ 7j) → END_OF_UNIT ───────────────────────────
  {
    const builder  = new CalendarStrategyBuilder()
    const calendar = makeCalendar({ hasUsableData: true, nearestBreakDays: 5 })
    const signal   = builder.analyze(calendar)
    assert.equal(signal?.mode, 'END_OF_UNIT', 'SC03 — congé → END_OF_UNIT')
    assert.equal(signal?.reason.code, 'upcoming_break', 'SC03 — code upcoming_break')
    console.log('✓ SC03 — congé imminent → END_OF_UNIT')
  }

  // ── SC04 : éval urgente prime sur congé ───────────────────────────────────
  {
    const builder  = new CalendarStrategyBuilder()
    const calendar = makeCalendar({
      hasUsableData: true, urgentEvalDeadlineCount: 1, nearestDeadlineDays: 2, nearestBreakDays: 3,
    })
    const signal = builder.analyze(calendar)
    assert.equal(signal?.mode, 'ASSESSMENT_PHASE', 'SC04 — éval > break (cascade)')
    console.log('✓ SC04 — éval urgente prime sur congé (cascade)')
  }

  // ── SC05 : congé dans 8j (hors fenêtre) → null ───────────────────────────
  {
    const builder  = new CalendarStrategyBuilder()
    const calendar = makeCalendar({ hasUsableData: true, nearestBreakDays: 8 })
    const signal   = builder.analyze(calendar)
    assert.equal(signal, null, 'SC05 — break dans 8j → null')
    console.log('✓ SC05 — congé hors fenêtre (8j) → null')
  }

  // ── SC06 : engine → pressureLevel urgent avec éval urgente ────────────────
  {
    const engine  = new TeachingStrategyEngine()
    const sit     = situate({ calendarDeadlines: [makeDeadline(2)] })
    const strategy = engine.buildStrategy(sit)
    assert.equal(strategy.pressureLevel, 'urgent', 'SC06 — pressureLevel urgent')
    console.log('✓ SC06 — pressureLevel urgent avec éval urgente')
  }

  // ── SC07 : engine → pressureLevel low sans données ────────────────────────
  {
    const engine   = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate())
    assert.equal(strategy.pressureLevel, 'low', 'SC07 — pressureLevel low sans données')
    console.log('✓ SC07 — pressureLevel low sans données calendrier')
  }

  // ── SC08 : engine → temporal rempli ───────────────────────────────────────
  {
    const engine   = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate({ calendarDeadlines: [makeDeadline(4)] }))
    assert.ok(strategy.temporal !== undefined, 'SC08 — temporal présent')
    assert.equal(strategy.temporal?.nearestDeadlineDays, 4, 'SC08 — nearestDeadlineDays 4')
    assert.equal(strategy.temporal?.urgentDeadlineCount, 0, 'SC08 — pas urgent')
    console.log('✓ SC08 — temporal rempli dans strategy')
  }

  // ── SC09 : ASSESSMENT_PHASE du calendrier peut être overridé par REMEDIATION
  {
    const engine = new TeachingStrategyEngine()
    const sit    = situate({ calendarDeadlines: [makeDeadline(2)] })
    const sitWithStudents = {
      ...sit,
      students: { ...sit.students, hasUsableData: true, totalStudents: 20, highPrioritySignalsCount: 3, signalsCount: 5, confidence: 0.8 },
    }
    const strategy = engine.buildStrategy(sitWithStudents)
    assert.equal(strategy.mode, 'REMEDIATION', 'SC09 — REMEDIATION domine ASSESSMENT_PHASE')
    console.log('✓ SC09 — REMEDIATION domine ASSESSMENT_PHASE calendrier')
  }

  // ── SC10 : engine → pressureLevel high (deadline dans 5j) ─────────────────
  {
    const engine   = new TeachingStrategyEngine()
    const strategy = engine.buildStrategy(situate({ calendarDeadlines: [makeDeadline(5)] }))
    assert.equal(strategy.pressureLevel, 'high', 'SC10 — pressureLevel high (≤ 7j)')
    console.log('✓ SC10 — pressureLevel high pour deadline dans 5j')
  }

  console.log('\n✅ Tous les tests Strategy Calendar passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
