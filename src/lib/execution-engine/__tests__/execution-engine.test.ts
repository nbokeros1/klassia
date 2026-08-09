// ── Tests : ExecutionEngine (ME-13) ──────────────────────────────────────────
//
// Couvre : templates (next-lesson, evaluation, work, student-follow-up, deadline, bundle, generic),
//          engine (déterminisme, statuts, blocages, createPlans, cas limites).
//
// Exécution : npx tsx src/lib/execution-engine/__tests__/execution-engine.test.ts

import assert from 'node:assert/strict'

import { ExecutionEngine }            from '../execution-engine'
import { ExecutionRegistry }          from '../execution-registry'
import type { ExecutionTemplate }     from '../execution-registry'
import { validateExecutionPlan }      from '../validators/execution-plan-validator'
import { createExecutionRouteRegistry } from '../execution-context'
import { makePlanId }                 from '../step-utils'
import type { ExecutionRecipe }       from '../recipes/types'
import { EXECUTION_RECIPE_VERSION }   from '../recipes/types'

import type { Mission, MissionType, MissionStatus } from '../../mission-engine/types'
import type { MissionBundle }         from '../../decision-engine/types'
import { DecisionEngine }             from '../../decision-engine'

// ── Constantes ────────────────────────────────────────────────────────────────

const CLASSE_ID = 'cff8e6b2-0001-4abc-8def-000000000001'
const ENS_ID    = 'ens-0001-0001-0001-000000000001'
const ROUTES    = createExecutionRouteRegistry()

// ── Helpers Mission ───────────────────────────────────────────────────────────

function makeMission(
  id: string, type: MissionType, priority: number,
  metadata: Record<string, unknown> = {},
  reasonCode = 'test',
  status: MissionStatus = 'proposed',
): Mission {
  return {
    id, type,
    title:       `Mission ${type}`,
    description: `Description ${id}`,
    priority, status,
    reason:    { code: reasonCode, label: 'Test', description: 'Mission test' },
    createdAt: new Date('2026-03-10T10:00:00Z'),
    metadata:  { classe_id: CLASSE_ID, matiere: 'Mathématiques', ...metadata },
    evidence:  [],
  }
}

function makeBundle(evalM: Mission, deadlineM: Mission): MissionBundle {
  const id = `bundle:${evalM.id}:${deadlineM.id}`
  return {
    id, title: "Préparer et planifier l'évaluation",
    description: `${evalM.title} — ${deadlineM.title}`,
    missions: [evalM, deadlineM], primaryType: 'evaluation',
    priority: Math.max(evalM.priority, deadlineM.priority),
  }
}

// ── Engine helpers ────────────────────────────────────────────────────────────

const engine = new ExecutionEngine()

function buildPlan(mission: Mission | null, bundle: MissionBundle | null = null) {
  return engine.createPlan(bundle ?? mission!)
}

// ═════════════════════════════════════════════════════════════════════════════
async function runTests() {

  // =========================================================================
  // TEMPLATES — NEXT LESSON
  // =========================================================================

  // ── EE01 : CAS A — create_annual_plan ────────────────────────────────────
  {
    const m    = makeMission('unfinished_document:ens:cls:math', 'unfinished_document', 100, { action: 'create_annual_plan' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.length >= 5,                          'EE01 — ≥5 étapes')
    assert.ok(plan.steps.some(s => s.title.includes('programme annuel')), 'EE01 — étape programme annuel')
    assert.equal(plan.missionType, 'next_lesson',              'EE01 — missionType next_lesson')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE01 — plan valide (${valid.errors.join(';')})`)
    console.log('✓ EE01 — CAS A : create_annual_plan')
  }

  // ── EE02 : CAS B — prepare_first_lesson ──────────────────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 95, { action: 'prepare_first_lesson' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('première leçon') || s.title.toLowerCase().includes('consulter')), 'EE02 — étape première leçon')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE02 — plan valide (${valid.errors.join(';')})`)
    console.log('✓ EE02 — CAS B : prepare_first_lesson')
  }

  // ── EE03 : CAS C — prepare_next_lesson (défaut) ───────────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('dernière leçon')), 'EE03 — étape dernière leçon')
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('génér')),           'EE03 — étape génération')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE03 — plan valide (${valid.errors.join(';')})`)
    console.log('✓ EE03 — CAS C : prepare_next_lesson')
  }

  // ── EE04 : suggestedTopic absent → titre générique ────────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson', suggested_topic: null })
    const plan = buildPlan(m)
    const topicStep = plan.steps.find(s => s.kind === 'select')!
    assert.ok(!topicStep.title.includes('null') && !topicStep.title.includes('undefined'), 'EE04 — pas de null dans titre')
    console.log('✓ EE04 — suggestedTopic absent → titre générique safe')
  }

  // ── EE05 : route Préparer absente → étape open_preparer bloquée ──────────
  {
    const noPrep = { ...ROUTES, prepare: null }
    const m      = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan   = new ExecutionEngine({ routeRegistry: noPrep }).createPlan(m)
    const prepStep = plan.steps.find(s => s.kind === 'navigate' && s.id.includes('preparer'))
    assert.ok(prepStep?.status === 'blocked',                  'EE05 — open_preparer bloqué sans route')
    console.log('✓ EE05 — route Préparer absente → étape bloquée')
  }

  // ── EE06 : classe absente → première étape bloquée, blockingReasons non vide
  {
    const m = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90,
      { action: 'prepare_next_lesson', classe_id: null })
    const plan = buildPlan(m)
    // CAS C : step 2 (verify_progression) n'a aucun requirement → devient 'available'
    // → canStart est true même si step 1 est bloqué
    assert.equal(plan.canStart, true,                          'EE06 — canStart true (step 2 sans requirement)')
    assert.ok(plan.blockingReasons.length > 0,                 'EE06 — blockingReasons non vide')
    const blockedStep = plan.steps.find(s => s.status === 'blocked')
    assert.ok(blockedStep !== undefined,                       'EE06 — au moins 1 step bloqué')
    console.log('✓ EE06 — classe absente → step 1 bloqué, blockingReasons non vide')
  }

  // ── EE07 : suggestedTopic présent → titre de l'étape le contient ──────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90,
      { action: 'prepare_next_lesson', suggested_topic: 'Les fractions décimales' })
    const plan = buildPlan(m)
    const hasTopicStep = plan.steps.some(s => s.title.includes('Les fractions décimales'))
    assert.ok(hasTopicStep,                                    'EE07 — suggested_topic dans les étapes')
    console.log('✓ EE07 — suggestedTopic présent → dans le titre d\'étape')
  }

  // =========================================================================
  // TEMPLATES — EVALUATION
  // =========================================================================

  // ── EE08 : première évaluation ────────────────────────────────────────────
  {
    const m    = makeMission('eval:ens:cls:math', 'evaluation', 85, { action: 'create_first_evaluation' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.length >= 7,                          'EE08 — ≥7 étapes')
    assert.ok(plan.steps.some(s => s.kind === 'prepare'),      'EE08 — étape prepare')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE08 — plan valide (${valid.errors.join(';')})`)
    console.log('✓ EE08 — EvaluationTemplate : première évaluation')
  }

  // ── EE09 : unité terminée ─────────────────────────────────────────────────
  {
    const m    = makeMission('eval:ens:cls:math', 'evaluation', 82, { action: 'evaluate_completed_unit', suggested_unit: 'Les fonctions' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.includes('Les fonctions')),  'EE09 — unité dans titre étape')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE09 — plan valide`)
    console.log('✓ EE09 — EvaluationTemplate : unité terminée')
  }

  // ── EE10 : évaluation régulière ───────────────────────────────────────────
  {
    const m    = makeMission('eval:ens:cls:math', 'evaluation', 80, { action: 'create_evaluation' })
    const plan = buildPlan(m)
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE10 — plan valide`)
    console.log('✓ EE10 — EvaluationTemplate : évaluation régulière')
  }

  // ── EE11 : calendrier disponible → étape schedule non optionnelle ─────────
  {
    const m    = makeMission('eval:ens:cls:math', 'evaluation', 80, { action: 'create_evaluation' })
    const plan = buildPlan(m)
    const schedStep = plan.steps.find(s => s.id.includes('schedule'))
    assert.equal(schedStep?.optional, false,                   'EE11 — schedule non optionnel si calendrier')
    assert.ok(schedStep?.target?.route === '/dashboard/calendrier', 'EE11 — route calendrier')
    console.log('✓ EE11 — calendrier disponible → schedule obligatoire')
  }

  // ── EE12 : calendrier indisponible → étape schedule optionnelle ───────────
  {
    const noCalendar = { ...ROUTES, calendar: null }
    const m    = makeMission('eval:ens:cls:math', 'evaluation', 80, { action: 'create_evaluation' })
    const plan = new ExecutionEngine({ routeRegistry: noCalendar }).createPlan(m)
    const schedStep = plan.steps.find(s => s.id.includes('schedule'))
    assert.equal(schedStep?.optional, true,                    'EE12 — schedule optionnel sans calendrier')
    assert.equal(schedStep?.target,   null,                    'EE12 — target null sans calendrier')
    console.log('✓ EE12 — calendrier indisponible → schedule optionnel')
  }

  // ── EE13 : route Préparer absente → étape open_preparer bloquée ──────────
  {
    const noPrep = { ...ROUTES, prepare: null }
    const m    = makeMission('eval:ens:cls:math', 'evaluation', 80, { action: 'create_evaluation' })
    const plan = new ExecutionEngine({ routeRegistry: noPrep }).createPlan(m)
    const prep = plan.steps.find(s => s.id.includes('preparer'))
    assert.equal(prep?.status, 'blocked',                      'EE13 — preparer bloqué sans route')
    console.log('✓ EE13 — route Préparer absente → bloqué (evaluation)')
  }

  // =========================================================================
  // TEMPLATES — WORK
  // =========================================================================

  // ── EE14 : travaux non corrigés (grade_assignments) ───────────────────────
  {
    const m    = makeMission('work:ens:cls:math', 'work', 70, { action: 'grade_assignments' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.kind === 'correct'),      'EE14 — étape correct')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE14 — plan valide`)
    console.log('✓ EE14 — WorkTemplate : grade_assignments')
  }

  // ── EE15 : travaux en retard (process_overdue) ────────────────────────────
  {
    const m    = makeMission('work:ens:cls:math', 'work', 65, { action: 'process_overdue' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('retard')), 'EE15 — étape retard')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE15 — plan valide`)
    console.log('✓ EE15 — WorkTemplate : process_overdue')
  }

  // ── EE16 : rétroaction manquante (add_feedback) ───────────────────────────
  {
    const m    = makeMission('work:ens:cls:math', 'work', 60, { action: 'add_feedback' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('rétroaction')), 'EE16 — étape rétroaction')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE16 — plan valide`)
    console.log('✓ EE16 — WorkTemplate : add_feedback')
  }

  // ── EE17 : aucun nom d'élève exposé dans les étapes work ─────────────────
  {
    const m    = makeMission('work:ens:cls:math', 'work', 70, { action: 'grade_assignments', student_name: 'Jean Tremblay' })
    const plan = buildPlan(m)
    const allText = plan.steps.flatMap(s => [s.title, s.description, ...s.completionCriteria]).join(' ')
    assert.ok(!allText.includes('Jean Tremblay'),              'EE17 — aucun nom d\'élève')
    console.log('✓ EE17 — aucun nom d\'élève dans plan work')
  }

  // =========================================================================
  // TEMPLATES — STUDENT FOLLOW-UP
  // =========================================================================

  // ── EE18 : plan agrégé (student_high_priority) ───────────────────────────
  {
    const m    = makeMission('student_follow_up:ens:cls', 'student_follow_up', 88, {}, 'student_high_priority')
    const plan = buildPlan(m)
    assert.ok(plan.steps.length >= 5,                          'EE18 — ≥5 étapes')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE18 — plan valide`)
    console.log('✓ EE18 — StudentFollowUpTemplate : agrégé')
  }

  // ── EE19 : aucune donnée nominative dans follow-up ────────────────────────
  {
    const m = makeMission('student_follow_up:ens:cls', 'student_follow_up', 88,
      { priority_student_ids: ['uuid1', 'uuid2'], student_name: 'Marie Côté' }, 'student_high_priority')
    const plan = buildPlan(m)
    const allText = plan.steps.flatMap(s => [s.title, s.description, ...s.completionCriteria]).join(' ')
    assert.ok(!allText.includes('uuid1'),                      'EE19 — pas d\'ID élève dans plan')
    assert.ok(!allText.includes('Marie Côté'),                 'EE19 — pas de nom d\'élève')
    console.log('✓ EE19 — aucune donnée nominative dans follow-up')
  }

  // ── EE20 : route followUp disponible → cible step 1 ──────────────────────
  {
    const m    = makeMission('student_follow_up:ens:cls', 'student_follow_up', 85, {}, 'student_missing_work')
    const plan = buildPlan(m)
    assert.equal(plan.steps[0].target?.route, '/dashboard/suivre', 'EE20 — route suivre')
    console.log('✓ EE20 — route followUp → target step 1')
  }

  // ── EE21 : fallback vers classe si followUp absent ────────────────────────
  {
    const noFollowUp = { ...ROUTES, followUp: null }
    const m    = makeMission('student_follow_up:ens:cls', 'student_follow_up', 85, {}, 'student_attendance')
    const plan = new ExecutionEngine({ routeRegistry: noFollowUp }).createPlan(m)
    assert.ok(plan.steps[0].target?.route?.includes('/dashboard/classes'), 'EE21 — fallback vers classes')
    console.log('✓ EE21 — fallback vers classe si followUp absent')
  }

  // =========================================================================
  // TEMPLATES — DEADLINE
  // =========================================================================

  // ── EE22 : deadline urgente ───────────────────────────────────────────────
  {
    const m    = makeMission(`deadline:${ENS_ID}:${CLASSE_ID}:math:dl-001:urgent`, 'deadline', 94,
      { deadline_id: 'dl-001', deadline_type: 'evaluation', urgency_days: 2 }, 'deadline_urgent')
    const plan = buildPlan(m)
    assert.ok(plan.steps.length >= 5,                          'EE22 — ≥5 étapes')
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('urgent') || s.title.toLowerCase().includes('ouv')), 'EE22 — étape urgence')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE22 — plan valide`)
    console.log('✓ EE22 — DeadlineTemplate : urgente')
  }

  // ── EE23 : deadline prochaine ─────────────────────────────────────────────
  {
    const m    = makeMission(`deadline:${ENS_ID}:${CLASSE_ID}:math:dl-002:upcoming`, 'deadline', 78,
      { deadline_id: 'dl-002' }, 'deadline_upcoming')
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('estim')), 'EE23 — étape estimation')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE23 — plan valide`)
    console.log('✓ EE23 — DeadlineTemplate : prochaine')
  }

  // ── EE24 : interruption scolaire ─────────────────────────────────────────
  {
    const m    = makeMission(`deadline:${ENS_ID}:${CLASSE_ID}:math:break:evt-001`, 'deadline', 72,
      { break_event_id: 'evt-001' }, 'deadline_break')
    const plan = buildPlan(m)
    assert.ok(plan.steps.some(s => s.title.toLowerCase().includes('congé') || s.title.toLowerCase().includes('interrupt')), 'EE24 — étape congé')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE24 — plan valide`)
    console.log('✓ EE24 — DeadlineTemplate : congé / relâche')
  }

  // ── EE25 : deadlineId absent → plan toujours valide ─────────────────────
  {
    const m    = makeMission(`deadline:${ENS_ID}:${CLASSE_ID}:math:dl-003:urgent`, 'deadline', 94,
      {}, 'deadline_urgent')
    const plan = buildPlan(m)
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE25 — valide sans deadlineId explicite`)
    console.log('✓ EE25 — deadlineId absent → plan toujours valide')
  }

  // =========================================================================
  // TEMPLATES — BUNDLE
  // =========================================================================

  const evalM     = makeMission(`evaluation:${ENS_ID}:${CLASSE_ID}:math`, 'evaluation', 90, { action: 'create_evaluation', suggested_unit: 'Algèbre' })
  const deadlineM = makeMission(`deadline:${ENS_ID}:${CLASSE_ID}:math:dl-001:urgent`, 'deadline', 94,
    { deadline_id: 'dl-001', deadline_type: 'evaluation' }, 'deadline_urgent')
  const bundle    = makeBundle(evalM, deadlineM)

  // ── EE26 : evaluation + deadline → bundle plan ───────────────────────────
  {
    const plan = engine.createPlan(bundle)
    assert.equal(plan.sourceType, 'bundle',                    'EE26 — sourceType bundle')
    assert.equal(plan.missionType, 'bundle',                   'EE26 — missionType bundle')
    assert.equal(plan.targetRoute, '/dashboard/gerer/preparer','EE26 — targetRoute preparer')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE26 — plan valide (${valid.errors.join(';')})`)
    console.log('✓ EE26 — BundleTemplate : evaluation + deadline')
  }

  // ── EE27 : aucune étape dupliquée dans le bundle ──────────────────────────
  {
    const plan   = engine.createPlan(bundle)
    const titles = plan.steps.map(s => s.title)
    const unique = new Set(titles)
    assert.equal(unique.size, titles.length,                   'EE27 — pas d\'étapes dupliquées')
    console.log('✓ EE27 — bundle : aucune étape dupliquée')
  }

  // ── EE28 : un seul accès à Préparer dans le bundle ───────────────────────
  {
    const plan      = engine.createPlan(bundle)
    const prepSteps = plan.steps.filter(s => s.target?.route?.includes('preparer'))
    assert.equal(prepSteps.length, 1,                          'EE28 — 1 seul passage vers Préparer')
    console.log('✓ EE28 — bundle : 1 seul accès Préparer')
  }

  // ── EE29 : missions sources du bundle absentes des steps ─────────────────
  {
    const plan = engine.createPlan(bundle)
    // Les missions sources (eval + deadline) ne doivent pas apparaître comme étapes individuelles
    // Les étapes du bundle sont celles du BundleTemplate uniquement
    assert.ok(plan.steps.every(s => !s.id.startsWith('execution:evaluation')), 'EE29 — pas d\'étapes evaluation individuelles')
    console.log('✓ EE29 — missions sources absentes des étapes du bundle')
  }

  // =========================================================================
  // TEMPLATES — GENERIC
  // =========================================================================

  // ── EE30 : type inconnu → GenericTemplate ────────────────────────────────
  {
    const m    = makeMission('resume_generation:ens:cls:math', 'resume_generation', 50)
    const plan = buildPlan(m)
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE30 — generic valide (${valid.errors.join(';')})`)
    console.log('✓ EE30 — type inconnu → GenericTemplate')
  }

  // ── EE31 : metadata vide → plan générique safe ────────────────────────────
  {
    const m = { ...makeMission('resume_generation:ens:cls:math', 'resume_generation', 50), metadata: {} }
    const plan = buildPlan(m)
    assert.ok(plan.steps.length > 0,                           'EE31 — plan non vide')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE31 — plan générique valide avec metadata vide`)
    console.log('✓ EE31 — metadata vide → plan générique safe')
  }

  // ── EE32 : targetRoute absent → plan toujours valide ─────────────────────
  {
    const noRoutes = { ...ROUTES, prepare: null, classes: null, classDetails: null, followUp: null, calendar: null, library: null }
    const m    = makeMission('resume_generation:ens:cls:math', 'resume_generation', 50)
    const plan = new ExecutionEngine({ routeRegistry: noRoutes }).createPlan(m)
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE32 — valid sans aucune route`)
    console.log('✓ EE32 — targetRoute absent → plan générique valide')
  }

  // =========================================================================
  // MOTEUR — PROPRIÉTÉS TRANSVERSALES
  // =========================================================================

  // ── EE33 : plan déterministe (même entrée → même sortie) ────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const p1   = buildPlan(m)
    const p2   = buildPlan(m)
    assert.equal(p1.id, p2.id,                                 'EE33 — plan id identique')
    assert.equal(p1.steps.length, p2.steps.length,             'EE33 — même nb d\'étapes')
    assert.equal(p1.steps[0].id, p2.steps[0].id,              'EE33 — même step[0] id')
    console.log('✓ EE33 — plan déterministe')
  }

  // ── EE34 : IDs déterministes — format attendu ────────────────────────────
  {
    const id   = 'next_lesson:ens:cls:math'
    const m    = makeMission(id, 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    assert.equal(plan.id, `execution:${id}`,                   'EE34 — plan id = execution:{sourceId}')
    assert.ok(plan.steps[0].id.startsWith(`execution:${id}:step:`), 'EE34 — step id format correct')
    console.log('✓ EE34 — IDs déterministes format correct')
  }

  // ── EE35 : ordre stable (steps ordonnés par .order) ──────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    const orders = plan.steps.map(s => s.order)
    const sorted = [...orders].sort((a, b) => a - b)
    assert.deepEqual(orders, sorted,                           'EE35 — steps ordonnés par .order croissant')
    console.log('✓ EE35 — ordre stable')
  }

  // ── EE36 : une seule étape available au démarrage ────────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    const avail = plan.steps.filter(s => s.status === 'available')
    assert.equal(avail.length, 1,                              'EE36 — exactement 1 étape available')
    console.log('✓ EE36 — exactement 1 étape available au démarrage')
  }

  // ── EE37 : canStart vrai si ≥1 étape available ───────────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    assert.equal(plan.canStart, true,                          'EE37 — canStart true')
    console.log('✓ EE37 — canStart true si étape available')
  }

  // ── EE38 : canStart faux via custom template (toutes étapes bloquées) ────
  {
    // Les templates réels ont toujours au moins 1 step sans requirement.
    // Pour tester canStart=false, on utilise un template custom qui bloque tout.
    const allBlockedReq = { code: 'req', label: 'Requis manquant.', satisfied: false as const, blocking: true as const }

    const customTemplate: ExecutionTemplate = {
      id: 'all-blocked-test',
      supports: () => true,
      buildRecipe: (_ctx): ExecutionRecipe => ({
        id:         makePlanId('test:all:blocked'),
        sourceType: 'mission',
        sourceId:   'test:all:blocked',
        missionType: 'next_lesson',
        title:      'Plan tout bloqué',
        objective:  'Test.',
        classeId:   null,
        matiere:    null,
        steps: [
          {
            code: 's1', capability: 'generic_review',
            title: 'Étape bloquée 1', description: 'Toujours bloquée.',
            requirements: [allBlockedReq],
            completionCriteria: ['Requis satisfait.'], estimatedMinutes: 5,
          },
          {
            code: 's2', capability: 'generic_review',
            title: 'Étape bloquée 2', description: 'Toujours bloquée.',
            requirements: [allBlockedReq],
            completionCriteria: ['Requis satisfait.'], estimatedMinutes: 5,
          },
        ],
        version: EXECUTION_RECIPE_VERSION,
      }),
    }

    const reg  = new ExecutionRegistry([customTemplate])
    const eng  = new ExecutionEngine({ registry: reg })
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = eng.createPlan(m)
    assert.equal(plan.canStart, false,                         'EE38 — canStart false : toutes étapes bloquées')
    assert.ok(plan.blockingReasons.length > 0,                 'EE38 — blockingReasons non vide')
    console.log('✓ EE38 — canStart false via custom template (toutes étapes bloquées)')
  }

  // ── EE39 : summary correct ───────────────────────────────────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    assert.equal(plan.summary.totalSteps, plan.steps.length,   'EE39 — totalSteps correct')
    assert.ok(plan.summary.actionableSteps >= 1,               'EE39 — ≥1 actionable step')
    assert.ok(plan.summary.firstActionLabel !== null,          'EE39 — firstActionLabel présent')
    console.log('✓ EE39 — summary correct')
  }

  // ── EE40 : estimation totale non nulle pour next_lesson ──────────────────
  {
    const m    = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const plan = buildPlan(m)
    assert.ok((plan.summary.estimatedMinutes ?? 0) > 0,        'EE40 — estimatedMinutes > 0')
    console.log('✓ EE40 — estimatedMinutes > 0 pour next_lesson')
  }

  // ── EE41 : validation intégrée ───────────────────────────────────────────
  {
    const m    = makeMission('evaluation:ens:cls:math', 'evaluation', 80, { action: 'create_evaluation' })
    const plan = buildPlan(m)
    const v    = validateExecutionPlan(plan)
    assert.equal(v.valid, true,                                `EE41 — plan evaluation valide (${v.errors.join(';')})`)
    console.log('✓ EE41 — validation intégrée : plan evaluation valide')
  }

  // ── EE42 : fallback GenericTemplate pour type inconnu ────────────────────
  {
    const m    = makeMission('unfinished_document:ens:cls:math', 'unfinished_document', 50, { action: 'something_unknown' })
    const plan = buildPlan(m)
    assert.ok(plan.steps.length >= 3,                          'EE42 — fallback ≥3 étapes')
    const valid = validateExecutionPlan(plan)
    assert.equal(valid.valid, true,                            `EE42 — fallback valide`)
    console.log('✓ EE42 — fallback GenericTemplate pour action inconnue')
  }

  // =========================================================================
  // createPlans (MissionPlan)
  // =========================================================================

  // ── EE43 : createPlans avec MissionPlan vide ─────────────────────────────
  {
    const mp = new DecisionEngine().run([])
    const { primary, secondary } = engine.createPlans(mp)
    assert.equal(primary,           null, 'EE43 — primary null pour plan vide')
    assert.equal(secondary.length,  0,    'EE43 — secondary vide pour plan vide')
    console.log('✓ EE43 — createPlans : MissionPlan vide')
  }

  // ── EE44 : createPlans — mission principale ───────────────────────────────
  {
    const m  = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const mp = new DecisionEngine().run([m])
    const { primary } = engine.createPlans(mp)
    assert.ok(primary !== null,                                'EE44 — primary non null')
    assert.equal(primary!.missionType, 'next_lesson',         'EE44 — missionType correct')
    console.log('✓ EE44 — createPlans : mission principale')
  }

  // ── EE45 : createPlans — trois missions secondaires ───────────────────────
  {
    const m1 = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const m2 = makeMission('work:ens:cls:math', 'work', 70, { action: 'grade_assignments' })
    const m3 = makeMission('student_follow_up:ens:cls', 'student_follow_up', 65, {}, 'student_attendance')
    const m4 = makeMission('evaluation:ens:cls:math', 'evaluation', 60, { action: 'create_evaluation' })
    const mp = new DecisionEngine().run([m1, m2, m3, m4])
    const { primary, secondary } = engine.createPlans(mp)
    assert.ok(primary !== null,                                'EE45 — primary présent')
    assert.equal(secondary.length, 3,                         'EE45 — 3 plans secondaires')
    console.log('✓ EE45 — createPlans : 3 missions secondaires → 3 plans')
  }

  // ── EE46 : deferred ignorées ─────────────────────────────────────────────
  {
    const m1 = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const m2 = makeMission('work:ens:cls:math', 'work', 70, { action: 'grade_assignments' })
    const m3 = makeMission('student_follow_up:ens:cls', 'student_follow_up', 65, {}, 'student_attendance')
    const m4 = makeMission('evaluation:ens:cls:math', 'evaluation', 60, { action: 'create_evaluation' })
    const m5 = makeMission('resume_generation:ens:cls:math', 'resume_generation', 50)   // → deferred
    const mp = new DecisionEngine().run([m1, m2, m3, m4, m5])
    const { primary, secondary } = engine.createPlans(mp)
    const totalPlans = (primary ? 1 : 0) + secondary.length
    assert.equal(totalPlans, 4,                               'EE46 — deferred non inclue (max 4 plans)')
    console.log('✓ EE46 — deferred ignorée dans createPlans')
  }

  // ── EE47 : hidden ignorées (completed) ───────────────────────────────────
  {
    const m1 = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const m2 = makeMission('work:ens:cls:math', 'work', 70, { action: 'grade_assignments' }, 'test', 'completed')
    const mp = new DecisionEngine().run([m1, m2])
    const { primary, secondary } = engine.createPlans(mp)
    assert.ok(primary !== null,                               'EE47 — primary présent')
    assert.equal(secondary.length, 0,                        'EE47 — completed non inclue dans secondary')
    console.log('✓ EE47 — hidden (completed) ignorée dans createPlans')
  }

  // ── EE48 : dismissed ignorée ─────────────────────────────────────────────
  {
    const m1 = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const m2 = makeMission('work:ens:cls:math', 'work', 70, { action: 'grade_assignments' }, 'test', 'dismissed')
    const mp = new DecisionEngine().run([m1, m2])
    const { secondary } = engine.createPlans(mp)
    const secondaryIds = secondary.map(p => p.sourceId)
    assert.ok(!secondaryIds.some(id => id.includes('work')), 'EE48 — dismissed non inclue')
    console.log('✓ EE48 — dismissed ignorée dans createPlans')
  }

  // ── EE49 : bundle remplace ses sources dans createPlans ──────────────────
  {
    const e   = makeMission(`evaluation:${ENS_ID}:${CLASSE_ID}:math`, 'evaluation', 90, { action: 'create_evaluation' })
    const d   = makeMission(`deadline:${ENS_ID}:${CLASSE_ID}:math:dl-001:urgent`, 'deadline', 94,
      { deadline_id: 'dl-001' }, 'deadline_urgent')
    const mp  = new DecisionEngine().run([e, d])
    const { primary, secondary } = engine.createPlans(mp)

    // Le bundle devient le plan principal
    assert.ok(primary !== null,                               'EE49 — primary présent (bundle)')
    assert.equal(primary!.sourceType, 'bundle',              'EE49 — sourceType bundle')
    // eval et deadline ne sont PAS dans secondary
    const secIds = secondary.map(p => p.sourceId)
    assert.ok(!secIds.some(id => id.startsWith('evaluation')), 'EE49 — eval absente en secondary (bundlée)')
    assert.ok(!secIds.some(id => id.startsWith('deadline')),   'EE49 — deadline absente en secondary (bundlée)')
    console.log('✓ EE49 — bundle remplace ses sources dans createPlans')
  }

  // ── EE50 : MissionPlan non muté par createPlans ───────────────────────────
  {
    const m  = makeMission('next_lesson:ens:cls:math', 'next_lesson', 90, { action: 'prepare_next_lesson' })
    const mp = new DecisionEngine().run([m])
    const primaryBefore = mp.primaryMission?.id
    engine.createPlans(mp)
    assert.equal(mp.primaryMission?.id, primaryBefore,        'EE50 — MissionPlan non muté')
    console.log('✓ EE50 — MissionPlan non muté par createPlans')
  }

  console.log('\n✅ Tous les tests Execution Engine (ME-13) passent.')
}

runTests().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
