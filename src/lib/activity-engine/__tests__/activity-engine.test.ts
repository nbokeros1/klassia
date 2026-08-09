// ── Tests : Activity Engine (ME-15) ───────────────────────────────────────────
//
// Tests unitaires sans dépendance Supabase.
// Exécution : npx tsx src/lib/activity-engine/__tests__/activity-engine.test.ts

import assert from 'node:assert/strict'

import type { SupabaseClient }             from '@supabase/supabase-js'
import { validateActivityEvent }           from '../activity-validator'
import { sanitizeMetadata, buildEventId }  from '../activity-sanitizer'
import { ActivityBus }                     from '../event-bus'
import { ActivityRegistry }                from '../event-registry'
import { EventDispatcher }                 from '../event-dispatcher'
import { countsFromRecord, startOf }       from '../activity-summary'
import {
  ActivitySource, ACTIVITY_TYPES, ACTIVITY_ENGINE_VERSION,
} from '../event-types'
import {
  ActivityEngine,
  WorkflowHandler, MissionHandler, LessonHandler,
  EvaluationHandler, DocumentHandler, CalendarHandler,
} from '../activity-engine'
import type { ActivityEvent }  from '../event-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id:         buildEventId(),
    type:       'lesson_created',
    occurredAt: new Date().toISOString(),
    teacherId:  'teacher-1',
    classId:    'cls-1',
    subject:    'Math',
    entityId:   'lesson-1',
    entityType: 'lesson',
    metadata:   {},
    source:     ActivitySource.USER,
    version:    ACTIVITY_ENGINE_VERSION,
    ...overrides,
  }
}

function makeSupabaseMock(): SupabaseClient {
  return {
    from: () => ({
      insert: (_data: unknown) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
        }),
      }),
      select: (_cols?: string) => ({
        eq:     function(this: unknown) { return this },
        gte:    function(this: unknown) { return this },
        lte:    function(this: unknown) { return this },
        in:     function(this: unknown) { return this },
        order:  function(this: unknown) { return this },
        limit:  function(this: unknown) { return this },
        then:   (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient
}

// ── AE01 : validateActivityEvent — champs requis ──────────────────────────────

{
  const result = validateActivityEvent(makeEvent())
  assert.equal(result.valid, true,  'AE01a: événement valide passe la validation')
  assert.equal(result.errors.length, 0, 'AE01b: aucune erreur sur événement valide')
}

// AE01c : id manquant
{
  const r = validateActivityEvent(makeEvent({ id: '' }))
  assert.equal(r.valid, false, 'AE01c: id vide → invalide')
  assert.ok(r.errors.some(e => e.includes('id')), 'AE01c: erreur mentionne "id"')
}

// AE01d : type invalide
{
  const r = validateActivityEvent(makeEvent({ type: 'invented_type' as ActivityEvent['type'] }))
  assert.equal(r.valid, false, 'AE01d: type invalide → invalide')
}

// AE01e : occurredAt invalide
{
  const r = validateActivityEvent(makeEvent({ occurredAt: 'not-a-date' }))
  assert.equal(r.valid, false, 'AE01e: occurredAt non-ISO → invalide')
}

// AE01f : null input
{
  const r = validateActivityEvent(null)
  assert.equal(r.valid, false, 'AE01f: null → invalide')
}

// ── AE02 : validateActivityEvent — métadonnées sensibles ─────────────────────

// AE02a : metadata avec clé storage_path
{
  const r = validateActivityEvent(makeEvent({ metadata: { storage_path: '/bucket/file' } }))
  assert.equal(r.valid, false, 'AE02a: storage_path dans metadata → invalide')
}

// AE02b : metadata avec token
{
  const r = validateActivityEvent(makeEvent({ metadata: { token: 'secret123' } }))
  assert.equal(r.valid, false, 'AE02b: token dans metadata → invalide')
}

// AE02c : metadata trop grande (>2048 octets)
{
  const bigMeta: Record<string, unknown> = {}
  for (let i = 0; i < 300; i++) bigMeta[`key_${i}`] = 'abcdefghij'
  const r = validateActivityEvent(makeEvent({ metadata: bigMeta }))
  assert.equal(r.valid, false, 'AE02c: metadata >2048 octets → invalide')
}

// AE02d : metadata normale acceptée
{
  const r = validateActivityEvent(makeEvent({ metadata: { stepId: 's1', percent: 80 } }))
  assert.equal(r.valid, true, 'AE02d: metadata normale → valide')
}

// ── AE03 : sanitizeMetadata ───────────────────────────────────────────────────

// AE03a : retire les clés bloquées
{
  const input = { title: 'leçon 1', storage_path: '/private', token: 'abc', missionType: 'lecon' }
  const out = sanitizeMetadata(input)
  assert.ok(!('storage_path' in out), 'AE03a: storage_path supprimé')
  assert.ok(!('token' in out),        'AE03a: token supprimé')
  assert.ok('title' in out,           'AE03a: title conservé')
  assert.ok('missionType' in out,     'AE03a: missionType conservé')
}

// AE03b : récursif
{
  const input = { nested: { password: 'pw', label: 'ok' } }
  const out = sanitizeMetadata(input) as Record<string, Record<string, unknown>>
  assert.ok(!('password' in out['nested']), 'AE03b: password imbriqué supprimé')
  assert.ok('label' in out['nested'],       'AE03b: label imbriqué conservé')
}

// AE03c : objet source non muté
{
  const input = { a: 1, private_key: 'pem' }
  sanitizeMetadata(input)
  assert.ok('private_key' in input, 'AE03c: objet source non muté')
}

// ── AE04 : ActivityBus ────────────────────────────────────────────────────────

// AE04a : subscribe + publish
{
  const bus      = new ActivityBus()
  const received: ActivityEvent[] = []
  bus.subscribe('lesson_created', e => { received.push(e) })
  const ev = makeEvent()
  bus.publish(ev)
  assert.equal(received.length, 1,       'AE04a: handler reçoit 1 événement')
  assert.equal(received[0]!.id, ev.id,   'AE04a: bon id reçu')
}

// AE04b : wildcard reçoit tous les types
{
  const bus      = new ActivityBus()
  const received: ActivityEvent[] = []
  bus.subscribe('*', e => { received.push(e) })
  bus.publish(makeEvent({ type: 'lesson_created' }))
  bus.publish(makeEvent({ type: 'workflow_started' }))
  bus.publish(makeEvent({ type: 'mission_completed' }))
  assert.equal(received.length, 3, 'AE04b: wildcard reçoit 3 événements différents')
}

// AE04c : unsubscribe stoppe la réception
{
  const bus      = new ActivityBus()
  const received: ActivityEvent[] = []
  const unsub = bus.subscribe('lesson_created', e => { received.push(e) })
  bus.publish(makeEvent())
  unsub()
  bus.publish(makeEvent())
  assert.equal(received.length, 1, 'AE04c: unsubscribe stoppe après 1er événement')
}

// AE04d : subscriberCount
{
  const bus = new ActivityBus()
  assert.equal(bus.subscriberCount('lesson_created'), 0, 'AE04d: 0 avant subscription')
  const unsub = bus.subscribe('lesson_created', () => { /* noop */ })
  assert.equal(bus.subscriberCount('lesson_created'), 1, 'AE04d: 1 après subscription')
  unsub()
  assert.equal(bus.subscriberCount('lesson_created'), 0, 'AE04d: 0 après unsubscribe')
}

// AE04e : erreur dans handler n'arrête pas les autres
{
  const bus      = new ActivityBus()
  const received: ActivityEvent[] = []
  bus.subscribe('lesson_created', () => { throw new Error('intentional') })
  bus.subscribe('lesson_created', e => { received.push(e) })
  bus.publish(makeEvent())
  assert.equal(received.length, 1, 'AE04e: 2e handler reçoit malgré erreur dans 1er')
}

// AE04f : clear vide tous les subscribers
{
  const bus = new ActivityBus()
  bus.subscribe('lesson_created', () => { /* noop */ })
  bus.subscribe('*', () => { /* noop */ })
  bus.clear()
  assert.equal(bus.subscriberCount(), 0, 'AE04f: clear vide tout')
}

// ── AE05 : ActivityRegistry ───────────────────────────────────────────────────

// AE05a : register + getHandlers retourne le bon handler
{
  const reg     = new ActivityRegistry()
  const handler = () => { /* noop */ }
  reg.register('lesson_created', handler)
  const handlers = reg.getHandlers('lesson_created')
  assert.ok(handlers.includes(handler), 'AE05a: handler enregistré retrouvé')
}

// AE05b : wildcard inclus dans getHandlers pour tout type
{
  const reg         = new ActivityRegistry()
  const typeHandler = () => { /* noop */ }
  const starHandler = () => { /* noop */ }
  reg.register('workflow_started', typeHandler)
  reg.register('*', starHandler)
  const handlers = reg.getHandlers('workflow_started')
  assert.ok(handlers.includes(typeHandler), 'AE05b: type-specific handler présent')
  assert.ok(handlers.includes(starHandler), 'AE05b: wildcard handler présent')
}

// AE05c : unregister retire le handler
{
  const reg     = new ActivityRegistry()
  const handler = () => { /* noop */ }
  reg.register('lesson_created', handler)
  reg.unregister('lesson_created', handler)
  assert.equal(reg.getHandlers('lesson_created').length, 0, 'AE05c: handler retiré')
}

// AE05d : registeredTypes liste les types enregistrés
{
  const reg = new ActivityRegistry()
  reg.register('lesson_created', () => { /* noop */ })
  reg.register('*', () => { /* noop */ })
  const types = reg.registeredTypes()
  assert.ok(types.includes('lesson_created'), 'AE05d: lesson_created listé')
  assert.ok(types.includes('*'),              'AE05d: wildcard listé')
}

// ── AE06 : EventDispatcher ────────────────────────────────────────────────────

// AE06a : dispatch appelle les handlers du registry
{
  const reg    = new ActivityRegistry()
  const called: ActivityEvent[] = []
  reg.register('*', e => { called.push(e) })
  const dispatcher = new EventDispatcher(reg)
  const ev = makeEvent()
  dispatcher.dispatch(ev)
  assert.equal(called.length, 1,       'AE06a: dispatcher invoque le handler du registry')
  assert.equal(called[0]!.id, ev.id,   'AE06a: bon événement transmis')
}

// ── AE07 : WorkflowHandler ────────────────────────────────────────────────────

// AE07a : onStarted publie workflow_started
{
  const bus     = new ActivityBus()
  const emitted: ActivityEvent[] = []
  bus.subscribe('workflow_started', e => { emitted.push(e) })
  const handler = new WorkflowHandler(bus, 'teacher-1')
  handler.onStarted('wf-1', 'cls-1', 'Math', 'lecon')
  assert.equal(emitted.length, 1,                         'AE07a: 1 événement émis')
  assert.equal(emitted[0]!.type, 'workflow_started',      'AE07a: type correct')
  assert.equal(emitted[0]!.entityId, 'wf-1',              'AE07a: entityId correct')
  assert.equal(emitted[0]!.metadata['missionType'], 'lecon', 'AE07a: missionType dans metadata')
}

// AE07b : onStepCompleted publie avec percent
{
  const bus     = new ActivityBus()
  const emitted: ActivityEvent[] = []
  bus.subscribe('workflow_step_completed', e => { emitted.push(e) })
  const handler = new WorkflowHandler(bus, 'teacher-1')
  handler.onStepCompleted('wf-1', 's1', 'cls-1', 'Math', 75)
  assert.equal(emitted[0]!.type, 'workflow_step_completed', 'AE07b: type correct')
  assert.equal(emitted[0]!.metadata['percent'], 75,          'AE07b: percent dans metadata')
  assert.equal(emitted[0]!.metadata['stepId'], 's1',         'AE07b: stepId dans metadata')
}

// AE07c : tous les types workflow publiés avec source WORKFLOW
{
  const bus     = new ActivityBus()
  const sources: ActivitySource[] = []
  bus.subscribe('*', e => { if (e.entityType === 'workflow') sources.push(e.source) })
  const h = new WorkflowHandler(bus, 'teacher-1')
  h.onPaused('wf-1',    null, null)
  h.onResumed('wf-1',   null, null)
  h.onCompleted('wf-1', null, null, 100)
  h.onCancelled('wf-1', null, null)
  h.onStepStarted('wf-1', 's1', null, null)
  h.onStepSkipped('wf-1', 's1', null, null)
  assert.ok(sources.every(s => s === ActivitySource.WORKFLOW), 'AE07c: tous les sources sont WORKFLOW')
}

// ── AE08 : MissionHandler ─────────────────────────────────────────────────────

// AE08a : onCompleted publie mission_completed
{
  const bus     = new ActivityBus()
  const emitted: ActivityEvent[] = []
  bus.subscribe('mission_completed', e => { emitted.push(e) })
  const h = new MissionHandler(bus, 'teacher-1')
  h.onCompleted('mission-1', 'cls-1', 'Français', 'evaluation')
  assert.equal(emitted.length, 1,                      'AE08a: 1 événement')
  assert.equal(emitted[0]!.type, 'mission_completed',  'AE08a: type correct')
  assert.equal(emitted[0]!.entityId, 'mission-1',      'AE08a: entityId correct')
}

// AE08b : onRestored publie mission_restored
{
  const bus     = new ActivityBus()
  const emitted: ActivityEvent[] = []
  bus.subscribe('mission_restored', e => { emitted.push(e) })
  const h = new MissionHandler(bus, 'teacher-1')
  h.onRestored('mission-2', 'cls-2', null)
  assert.equal(emitted[0]!.type, 'mission_restored', 'AE08b: type correct')
}

// ── AE09 : LessonHandler / EvaluationHandler / DocumentHandler / CalendarHandler

// AE09a : LessonHandler publie les 3 types
{
  const bus   = new ActivityBus()
  const types: string[] = []
  bus.subscribe('*', e => { types.push(e.type) })
  const h = new LessonHandler(bus, 'teacher-1')
  h.onCreated('l1', 'cls-1', 'Math')
  h.onUpdated('l1', 'cls-1', 'Math')
  h.onDeleted('l1', 'cls-1', 'Math')
  assert.deepEqual(types, ['lesson_created', 'lesson_updated', 'lesson_deleted'], 'AE09a: 3 types leçon')
}

// AE09b : EvaluationHandler publie les 3 types
{
  const bus   = new ActivityBus()
  const types: string[] = []
  bus.subscribe('*', e => { types.push(e.type) })
  const h = new EvaluationHandler(bus, 'teacher-1')
  h.onCreated('ev1', 'cls-1', 'Sciences')
  h.onUpdated('ev1', 'cls-1', 'Sciences')
  h.onDeleted('ev1', 'cls-1', 'Sciences')
  assert.deepEqual(types, ['evaluation_created', 'evaluation_updated', 'evaluation_deleted'], 'AE09b: 3 types évaluation')
}

// AE09c : DocumentHandler publie les 3 types
{
  const bus   = new ActivityBus()
  const types: string[] = []
  bus.subscribe('*', e => { types.push(e.type) })
  const h = new DocumentHandler(bus, 'teacher-1')
  h.onUploaded('doc1', 'cls-1', null)
  h.onDeleted ('doc1', 'cls-1', null)
  h.onMoved   ('doc1', 'cls-1', null)
  assert.deepEqual(types, ['document_uploaded', 'document_deleted', 'document_moved'], 'AE09c: 3 types document')
}

// AE09d : CalendarHandler publie les 3 types
{
  const bus   = new ActivityBus()
  const types: string[] = []
  bus.subscribe('*', e => { types.push(e.type) })
  const h = new CalendarHandler(bus, 'teacher-1')
  h.onCreated('cal1', 'cls-1', null)
  h.onUpdated('cal1', 'cls-1', null)
  h.onDeleted('cal1', 'cls-1', null)
  assert.deepEqual(types, ['calendar_event_created', 'calendar_event_updated', 'calendar_event_deleted'], 'AE09d: 3 types calendrier')
}

// ── AE10 : ActivityEngine — orchestration ─────────────────────────────────────

// AE10a : engine instancie tous les handlers
{
  const engine = new ActivityEngine(makeSupabaseMock(), 'teacher-1')
  assert.ok(engine.workflow   instanceof WorkflowHandler,   'AE10a: WorkflowHandler présent')
  assert.ok(engine.mission    instanceof MissionHandler,    'AE10a: MissionHandler présent')
  assert.ok(engine.lesson     instanceof LessonHandler,     'AE10a: LessonHandler présent')
  assert.ok(engine.evaluation instanceof EvaluationHandler, 'AE10a: EvaluationHandler présent')
  assert.ok(engine.document   instanceof DocumentHandler,   'AE10a: DocumentHandler présent')
  assert.ok(engine.calendar   instanceof CalendarHandler,   'AE10a: CalendarHandler présent')
}

// AE10b : publish valide passe — publish invalide silencieux
{
  const engine = new ActivityEngine(makeSupabaseMock(), 'teacher-1')
  assert.doesNotThrow(() => { engine.publish(makeEvent()) }, 'AE10b: publish valide ne throw pas')
  assert.doesNotThrow(() => {
    engine.publish(makeEvent({ type: 'INVALID' as ActivityEvent['type'] }))
  }, 'AE10b: publish invalide ne throw pas')
}

// AE10c : bus → dispatcher → registry chain intact
{
  const engine      = new ActivityEngine(makeSupabaseMock(), 'teacher-1')
  const dispatched: ActivityEvent[] = []
  engine.registry.register('lesson_created', e => { dispatched.push(e) })

  const ev = makeEvent({ type: 'lesson_created' })
  engine.bus.publish(ev)

  assert.equal(dispatched.length, 1,          'AE10c: événement routé bus→dispatcher→registry')
  assert.equal(dispatched[0]!.id, ev.id,      'AE10c: bon événement routé')
}

// AE10d : wildcard persistence handler enregistré dès le constructeur
{
  const engine      = new ActivityEngine(makeSupabaseMock(), 'teacher-1')
  const wildcardCnt = engine.registry.getHandlers('lesson_created').length
  assert.ok(wildcardCnt >= 1, 'AE10d: au moins 1 handler wildcard (persistance) enregistré')
}

// AE10e : handler workflow publie via le bus → observable par subscriber externe
{
  const engine   = new ActivityEngine(makeSupabaseMock(), 'teacher-1')
  const received: ActivityEvent[] = []
  engine.bus.subscribe('workflow_completed', e => { received.push(e) })

  engine.workflow.onCompleted('wf-abc', 'cls-1', 'Math', 100)
  assert.equal(received.length, 1,                        'AE10e: 1 événement reçu')
  assert.equal(received[0]!.type, 'workflow_completed',   'AE10e: type correct')
  assert.equal(received[0]!.teacherId, 'teacher-1',       'AE10e: teacherId correct')
}

// ── AE11 : countsFromRecord ───────────────────────────────────────────────────

// AE11a : catégorisation correcte
{
  const record: Record<string, number> = {
    lesson_created: 3, lesson_updated: 1,
    evaluation_created: 2,
    document_uploaded: 1,
    workflow_started: 1, workflow_completed: 1,
    mission_completed: 2,
  }
  const counts = countsFromRecord(record)
  assert.equal(counts.lessons,     4,  'AE11a: 4 leçons')
  assert.equal(counts.evaluations, 2,  'AE11a: 2 évaluations')
  assert.equal(counts.documents,   1,  'AE11a: 1 document')
  assert.equal(counts.workflows,   2,  'AE11a: 2 workflows')
  assert.equal(counts.total,      11,  'AE11a: 11 total')
}

// AE11b : enregistrement vide → tous à 0
{
  const counts = countsFromRecord({})
  assert.equal(counts.total, 0, 'AE11b: total 0 si vide')
}

// ── AE12 : startOf ────────────────────────────────────────────────────────────

// AE12a : startOf day
{
  const d = new Date('2026-07-15T14:30:00')
  const s = startOf('day', d)
  assert.equal(s.getHours(),   0,  'AE12a: heures à 0')
  assert.equal(s.getMinutes(), 0,  'AE12a: minutes à 0')
  assert.equal(s.getSeconds(), 0,  'AE12a: secondes à 0')
  assert.equal(s.getDate(),   15,  'AE12a: jour conservé')
}

// AE12b : startOf month remet le jour à 1
{
  const d = new Date('2026-07-15T14:30:00')
  const s = startOf('month', d)
  assert.equal(s.getDate(), 1, 'AE12b: premier jour du mois')
}

// AE12c : startOf week recule au dimanche
{
  const d = new Date('2026-07-13T12:00:00')   // lundi
  const s = startOf('week', d)
  assert.equal(s.getDay(), 0, 'AE12c: retour au dimanche')
}

// ── AE13 : event-types — ACTIVITY_TYPES exhaustif ────────────────────────────

// AE13a : 26 types déclarés
{
  assert.equal(ACTIVITY_TYPES.length, 26, 'AE13a: exactement 26 ActivityTypes')
}

// AE13b : tous les types attendus sont dans la liste
{
  const expected: ActivityEvent['type'][] = [
    'lesson_created', 'lesson_updated', 'lesson_deleted',
    'evaluation_created', 'evaluation_updated', 'evaluation_deleted',
    'document_uploaded', 'document_deleted', 'document_moved',
    'calendar_event_created', 'calendar_event_updated', 'calendar_event_deleted',
    'assignment_corrected', 'feedback_added',
    'workflow_started', 'workflow_paused', 'workflow_resumed',
    'workflow_completed', 'workflow_cancelled',
    'workflow_step_started', 'workflow_step_completed', 'workflow_step_skipped',
    'mission_completed', 'mission_restored',
    'ia_conversation_started', 'ia_document_generated',
  ]
  for (const t of expected) {
    assert.ok(ACTIVITY_TYPES.includes(t), `AE13b: "${t}" dans ACTIVITY_TYPES`)
  }
}

// ── AE14 : buildEventId ───────────────────────────────────────────────────────

// AE14a : retourne une string UUID-like non vide
{
  const id = buildEventId()
  assert.equal(typeof id, 'string',               'AE14a: string')
  assert.ok(id.length > 0,                         'AE14a: non vide')
  assert.ok(/^[0-9a-f-]{36}$/.test(id),           'AE14a: format UUID')
}

// AE14b : chaque appel retourne un id unique
{
  const ids = new Set(Array.from({ length: 100 }, () => buildEventId()))
  assert.equal(ids.size, 100, 'AE14b: 100 ids uniques')
}

// ── AE15 : validateActivityEvent — tous les ACTIVITY_TYPES passent ───────────

{
  for (const type of ACTIVITY_TYPES) {
    const r = validateActivityEvent(makeEvent({ type }))
    assert.equal(r.valid, true, `AE15: type "${type}" est un type valide`)
  }
}

// ── AE16 : ActivityEngine — sanitization via BaseHandler.emit ─────────────────

// AE16a : metadata sensible émise par handler est automatiquement sanitisée
{
  const engine   = new ActivityEngine(makeSupabaseMock(), 'teacher-1')
  const received: ActivityEvent[] = []
  engine.bus.subscribe('lesson_created', e => { received.push(e) })

  const h = new LessonHandler(engine.bus, 'teacher-1')
  h.onCreated('l1', 'cls-1', 'Math', { storage_path: '/private', title: 'OK' })

  assert.equal(received.length, 1,                          'AE16a: événement reçu')
  assert.ok(!('storage_path' in received[0]!.metadata),     'AE16a: storage_path retiré')
  assert.ok('title' in received[0]!.metadata,               'AE16a: title conservé')
}

// ── AE17 : ActivitySource enum ────────────────────────────────────────────────

{
  assert.equal(ActivitySource.USER,     'USER',     'AE17: USER')
  assert.equal(ActivitySource.SYSTEM,   'SYSTEM',   'AE17: SYSTEM')
  assert.equal(ActivitySource.WORKFLOW, 'WORKFLOW', 'AE17: WORKFLOW')
  assert.equal(ActivitySource.API,      'API',      'AE17: API')
  assert.equal(ActivitySource.IMPORT,   'IMPORT',   'AE17: IMPORT')
}

// ── AE18 : MissionHandler — source est SYSTEM ─────────────────────────────────

{
  const bus     = new ActivityBus()
  const sources: ActivitySource[] = []
  bus.subscribe('*', e => { if (e.entityType === 'mission') sources.push(e.source) })
  const h = new MissionHandler(bus, 'teacher-1')
  h.onCompleted('m1', null, null)
  h.onRestored ('m1', null, null)
  assert.ok(sources.every(s => s === ActivitySource.SYSTEM), 'AE18: missions émises avec source SYSTEM')
}

// ── Rapport ───────────────────────────────────────────────────────────────────

console.log('\n✅  Tous les tests ME-15 passent.\n')
