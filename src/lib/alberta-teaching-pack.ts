// ─── ScorgIA Alberta Teaching Pack — Définition centrale ─────────────────────
// Ce fichier définit les métadonnées officielles du Pack Alberta.
// IMPORTANT : Ce pack n'est PAS un produit officiel du gouvernement de l'Alberta.
// C'est un ensemble de gabarits et de règles conçus par ScorgIA pour le contexte
// albertain, basés sur les documents publics d'Alberta Education.

import type { AlbertaPackMetadata } from '@/lib/types/teaching-pack'

export const ALBERTA_PACK_METADATA: AlbertaPackMetadata = {
  id:      'scorgia-alberta-v1-beta',
  nom:     'ScorgIA Alberta Teaching Pack — Beta',
  nom_legal: 'ScorgIA Alberta Teaching Pack (Bêta privée)',
  province: 'alberta',
  pays:    'Canada',
  langue:  'fr',
  version: '1.0.0-beta',
  statut:  'beta',
  date_publication: '2026-08-04',
  date_mise_a_jour: '2026-08-04',
  auteur:  'ScorgIA / Bodingo AI Tech Inc.',

  description: `Le ScorgIA Alberta Teaching Pack est un ensemble de gabarits pédagogiques
et de règles de structuration conçus par ScorgIA pour les enseignants francophones
de l'Alberta. Il organise la planification annuelle selon les principes du Programme
d'études de l'Alberta (Program of Studies) et les compétences du Teaching Quality
Standard (2019).

Ce pack n'a pas été produit, approuvé ni certifié par Alberta Education ou le
gouvernement de l'Alberta.`,

  niveaux_compatibles: [
    'Maternelle', '1re année', '2e année', '3e année', '4e année',
    '5e année', '6e année', '7e année', '8e année', '9e année',
    '10e année', '11e année', '12e année',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12',
  ],

  matieres_compatibles: [
    'Mathématiques', 'Français', 'Sciences', 'Sciences sociales',
    'Arts visuels', 'Musique', 'Éducation physique', 'Anglais',
    'Informatique', 'Santé',
    'Mathematics', 'Language Arts', 'Social Studies',
    'Science', 'Physical Education', 'Health',
  ],

  sources: [
    {
      organisme: 'Alberta Education',
      titre: 'Program of Studies — Alberta Curriculum',
      url: 'https://www.alberta.ca/curriculum.aspx',
      version: '2023',
      date: '2023-09-01',
      langue: 'en',
      date_consultation: '2026-08-04',
      statut: 'reference_scorgia_en_validation',
    },
    {
      organisme: 'Alberta Education',
      titre: 'Teaching Quality Standard (2019)',
      url: 'https://www.alberta.ca/teaching-quality-standard.aspx',
      version: '2019',
      date: '2019-09-01',
      langue: 'en',
      date_consultation: '2026-08-04',
      statut: 'reference_scorgia_en_validation',
    },
  ],

  limites: [
    "Ce pack n'est pas approuvé par Alberta Education.",
    "Les résultats d'apprentissage sont des références indicatives — l'enseignant doit vérifier avec le Programme d'études officiel.",
    "Le contenu généré par IA doit être révisé par l'enseignant avant utilisation.",
    "Les calendriers scolaires varient selon le conseil scolaire — adaptez les dates.",
    "Ce pack est en version bêta et peut contenir des erreurs ou des lacunes.",
  ],

  gabarits_inclus: [
    'scorgia-alberta-plan-annuel-v1',
    'scorgia-alberta-plan-sequence-v1',
    'scorgia-alberta-plan-lecon-v1',
  ],

  normes_professionnelles: [
    'Teaching Quality Standard (Alberta) — 2019',
  ],

  avertissement_legal:
    "ScorgIA Alberta Teaching Pack est un outil d'aide à la planification conçu " +
    "par ScorgIA (Bodingo AI Tech Inc.). Il ne constitue pas un document officiel " +
    "du gouvernement de l'Alberta ni d'Alberta Education. L'enseignant demeure " +
    "responsable du contenu enseigné et de sa conformité avec les exigences " +
    "curriculaires officielles.",
}

// ─── Helper : nom contextualisé d'un pack enseignant ─────────────────────────

export function buildPackNom(matiere: string, niveau: string, province: string, annee: string): string {
  const prov = province.charAt(0).toUpperCase() + province.slice(1)
  return `${matiere} ${niveau} — ${prov} — ${annee}`
}

// ─── Niveaux Alberta normalisés ───────────────────────────────────────────────

export const ALBERTA_GRADE_MAP: Record<string, string> = {
  'maternelle': 'Kindergarten',
  '1re': 'Grade 1', '1re année': 'Grade 1',
  '2e':  'Grade 2', '2e année':  'Grade 2',
  '3e':  'Grade 3', '3e année':  'Grade 3',
  '4e':  'Grade 4', '4e année':  'Grade 4',
  '5e':  'Grade 5', '5e année':  'Grade 5',
  '6e':  'Grade 6', '6e année':  'Grade 6',
  '7e':  'Grade 7', '7e année':  'Grade 7',
  '8e':  'Grade 8', '8e année':  'Grade 8',
  '9e':  'Grade 9', '9e année':  'Grade 9',
  '10e': 'Grade 10', '10e année': 'Grade 10',
  '11e': 'Grade 11', '11e année': 'Grade 11',
  '12e': 'Grade 12', '12e année': 'Grade 12',
}
