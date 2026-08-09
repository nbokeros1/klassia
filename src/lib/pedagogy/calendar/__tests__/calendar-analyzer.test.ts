// ── Tests : CalendarAnalyzer (ME-11) ──────────────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/pedagogy/calendar/__tests__/calendar-analyzer.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { CalendarAnalyzer } from '../calendar-analyzer'
import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '../types'

const NOW = new Date('2026-03-10T10:00:00Z')
const CLASSE_ID = 'classe-001'

function makeEvent(
  id: string,
  type: CalendarEventSnapshot['type'],
  daysFromNow: number,
  classeId: string | null = CLASSE_ID,
): CalendarEventSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + daysFromNow)
  return {
    id, titre: `Event ${id}`, dateDebut: d, dateFin: null,
    heureDebut: null, heureFin: null,
    type, scope: 'class', classeId, matiere: null, couleur: null,
  }
}

function makeDeadline(
  id: string,
  type: CalendarDeadlineSnapshot['type'],
  urgencyDays: number,
): CalendarDeadlineSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() + urgencyDays)
  return { id, titre: `Deadline ${id}`, date: d, type, urgencyDays, classeId: CLASSE_ID, matiere: null }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // ── CA01 : aucune donnée → hasUsableData = false ───────────────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const result   = analyzer.analyze([], [], NOW)
    assert.equal(result.hasUsableData,       false, 'CA01 — hasUsableData false')
    assert.equal(result.confidence,          0.0,   'CA01 — confidence 0')
    assert.equal(result.totalEvents,         0,     'CA01 — totalEvents 0')
    assert.equal(result.urgentDeadlineCount, 0,     'CA01 — urgentDeadlineCount 0')
    console.log('✓ CA01 — aucune donnée → hasUsableData false')
  }

  // ── CA02 : événements sans échéances → confidence 0.5 ─────────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const events   = [makeEvent('e1', 'evenement', 5)]
    const result   = analyzer.analyze(events, [], NOW)
    assert.equal(result.hasUsableData, true,  'CA02 — hasUsableData true')
    assert.equal(result.confidence,    0.5,   'CA02 — confidence 0.5 sans échéances')
    assert.equal(result.totalEvents,   1,     'CA02 — totalEvents 1')
    console.log('✓ CA02 — événements sans échéances → confidence 0.5')
  }

  // ── CA03 : échéance urgente (≤ 3 j) ───────────────────────────────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [makeDeadline('d1', 'evaluation', 2)]
    const result    = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.hasUsableData,           true, 'CA03 — hasUsableData true')
    assert.equal(result.urgentDeadlineCount,     1,    'CA03 — urgentDeadlineCount 1')
    assert.equal(result.urgentEvalDeadlineCount, 1,    'CA03 — urgentEvalDeadlineCount 1')
    assert.equal(result.urgentSubmissionCount,   0,    'CA03 — urgentSubmissionCount 0')
    assert.equal(result.nearestDeadlineDays,     2,    'CA03 — nearestDeadlineDays 2')
    assert.equal(result.confidence,              0.9,  'CA03 — confidence 0.9 (urgent)')
    console.log('✓ CA03 — échéance urgente → urgentDeadlineCount 1')
  }

  // ── CA04 : échéance devoir urgente ─────────────────────────────────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [makeDeadline('d1', 'devoir', 1)]
    const result    = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.urgentEvalDeadlineCount, 0, 'CA04 — pas de deadline eval')
    assert.equal(result.urgentSubmissionCount,   1, 'CA04 — urgentSubmissionCount 1')
    console.log('✓ CA04 — devoir urgent → urgentSubmissionCount 1')
  }

  // ── CA05 : échéance future non urgente (≤ 7j) ─────────────────────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [makeDeadline('d1', 'evaluation', 5)]
    const result    = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.urgentDeadlineCount,     0,    'CA05 — pas urgent')
    assert.equal(result.upcomingDeadlines.length, 1,   'CA05 — 1 deadline upcoming')
    assert.equal(result.nearestDeadlineDays,      5,   'CA05 — nearest = 5')
    assert.equal(result.confidence,               0.8, 'CA05 — confidence 0.8')
    console.log('✓ CA05 — échéance à 5 jours → upcoming, confidence 0.8')
  }

  // ── CA06 : passée → exclue de upcomingDeadlines ───────────────────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [makeDeadline('d1', 'evaluation', -2)]
    const result    = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.upcomingDeadlines.length, 0, 'CA06 — passée exclue')
    assert.equal(result.hasUsableData,            true, 'CA06 — hasUsableData true (data existe)')
    console.log('✓ CA06 — échéance passée → exclue des upcomingDeadlines')
  }

  // ── CA07 : congé dans 5 j → upcomingBreaks ────────────────────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const events   = [makeEvent('e1', 'conge', 5)]
    const result   = analyzer.analyze(events, [], NOW)
    assert.equal(result.upcomingBreaks.length, 1, 'CA07 — 1 break')
    assert.equal(result.nearestBreakDays,      5, 'CA07 — nearestBreakDays 5')
    console.log('✓ CA07 — congé dans 5 j → upcomingBreaks')
  }

  // ── CA08 : congé hors fenêtre (> 7j) → pas dans upcomingBreaks ────────────
  {
    const analyzer = new CalendarAnalyzer()
    const events   = [makeEvent('e1', 'conge', 10)]
    const result   = analyzer.analyze(events, [], NOW)
    assert.equal(result.upcomingBreaks.length, 0, 'CA08 — hors fenêtre')
    console.log('✓ CA08 — congé dans 10 j → hors fenêtre break')
  }

  // ── CA09 : ferie reconnu comme break ──────────────────────────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const events   = [makeEvent('e1', 'ferie', 2)]
    const result   = analyzer.analyze(events, [], NOW)
    assert.equal(result.upcomingBreaks.length, 1, 'CA09 — ferie = break')
    console.log('✓ CA09 — ferie → reconnu comme break')
  }

  // ── CA10 : calendrier_scolaire reconnu comme break ────────────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const events   = [makeEvent('e1', 'calendrier_scolaire', 3)]
    const result   = analyzer.analyze(events, [], NOW)
    assert.equal(result.upcomingBreaks.length, 1, 'CA10 — calendrier_scolaire = break')
    console.log('✓ CA10 — calendrier_scolaire → break')
  }

  // ── CA11 : tri upcomingDeadlines par urgencyDays ──────────────────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [
      makeDeadline('d3', 'evaluation', 6),
      makeDeadline('d1', 'evaluation', 1),
      makeDeadline('d2', 'devoir',     4),
    ]
    const result = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.upcomingDeadlines[0].id, 'd1', 'CA11 — premier = plus urgent')
    assert.equal(result.nearestDeadlineDays,       1,   'CA11 — nearest = 1')
    console.log('✓ CA11 — tri upcomingDeadlines par urgencyDays')
  }

  // ── CA12 : multiple urgentDeadlines ──────────────────────────────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [
      makeDeadline('d1', 'evaluation', 2),
      makeDeadline('d2', 'evaluation', 3),
      makeDeadline('d3', 'devoir',     1),
    ]
    const result = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.urgentDeadlineCount,     3, 'CA12 — 3 urgents')
    assert.equal(result.urgentEvalDeadlineCount, 2, 'CA12 — 2 eval urgents')
    assert.equal(result.urgentSubmissionCount,   1, 'CA12 — 1 devoir urgent')
    console.log('✓ CA12 — multiple urgentDeadlines')
  }

  // ── CA13 : config personnalisée urgentDeadlineDays ────────────────────────
  {
    const analyzer  = new CalendarAnalyzer({ urgentDeadlineDays: 1 })
    const deadlines = [makeDeadline('d1', 'evaluation', 2)]
    const result    = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.urgentDeadlineCount, 0, 'CA13 — config 1j : 2j pas urgent')
    console.log('✓ CA13 — config urgentDeadlineDays personnalisée')
  }

  // ── CA14 : aujourd'hui (urgencyDays=0) → urgent et upcoming ───────────────
  {
    const analyzer  = new CalendarAnalyzer()
    const deadlines = [makeDeadline('d1', 'evaluation', 0)]
    const result    = analyzer.analyze([], deadlines, NOW)
    assert.equal(result.urgentDeadlineCount,     1, 'CA14 — aujourd\'hui = urgent')
    assert.equal(result.nearestDeadlineDays,     0, 'CA14 — nearest = 0')
    console.log('✓ CA14 — urgencyDays=0 → urgent')
  }

  // ── CA15 : événements non-break exclus de upcomingBreaks ──────────────────
  {
    const analyzer = new CalendarAnalyzer()
    const events   = [makeEvent('e1', 'evaluation', 2), makeEvent('e2', 'devoir', 1)]
    const result   = analyzer.analyze(events, [], NOW)
    assert.equal(result.upcomingBreaks.length, 0, 'CA15 — eval/devoir pas des breaks')
    console.log('✓ CA15 — evaluation/devoir non inclus dans upcomingBreaks')
  }

  console.log('\n✅ Tous les tests CalendarAnalyzer passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
