// ─── KlassIA+ — Curricula officiels ────────────────────────────────────────────
// Source unique de vérité — utilisé dans les pages UI et les routes API.

// Format riche : utilisé dans les sélecteurs avec flag et groupement par pays
export const CURRICULA = [
  { id: 'alberta',          label: 'Alberta — Program of Studies',       flag: '🏔️', pays: 'canada' },
  { id: 'ontario',          label: 'Ontario — The Ontario Curriculum',    flag: '🍁', pays: 'canada' },
  { id: 'quebec',           label: 'Québec — PFEQ (MEES)',                flag: '⚜️', pays: 'canada' },
  { id: 'bc',               label: 'Colombie-Britannique',                flag: '🌊', pays: 'canada' },
  { id: 'saskatchewan',     label: 'Saskatchewan',                        flag: '🌾', pays: 'canada' },
  { id: 'manitoba',         label: 'Manitoba',                            flag: '🦬', pays: 'canada' },
  { id: 'nouveau_brunswick', label: 'Nouveau-Brunswick',                  flag: '🦞', pays: 'canada' },
  { id: 'common_core',      label: 'Common Core (USA)',                   flag: '🇺🇸', pays: 'usa'    },
  { id: 'ib',               label: 'Baccalauréat International (IB)',     flag: '🌍', pays: 'autre'  },
  { id: 'france',           label: 'Éducation nationale (France)',        flag: '🇫🇷', pays: 'autre'  },
] as const

export type CurriculumId = (typeof CURRICULA)[number]['id']

// Format compact : utilisé dans les radio-buttons de génération IA (pages UI)
export const CURRICULA_IA: { v: CurriculumId; l: string }[] = [
  { v: 'quebec',      l: '🇨🇦 Québec — PFEQ (MEES)'            },
  { v: 'ontario',     l: '🇨🇦 Ontario — The Ontario Curriculum'  },
  { v: 'alberta',     l: '🇨🇦 Alberta — Program of Studies'      },
  { v: 'bc',          l: '🇨🇦 Colombie-Britannique'              },
  { v: 'common_core', l: '🇺🇸 Common Core (USA)'                 },
  { v: 'ib',          l: '🌍 Baccalauréat International (IB)'   },
  { v: 'france',      l: '🇫🇷 Éducation nationale (France)'      },
]

// Contexte narratif injecté dans les prompts API curriculum
export const CURRICULA_CONTEXT: Record<string, string> = {
  quebec:      "Programme de formation de l'école québécoise (PFEQ/MEES). Compétences transversales, domaines d'apprentissage, progression des apprentissages.",
  ontario:     "The Ontario Curriculum (Ministère de l'Éducation de l'Ontario). Expectations: overall and specific, cross-curricular connections.",
  alberta:     "Alberta Program of Studies (Alberta Education). Learning outcomes, key concepts, essential questions, competencies.",
  bc:          "BC Curriculum (Ministry of Education BC). Core competencies, curricular competencies, big ideas, First Peoples Principles of Learning.",
  saskatchewan:"Saskatchewan Curriculum (Ministry of Education SK). Outcomes, indicators, adaptive dimension, treaty education.",
  manitoba:    "Manitoba Curriculum (Manitoba Education). Learning outcomes, cluster of skills, differentiated instruction.",
  common_core: "Common Core State Standards (USA). Standards for Mathematical Practice, ELA Anchor Standards, college and career readiness.",
  ib:          "International Baccalaureate (IB). Approaches to Teaching and Learning (ATL), transdisciplinary themes, learner profile.",
  france:      "Éducation nationale française. Programmes officiels, compétences du socle commun, évaluation par compétences.",
}

// Aide à trouver le label affichable à partir d'un id de source_curriculum
export const getCurriculumLabel = (id: string): string =>
  CURRICULA.find(c => c.id === id)?.label ?? id
