// V7.4.3 — Anti-placeholder validator tests
// Cases A–F as specified in the Curriculum Integrity Hotfix spec.

import { validatePedagogicalProgramme } from '../validate-pedagogical-programme'
import type { ContenuProgramme } from '@/lib/types/database'

function makeContenu(overrides: Partial<ContenuProgramme> = {}): ContenuProgramme {
  return {
    titre:            'Programme Français — Secondaire 3',
    nb_semaines:      36,
    source_curriculum: 'alberta',
    unites: [
      {
        numero:       1,
        titre:        'Communication orale — Interaction et partage',
        semaine_debut: 1,
        semaine_fin:   6,
        objectifs:    ['L\'élève interagit en français dans des contextes variés'],
        lecons: [
          { numero: 1, titre: 'Discussion structurée — partager ses idées', sujet: 'Pratique de la communication en groupe', duree_minutes: 60, type: 'introduction' },
          { numero: 2, titre: 'Écoute active et prise de notes', sujet: 'Stratégies d\'écoute en contexte francophone', duree_minutes: 60, type: 'developpement' },
        ],
      },
    ],
    ...overrides,
  }
}

// A. Valid rich programme → PASS
test('A — valid programme passes validation', () => {
  const result = validatePedagogicalProgramme(makeContenu())
  expect(result.valid).toBe(true)
  expect(result.violations).toHaveLength(0)
})

// B. Invalid JSON already blocked at parse level → validator receives empty unites
test('B — empty unites fails validation', () => {
  const result = validatePedagogicalProgramme(makeContenu({ unites: [] }))
  expect(result.valid).toBe(false)
  expect(result.violations[0].rule).toBe('empty-programme')
})

// C. "Unité 1 / Leçon 1" fallback → blocked
test('C — generic unit title blocked', () => {
  const result = validatePedagogicalProgramme(makeContenu({
    unites: [{
      numero: 1, titre: 'Unité 1', semaine_debut: 1, semaine_fin: 6,
      objectifs: ['Objectif principal'],
      lecons: [{ numero: 1, titre: 'Leçon 1', sujet: 'Contenu à définir', duree_minutes: 60, type: 'developpement' }],
    }],
  }))
  expect(result.valid).toBe(false)
  const rules = result.violations.map(v => v.rule)
  expect(rules).toContain('generic-unit-title')
  expect(rules).toContain('placeholder-objective')
  expect(rules).toContain('generic-lesson-title')
  expect(rules).toContain('placeholder-content')
})

// C2. All known placeholder strings are caught
test('C2 — all placeholder variants caught', () => {
  const bad = ['Unité 2', 'Unité 3 — Introduction', 'Séquence 1', 'Leçon 5', 'Leçon 12 — Révision']
  for (const titre of bad) {
    const r = validatePedagogicalProgramme(makeContenu({
      unites: [{ numero: 1, titre, semaine_debut: 1, semaine_fin: 6, objectifs: ['Objectif réel'], lecons: [] }],
    }))
    expect(r.valid).toBe(false)
  }
})

// C3. Real curricula containing numbers are NOT false-positived
test('C3 — real titles with numbers pass', () => {
  const good = [
    'Unité de mesure — le mètre et le centimètre',
    'Les Premières Nations : 5 nations fondatrices',
    'Leçon de grammaire : les 3 groupes verbaux',
    'Chapitre 1 : L\'identité francophone',
  ]
  for (const titre of good) {
    const r = validatePedagogicalProgramme(makeContenu({
      unites: [{ numero: 1, titre, semaine_debut: 1, semaine_fin: 6, objectifs: ['Objectif réel'], lecons: [] }],
    }))
    expect(r.valid).toBe(true)
  }
})

// D. Old V1 pack is still readable by validator (does not throw)
test('E — legacy V1 pack structure is safe to validate', () => {
  const v1Pack = {
    titre: 'Programme de Français — Secondaire 3',
    nb_semaines: 36,
    source_curriculum: 'alberta',
    unites: [{
      numero: 1, titre: 'Compréhension de textes', semaine_debut: 1, semaine_fin: 6,
      objectifs: ['Développer la lecture critique'],
      competences: ['Compréhension de l\'écrit'],
      lecons: [{
        numero: 1, titre: 'Textes informatifs — repérer les idées principales',
        sujet: 'Stratégies de lecture pour textes informatifs', duree_minutes: 75, type: 'developpement' as const,
      }],
    }],
  } as ContenuProgramme
  expect(() => validatePedagogicalProgramme(v1Pack)).not.toThrow()
  const r = validatePedagogicalProgramme(v1Pack)
  expect(r.valid).toBe(true)
})

// F. Objective placeholders blocked
test('F — "Objectif principal" and "Objectif secondaire" blocked', () => {
  const r = validatePedagogicalProgramme(makeContenu({
    unites: [{
      numero: 1, titre: 'Titre réel', semaine_debut: 1, semaine_fin: 6,
      objectifs: ['Objectif principal', 'Objectif secondaire'],
      lecons: [],
    }],
  }))
  expect(r.valid).toBe(false)
  expect(r.violations.every(v => v.rule === 'placeholder-objective')).toBe(true)
})
