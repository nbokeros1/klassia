// ─── Normes professionnelles Alberta — Teaching Quality Standard (2019) ──────
// Source : Alberta Education, Teaching Quality Standard (2019)
// URL    : https://www.alberta.ca/teaching-quality-standard.aspx
// Statut : Référence ScorgIA en validation — PAS une certification officielle.
//
// RÈGLE ABSOLUE : Toute affirmation doit être reliée à une source vérifiée.
// Afficher systématiquement : "Alignement indicatif — ne constitue pas une
// certification officielle."

import type { NormeProfessionnelle } from '@/lib/types/teaching-pack'

export const AVERTISSEMENT_LEGAL_TQS =
  'Alignement indicatif — ne constitue pas une certification officielle. ' +
  'Ces normes sont présentées à titre de référence pédagogique seulement. ' +
  'Pour l\'évaluation professionnelle officielle, référez-vous à Alberta Education.'

// ─── Normes TQS 2019 — Sélection pour la planification ──────────────────────
// Source : Teaching Quality Standard (Alberta Education, 2019)
// Seules les dimensions pertinentes à la planification sont incluses ici.

export const NORMES_TQS_ALBERTA: NormeProfessionnelle[] = [
  {
    id: 'TQS-1a',
    standard: '1 — Fostering Effective Relationships',
    competence: 'Engaging students in purposeful learning',
    indicateur: 'Plans learning experiences that engage all students',
    elements_plan_lies: ['objectifs_lecon', 'mise_en_situation', 'pratique_guidee'],
    justification: 'Le plan de leçon doit prévoir des activités qui engagent tous les apprenants.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 1',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
  {
    id: 'TQS-2a',
    standard: '2 — Engaging in Career-Long Learning',
    competence: 'Demonstrating ongoing professional growth',
    indicateur: 'Reflects on and adapts teaching practice based on student learning',
    elements_plan_lies: ['reflexion_post', 'ajustements', 'evaluation_formative'],
    justification: 'Les sections de réflexion et d\'évaluation formative soutiennent la croissance professionnelle.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 2',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
  {
    id: 'TQS-3a',
    standard: '3 — Demonstrating a Professional Body of Knowledge',
    competence: 'Subject matter knowledge',
    indicateur: 'Plans instruction using current subject matter knowledge',
    elements_plan_lies: ['resultats_curriculaires', 'grandes_idees', 'rag', 'ras'],
    justification: 'Le plan annuel et les plans de séquence ancrent l\'enseignement dans le curriculum officiel.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 3',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
  {
    id: 'TQS-3b',
    standard: '3 — Demonstrating a Professional Body of Knowledge',
    competence: 'Differentiated instruction',
    indicateur: 'Plans for differentiated instruction to meet diverse learning needs',
    elements_plan_lies: ['diff_universelle', 'diff_ciblee', 'diff_specialisee'],
    justification: 'Les sections de différenciation dans le plan de leçon soutiennent cet indicateur.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 3',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
  {
    id: 'TQS-3c',
    standard: '3 — Demonstrating a Professional Body of Knowledge',
    competence: 'Assessment practices',
    indicateur: 'Designs and uses a variety of assessment practices',
    elements_plan_lies: ['evaluation_formative', 'evaluation_sommative', 'criteres_reussite'],
    justification: 'Les évaluations formatives et sommatives du Teaching Pack soutiennent des pratiques d\'évaluation variées.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 3',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
  {
    id: 'TQS-4a',
    standard: '4 — Establishing Inclusive Learning Environments',
    competence: 'Creating inclusive environments',
    indicateur: 'Plans instruction that is culturally responsive and inclusive',
    elements_plan_lies: ['differentiation', 'perspective_autochtone', 'profil_classe'],
    justification: 'Les éléments de différenciation et les adaptations soutiennent un environnement inclusif.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 4',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
  {
    id: 'TQS-5a',
    standard: '5 — Applying Foundational Knowledge about First Nations, Métis and Inuit',
    competence: 'FNMI integration',
    indicateur: 'Incorporates FNMI perspectives into planning and instruction',
    elements_plan_lies: ['perspective_autochtone', 'ressources'],
    justification: 'La perspective autochtone est un champ explicite des gabarits ScorgIA Alberta.',
    source: 'Teaching Quality Standard (Alberta Education, 2019), Standard 5',
    statut_verification: 'indicatif',
    avertissement_legal: AVERTISSEMENT_LEGAL_TQS,
  },
]

// ─── Alignement indicatif d'un Teaching Pack avec les normes TQS ─────────────

export type AlignementTQS = {
  norme: NormeProfessionnelle
  elements_presents: string[]
  elements_manquants: string[]
  niveau_alignement: 'fort' | 'partiel' | 'faible'
  note: string
}

export function calculerAlignementTQS(champsPlan: string[]): AlignementTQS[] {
  return NORMES_TQS_ALBERTA.map(norme => {
    const presents  = norme.elements_plan_lies.filter(e => champsPlan.includes(e))
    const manquants = norme.elements_plan_lies.filter(e => !champsPlan.includes(e))
    const ratio     = presents.length / Math.max(norme.elements_plan_lies.length, 1)
    const niveau    = ratio >= 0.7 ? 'fort' : ratio >= 0.4 ? 'partiel' : 'faible'

    return {
      norme,
      elements_presents: presents,
      elements_manquants: manquants,
      niveau_alignement: niveau,
      note: AVERTISSEMENT_LEGAL_TQS,
    }
  })
}
