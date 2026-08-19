// MON-ANNEE-V3 — Smart Syllabus Engine
// Fonctions pures : normalisation V1→V3, score de complétude, calendrier déterministe.

import type { PackSyllabus, AperçuCalendrierItem } from '@/lib/types/teaching-pack'
import type { ContenuProgramme } from '@/lib/types/database'

// ─── Score de complétude ──────────────────────────────────────────────────────

const WEIGHTS = {
  titre_cours:              5,
  niveau:                   3,
  matiere:                  3,
  description_cours:        5,
  mission_cours:            5,
  objectifs_generaux:       10,
  grandes_idees:            5,
  resultats_apprentissage:  10,
  methodes_pedagogiques:    5,
  methodes_evaluation:      5,
  evaluation_categories:    5,
  attentes_classe:          5,
  politique_presence:       5,
  politique_retards:        3,
  politique_remise_travaux: 3,
  integrite_academique:     4,
  communication:            4,
  apercu_calendrier:        5,
} as const

type WeightKey = keyof typeof WEIGHTS

function isFilled(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 && !t.startsWith('À compléter') && !t.startsWith('À préciser')
  }
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(x => isFilled(x))
  return false
}

export type SyllabusCompletenessDetail = {
  present: boolean
  weight:  number
}

export type SyllabusCompleteness = {
  score:   number   // 0-100
  details: Record<WeightKey, SyllabusCompletenessDetail>
  sections: {
    presentation:   number   // 0-100 proportionnel à la section
    objectifs:      number
    methodologie:   number
    evaluation:     number
    attentes:       number
    politiques:     number
    communication:  number
    calendrier:     number
  }
}

export function getSyllabusCompleteness(s: PackSyllabus): SyllabusCompleteness {
  const checks: Array<[WeightKey, boolean]> = [
    ['titre_cours',              isFilled(s.titre_cours)],
    ['niveau',                   isFilled(s.niveau)],
    ['matiere',                  isFilled(s.matiere)],
    ['description_cours',        isFilled(s.description_cours) || isFilled(s.description)],
    ['mission_cours',            isFilled(s.mission_cours)],
    ['objectifs_generaux',       isFilled(s.objectifs_generaux)],
    ['grandes_idees',            isFilled(s.grandes_idees)],
    ['resultats_apprentissage',  isFilled(s.resultats_apprentissage)],
    ['methodes_pedagogiques',    isFilled(s.methodes_pedagogiques)],
    ['methodes_evaluation',      isFilled(s.methodes_evaluation)],
    ['evaluation_categories',    isFilled(s.evaluation?.categories)],
    ['attentes_classe',          isFilled(s.attentes_classe) || isFilled(s.attentes)],
    ['politique_presence',       isFilled(s.politique_presence)],
    ['politique_retards',        isFilled(s.politique_retards)],
    ['politique_remise_travaux', isFilled(s.politique_remise_travaux)],
    ['integrite_academique',     isFilled(s.integrite_academique)],
    ['communication',            isFilled(s.communication)],
    ['apercu_calendrier',        isFilled(s.apercu_calendrier)],
  ]

  let score = 0
  const details = {} as Record<WeightKey, SyllabusCompletenessDetail>

  for (const [key, present] of checks) {
    const weight = WEIGHTS[key]
    if (present) score += weight
    details[key] = { present, weight }
  }

  const sectionScore = (keys: WeightKey[]): number => {
    const rel = checks.filter(([k]) => (keys as string[]).includes(k))
    if (rel.length === 0) return 0
    return Math.round(rel.filter(([, v]) => v).length / rel.length * 100)
  }

  return {
    score: Math.min(100, score),
    details,
    sections: {
      presentation:  sectionScore(['titre_cours', 'niveau', 'matiere', 'description_cours', 'mission_cours']),
      objectifs:     sectionScore(['objectifs_generaux', 'grandes_idees', 'resultats_apprentissage']),
      methodologie:  sectionScore(['methodes_pedagogiques', 'methodes_evaluation']),
      evaluation:    sectionScore(['evaluation_categories']),
      attentes:      sectionScore(['attentes_classe']),
      politiques:    sectionScore(['politique_presence', 'politique_retards', 'politique_remise_travaux', 'integrite_academique']),
      communication: sectionScore(['communication']),
      calendrier:    sectionScore(['apercu_calendrier']),
    },
  }
}

// ─── Normalisation V1 → V3 ────────────────────────────────────────────────────

export function normalizeSyllabus(s: PackSyllabus): PackSyllabus {
  return {
    ...s,
    description_cours:      s.description_cours ?? s.description,
    attentes_classe:         s.attentes_classe ?? s.attentes,
    ressources_principales:  s.ressources_principales ?? s.ressources_suggeres,
  }
}

// ─── Aperçu calendrier déterministe ──────────────────────────────────────────

export function buildAperçuCalendrier(programme: ContenuProgramme): AperçuCalendrierItem[] {
  return programme.unites.map(u => ({
    semaines:    `S${u.semaine_debut}–S${u.semaine_fin}`,
    titre:       u.titre,
    description: (u as { justification_pedagogique?: string }).justification_pedagogique ?? undefined,
  }))
}
