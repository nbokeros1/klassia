// ── Tests : TeacherBrain + CalendarBuilder (ME-11) ────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/teacher-brain/__tests__/teacher-brain-calendar.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { TeacherBrain }     from '../teacher-brain'
import { CalendarBuilder }  from '../builders/calendar-builder'
import { CalendarAnalyzer } from '../../pedagogy/calendar/calendar-analyzer'
import type { MissionDataContext } from '../../mission-engine/types'
import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '../../mission-engine/types'

const NOW       = new Date('2026-03-10T10:00:00Z')
const CLASSE_ID = 'classe-001'
const ENS_ID    = 'teacher-001'

function makeBaseCtx(overrides: Partial<MissionDataContext> = {}): MissionDataContext {
  return {
    enseignant: { id: ENS_ID, prenom: 'Marie', nom: 'Curie', province: 'QC', langue: 'fr' },
    classe: { id: CLASSE_ID, nom: '3e sec — A', niveau: 'secondaire', matiere: 'Sciences', matieres: ['Sciences'] },
    matiere: 'Sciences',
    programmeAnnuel: null, curriculum: null,
    dernieresLecons: [], dernieresEvaluations: [],
    ressources: [], travaux: [],
    students: [], attendance: [], studentResults: [], studentWork: [],
    conversationIA: [],
    dateCourante: NOW,
    calendarEvents:    [],
    calendarDeadlines: [],
    ...overrides,
  }
}

function makeEvent(daysFromNow: number, type: CalendarEventSnapshot['type'] = 'evenement'): CalendarEventSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return { id: `evt-${daysFromNow}`, titre: `Event`, dateDebut: d, dateFin: null,
    heureDebut: null, heureFin: null, type, scope: 'class', classeId: CLASSE_ID, matiere: null, couleur: null }
}

function makeDeadline(daysFromNow: number, type: CalendarDeadlineSnapshot['type'] = 'evaluation'): CalendarDeadlineSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return { id: `dl-${daysFromNow}`, titre: `Deadline`, date: d, type, urgencyDays: daysFromNow, classeId: CLASSE_ID, matiere: null }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── CB01 : sans données calendrier → calendar.hasUsableData false ──────────
  {
    const brain  = new TeacherBrain()
    const sit    = brain.buildSituation(makeBaseCtx())
    assert.equal(sit.calendar.hasUsableData, false, 'CB01 — pas de données calendar')
    assert.equal(sit.calendar.confidence,    0.0,   'CB01 — confidence 0')
    assert.equal(sit.calendar.urgentDeadlineCount, 0, 'CB01 — 0 urgent')
    console.log('✓ CB01 — vide → calendar.hasUsableData false')
  }

  // ── CB02 : échéance urgente → calendar.urgentEvalDeadlineCount 1 ──────────
  {
    const brain  = new TeacherBrain()
    const sit    = brain.buildSituation(makeBaseCtx({
      calendarDeadlines: [makeDeadline(2)],
    }))
    assert.equal(sit.calendar.hasUsableData,           true, 'CB02 — data présente')
    assert.equal(sit.calendar.urgentEvalDeadlineCount, 1,    'CB02 — 1 eval urgente')
    assert.equal(sit.calendar.nearestDeadlineDays,     2,    'CB02 — nearest 2')
    console.log('✓ CB02 — échéance urgente dans situation')
  }

  // ── CB03 : congé imminent → calendar.nearestBreakDays ─────────────────────
  {
    const brain = new TeacherBrain()
    const sit   = brain.buildSituation(makeBaseCtx({
      calendarEvents: [makeEvent(4, 'conge')],
    }))
    assert.equal(sit.calendar.upcomingBreaks.length, 1, 'CB03 — 1 break')
    assert.equal(sit.calendar.nearestBreakDays,      4, 'CB03 — nearestBreakDays 4')
    console.log('✓ CB03 — congé imminent dans situation')
  }

  // ── CB04 : confidence globale inchangée par calendrier vide ────────────────
  {
    const brain  = new TeacherBrain()
    const sit    = brain.buildSituation(makeBaseCtx())
    assert.equal(sit.confidence,           0.3,   'CB04 — confidence globale 0.3 sans données')
    assert.equal(sit.calendar.hasUsableData, false, 'CB04 — calendar vide ne doit pas augmenter confidence')
    console.log('✓ CB04 — calendrier vide ne modifie pas confidence globale')
  }

  // ── CB05 : CalendarBuilder isolation ──────────────────────────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const builder  = new CalendarBuilder()
    const analysis = analyzer.analyze([], [], NOW)
    const calendar = builder.build(analysis)
    assert.equal(calendar.hasUsableData,           false, 'CB05 — hasUsableData false')
    assert.equal(calendar.urgentDeadlineCount,     0,     'CB05 — urgentDeadlineCount 0')
    assert.equal(calendar.urgentEvalDeadlineCount, 0,     'CB05 — urgentEvalDeadlineCount 0')
    assert.equal(calendar.urgentSubmissionCount,   0,     'CB05 — urgentSubmissionCount 0')
    assert.equal(calendar.nearestDeadlineDays,     null,  'CB05 — nearestDeadlineDays null')
    assert.equal(calendar.nearestBreakDays,        null,  'CB05 — nearestBreakDays null')
    console.log('✓ CB05 — CalendarBuilder isolation (analyse vide)')
  }

  // ── CB06 : situation possède bien le champ calendar ────────────────────────
  {
    const brain = new TeacherBrain()
    const sit   = brain.buildSituation(makeBaseCtx())
    assert.ok('calendar' in sit,                   'CB06 — calendar présent dans TeacherSituation')
    assert.ok('hasUsableData' in sit.calendar,     'CB06 — hasUsableData présent')
    assert.ok('upcomingDeadlines' in sit.calendar, 'CB06 — upcomingDeadlines présent')
    assert.ok('upcomingBreaks' in sit.calendar,    'CB06 — upcomingBreaks présent')
    console.log('✓ CB06 — TeacherSituation.calendar structure complète')
  }

  // ── CB07 : upcomingDeadlines triées par urgencyDays ───────────────────────
  {
    const brain = new TeacherBrain()
    const sit   = brain.buildSituation(makeBaseCtx({
      calendarDeadlines: [makeDeadline(6), makeDeadline(1), makeDeadline(4)],
    }))
    const days = sit.calendar.upcomingDeadlines.map(d => d.urgencyDays)
    assert.deepEqual(days, [1, 4, 6], 'CB07 — tri croissant par urgencyDays')
    console.log('✓ CB07 — upcomingDeadlines triées par urgencyDays croissant')
  }

  console.log('\n✅ Tous les tests TeacherBrain Calendar passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
