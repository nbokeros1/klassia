// ── Tests : détecteur d'évaluation (ME-06) ───────────────────────────────────
//
// Tests déterministes sans Supabase, sans LLM.
// Exécution : npx tsx src/lib/mission-engine/__tests__/evaluation.test.ts
// TypeScript : npx tsc --noEmit

import assert from 'node:assert/strict'
import { detectEvaluation } from '../detectors/evaluation'
import type { MissionDataContext, DocumentSnapshot } from '../types'
import { TeacherBrain } from '../../teacher-brain/teacher-brain'
import type { TeacherSituation } from '../../teacher-brain/types'

function situate(ctx: MissionDataContext): TeacherSituation {
  return new TeacherBrain().buildSituation(ctx)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENSEIGNANT_ID = 'teacher-001'
const CLASSE_ID     = 'classe-001'
const NOW           = new Date('2026-01-15T10:00:00Z')

function makeCtx(overrides: Partial<MissionDataContext>): MissionDataContext {
  return {
    enseignant: {
      id:       ENSEIGNANT_ID,
      prenom:   'Marie',
      nom:      'Dupont',
      province: 'QC',
      langue:   'fr',
    },
    classe: {
      id:       CLASSE_ID,
      nom:      '3e secondaire — Gr. A',
      niveau:   'secondaire',
      matiere:  'Mathématiques',
      matieres: ['Mathématiques'],
    },
    matiere:              'Mathématiques',
    programmeAnnuel:      null,
    curriculum:           null,
    dernieresLecons:      [],
    dernieresEvaluations: [],
    ressources:           [],
    travaux:              [],
    students:             [],
    attendance:           [],
    studentResults:       [],
    studentWork:          [],
    conversationIA:       [],
    calendarEvents:       [],
    calendarDeadlines:    [],
    dateCourante:         NOW,
    ...overrides,
  }
}

function makeDoc(id: string, nom: string, daysAgo = 0): DocumentSnapshot {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return {
    id,
    nom,
    type_fichier: 'application/pdf',
    texteExtrait: null,
    createdAt:    d,
    dossierType:  'lecon',
  }
}

const PROGRAMME_CONTENT = `
Unité 1 — Algèbre
Équations linéaires
Systèmes d'équations

Unité 2 — Géométrie
Triangles semblables
Transformations géométriques

Unité 3 — Statistiques
Mesures de tendance centrale
Probabilités
`

function makeProgramme(): DocumentSnapshot {
  return {
    id:           'programme-001',
    nom:          'Programme annuel Mathématiques',
    type_fichier: 'text/plain',
    texteExtrait: PROGRAMME_CONTENT,
    createdAt:    new Date('2025-09-01T00:00:00Z'),
    dossierType:  'programme_annuel',
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

async function main() {

  // ── Cas 1 : pas de programme annuel → [] ───────────────────────────────────
  {
    const ctx = makeCtx({
      programmeAnnuel: null,
      dernieresLecons: [makeDoc('l1', 'Équations linéaires')],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.deepEqual(missions, [], 'Cas 1 — sans programme annuel doit retourner []')
    console.log('✓ Cas 1 — sans programme annuel → []')
  }

  // ── Cas 1b : pas de matière → [] ───────────────────────────────────────────
  {
    const ctx = makeCtx({
      matiere:         null,
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [makeDoc('l1', 'Équations linéaires')],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.deepEqual(missions, [], 'Cas 1b — sans matière doit retourner []')
    console.log('✓ Cas 1b — sans matière → []')
  }

  // ── Cas 2 : aucune leçon → [] ──────────────────────────────────────────────
  {
    const ctx = makeCtx({
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.deepEqual(missions, [], 'Cas 2 — aucune leçon doit retourner []')
    console.log('✓ Cas 2 — aucune leçon → []')
  }

  // ── Cas 3 : leçons présentes, aucune évaluation → priorité 85 ──────────────
  {
    const ctx = makeCtx({
      programmeAnnuel:      makeProgramme(),
      dernieresLecons:      [
        makeDoc('l1', 'Équations linéaires',  10),
        makeDoc('l2', "Systèmes d'équations",  5),
      ],
      dernieresEvaluations: [],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 3 — doit retourner 1 mission')
    assert.equal(missions[0].priority, 85, 'Cas 3 — priorité doit être 85')
    assert.equal(missions[0].type, 'evaluation', 'Cas 3 — type doit être evaluation')
    assert.equal(missions[0].reason.code, 'no_evaluation', 'Cas 3 — code raison no_evaluation')
    assert.equal(missions[0].metadata['action'], 'create_first_evaluation', 'Cas 3 — action create_first_evaluation')
    assert.ok(missions[0].id.startsWith('evaluation_needed:'), 'Cas 3 — id préfixe evaluation_needed')
    console.log('✓ Cas 3 — aucune évaluation → mission priorité 85')
  }

  // ── Cas 4 : ≥3 leçons depuis la dernière éval → priorité 80 ────────────────
  {
    const oldEval = makeDoc('ev1', 'Évaluation Unité 0', 30)
    oldEval.dossierType = 'evaluation'
    // Les 3 leçons sont créées après l'éval (daysAgo < 30)
    // Le programme a 3 unités nommées différemment des leçons → pas de match Cas 5
    const ctx = makeCtx({
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [
        makeDoc('l1', 'Introduction aux fonctions',  20),
        makeDoc('l2', 'Droites et plans',            15),
        makeDoc('l3', 'Racines carrées',              5),
      ],
      dernieresEvaluations: [oldEval],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 4 — doit retourner 1 mission')
    assert.equal(missions[0].priority, 80, 'Cas 4 — priorité doit être 80')
    assert.equal(missions[0].reason.code, 'evaluation_overdue', 'Cas 4 — code evaluation_overdue')
    assert.equal(missions[0].metadata['action'], 'create_evaluation', 'Cas 4 — action create_evaluation')
    assert.ok(missions[0].id.startsWith('evaluation_overdue:'), 'Cas 4 — id préfixe evaluation_overdue')
    console.log('✓ Cas 4 — progression importante → mission priorité 80')
  }

  // ── Cas 5 : unité terminée non évaluée → priorité 82 ──────────────────────
  {
    const oldEval = makeDoc('ev1', 'Test général', 40)
    oldEval.dossierType = 'evaluation'
    // Les leçons correspondent aux noms exacts des unités du curriculum
    const ctx = makeCtx({
      programmeAnnuel: makeProgramme(),
      dernieresLecons: [
        makeDoc('l1', 'Algèbre',       20),
        makeDoc('l2', 'Géométrie',     10),
        makeDoc('l3', 'Statistiques',   5),
      ],
      dernieresEvaluations: [oldEval],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.equal(missions.length, 1, 'Cas 5 — doit retourner 1 mission')
    assert.equal(missions[0].priority, 82, 'Cas 5 — priorité doit être 82')
    assert.equal(missions[0].reason.code, 'unit_completed', 'Cas 5 — code unit_completed')
    assert.equal(missions[0].metadata['action'], 'evaluate_completed_unit', 'Cas 5 — action evaluate_completed_unit')
    assert.ok(missions[0].id.includes('evaluation_unit:'), 'Cas 5 — id contient evaluation_unit')
    console.log('✓ Cas 5 — unité terminée non évaluée → mission priorité 82')
  }

  // ── Confiance et progress_percent ──────────────────────────────────────────
  {
    const ctx = makeCtx({
      programmeAnnuel:      makeProgramme(),
      dernieresLecons:      [
        makeDoc('l1', 'Équations linéaires', 10),
        makeDoc('l2', 'Triangles semblables',  5),
      ],
      dernieresEvaluations: [],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.equal(missions.length, 1, 'Confiance — doit retourner 1 mission')
    const pp = missions[0].metadata['progress_percent']
    assert.ok(pp !== undefined, 'Confiance — progress_percent présent dans metadata')
    assert.ok(typeof pp === 'number' || pp === null, 'Confiance — progress_percent est number|null')
    console.log(`✓ Confiance — progress_percent = ${pp}`)
  }

  // ── Evidence — structure ───────────────────────────────────────────────────
  {
    const ctx = makeCtx({
      programmeAnnuel:      makeProgramme(),
      dernieresLecons:      [makeDoc('l1', 'Équations linéaires', 5)],
      dernieresEvaluations: [],
    })
    const missions = await detectEvaluation(situate(ctx))
    const m = missions[0]
    assert.ok(Array.isArray(m.evidence), 'Evidence — doit être un tableau')
    assert.ok((m.evidence?.length ?? 0) >= 2, 'Evidence — au moins 2 preuves')
    const sources = m.evidence?.map(e => e.source) ?? []
    assert.ok(sources.includes('programme_annuel'), 'Evidence — source programme_annuel présente')
    assert.ok(sources.includes('derniere_lecon'), 'Evidence — source derniere_lecon présente')
    console.log('✓ Evidence — structure correcte')
  }

  // ── Sans enseignant (fallback classe.id) ───────────────────────────────────
  {
    const ctx = makeCtx({
      enseignant:           null,
      programmeAnnuel:      makeProgramme(),
      dernieresLecons:      [makeDoc('l1', 'Algèbre', 3)],
      dernieresEvaluations: [],
    })
    const missions = await detectEvaluation(situate(ctx))
    assert.equal(missions.length, 1, 'Sans enseignant — doit retourner 1 mission')
    assert.ok(missions[0].id.includes(CLASSE_ID), 'Sans enseignant — id contient classeId (fallback)')
    console.log('✓ Sans enseignant — fallback sur classe.id')
  }

  console.log('\n✅ Tous les tests du détecteur d\'évaluation passent.')
}

main().catch(err => { console.error('ÉCHEC :', err); process.exit(1) })
