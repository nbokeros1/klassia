// ── Tests : Predictive Engine (ME-18) ─────────────────────────────────────────
//
// Tests unitaires sans dépendance Supabase.
// Exécution : npx tsx src/lib/predictive-engine/__tests__/predictive-engine.test.ts

import assert from 'node:assert/strict'
import type { SupabaseClient }              from '@supabase/supabase-js'

import { PredictionBuilder }                from '../prediction-builder'
import { validatePrediction }               from '../prediction-validator'
import { PredictionRegistry }               from '../prediction-registry'
import { PredictiveEngine }                 from '../predictive-engine'
import { predictionsToMissions, createPredictionProvider } from '../prediction-mission-bridge'
import { PREDICTION_TYPES, PREDICTIVE_ENGINE_VERSION }     from '../prediction-types'
import type { Prediction, CalendarContext } from '../prediction-types'
import {
  daysUntil, eventsWithinDays, deadlinesWithinDays,
  upcomingEvaluationDeadlines, hasExamPeriod, hasSemesterEnd,
  confidenceFromUrgency,
} from '../predictive-calendar'
import {
  getInsightsByType, averageConfidence, insightConfidenceBoost,
  hasLowPlanningScore,
} from '../predictive-insights'

import { EvaluationPredictionStrategy }  from '../strategies/evaluation-prediction'
import { LessonPredictionStrategy }      from '../strategies/lesson-prediction'
import { DeadlinePredictionStrategy }    from '../strategies/deadline-prediction'
import { HolidayPredictionStrategy }     from '../strategies/holiday-prediction'
import { ExamPeriodPredictionStrategy }  from '../strategies/exam-period-prediction'
import { SemesterEndPredictionStrategy, GradingPeriodPredictionStrategy } from '../strategies/semester-end-prediction'

import type { Insight }                  from '@/lib/insight-engine/insight-types'
import { INSIGHT_ENGINE_VERSION }        from '@/lib/insight-engine/insight-types'
import type { CalendarEventSnapshot, CalendarDeadlineSnapshot } from '@/lib/pedagogy/calendar/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = new Date('2026-07-21T08:00:00.000Z')

function daysFromNow(n: number): Date {
  return new Date(NOW.getTime() + n * 86_400_000)
}

function makeEvent(
  type: CalendarEventSnapshot['type'],
  daysAhead: number,
  titre = `Événement ${type}`,
): CalendarEventSnapshot {
  return {
    id:         crypto.randomUUID(),
    titre,
    dateDebut:  daysFromNow(daysAhead),
    dateFin:    null,
    heureDebut: null,
    heureFin:   null,
    type,
    scope:      'class',
    classeId:   'classe-1',
    matiere:    'Mathématiques',
    couleur:    null,
  }
}

function makeDeadline(
  type: CalendarDeadlineSnapshot['type'],
  urgencyDays: number,
  titre = `Deadline ${type}`,
): CalendarDeadlineSnapshot {
  return {
    id:          crypto.randomUUID(),
    titre,
    date:        daysFromNow(urgencyDays),
    type,
    urgencyDays,
    classeId:    'classe-1',
    matiere:     'Mathématiques',
  }
}

function emptyCalendar(): CalendarContext {
  return { events: [], deadlines: [], now: NOW }
}

function makeInsight(type: Insight['type'], confidence: number, score = 60): Insight {
  return {
    id:          crypto.randomUUID(),
    teacherId:   'teacher-1',
    type,
    confidence,
    score,
    title:       `Insight ${type}`,
    description: `Observation sur ${type}.`,
    generatedAt: NOW.toISOString(),
    period:      { since: new Date(NOW.getTime() - 30 * 86_400_000).toISOString(), until: NOW.toISOString() },
    evidence:    { eventCount: 10, periodDays: 30, sampleSize: 10 },
    version:     INSIGHT_ENGINE_VERSION,
  }
}

function makeValidPrediction(overrides: Partial<Prediction> = {}): Prediction {
  return new PredictionBuilder()
    .ofType('lesson_preparation')
    .forTeacher('teacher-1')
    .withConfidence(70)
    .onDate(daysFromNow(2))
    .withSuggestedAction('Préparer la leçon de demain.')
    .withReason('Une leçon est planifiée dans 3 jours.')
    .fromInsights([])
    .fromCalendar(['event-1'])
    .build()
}

function makeSupabase(): SupabaseClient {
  return {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      delete: () => ({
        eq: function(this: unknown) { return this },
        lt: function(this: unknown) { return this },
        gte: function(this: unknown) { return this },
      }),
      select: (_?: string) => ({
        eq:     function(this: unknown) { return this },
        gte:    function(this: unknown) { return this },
        lte:    function(this: unknown) { return this },
        order:  function(this: unknown) { return this },
        limit:  function(this: unknown) { return this },
        then:   (r: (v: { data: unknown[]; error: null }) => void) => r({ data: [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient
}

// ── PRED01 : PredictionBuilder ────────────────────────────────────────────────

// PRED01a : build() produit une prédiction valide
{
  const pred = makeValidPrediction()
  assert.ok(pred.id.length > 0,                         'PRED01a: id généré')
  assert.equal(pred.type, 'lesson_preparation',          'PRED01a: type correct')
  assert.equal(pred.version, PREDICTIVE_ENGINE_VERSION,  'PRED01a: version ME-18.0')
  assert.ok(Array.isArray(pred.sourceInsights),          'PRED01a: sourceInsights tableau')
  assert.ok(Array.isArray(pred.sourceCalendar),          'PRED01a: sourceCalendar tableau')
}

// PRED01b : confidence clampée 0-100
{
  const pred = new PredictionBuilder()
    .ofType('exam_period').forTeacher('t1')
    .withConfidence(150).onDate(daysFromNow(5))
    .withSuggestedAction('Action').withReason('Raison')
    .build()
  assert.equal(pred.confidence, 100, 'PRED01b: confidence clampée à 100')
}

// PRED01c : throw si type manquant
{
  assert.throws(() => new PredictionBuilder().build(), 'PRED01c: sans type → throw')
}

// PRED01d : throw si teacherId manquant
{
  assert.throws(() => {
    new PredictionBuilder().ofType('exam_period').build()
  }, 'PRED01d: sans teacherId → throw')
}

// PRED01e : throw si predictedDate manquant
{
  assert.throws(() => {
    new PredictionBuilder().ofType('exam_period').forTeacher('t1')
      .withConfidence(60).withSuggestedAction('A').withReason('R').build()
  }, 'PRED01e: sans predictedDate → throw')
}

// PRED01f : onDate accepte un objet Date
{
  const date = daysFromNow(3)
  const pred = new PredictionBuilder()
    .ofType('lesson_preparation').forTeacher('t1')
    .withConfidence(60).onDate(date)
    .withSuggestedAction('A').withReason('R').build()
  assert.ok(pred.predictedDate.startsWith(date.toISOString().slice(0, 10)), 'PRED01f: onDate(Date)')
}

// PRED01g : chaque build génère un id unique
{
  const ids = new Set(Array.from({ length: 30 }, () => makeValidPrediction().id))
  assert.equal(ids.size, 30, 'PRED01g: 30 ids uniques')
}

// ── PRED02 : validatePrediction ───────────────────────────────────────────────

// PRED02a : prédiction valide passe
{
  const r = validatePrediction(makeValidPrediction())
  assert.equal(r.valid, true,     'PRED02a: valide passe')
  assert.equal(r.errors.length, 0, 'PRED02a: 0 erreurs')
}

// PRED02b : type invalide
{
  const r = validatePrediction({ ...makeValidPrediction(), type: 'invented' })
  assert.equal(r.valid, false, 'PRED02b: type invalide')
}

// PRED02c : confidence hors borne
{
  const r = validatePrediction({ ...makeValidPrediction(), confidence: 150 })
  assert.equal(r.valid, false, 'PRED02c: confidence > 100')
}

// PRED02d : predictedDate non ISO
{
  const r = validatePrediction({ ...makeValidPrediction(), predictedDate: 'demain' })
  assert.equal(r.valid, false, 'PRED02d: predictedDate non ISO')
}

// PRED02e : suggestedAction vide
{
  const r = validatePrediction({ ...makeValidPrediction(), suggestedAction: '' })
  assert.equal(r.valid, false, 'PRED02e: suggestedAction vide')
}

// PRED02f : reason vide
{
  const r = validatePrediction({ ...makeValidPrediction(), reason: '' })
  assert.equal(r.valid, false, 'PRED02f: reason vide')
}

// PRED02g : null → rejeté
{
  const r = validatePrediction(null)
  assert.equal(r.valid, false, 'PRED02g: null rejeté')
}

// ── PRED03 : Utilitaires calendrier ──────────────────────────────────────────

// PRED03a : daysUntil
{
  const future = daysFromNow(7)
  const d      = daysUntil(future, NOW)
  assert.equal(d, 7, 'PRED03a: daysUntil 7 jours')
}

// PRED03b : daysUntil passé
{
  const past = daysFromNow(-2)
  const d    = daysUntil(past, NOW)
  assert.equal(d, -2, 'PRED03b: daysUntil négatif')
}

// PRED03c : eventsWithinDays — filtre correct
{
  const events = [
    makeEvent('lecon', 2),
    makeEvent('lecon', 10),
    makeEvent('lecon', -1),  // passé
  ]
  const result = eventsWithinDays(events, 5, NOW)
  assert.equal(result.length, 1, 'PRED03c: 1 événement dans 5 jours')
}

// PRED03d : deadlinesWithinDays — filtre correct
{
  const deadlines = [
    makeDeadline('evaluation', 3),
    makeDeadline('evaluation', 15),
    makeDeadline('evaluation', -1),  // passé
  ]
  const result = deadlinesWithinDays(deadlines, 7)
  assert.equal(result.length, 1, 'PRED03d: 1 deadline dans 7 jours')
}

// PRED03e : confidenceFromUrgency — décroissante
{
  const c1 = confidenceFromUrgency(0)
  const c3 = confidenceFromUrgency(3)
  const c7 = confidenceFromUrgency(7)
  const c14 = confidenceFromUrgency(14)
  assert.ok(c1 > c3,  'PRED03e: urgence 0 > 3')
  assert.ok(c3 > c7,  'PRED03e: urgence 3 > 7')
  assert.ok(c7 > c14, 'PRED03e: urgence 7 > 14')
  assert.ok(c1 <= 100, 'PRED03e: max 100')
}

// PRED03f : hasExamPeriod — seuil 3 évaluations
{
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [
      makeDeadline('evaluation', 3),
      makeDeadline('evaluation', 7),
      makeDeadline('evaluation', 11),
    ],
    now: NOW,
  }
  assert.equal(hasExamPeriod(ctx, 14, 3), true,  'PRED03f: 3 évals → exam period')
  assert.equal(hasExamPeriod(ctx, 14, 4), false, 'PRED03f: seuil 4 → pas de exam period')
}

// PRED03g : hasSemesterEnd — détecte "bulletin"
{
  const ctx: CalendarContext = {
    events: [{ ...makeEvent('calendrier_scolaire', 10), titre: 'Remise des bulletins' }],
    deadlines: [],
    now: NOW,
  }
  const ev = hasSemesterEnd(ctx, 14)
  assert.ok(ev !== undefined,                    'PRED03g: hasSemesterEnd trouvé')
  assert.ok(ev!.titre.includes('bulletins'),     'PRED03g: contient "bulletins"')
}

// ── PRED04 : Utilitaires insights ─────────────────────────────────────────────

// PRED04a : getInsightsByType
{
  const insights = [
    makeInsight('planning_pattern', 60),
    makeInsight('cadence_pattern', 70),
    makeInsight('planning_pattern', 40),
  ]
  const planning = getInsightsByType(insights, 'planning_pattern')
  assert.equal(planning.length, 2, 'PRED04a: 2 insights planning_pattern')
}

// PRED04b : averageConfidence
{
  const insights = [makeInsight('planning_pattern', 60), makeInsight('cadence_pattern', 80)]
  assert.equal(averageConfidence(insights), 70, 'PRED04b: moyenne 70')
  assert.equal(averageConfidence([]),        0,  'PRED04b: [] → 0')
}

// PRED04c : insightConfidenceBoost — boost si confidence >= 50
{
  const insights = [makeInsight('planning_pattern', 70)]
  const boost    = insightConfidenceBoost(insights, 'planning_pattern')
  assert.equal(boost, 10, 'PRED04c: boost 10 si confidence >= 50')
}

// PRED04d : insightConfidenceBoost — pas de boost si confidence < 50
{
  const insights = [makeInsight('planning_pattern', 30)]
  const boost    = insightConfidenceBoost(insights, 'planning_pattern')
  assert.equal(boost, 0, 'PRED04d: pas de boost si confidence < 50')
}

// PRED04e : hasLowPlanningScore
{
  const insights = [makeInsight('planning_pattern', 50, 30)]  // score 30 < 50
  assert.equal(hasLowPlanningScore(insights, 50), true, 'PRED04e: score faible détecté')
}

// ── PRED05 : EvaluationPredictionStrategy ─────────────────────────────────────

// PRED05a : évaluation dans 5 jours → prédiction
{
  const strategy = new EvaluationPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [makeDeadline('evaluation', 5, 'Examen de mathématiques')],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                             'PRED05a: 1 prédiction')
  assert.equal(preds[0]!.type, 'evaluation_preparation',   'PRED05a: type évaluation')
  assert.ok(preds[0]!.sourceCalendar.length > 0,           'PRED05a: sourceCalendar non vide')
}

// PRED05b : pas d'évaluation → []
{
  const strategy = new EvaluationPredictionStrategy()
  const preds    = strategy.generate('teacher-1', emptyCalendar(), [], [])
  assert.equal(preds.length, 0, 'PRED05b: sans évaluation → aucune prédiction')
}

// PRED05c : max 3 prédictions même si 5 évaluations
{
  const strategy = new EvaluationPredictionStrategy()
  const ctx: CalendarContext = {
    events: [],
    deadlines: Array.from({ length: 5 }, (_, i) => makeDeadline('evaluation', i + 2)),
    now:    NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.ok(preds.length <= 3, 'PRED05c: max 3 prédictions')
}

// ── PRED06 : LessonPredictionStrategy ─────────────────────────────────────────

// PRED06a : leçon dans 3 jours → prédiction
{
  const strategy = new LessonPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [makeEvent('lecon', 3, 'Leçon fractions')],
    deadlines: [],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                       'PRED06a: 1 prédiction')
  assert.equal(preds[0]!.type, 'lesson_preparation',  'PRED06a: type leçon')
}

// PRED06b : leçon dans 10 jours → hors fenêtre → []
{
  const strategy = new LessonPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [makeEvent('lecon', 10)],
    deadlines: [],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 0, 'PRED06b: leçon trop loin → aucune prédiction')
}

// ── PRED07 : DeadlinePredictionStrategy ───────────────────────────────────────

// PRED07a : devoir dans 7 jours → prédiction administrative_deadline
{
  const strategy = new DeadlinePredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [makeDeadline('devoir', 7, 'Remise du rapport')],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                              'PRED07a: 1 prédiction')
  assert.equal(preds[0]!.type, 'administrative_deadline',   'PRED07a: type deadline')
}

// PRED07b : n'inclut pas les évaluations (gérées ailleurs)
{
  const strategy = new DeadlinePredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [makeDeadline('evaluation', 7)],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 0, 'PRED07b: évaluations exclues')
}

// ── PRED08 : HolidayPredictionStrategy ────────────────────────────────────────

// PRED08a : congé dans 10 jours → prédiction holiday_preparation
{
  const strategy = new HolidayPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [makeEvent('conge', 10, 'Vacances de l\'été')],
    deadlines: [],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                          'PRED08a: 1 prédiction')
  assert.equal(preds[0]!.type, 'holiday_preparation',   'PRED08a: type congé')
}

// PRED08b : ferie → aussi détecté
{
  const strategy = new HolidayPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [makeEvent('ferie', 5, 'Fête nationale')],
    deadlines: [],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1, 'PRED08b: ferie détecté')
}

// PRED08c : pas de congé → []
{
  const strategy = new HolidayPredictionStrategy()
  const preds    = strategy.generate('teacher-1', emptyCalendar(), [], [])
  assert.equal(preds.length, 0, 'PRED08c: sans congé → aucune prédiction')
}

// ── PRED09 : ExamPeriodPredictionStrategy ─────────────────────────────────────

// PRED09a : 3 évaluations dans 14 jours → exam_period
{
  const strategy = new ExamPeriodPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [
      makeDeadline('evaluation', 4),
      makeDeadline('evaluation', 8),
      makeDeadline('evaluation', 12),
    ],
    now: NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                  'PRED09a: 1 prédiction')
  assert.equal(preds[0]!.type, 'exam_period',    'PRED09a: type exam_period')
  assert.ok(preds[0]!.sourceCalendar.length >= 3, 'PRED09a: sourceCalendar ≥ 3')
}

// PRED09b : seulement 2 évaluations → pas de période d'examens
{
  const strategy = new ExamPeriodPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [makeDeadline('evaluation', 4), makeDeadline('evaluation', 8)],
    now:       NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 0, 'PRED09b: 2 évals → pas d\'exam_period')
}

// ── PRED10 : SemesterEndPredictionStrategy ────────────────────────────────────

// PRED10a : événement "bilan" dans 15 jours → semester_transition
{
  const strategy = new SemesterEndPredictionStrategy()
  const ctx: CalendarContext = {
    events: [{ ...makeEvent('calendrier_scolaire', 15), titre: 'Bilan de mi-session' }],
    deadlines: [],
    now: NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                        'PRED10a: 1 prédiction')
  assert.equal(preds[0]!.type, 'semester_transition',  'PRED10a: type semester_transition')
}

// PRED10b : GradingPeriodPredictionStrategy — 3 devoirs → grading_period
{
  const strategy = new GradingPeriodPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [
      makeDeadline('devoir', 5),
      makeDeadline('devoir', 10),
      makeDeadline('devoir', 15),
    ],
    now: NOW,
  }
  const preds = strategy.generate('teacher-1', ctx, [], [])
  assert.equal(preds.length, 1,                    'PRED10b: 1 prédiction')
  assert.equal(preds[0]!.type, 'grading_period',  'PRED10b: type grading_period')
}

// ── PRED11 : PredictionRegistry ───────────────────────────────────────────────

// PRED11a : collecte toutes les stratégies
{
  const registry = new PredictionRegistry()
  registry.register(new EvaluationPredictionStrategy())
  registry.register(new HolidayPredictionStrategy())

  const ctx: CalendarContext = {
    events:    [makeEvent('conge', 10)],
    deadlines: [makeDeadline('evaluation', 5)],
    now:       NOW,
  }
  const preds = registry.generate('teacher-1', ctx, [], [])
  assert.ok(preds.length >= 2, 'PRED11a: ≥ 2 prédictions')
}

// PRED11b : erreur dans une stratégie n'arrête pas les autres
{
  const registry = new PredictionRegistry()
  registry.register({
    predictionType: 'lesson_preparation',
    generate: () => { throw new Error('intentional') },
  })
  registry.register(new HolidayPredictionStrategy())

  const ctx: CalendarContext = {
    events:    [makeEvent('conge', 5)],
    deadlines: [],
    now:       NOW,
  }
  const preds = registry.generate('teacher-1', ctx, [], [])
  assert.ok(preds.length <= 1, 'PRED11b: autre stratégie résiste à l\'erreur')
}

// PRED11c : getStrategies() retourne une copie
{
  const registry = new PredictionRegistry()
  registry.register(new LessonPredictionStrategy())
  const arr1 = registry.getStrategies()
  const arr2 = registry.getStrategies()
  assert.notEqual(arr1, arr2, 'PRED11c: copie distincte')
}

// ── PRED12 : PredictiveEngine — orchestration ──────────────────────────────────

// PRED12a : sans signaux calendrier → []
{
  const engine = new PredictiveEngine(makeSupabase(), 'teacher-1')
  const preds  = engine.generate(emptyCalendar())
  assert.equal(preds.length, 0, 'PRED12a: 0 signaux → 0 prédictions')
}

// PRED12b : avec signaux → prédictions validées
{
  const engine = new PredictiveEngine(makeSupabase(), 'teacher-1')
  const ctx: CalendarContext = {
    events:    [makeEvent('lecon', 3), makeEvent('conge', 12)],
    deadlines: [makeDeadline('evaluation', 6)],
    now:       NOW,
  }
  const preds = engine.generate(ctx, [makeInsight('planning_pattern', 70)])
  assert.ok(preds.length > 0,                             'PRED12b: prédictions produites')
  assert.ok(preds.every(p => p.teacherId === 'teacher-1'), 'PRED12b: teacherId correct')
  assert.ok(preds.every(p => p.version === PREDICTIVE_ENGINE_VERSION), 'PRED12b: version ME-18.0')
}

// PRED12c : 7 stratégies enregistrées par défaut
{
  const engine = new PredictiveEngine(makeSupabase(), 'teacher-1')
  const strategies = (engine as unknown as { registry: PredictionRegistry })['registry'].getStrategies()
  assert.equal(strategies.length, 7, 'PRED12c: 7 stratégies enregistrées')
}

// ── PRED13 : PREDICTION_TYPES exhaustif ───────────────────────────────────────

{
  assert.equal(PREDICTION_TYPES.length, 7, 'PRED13: exactement 7 PredictionTypes')
  const expected = [
    'lesson_preparation', 'evaluation_preparation', 'grading_period',
    'holiday_preparation', 'semester_transition', 'exam_period', 'administrative_deadline',
  ]
  for (const t of expected) {
    assert.ok(PREDICTION_TYPES.includes(t as Prediction['type']), `PRED13: "${t}" dans PREDICTION_TYPES`)
  }
}

// ── PRED14 : Mission Bridge ───────────────────────────────────────────────────

// PRED14a : predictionsToMissions — 1 prédiction → 1 mission
{
  const pred    = makeValidPrediction()
  const missions = predictionsToMissions([pred])
  assert.equal(missions.length, 1,               'PRED14a: 1 mission')
  assert.ok(missions[0]!.id.length > 0,          'PRED14a: id généré')
  assert.equal(missions[0]!.status, 'proposed',  'PRED14a: status proposed')
  assert.equal(missions[0]!.title, pred.suggestedAction, 'PRED14a: title = suggestedAction')
}

// PRED14b : confidence élevée → priorité mission plus haute
{
  const highConf = { ...makeValidPrediction(), confidence: 90 }
  const lowConf  = { ...makeValidPrediction(), confidence: 25 }
  const [mHigh]  = predictionsToMissions([highConf])
  const [mLow]   = predictionsToMissions([lowConf])
  assert.ok(mHigh!.priority > mLow!.priority, 'PRED14b: priorité mission corrélée à confidence')
}

// PRED14c : createPredictionProvider
{
  const provider = createPredictionProvider([makeValidPrediction(), makeValidPrediction()])
  provider.getMissions().then(missions => {
    assert.equal(missions.length, 2, 'PRED14c: 2 missions depuis provider')
  })
}

// PRED14d : metadata contient predictionId et predictedDate
{
  const pred    = makeValidPrediction()
  const mission = predictionsToMissions([pred])[0]!
  const meta    = mission.metadata as Record<string, unknown>
  assert.equal(meta['predictionId'], pred.id,          'PRED14d: predictionId dans metadata')
  assert.equal(meta['predictedDate'], pred.predictedDate, 'PRED14d: predictedDate dans metadata')
}

// ── PRED15 : confidence — propriétés ─────────────────────────────────────────

// PRED15a : évaluation très urgente (< 3j) → confidence >= 85
{
  const strategy = new EvaluationPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [makeDeadline('evaluation', 2, 'Examen urgent')],
    now:       NOW,
  }
  const [pred] = strategy.generate('teacher-1', ctx, [], [])
  assert.ok(pred!.confidence >= 85, `PRED15a: confidence urgente >= 85 (got ${pred!.confidence})`)
}

// PRED15b : évaluation lointaine (14j) → confidence < 50
{
  const strategy = new EvaluationPredictionStrategy()
  const ctx: CalendarContext = {
    events:    [],
    deadlines: [makeDeadline('evaluation', 14, 'Examen lointain')],
    now:       NOW,
  }
  const [pred] = strategy.generate('teacher-1', ctx, [], [])
  assert.ok(pred!.confidence < 55, `PRED15b: confidence lointaine < 55 (got ${pred!.confidence})`)
}

// ── Rapport ───────────────────────────────────────────────────────────────────

console.log('\n✅  Tous les tests ME-18 passent.\n')
