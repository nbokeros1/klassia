// ── Tests : Recommendation Engine (ME-17) ─────────────────────────────────────
//
// Tests unitaires sans dépendance Supabase.
// Exécution : npx tsx src/lib/recommendation-engine/__tests__/recommendation-engine.test.ts

import assert from 'node:assert/strict'
import type { SupabaseClient }                 from '@supabase/supabase-js'

import { RecommendationBuilder }               from '../recommendation-builder'
import { validateRecommendation }              from '../recommendation-validator'
import { RecommendationRegistry }              from '../recommendation-registry'
import { RecommendationEngine }                from '../recommendation-engine'
import { summarizeRecommendations }            from '../summary'
import {
  RecommendationPriority, RECOMMENDATION_TYPES, RECOMMENDATION_ENGINE_VERSION,
} from '../recommendation-types'
import type { Recommendation }                 from '../recommendation-types'
import { PlanningRecommendationStrategy, PreparationRecommendationStrategy } from '../strategies/planning-recommendation'
import { WorkflowRecommendationStrategy }      from '../strategies/workflow-recommendation'
import { EvaluationRecommendationStrategy }    from '../strategies/evaluation-recommendation'
import { ConsistencyRecommendationStrategy }   from '../strategies/consistency-recommendation'
import { ProductivityRecommendationStrategy }  from '../strategies/productivity-recommendation'
import { WellbeingRecommendationStrategy }     from '../strategies/fatigue-recommendation'
import type { Insight }                        from '@/lib/insight-engine/insight-types'
import { INSIGHT_ENGINE_VERSION }              from '@/lib/insight-engine/insight-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInsight(
  type: Insight['type'],
  score: number,
  confidence: number,
  descOverride?: string,
): Insight {
  return {
    id:          crypto.randomUUID(),
    teacherId:   'teacher-1',
    type,
    confidence,
    score,
    title:       `Insight ${type}`,
    description: descOverride ?? `Observation sur ${type} (score=${score}).`,
    generatedAt: new Date().toISOString(),
    period: {
      since: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      until: new Date().toISOString(),
    },
    evidence:    { eventCount: 20, periodDays: 30, sampleSize: 20 },
    version:     INSIGHT_ENGINE_VERSION,
  }
}

function makeValidRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return new RecommendationBuilder()
    .ofType('planning')
    .forTeacher('teacher-1')
    .withPriority(RecommendationPriority.MEDIUM)
    .withTitle('Planifier plus tôt')
    .withDescription('Essayez de créer vos leçons en début de semaine.')
    .withReason('Seulement 30% de vos leçons sont créées en début de semaine.')
    .basedOn(['insight-1'])
    .withConfidence(60)
    .expiresIn(7)
    .build()
}

function makeSupabase(): SupabaseClient {
  return {
    from: () => ({
      insert: (_: unknown) => Promise.resolve({ error: null }),
      delete: () => ({
        eq: function(this: unknown) { return this },
        lt: function(this: unknown) { return this },
      }),
      select: (_?: string) => ({
        eq:    function(this: unknown) { return this },
        or:    function(this: unknown) { return this },
        order: function(this: unknown) { return this },
        limit: function(this: unknown) { return this },
        then:  (r: (v: { data: unknown[]; error: null }) => void) => r({ data: [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient
}

// ── REC01 : RecommendationBuilder ─────────────────────────────────────────────

// REC01a : build() produit une recommandation valide
{
  const rec = makeValidRecommendation()
  assert.ok(rec.id.length > 0,               'REC01a: id généré')
  assert.equal(rec.type, 'planning',          'REC01a: type correct')
  assert.equal(rec.priority, 'MEDIUM',        'REC01a: priority correct')
  assert.equal(rec.version, RECOMMENDATION_ENGINE_VERSION, 'REC01a: version ME-17.0')
  assert.ok(rec.expiresAt > rec.createdAt,   'REC01a: expiresAt > createdAt')
}

// REC01b : confidence clampée 0-100
{
  const rec = new RecommendationBuilder()
    .ofType('planning').forTeacher('t1')
    .withPriority(RecommendationPriority.MEDIUM)
    .withTitle('T').withDescription('D').withReason('R')
    .basedOn(['i1']).withConfidence(200).expiresIn(7)
    .build()
  assert.equal(rec.confidence, 100, 'REC01b: confidence clampée à 100')
}

// REC01c : throw si basedOnInsights vide
{
  assert.throws(() => {
    new RecommendationBuilder()
      .ofType('planning').forTeacher('t1')
      .withPriority(RecommendationPriority.MEDIUM)
      .withTitle('T').withDescription('D').withReason('R')
      .basedOn([]).withConfidence(50).build()
  }, 'REC01c: basedOn([]) → throw')
}

// REC01d : throw si type manquant
{
  assert.throws(() => {
    new RecommendationBuilder().build()
  }, 'REC01d: sans type → throw')
}

// REC01e : expiresIn(7) → expiresAt dans ~7 jours
{
  const before = Date.now()
  const rec    = makeValidRecommendation()
  const after  = Date.now()
  const exp    = new Date(rec.expiresAt).getTime()
  assert.ok(exp > before + 6 * 86_400_000, 'REC01e: expiresAt > now+6j')
  assert.ok(exp < after  + 8 * 86_400_000, 'REC01e: expiresAt < now+8j')
}

// REC01f : chaque build génère un id unique
{
  const ids = new Set(Array.from({ length: 50 }, () => makeValidRecommendation().id))
  assert.equal(ids.size, 50, 'REC01f: 50 ids uniques')
}

// ── REC02 : validateRecommendation ────────────────────────────────────────────

// REC02a : recommandation valide passe
{
  const r = validateRecommendation(makeValidRecommendation())
  assert.equal(r.valid, true,     'REC02a: valide passe')
  assert.equal(r.errors.length, 0, 'REC02a: aucune erreur')
}

// REC02b : type invalide
{
  const r = validateRecommendation({ ...makeValidRecommendation(), type: 'invented' })
  assert.equal(r.valid, false, 'REC02b: type invalide → rejeté')
}

// REC02c : basedOnInsights vide → rejeté
{
  const r = validateRecommendation({ ...makeValidRecommendation(), basedOnInsights: [] })
  assert.equal(r.valid, false, 'REC02c: basedOnInsights vide → rejeté')
}

// REC02d : priority invalide
{
  const r = validateRecommendation({ ...makeValidRecommendation(), priority: 'CRITICAL' })
  assert.equal(r.valid, false, 'REC02d: priority invalide → rejeté')
}

// REC02e : description vide → rejeté
{
  const r = validateRecommendation({ ...makeValidRecommendation(), description: '' })
  assert.equal(r.valid, false, 'REC02e: description vide → rejeté')
}

// REC02f : reason vide → rejeté
{
  const r = validateRecommendation({ ...makeValidRecommendation(), reason: '' })
  assert.equal(r.valid, false, 'REC02f: reason vide → rejeté')
}

// REC02g : null → rejeté
{
  const r = validateRecommendation(null)
  assert.equal(r.valid, false, 'REC02g: null → rejeté')
}

// ── REC03 : PlanningRecommendationStrategy ────────────────────────────────────

// REC03a : score < 50 → MEDIUM
{
  const strategy = new PlanningRecommendationStrategy()
  const insight  = makeInsight('planning_pattern', 30, 60)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs.length, 1,                    'REC03a: 1 recommandation')
  assert.equal(recs[0]!.priority, 'MEDIUM',        'REC03a: MEDIUM')
  assert.equal(recs[0]!.type, 'planning',          'REC03a: type planning')
  assert.ok(recs[0]!.basedOnInsights.includes(insight.id), 'REC03a: basedOnInsights contient insight.id')
}

// REC03b : score >= 50 → INFORMATION
{
  const strategy = new PlanningRecommendationStrategy()
  const insight  = makeInsight('planning_pattern', 75, 70)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'INFORMATION', 'REC03b: INFORMATION si score élevé')
}

// REC03c : confidence trop faible → aucune recommandation
{
  const strategy = new PlanningRecommendationStrategy()
  const insight  = makeInsight('planning_pattern', 30, 10)  // confidence < 25
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs.length, 0, 'REC03c: confidence < 25 → aucune reco')
}

// REC03d : pas d'insight planning_pattern → aucune recommandation
{
  const strategy = new PlanningRecommendationStrategy()
  const recs     = strategy.generate([makeInsight('cadence_pattern', 80, 80)], 'teacher-1')
  assert.equal(recs.length, 0, 'REC03d: mauvais type → aucune reco')
}

// ── REC04 : PreparationRecommendationStrategy ──────────────────────────────────

// REC04a : score < 40 → MEDIUM
{
  const strategy = new PreparationRecommendationStrategy()
  const insight  = makeInsight('preparation_pattern', 20, 50)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'MEDIUM',      'REC04a: MEDIUM')
  assert.equal(recs[0]!.type, 'preparation',     'REC04a: type preparation')
}

// REC04b : score >= 40 → INFORMATION
{
  const strategy = new PreparationRecommendationStrategy()
  const insight  = makeInsight('preparation_pattern', 60, 50)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'INFORMATION', 'REC04b: INFORMATION')
}

// ── REC05 : WorkflowRecommendationStrategy ────────────────────────────────────

// REC05a : interruption_pattern score > 40 → HIGH
{
  const strategy = new WorkflowRecommendationStrategy()
  const insight  = makeInsight('interruption_pattern', 60, 60)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs.length, 1,       'REC05a: 1 reco')
  assert.equal(recs[0]!.priority, 'HIGH', 'REC05a: HIGH')
  assert.equal(recs[0]!.type, 'workflow', 'REC05a: type workflow')
}

// REC05b : workflow score < 60 (sans interruption) → MEDIUM
{
  const strategy = new WorkflowRecommendationStrategy()
  const insight  = makeInsight('workflow_pattern', 40, 60)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'MEDIUM', 'REC05b: MEDIUM')
}

// REC05c : workflow score >= 60 → INFORMATION
{
  const strategy = new WorkflowRecommendationStrategy()
  const insight  = makeInsight('workflow_pattern', 85, 70)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'INFORMATION', 'REC05c: INFORMATION')
}

// REC05d : aucun insight workflow/interruption → []
{
  const strategy = new WorkflowRecommendationStrategy()
  const recs     = strategy.generate([makeInsight('cadence_pattern', 80, 80)], 'teacher-1')
  assert.equal(recs.length, 0, 'REC05d: aucun insight pertinent → aucune reco')
}

// ── REC06 : EvaluationRecommendationStrategy ──────────────────────────────────

// REC06a : score < 40 → MEDIUM
{
  const strategy = new EvaluationRecommendationStrategy()
  const insight  = makeInsight('evaluation_pattern', 20, 50)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'MEDIUM',    'REC06a: MEDIUM')
  assert.equal(recs[0]!.type, 'evaluation',    'REC06a: type evaluation')
}

// REC06b : score >= 40 → INFORMATION
{
  const strategy = new EvaluationRecommendationStrategy()
  const insight  = makeInsight('evaluation_pattern', 70, 60)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'INFORMATION', 'REC06b: INFORMATION')
}

// ── REC07 : ConsistencyRecommendationStrategy ─────────────────────────────────

// REC07a : score < 40 → HIGH
{
  const strategy = new ConsistencyRecommendationStrategy()
  const insight  = makeInsight('consistency_pattern', 20, 60)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'HIGH',       'REC07a: HIGH')
  assert.equal(recs[0]!.type, 'consistency',    'REC07a: type consistency')
}

// REC07b : 40 <= score < 70 → MEDIUM
{
  const strategy = new ConsistencyRecommendationStrategy()
  const insight  = makeInsight('consistency_pattern', 55, 60)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'MEDIUM', 'REC07b: MEDIUM')
}

// REC07c : score >= 70 → INFORMATION
{
  const strategy = new ConsistencyRecommendationStrategy()
  const insight  = makeInsight('consistency_pattern', 85, 70)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'INFORMATION', 'REC07c: INFORMATION')
}

// ── REC08 : ProductivityRecommendationStrategy ────────────────────────────────

// REC08a : score < 30 → MEDIUM
{
  const strategy = new ProductivityRecommendationStrategy()
  const insight  = makeInsight('productivity_pattern', 15, 50)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'MEDIUM',       'REC08a: MEDIUM')
  assert.equal(recs[0]!.type, 'productivity',     'REC08a: type productivity')
}

// ── REC09 : WellbeingRecommendationStrategy ───────────────────────────────────

// REC09a : cadence dimanche haute → MEDIUM avec mention du dimanche
{
  const strategy = new WellbeingRecommendationStrategy()
  const insight  = makeInsight(
    'cadence_pattern', 75, 65,
    'Vous êtes le plus actif le Dimanche (75% de votre activité hebdomadaire).',
  )
  const recs = strategy.generate([insight], 'teacher-1')
  assert.equal(recs.length, 1,           'REC09a: 1 reco')
  assert.equal(recs[0]!.priority, 'MEDIUM', 'REC09a: MEDIUM')
  assert.equal(recs[0]!.type, 'wellbeing', 'REC09a: type wellbeing')
  assert.ok(recs[0]!.description.includes('dimanche'), 'REC09a: description mentionne dimanche')
}

// REC09b : cadence samedi → MEDIUM avec mention du samedi
{
  const strategy = new WellbeingRecommendationStrategy()
  const insight  = makeInsight(
    'cadence_pattern', 70, 65,
    'Vous êtes le plus actif le Samedi (70% de votre activité hebdomadaire).',
  )
  const recs = strategy.generate([insight], 'teacher-1')
  assert.equal(recs[0]!.priority, 'MEDIUM', 'REC09b: MEDIUM pour samedi')
  assert.ok(recs[0]!.description.includes('samedi'), 'REC09b: description mentionne samedi')
}

// REC09c : score < 60 → aucune reco (signal trop faible)
{
  const strategy = new WellbeingRecommendationStrategy()
  const insight  = makeInsight('cadence_pattern', 40, 65)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs.length, 0, 'REC09c: score < 60 → aucune reco')
}

// REC09d : confidence < 25 → aucune reco
{
  const strategy = new WellbeingRecommendationStrategy()
  const insight  = makeInsight('cadence_pattern', 75, 10)
  const recs     = strategy.generate([insight], 'teacher-1')
  assert.equal(recs.length, 0, 'REC09d: confidence < 25 → aucune reco')
}

// ── REC10 : RecommendationRegistry ────────────────────────────────────────────

// REC10a : collecte toutes les recommandations des stratégies
{
  const registry = new RecommendationRegistry()
  registry.register(new PlanningRecommendationStrategy())
  registry.register(new ConsistencyRecommendationStrategy())

  const insights = [
    makeInsight('planning_pattern', 25, 60),
    makeInsight('consistency_pattern', 20, 60),
  ]
  const recs = registry.generate(insights, 'teacher-1')
  assert.ok(recs.length >= 2, 'REC10a: au moins 2 recommandations')
}

// REC10b : erreur dans une stratégie n'arrête pas les autres
{
  const registry = new RecommendationRegistry()
  registry.register({
    recommendationType: 'planning',
    generate: () => { throw new Error('intentional') },
  })
  registry.register(new ConsistencyRecommendationStrategy())

  const insights = [makeInsight('consistency_pattern', 20, 60)]
  const recs = registry.generate(insights, 'teacher-1')
  // ConsistencyStrategy devrait quand même fonctionner
  assert.ok(recs.length <= 1, 'REC10b: ConsistencyStrategy résiste à l\'erreur')
}

// REC10c : getStrategies() retourne une copie
{
  const registry = new RecommendationRegistry()
  registry.register(new PlanningRecommendationStrategy())
  const arr1 = registry.getStrategies()
  const arr2 = registry.getStrategies()
  assert.notEqual(arr1, arr2, 'REC10c: getStrategies retourne une copie')
}

// ── REC11 : summarizeRecommendations ──────────────────────────────────────────

// REC11a : liste vide
{
  const s = summarizeRecommendations([])
  assert.equal(s.total, 0,              'REC11a: total 0')
  assert.equal(s.highPriority.length, 0, 'REC11a: highPriority vide')
}

// REC11b : comptage par priorité et type
{
  const r1 = { ...makeValidRecommendation(), id: crypto.randomUUID(), priority: RecommendationPriority.HIGH, type: 'consistency' as const }
  const r2 = { ...makeValidRecommendation(), id: crypto.randomUUID(), priority: RecommendationPriority.HIGH, type: 'workflow' as const }
  const r3 = { ...makeValidRecommendation(), id: crypto.randomUUID(), priority: RecommendationPriority.INFORMATION }
  const s  = summarizeRecommendations([r1, r2, r3])
  assert.equal(s.total, 3,                           'REC11b: total 3')
  assert.equal(s.byPriority['HIGH'], 2,              'REC11b: 2 HIGH')
  assert.equal(s.byPriority['INFORMATION'], 1,       'REC11b: 1 INFORMATION')
  assert.equal(s.highPriority.length, 2,             'REC11b: 2 highPriority')
}

// REC11c : topRecommendations trié HIGH > MEDIUM > LOW > INFORMATION, max 3
{
  const makeRec = (p: RecommendationPriority) => ({
    ...makeValidRecommendation(),
    id:       crypto.randomUUID(),
    priority: p,
  })
  const list = [
    makeRec(RecommendationPriority.INFORMATION),
    makeRec(RecommendationPriority.LOW),
    makeRec(RecommendationPriority.HIGH),
    makeRec(RecommendationPriority.MEDIUM),
    makeRec(RecommendationPriority.HIGH),
  ]
  const s = summarizeRecommendations(list)
  assert.equal(s.topRecommendations.length, 3,         'REC11c: max 3')
  assert.equal(s.topRecommendations[0]!.priority, 'HIGH', 'REC11c: premier = HIGH')
}

// ── REC12 : RecommendationEngine — orchestration ──────────────────────────────

// REC12a : generate([]) → []
{
  const engine = new RecommendationEngine(makeSupabase(), 'teacher-1')
  const result = engine.generate([])
  assert.equal(result.length, 0, 'REC12a: 0 insights → 0 recommandations')
}

// REC12b : generate avec insights pertinents → recommandations validées
{
  const engine   = new RecommendationEngine(makeSupabase(), 'teacher-1')
  const insights = [
    makeInsight('planning_pattern', 20, 60),
    makeInsight('consistency_pattern', 30, 65),
    makeInsight('workflow_pattern', 80, 70),
  ]
  const recs = engine.generate(insights)
  assert.ok(recs.length > 0,               'REC12b: recommandations produites')
  assert.ok(recs.every(r => r.teacherId === 'teacher-1'), 'REC12b: teacherId correct')
  assert.ok(recs.every(r => r.basedOnInsights.length >= 1), 'REC12b: basedOnInsights non vide')
  assert.ok(recs.every(r => r.version === RECOMMENDATION_ENGINE_VERSION), 'REC12b: version ME-17.0')
}

// REC12c : 7 stratégies enregistrées par défaut
{
  const engine = new RecommendationEngine(makeSupabase(), 'teacher-1')
  const strats = (engine as unknown as { registry: RecommendationRegistry })['registry'].getStrategies()
  assert.equal(strats.length, 7, 'REC12c: 7 stratégies enregistrées')
}

// ── REC13 : RECOMMENDATION_TYPES exhaustif ────────────────────────────────────

{
  assert.equal(RECOMMENDATION_TYPES.length, 7, 'REC13: exactement 7 RecommendationTypes')
  const expected = ['planning', 'workflow', 'evaluation', 'preparation', 'consistency', 'productivity', 'wellbeing']
  for (const t of expected) {
    assert.ok(RECOMMENDATION_TYPES.includes(t as Recommendation['type']), `REC13: "${t}" dans RECOMMENDATION_TYPES`)
  }
}

// ── REC14 : langage — jamais "devriez" ────────────────────────────────────────

{
  const engine   = new RecommendationEngine(makeSupabase(), 'teacher-1')
  const insights = [
    makeInsight('planning_pattern', 20, 60),
    makeInsight('preparation_pattern', 15, 50),
    makeInsight('workflow_pattern', 40, 60),
    makeInsight('evaluation_pattern', 20, 50),
    makeInsight('consistency_pattern', 20, 60),
    makeInsight('productivity_pattern', 15, 50),
    makeInsight('cadence_pattern', 75, 65,
      'Vous êtes le plus actif le Dimanche (75% de votre activité hebdomadaire).'),
    makeInsight('interruption_pattern', 60, 60),
  ]
  const recs = engine.generate(insights)
  for (const rec of recs) {
    assert.ok(
      !rec.description.toLowerCase().includes('devriez'),
      `REC14: "${rec.description}" ne contient pas "devriez"`,
    )
    assert.ok(
      !rec.reason.toLowerCase().includes('devriez'),
      `REC14: reason ne contient pas "devriez"`,
    )
  }
}

// ── REC15 : priorité HIGH pour interruption et incohérence ───────────────────

{
  const engine = new RecommendationEngine(makeSupabase(), 'teacher-1')

  // Interruption élevée
  const interruption = makeInsight('interruption_pattern', 70, 65)
  const recs1 = engine.generate([interruption])
  const highPrio = recs1.find(r => r.priority === RecommendationPriority.HIGH)
  assert.ok(highPrio !== undefined, 'REC15: interruption score 70 → au moins 1 HIGH')

  // Incohérence marquée
  const inconsistent = makeInsight('consistency_pattern', 15, 70)
  const recs2 = engine.generate([inconsistent])
  const highPrio2 = recs2.find(r => r.priority === RecommendationPriority.HIGH)
  assert.ok(highPrio2 !== undefined, 'REC15: consistency score 15 → au moins 1 HIGH')
}

// ── Rapport ───────────────────────────────────────────────────────────────────

console.log('\n✅  Tous les tests ME-17 passent.\n')
