// ── Tests : detectNextLesson (ME-08 : via TeacherSituation) ─────────────────
//
// Tests unitaires déterministes. Aucun framework requis : utilise node:assert.
// Exécution : npx tsx src/lib/mission-engine/__tests__/next-lesson.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'

import { detectNextLesson, extractSuggestedTopic } from '../detectors/next-lesson'
import type {
  MissionDataContext,
  DocumentSnapshot,
  ClasseSnapshot,
  EnseignantSnapshot,
} from '../types'
import { EMPTY_MISSION_CONTEXT } from '../types'
import { TeacherBrain } from '../../teacher-brain/teacher-brain'
import type { TeacherSituation } from '../../teacher-brain/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function situate(ctx: MissionDataContext): TeacherSituation {
  return new TeacherBrain().buildSituation(ctx)
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ENSEIGNANT: EnseignantSnapshot = {
  id: 'ens-uuid-1', prenom: 'Marie', nom: 'Dupont', province: 'QC', langue: 'fr',
}

const CLASSE: ClasseSnapshot = {
  id: 'cls-uuid-1', nom: '4e année A', niveau: 'primaire',
  matiere: 'Mathématiques', matieres: ['Mathématiques'],
}

const PROGRAMME: DocumentSnapshot = {
  id:           'doc-pa-uuid-1',
  nom:          'Programme annuel Mathématiques',
  type_fichier: 'plan_annuel',
  texteExtrait: [
    '1. Les nombres naturels',
    '2. La géométrie plane',
    '3. Les fractions',
    '4. La mesure',
  ].join('\n'),
  createdAt: new Date('2026-09-01T00:00:00Z'),
}

const LECON_NOMBRES: DocumentSnapshot = {
  id: 'doc-l-uuid-1', nom: 'Les nombres naturels',
  type_fichier: 'plan_lecon', texteExtrait: null,
  createdAt: new Date('2026-09-15T00:00:00Z'),
}

const LECON_GEOMETRIE: DocumentSnapshot = {
  id: 'doc-l-uuid-2', nom: 'La géométrie plane',
  type_fichier: 'plan_lecon', texteExtrait: null,
  createdAt: new Date('2026-09-22T00:00:00Z'),
}

const DATE_COURANTE = new Date('2026-10-01T00:00:00Z')

function makeCtx(overrides: Partial<MissionDataContext> = {}): MissionDataContext {
  return { ...EMPTY_MISSION_CONTEXT, dateCourante: DATE_COURANTE, ...overrides }
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function test01_noClasse_returnsEmpty() {
  const result = await detectNextLesson(situate(makeCtx({ classe: null, matiere: 'Mathématiques' })))
  assert.equal(result.length, 0, 'Cas 1 : sans classe → tableau vide')
}

async function test02_noMatiere_returnsEmpty() {
  const result = await detectNextLesson(situate(makeCtx({ classe: CLASSE, matiere: null })))
  assert.equal(result.length, 0, 'Cas 1 : sans matière → tableau vide')
}

async function test03_noProgramme_returnsUnfinishedDocument() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques', programmeAnnuel: null,
  })))
  assert.equal(result.length, 1, 'Cas 2 : 1 mission retournée')
  assert.equal(result[0].type, 'unfinished_document', 'Cas 2 : type = unfinished_document')
}

async function test04_noProgramme_priority100() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques', programmeAnnuel: null,
  })))
  assert.equal(result[0].priority, 100, 'Cas 2 : priorité = 100')
}

async function test05_noProgramme_actionCreateAnnualPlan() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques', programmeAnnuel: null,
  })))
  assert.equal(result[0].metadata['action'], 'create_annual_plan', 'Cas 2 : action = create_annual_plan')
}

async function test06_programmeNoLecons_returnsNextLesson() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [],
  })))
  assert.equal(result.length, 1, 'Cas 3 : 1 mission retournée')
  assert.equal(result[0].type, 'next_lesson', 'Cas 3 : type = next_lesson')
}

async function test07_firstLesson_priority95() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [],
  })))
  assert.equal(result[0].priority, 95, 'Cas 3 : priorité = 95')
}

async function test08_firstLesson_actionPrepareFirstLesson() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [],
  })))
  assert.equal(result[0].metadata['action'], 'prepare_first_lesson', 'Cas 3 : action = prepare_first_lesson')
}

async function test09_programmeWithLecons_returnsNextLesson() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [LECON_NOMBRES],
  })))
  assert.equal(result.length, 1, 'Cas 4 : 1 mission retournée')
  assert.equal(result[0].type, 'next_lesson', 'Cas 4 : type = next_lesson')
}

async function test10_nextLesson_priority90() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [LECON_NOMBRES],
  })))
  assert.equal(result[0].priority, 90, 'Cas 4 : priorité = 90')
}

async function test11_nextLesson_actionPrepareNextLesson() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [LECON_NOMBRES],
  })))
  assert.equal(result[0].metadata['action'], 'prepare_next_lesson', 'Cas 4 : action = prepare_next_lesson')
}

async function test12_extractTopic_skipsAlreadyCoveredLessons() {
  const topic = extractSuggestedTopic(PROGRAMME, [LECON_NOMBRES, LECON_GEOMETRIE])
  assert.equal(topic, 'Les fractions', 'extractSuggestedTopic : ignore les leçons déjà couvertes')
}

async function test13_extractTopic_returnsNullWhenNoText() {
  const topic = extractSuggestedTopic({ texteExtrait: null }, [])
  assert.equal(topic, null, 'extractSuggestedTopic : null si pas de texte')
}

async function test14_missionId_isDeterministic() {
  const ctx = makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [LECON_NOMBRES],
  })
  const [r1, r2] = await Promise.all([detectNextLesson(situate(ctx)), detectNextLesson(situate(ctx))])
  assert.equal(r1[0].id, r2[0].id, 'ID de mission déterministe pour le même contexte')
}

async function test15_evidence_hasAtLeastOneEntry() {
  const result = await detectNextLesson(situate(makeCtx({
    enseignant: ENSEIGNANT, classe: CLASSE, matiere: 'Mathématiques',
    programmeAnnuel: PROGRAMME, dernieresLecons: [LECON_NOMBRES],
  })))
  assert.ok(result[0].evidence && result[0].evidence.length > 0, 'La mission contient des preuves')
}

// ── Runner ────────────────────────────────────────────────────────────────────

const TESTS = [
  test01_noClasse_returnsEmpty,
  test02_noMatiere_returnsEmpty,
  test03_noProgramme_returnsUnfinishedDocument,
  test04_noProgramme_priority100,
  test05_noProgramme_actionCreateAnnualPlan,
  test06_programmeNoLecons_returnsNextLesson,
  test07_firstLesson_priority95,
  test08_firstLesson_actionPrepareFirstLesson,
  test09_programmeWithLecons_returnsNextLesson,
  test10_nextLesson_priority90,
  test11_nextLesson_actionPrepareNextLesson,
  test12_extractTopic_skipsAlreadyCoveredLessons,
  test13_extractTopic_returnsNullWhenNoText,
  test14_missionId_isDeterministic,
  test15_evidence_hasAtLeastOneEntry,
]

async function run() {
  let passed = 0
  const failed: string[] = []
  for (const t of TESTS) {
    try {
      await t()
      passed++
      console.log(`  ✓  ${t.name}`)
    } catch (e) {
      failed.push(t.name)
      console.error(`  ✗  ${t.name}:`, e instanceof Error ? e.message : String(e))
    }
  }
  console.log(`\n${passed}/${TESTS.length} tests passés`)
  if (failed.length > 0) { console.error('Échecs :', failed); process.exit(1) }
}

run().catch(e => { console.error(e); process.exit(1) })
