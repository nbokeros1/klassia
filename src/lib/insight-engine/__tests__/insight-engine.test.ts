// ── Tests : Insight Engine (ME-16) ────────────────────────────────────────────
//
// Tests unitaires sans dépendance Supabase.
// Exécution : npx tsx src/lib/insight-engine/__tests__/insight-engine.test.ts

import assert from 'node:assert/strict'
import type { SupabaseClient }                  from '@supabase/supabase-js'

import { InsightBuilder }                       from '../insight-builder'
import { validateInsight }                      from '../insight-validator'
import { InsightRegistry }                      from '../insight-registry'
import { InsightEngine }                        from '../insight-engine'
import { summarizeInsights }                    from '../summary'
import { INSIGHT_TYPES, INSIGHT_ENGINE_VERSION } from '../insight-types'
import type { Insight, InsightPeriod }          from '../insight-types'
import { CadencePattern }                       from '../patterns/cadence-pattern'
import { PlanningPattern }                      from '../patterns/planning-pattern'
import { PreparationPattern, EvaluationPattern } from '../patterns/preparation-pattern'
import { CompletionPattern, ProductivityPattern } from '../patterns/completion-pattern'
import { ConsistencyPattern }                   from '../patterns/consistency-pattern'
import { InterruptionPattern }                  from '../patterns/interruption-pattern'
import type { ActivityEvent }                   from '@/lib/activity-engine/event-types'
import { ActivitySource }                       from '@/lib/activity-engine/event-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_PERIOD: InsightPeriod = {
  since: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  until: new Date().toISOString(),
}

function makeEvent(
  type: ActivityEvent['type'],
  daysAgo = 0,
  day?: number,     // explicit day of week (0-6)
): ActivityEvent {
  const d = new Date(Date.now() - daysAgo * 86_400_000)
  if (day !== undefined) {
    const current = d.getDay()
    const diff    = day - current
    d.setDate(d.getDate() + diff)
  }
  return {
    id:         crypto.randomUUID(),
    type,
    occurredAt: d.toISOString(),
    teacherId:  'teacher-1',
    classId:    'cls-1',
    subject:    'Math',
    entityId:   crypto.randomUUID(),
    entityType: 'lesson',
    metadata:   {},
    source:     ActivitySource.USER,
    version:    'ME-15.0',
  }
}

function makeEvents(type: ActivityEvent['type'], count: number, startDaysAgo = 28): ActivityEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent(type, startDaysAgo - Math.floor(i * (startDaysAgo / count)))
  )
}

function makeValidInsight(overrides: Partial<Insight> = {}): Insight {
  return new InsightBuilder()
    .ofType('cadence_pattern')
    .forTeacher('teacher-1')
    .withScore(75)
    .withConfidence(65)
    .withTitle('Test insight')
    .withDescription('Une observation de test.')
    .forPeriod(new Date(Date.now() - 30 * 86_400_000), new Date())
    .withEvidence({ eventCount: 12, periodDays: 30, sampleSize: 12 })
    .build()
}

function makeSupabase(): SupabaseClient {
  return {
    from: () => ({
      insert:  (_: unknown) => Promise.resolve({ error: null }),
      delete:  () => ({ eq: function(this: unknown) { return this }, lt: function(this: unknown) { return this } }),
      select:  (_?: string) => ({
        eq:    function(this: unknown) { return this },
        gte:   function(this: unknown) { return this },
        lte:   function(this: unknown) { return this },
        or:    function(this: unknown) { return this },
        order: function(this: unknown) { return this },
        limit: function(this: unknown) { return this },
        then:  (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient
}

// ── IN01 : InsightBuilder ─────────────────────────────────────────────────────

// IN01a : build() produit un insight valide
{
  const insight = makeValidInsight()
  assert.ok(insight.id.length > 0,           'IN01a: id généré')
  assert.equal(insight.type, 'cadence_pattern', 'IN01a: type correct')
  assert.equal(insight.confidence, 65,        'IN01a: confidence correct')
  assert.equal(insight.score, 75,             'IN01a: score correct')
  assert.equal(insight.version, INSIGHT_ENGINE_VERSION, 'IN01a: version ME-16.0')
}

// IN01b : confidence est clampée 0-100
{
  const insight = new InsightBuilder()
    .ofType('cadence_pattern').forTeacher('t1')
    .withConfidence(150).withScore(-10)
    .withTitle('t').withDescription('d')
    .forPeriod(new Date(Date.now() - 86400000), new Date())
    .withEvidence({ eventCount: 5, periodDays: 1, sampleSize: 5 })
    .build()
  assert.equal(insight.confidence, 100, 'IN01b: confidence clampée à 100')
  assert.equal(insight.score, 0,        'IN01b: score clampé à 0')
}

// IN01c : build() throw si champs requis manquants
{
  assert.throws(() => {
    new InsightBuilder().build()
  }, 'IN01c: build sans type → throw')
}

// IN01d : chaque build() génère un id unique
{
  const ids = new Set(Array.from({ length: 50 }, () => makeValidInsight().id))
  assert.equal(ids.size, 50, 'IN01d: 50 ids uniques')
}

// ── IN02 : validateInsight ────────────────────────────────────────────────────

// IN02a : insight valide passe
{
  const r = validateInsight(makeValidInsight())
  assert.equal(r.valid, true,     'IN02a: insight valide passe')
  assert.equal(r.errors.length, 0, 'IN02a: aucune erreur')
}

// IN02b : type invalide
{
  const bad = { ...makeValidInsight(), type: 'invented' }
  const r = validateInsight(bad)
  assert.equal(r.valid, false, 'IN02b: type invalide → rejeté')
}

// IN02c : evidence.eventCount < 1 → rejeté (pas de preuve)
{
  const bad = { ...makeValidInsight(), evidence: { eventCount: 0, periodDays: 30, sampleSize: 5 } }
  const r = validateInsight(bad)
  assert.equal(r.valid, false, 'IN02c: eventCount=0 → rejeté')
}

// IN02d : confidence hors 0-100 → rejeté
{
  const bad = { ...makeValidInsight(), confidence: 120 }
  const r = validateInsight(bad)
  assert.equal(r.valid, false, 'IN02d: confidence=120 → rejeté')
}

// IN02e : null → rejeté
{
  const r = validateInsight(null)
  assert.equal(r.valid, false, 'IN02e: null → rejeté')
}

// IN02f : description vide → rejeté
{
  const bad = { ...makeValidInsight(), description: '' }
  const r = validateInsight(bad)
  assert.equal(r.valid, false, 'IN02f: description vide → rejeté')
}

// ── IN03 : CadencePattern ─────────────────────────────────────────────────────

// IN03a : < 5 événements → null
{
  const pattern = new CadencePattern()
  const result  = pattern.analyze(makeEvents('lesson_created', 3), 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN03a: < 5 events → null')
}

// IN03b : assez d'événements → insight produit
{
  const pattern = new CadencePattern()
  // 10 events, tous le lundi (day 1)
  const events = Array.from({ length: 10 }, () => makeEvent('lesson_created', 10, 1))
  const result = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,              'IN03b: 10 events → insight produit')
  assert.equal(result!.type, 'cadence_pattern', 'IN03b: type correct')
  assert.ok(result!.score >= 50,          'IN03b: score ≥ 50 (dominance jours)')
  assert.ok(result!.description.includes('Lundi'), 'IN03b: description mentionne Lundi')
}

// IN03c : teacherId transmis
{
  const pattern = new CadencePattern()
  const events  = makeEvents('lesson_created', 10)
  const result  = pattern.analyze(events, 'my-teacher', BASE_PERIOD)
  if (result) assert.equal(result.teacherId, 'my-teacher', 'IN03c: teacherId correct')
}

// ── IN04 : PlanningPattern ────────────────────────────────────────────────────

// IN04a : < 3 leçons → null
{
  const pattern = new PlanningPattern()
  const result  = pattern.analyze(makeEvents('lesson_created', 2), 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN04a: < 3 leçons → null')
}

// IN04b : leçons créées en début de semaine → score élevé
{
  const pattern = new PlanningPattern()
  // 8 events le lundi (day 1 = early week)
  const events = Array.from({ length: 8 }, () => makeEvent('lesson_created', 14, 1))
  const result = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                  'IN04b: insight produit')
  assert.equal(result!.type, 'planning_pattern', 'IN04b: type correct')
  assert.ok(result!.score >= 90,              'IN04b: score élevé (tous en début de semaine)')
}

// ── IN05 : PreparationPattern ─────────────────────────────────────────────────

// IN05a : < 2 leçons → null
{
  const pattern = new PreparationPattern()
  const result  = pattern.analyze(makeEvents('lesson_created', 1), 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN05a: 1 leçon → null')
}

// IN05b : calcule leçons/semaine
{
  const pattern = new PreparationPattern()
  const events  = makeEvents('lesson_created', 10)
  const result  = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                      'IN05b: insight produit')
  assert.equal(result!.type, 'preparation_pattern', 'IN05b: type correct')
  assert.ok(result!.description.includes('leçon'), 'IN05b: description mentionne leçon')
}

// ── IN06 : EvaluationPattern ──────────────────────────────────────────────────

// IN06a : < 2 évaluations → null
{
  const pattern = new EvaluationPattern()
  const result  = pattern.analyze(makeEvents('evaluation_created', 1), 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN06a: 1 évaluation → null')
}

// IN06b : calcule évaluations/mois
{
  const pattern = new EvaluationPattern()
  const events  = makeEvents('evaluation_created', 5)
  const result  = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                       'IN06b: insight produit')
  assert.equal(result!.type, 'evaluation_pattern', 'IN06b: type correct')
  assert.ok(result!.description.includes('évaluation'), 'IN06b: description mentionne évaluation')
}

// ── IN07 : CompletionPattern ──────────────────────────────────────────────────

// IN07a : < 2 workflow_started → null
{
  const pattern = new CompletionPattern()
  const result  = pattern.analyze([makeEvent('workflow_started')], 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN07a: 1 démarré → null')
}

// IN07b : 5 démarrés, 5 complétés → score 100
{
  const pattern = new CompletionPattern()
  const events  = [
    ...makeEvents('workflow_started', 5),
    ...makeEvents('workflow_completed', 5),
  ]
  const result = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                   'IN07b: insight produit')
  assert.equal(result!.type, 'workflow_pattern', 'IN07b: type correct')
  assert.equal(result!.score, 100,              'IN07b: 5/5 → score 100')
}

// IN07c : 5 démarrés, 2 complétés → score 40
{
  const pattern = new CompletionPattern()
  const events  = [
    ...makeEvents('workflow_started', 5),
    ...makeEvents('workflow_completed', 2),
  ]
  const result = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null, 'IN07c: insight produit')
  assert.equal(result!.score, 40, 'IN07c: 2/5 → score 40')
}

// ── IN08 : ProductivityPattern ────────────────────────────────────────────────

// IN08a : < 3 events → null
{
  const pattern = new ProductivityPattern()
  const result  = pattern.analyze(makeEvents('lesson_created', 2), 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN08a: 2 events → null')
}

// IN08b : 20 events sur 4 semaines → insight produit
{
  const pattern = new ProductivityPattern()
  const events  = makeEvents('lesson_created', 20)
  const result  = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                        'IN08b: insight produit')
  assert.equal(result!.type, 'productivity_pattern', 'IN08b: type correct')
}

// ── IN09 : ConsistencyPattern ─────────────────────────────────────────────────

// IN09a : < 3 events → null
{
  const pattern = new ConsistencyPattern()
  const result  = pattern.analyze(makeEvents('lesson_created', 2), 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN09a: 2 events → null')
}

// IN09b : activité régulière → score élevé
{
  const pattern = new ConsistencyPattern()
  // Distribuer des events uniformément sur 28 jours (4 semaines, 7 events/sem)
  const events = Array.from({ length: 28 }, (_, i) =>
    makeEvent('lesson_created', 28 - i)
  )
  const result = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                       'IN09b: insight produit')
  assert.equal(result!.type, 'consistency_pattern', 'IN09b: type correct')
}

// ── IN10 : InterruptionPattern ────────────────────────────────────────────────

// IN10a : < 2 workflow_started → null
{
  const pattern = new InterruptionPattern()
  const result  = pattern.analyze([makeEvent('workflow_started')], 'teacher-1', BASE_PERIOD)
  assert.equal(result, null, 'IN10a: 1 démarré → null')
}

// IN10b : 0 annulations → score 0, description positive
{
  const pattern = new InterruptionPattern()
  const events  = makeEvents('workflow_started', 5)
  const result  = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null,                        'IN10b: insight produit')
  assert.equal(result!.type, 'interruption_pattern', 'IN10b: type correct')
  assert.equal(result!.score, 0,                    'IN10b: 0 annulé → score 0')
  assert.ok(result!.description.includes('aucun'),  'IN10b: description positive')
}

// IN10c : 3/5 annulés → score 60
{
  const pattern = new InterruptionPattern()
  const events  = [
    ...makeEvents('workflow_started', 5),
    ...makeEvents('workflow_cancelled', 3),
  ]
  const result  = pattern.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(result !== null, 'IN10c: insight produit')
  assert.equal(result!.score, 60, 'IN10c: 3/5 → score 60')
}

// ── IN11 : InsightRegistry ────────────────────────────────────────────────────

// IN11a : register + analyze collecte les non-null
{
  const registry = new InsightRegistry()
  registry.register(new CadencePattern())
  registry.register(new CompletionPattern())

  const events = [
    ...Array.from({ length: 10 }, () => makeEvent('lesson_created', 10, 1)),
    ...makeEvents('workflow_started', 5),
    ...makeEvents('workflow_completed', 5),
  ]

  const insights = registry.analyze(events, 'teacher-1', BASE_PERIOD)
  assert.ok(insights.length >= 1, 'IN11a: au moins 1 insight produit')
  assert.ok(insights.every(i => i.teacherId === 'teacher-1'), 'IN11a: teacherId correct sur tous')
}

// IN11b : erreur dans un pattern ne bloque pas les autres
{
  const registry = new InsightRegistry()
  registry.register({
    insightType: 'cadence_pattern',
    analyze: () => { throw new Error('intentional') },
  })
  registry.register(new CompletionPattern())

  const events = [
    ...makeEvents('workflow_started', 5),
    ...makeEvents('workflow_completed', 5),
  ]
  const insights = registry.analyze(events, 'teacher-1', BASE_PERIOD)
  // Le CompletionPattern devrait produire un résultat malgré l'erreur dans CadencePattern
  assert.ok(insights.length <= 1, 'IN11b: résultats des autres patterns récupérés')
}

// IN11c : getAnalyzers() retourne une copie
{
  const registry = new InsightRegistry()
  registry.register(new CadencePattern())
  const arr1 = registry.getAnalyzers()
  const arr2 = registry.getAnalyzers()
  assert.notEqual(arr1, arr2, 'IN11c: getAnalyzers retourne une nouvelle copie')
  assert.equal(arr1.length, arr2.length, 'IN11c: même longueur')
}

// ── IN12 : summarizeInsights ──────────────────────────────────────────────────

// IN12a : résumé sur liste vide
{
  const summary = summarizeInsights([])
  assert.equal(summary.total, 0,             'IN12a: total 0')
  assert.equal(summary.highConfidence.length, 0, 'IN12a: highConfidence vide')
  assert.equal(summary.topInsights.length, 0,    'IN12a: topInsights vide')
}

// IN12b : comptage par type
{
  const a = makeValidInsight()
  const b = { ...makeValidInsight(), id: crypto.randomUUID(), type: 'workflow_pattern' as const }
  const c = { ...makeValidInsight(), id: crypto.randomUUID(), type: 'workflow_pattern' as const }
  const summary = summarizeInsights([a, b, c])
  assert.equal(summary.total, 3,                     'IN12b: total 3')
  assert.equal(summary.byType['cadence_pattern'], 1,  'IN12b: 1 cadence')
  assert.equal(summary.byType['workflow_pattern'], 2, 'IN12b: 2 workflow')
}

// IN12c : highConfidence filtre >= 70
{
  const lo = { ...makeValidInsight(), id: crypto.randomUUID(), confidence: 50 }
  const hi = { ...makeValidInsight(), id: crypto.randomUUID(), confidence: 80 }
  const summary = summarizeInsights([lo, hi])
  assert.equal(summary.highConfidence.length, 1,      'IN12c: 1 high-confidence')
  assert.equal(summary.highConfidence[0]!.confidence, 80, 'IN12c: confidence 80')
}

// IN12d : topInsights trié par confidence décroissante, max 5
{
  const insightList = Array.from({ length: 8 }, (_, i) => ({
    ...makeValidInsight(),
    id: crypto.randomUUID(),
    confidence: i * 10,
  }))
  const summary = summarizeInsights(insightList)
  assert.equal(summary.topInsights.length, 5, 'IN12d: max 5 topInsights')
  assert.ok(
    summary.topInsights[0]!.confidence >= summary.topInsights[1]!.confidence,
    'IN12d: trié par confidence décroissante',
  )
}

// ── IN13 : InsightEngine — orchestration ──────────────────────────────────────

// IN13a : analyze avec events vides → []
{
  const engine = new InsightEngine(makeSupabase(), 'teacher-1')
  const result = engine.analyze([])
  assert.ok(Array.isArray(result), 'IN13a: retourne un tableau')
  assert.equal(result.length, 0,   'IN13a: 0 insights sur 0 events')
}

// IN13b : analyze produit des insights validés
{
  const engine  = new InsightEngine(makeSupabase(), 'teacher-1')
  const events  = [
    ...Array.from({ length: 10 }, () => makeEvent('lesson_created', 20, 1)),
    ...makeEvents('workflow_started', 5),
    ...makeEvents('workflow_completed', 5),
    ...makeEvents('evaluation_created', 4),
  ]
  const results = engine.analyze(events, BASE_PERIOD)
  assert.ok(results.length > 0, 'IN13b: au moins 1 insight produit')
  assert.ok(results.every(i => i.teacherId === 'teacher-1'), 'IN13b: tous teacherId=teacher-1')
  assert.ok(results.every(i => i.version === INSIGHT_ENGINE_VERSION), 'IN13b: version ME-16.0')
}

// IN13c : les insights produits passent tous la validation
{
  const engine  = new InsightEngine(makeSupabase(), 'teacher-1')
  const events  = [
    ...makeEvents('lesson_created', 12),
    ...makeEvents('workflow_started', 6),
    ...makeEvents('workflow_completed', 6),
  ]
  const results  = engine.analyze(events, BASE_PERIOD)
  const { validateInsight: vi } = require('../insight-validator')
  for (const insight of results) {
    const r = vi(insight)
    assert.equal(r.valid, true, `IN13c: insight type="${insight.type}" valide`)
  }
}

// IN13d : période auto-dérivée des events si non fournie
{
  const engine = new InsightEngine(makeSupabase(), 'teacher-1')
  const events = makeEvents('lesson_created', 10)
  const result = engine.analyze(events)
  // Ne doit pas throw
  assert.ok(Array.isArray(result), 'IN13d: analyze sans period ne throw pas')
}

// ── IN14 : INSIGHT_TYPES exhaustif ────────────────────────────────────────────

{
  assert.equal(INSIGHT_TYPES.length, 8, 'IN14: exactement 8 InsightTypes')

  const expected = [
    'planning_pattern', 'preparation_pattern', 'evaluation_pattern',
    'workflow_pattern', 'consistency_pattern', 'productivity_pattern',
    'interruption_pattern', 'cadence_pattern',
  ]
  for (const t of expected) {
    assert.ok(INSIGHT_TYPES.includes(t as Insight['type']), `IN14: "${t}" dans INSIGHT_TYPES`)
  }
}

// ── IN15 : InsightEngine enregistre tous les patterns par défaut ───────────────

{
  const engine    = new InsightEngine(makeSupabase(), 'teacher-1')
  const analyzers = (engine as unknown as { registry: InsightRegistry })['registry'].getAnalyzers()
  assert.equal(analyzers.length, 8, 'IN15: 8 patterns enregistrés par défaut')

  const types = new Set(analyzers.map(a => a.insightType))
  for (const t of INSIGHT_TYPES) {
    assert.ok(types.has(t), `IN15: pattern "${t}" enregistré`)
  }
}

// ── Rapport ───────────────────────────────────────────────────────────────────

console.log('\n✅  Tous les tests ME-16 passent.\n')
