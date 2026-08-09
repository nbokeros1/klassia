// SPIE-02 — Curriculum extraction prompt
// Builds the AI prompt for structured curriculum extraction.
// Province-aware but curriculum-agnostic: works with Alberta, Ontario, Quebec, BC, etc.

import type { ExtractionPromptConfig } from './types'

// Provincial vocabulary labels for extraction hints
const VOCAB_BY_PROVINCE: Record<string, { general: string; specifique: string; competence: string }> = {
  alberta:           { general: 'Résultat d\'apprentissage général (RAG)', specifique: 'Résultat d\'apprentissage spécifique (RAS)', competence: 'Compétence' },
  ontario:           { general: 'Overall Expectation', specifique: 'Specific Expectation', competence: 'Competency' },
  quebec:            { general: 'Compétence disciplinaire', specifique: 'Indicateur de compétence', competence: 'Compétence transversale' },
  bc:                { general: 'Big Idea', specifique: 'Curricular Competency', competence: 'Core Competency' },
  saskatchewan:      { general: 'Outcome', specifique: 'Indicator', competence: 'Cross-Curricular Competency' },
  manitoba:          { general: 'Learning Outcome', specifique: 'Achievement Indicator', competence: 'Competency' },
  nouveau_brunswick: { general: 'Résultat d\'apprentissage général', specifique: 'Résultat d\'apprentissage spécifique', competence: 'Compétence' },
  common_core:       { general: 'Standard', specifique: 'Sub-standard', competence: 'Practice' },
  ib:                { general: 'Aim / Objective', specifique: 'Learning Outcome', competence: 'ATL Skill' },
  france:            { general: 'Compétence du socle', specifique: 'Objectif de connaissance', competence: 'Capacité' },
}

export function buildExtractionSystemPrompt(): string {
  return `Tu es un expert en ingénierie pédagogique spécialisé dans l'analyse et la structuration de curricula scolaires.

Ta mission est d'analyser un document curriculaire et d'en extraire les éléments pédagogiques structurés.

RÈGLES ABSOLUES :
1. Extrais UNIQUEMENT ce qui est présent dans le document. N'invente rien.
2. Si un élément est ambigu, indique-le dans le champ warnings.
3. Respecte la structure hiérarchique du curriculum (général → spécifique).
4. Normalise les codes d'outcomes exactement comme dans le document.
5. Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaires.`
}

export function buildExtractionUserPrompt(
  texte: string,
  config: ExtractionPromptConfig = {}
): string {
  const { province, matiere, niveaux, langue } = config

  const vocabHints = province && VOCAB_BY_PROVINCE[province]
    ? `\nVocabulaire provincial (${province}) : ${JSON.stringify(VOCAB_BY_PROVINCE[province])}`
    : ''

  const contextHints = [
    province ? `Province: ${province}` : '',
    matiere ? `Matière: ${matiere}` : '',
    niveaux?.length ? `Niveaux: ${niveaux.join(', ')}` : '',
    langue ? `Langue principale: ${langue}` : '',
  ].filter(Boolean).join('\n')

  return `${contextHints ? `CONTEXTE:\n${contextHints}\n` : ''}${vocabHints}

DOCUMENT À ANALYSER:
---
${texte.substring(0, 12000)}
---

Extrais les éléments pédagogiques et retourne un JSON strictement conforme à cette structure:

{
  "province": "code_province_ou_null",
  "pays": "canada_ou_autre",
  "autoriteEmettrice": "nom_autorite",
  "matiere": "nom_matiere",
  "niveaux": ["grade 1", "grade 2"],
  "annee": 2024,
  "langue": "fr",
  "titre": "titre_du_curriculum",
  "description": "description_courte",
  "outcomesGeneraux": [
    {
      "code": "A1",
      "texte": "texte_complet_de_loutcome",
      "type": "general",
      "vocabulaireProvincial": "RAG",
      "niveauBloom": "comprendre",
      "parentCode": null,
      "conceptsReferenced": ["concept1"]
    }
  ],
  "outcomesSpecifiques": [
    {
      "code": "A1.1",
      "texte": "texte_complet",
      "type": "specifique",
      "vocabulaireProvincial": "RAS",
      "niveauBloom": "appliquer",
      "parentCode": "A1",
      "conceptsReferenced": []
    }
  ],
  "competences": [],
  "bigIdeas": [],
  "concepts": [
    { "terme": "addition", "definition": "opération mathématique", "synonymes": [] }
  ],
  "vocabulaire": [
    { "terme": "algorithme", "definition": "suite d'instructions", "contexte": "informatique", "niveauDifficulte": "intermediaire" }
  ],
  "contraintes": [
    { "description": "A1 doit précéder A2", "type": "prerequis", "prealablesCode": ["A1"], "cibleCode": "A2" }
  ],
  "confidenceScore": 85,
  "completenessScore": 90,
  "warnings": []
}`
}
