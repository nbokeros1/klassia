// ── Tests : detectDeadline (ME-11) ────────────────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/mission-engine/__tests__/deadline.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { detectDeadline }         from '../detectors/deadline'
import { TeacherBrain }           from '../../teacher-brain/teacher-brain'
import { TeachingStrategyEngine } from '../../teaching-strategy/strategy-engine'
import type { MissionDataContext }   from '../types'
import type { CalendarDeadlineSnapshot, CalendarEventSnapshot } from '../types'
import type { TeacherSituation }  from '../../teacher-brain/types'

const NOW       = new Date('2026-03-10T10:00:00Z')
const CLASSE_ID = 'classe-001'
const ENS_ID    = 'teacher-001'

function makeBaseCtx(overrides: Partial<MissionDataContext> = {}): MissionDataContext {
  return {
    enseignant: { id: ENS_ID, prenom: 'Sophie', nom: 'Tremblay', province: 'QC', langue: 'fr' },
    classe: { id: CLASSE_ID, nom: '4e sec — B', niveau: 'secondaire', matiere: 'Mathématiques', matieres: ['Mathématiques'] },
    matiere: 'Mathématiques',
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

function makeDeadline(urgencyDays: number, type: CalendarDeadlineSnapshot['type'] = 'evaluation'): CalendarDeadlineSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + urgencyDays)
  return { id: `dl-${urgencyDays}-${type}`, titre: `Épreuve ${type}`, date: d, type, urgencyDays, classeId: CLASSE_ID, matiere: null }
}

function makeBreakEvent(daysFromNow: number): CalendarEventSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return {
    id: `break-${daysFromNow}`, titre: 'Relâche scolaire', dateDebut: d, dateFin: null,
    heureDebut: null, heureFin: null, type: 'conge', scope: 'school',
    classeId: null, matiere: null, couleur: null,
  }
}

function situate(overrides: Partial<MissionDataContext> = {}): TeacherSituation {
  return new TeacherBrain().buildSituation(makeBaseCtx(overrides))
}

function getStrategy(sit: TeacherSituation) {
  return new TeachingStrategyEngine().buildStrategy(sit)
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── D01 : sans données calendrier → [] ────────────────────────────────────
  {
    const sit      = situate()
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length, 0, 'D01 — vide → []')
    console.log('✓ D01 — sans données calendrier → []')
  }

  // ── D02 : sans classe → [] ────────────────────────────────────────────────
  {
    const sit = { ...situate({ calendarDeadlines: [makeDeadline(2)] }), classe: null }
    const strategy = getStrategy(situate())
    const missions = await detectDeadline(sit as TeacherSituation, strategy)
    assert.equal(missions.length, 0, 'D02 — sans classe → []')
    console.log('✓ D02 — sans classe → []')
  }

  // ── D03 : échéance urgente → p=94, type='deadline' ────────────────────────
  {
    const sit      = situate({ calendarDeadlines: [makeDeadline(2)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length, 1,         'D03 — 1 mission')
    assert.equal(missions[0].type, 'deadline', 'D03 — type deadline')
    assert.equal(missions[0].priority, 94,   'D03 — priorité 94')
    assert.equal(missions[0].reason.code, 'deadline_urgent', 'D03 — code deadline_urgent')
    console.log('✓ D03 — échéance urgente → p=94')
  }

  // ── D04 : ID déterministe format correct ──────────────────────────────────
  {
    const sit      = situate({ calendarDeadlines: [makeDeadline(1)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    const id       = missions[0].id
    assert.ok(id.startsWith('deadline:'), 'D04 — id commence par deadline:')
    assert.ok(id.includes(ENS_ID),        'D04 — id contient enseignantId')
    assert.ok(id.includes(CLASSE_ID),     'D04 — id contient classeId')
    assert.ok(id.includes('urgent'),      'D04 — id contient action urgent')
    console.log('✓ D04 — ID déterministe format deadline:ens:cls:mat:id:action')
  }

  // ── D05 : échéance proche (4-7j) → p=78 ──────────────────────────────────
  {
    const sit      = situate({ calendarDeadlines: [makeDeadline(5)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length,   1,                   'D05 — 1 mission')
    assert.equal(missions[0].priority, 78,               'D05 — priorité 78')
    assert.equal(missions[0].reason.code, 'deadline_upcoming', 'D05 — code deadline_upcoming')
    console.log('✓ D05 — échéance proche → p=78')
  }

  // ── D06 : congé imminent → p=72 ───────────────────────────────────────────
  {
    const sit      = situate({ calendarEvents: [makeBreakEvent(4)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length,   1,               'D06 — 1 mission')
    assert.equal(missions[0].priority, 72,           'D06 — priorité 72')
    assert.equal(missions[0].reason.code, 'deadline_break', 'D06 — code deadline_break')
    console.log('✓ D06 — congé imminent → p=72')
  }

  // ── D07 : cascade — urgente prime sur proche ───────────────────────────────
  {
    const sit      = situate({ calendarDeadlines: [makeDeadline(2), makeDeadline(6)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length,   1,                   'D07 — 1 mission (cascade)')
    assert.equal(missions[0].priority, 94,               'D07 — urgente prime (p=94)')
    assert.equal(missions[0].reason.code, 'deadline_urgent', 'D07 — code urgent')
    console.log('✓ D07 — cascade : urgente prime sur proche')
  }

  // ── D08 : cascade — proche prime sur break ─────────────────────────────────
  {
    const sit = situate({
      calendarDeadlines: [makeDeadline(6)],
      calendarEvents:    [makeBreakEvent(5)],
    })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length,   1,                       'D08 — 1 mission')
    assert.equal(missions[0].priority, 78,                   'D08 — proche prime (p=78)')
    assert.equal(missions[0].reason.code, 'deadline_upcoming', 'D08 — code upcoming')
    console.log('✓ D08 — cascade : proche prime sur break')
  }

  // ── D09 : break ID déterministe format break ───────────────────────────────
  {
    const sit      = situate({ calendarEvents: [makeBreakEvent(3)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    const id       = missions[0].id
    assert.ok(id.includes(':break:'), 'D09 — id contient :break:')
    console.log('✓ D09 — ID break : deadline:ens:cls:mat:break:eventId')
  }

  // ── D10 : passée → pas de mission ─────────────────────────────────────────
  {
    const sit      = situate({ calendarDeadlines: [makeDeadline(-2)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    assert.equal(missions.length, 0, 'D10 — échéance passée → []')
    console.log('✓ D10 — échéance passée → aucune mission')
  }

  // ── D11 : evidence source = 'deadline' ────────────────────────────────────
  {
    const sit      = situate({ calendarDeadlines: [makeDeadline(2)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    const ev       = missions[0].evidence?.[0]
    assert.equal(ev?.source, 'deadline', 'D11 — evidence source deadline')
    console.log('✓ D11 — evidence source = deadline')
  }

  // ── D12 : break evidence source = 'school_schedule' ───────────────────────
  {
    const sit      = situate({ calendarEvents: [makeBreakEvent(4)] })
    const strategy = getStrategy(sit)
    const missions = await detectDeadline(sit, strategy)
    const ev       = missions[0].evidence?.[0]
    assert.equal(ev?.source, 'school_schedule', 'D12 — break evidence = school_schedule')
    console.log('✓ D12 — break evidence source = school_schedule')
  }

  console.log('\n✅ Tous les tests detectDeadline passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
