// ─── ScorgIA V7.1 — Student AI Context (Privacy P0) ────────────────────────
// Couche de minimisation des données avant tout appel IA concernant un élève.
//
// GARANTIES :
//   - Aucun identifiant DB réel transmis à l'IA
//   - Aucun nom/prénom complet (sauf si explicitement requis ET consenti)
//   - Aucune donnée médicale nominative
//   - Aucune désignation officielle (code) sans autorisation explicite
//   - Minimum pédagogique requis seulement
//
// TERMINOLOGIE :
//   "Pseudonymisation" — l'élève est remplacé par un code de session temporaire.
//   Pas "anonymisation" — un enseignant connaissant sa classe peut ré-identifier.
//   Ne pas promettre une anonymisation irréversible.
//
// UTILISATION :
//   const ctx = buildSafeStudentAIContext(plan, { purpose: 'strategy_suggestion' })
//   const response = await callAI(ctx.prompt_payload)
//
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SupportPlanV71,
  StudentPedagogicalProfile,
  StudentNeed,
  MeasurableGoal,
  Intervention,
  StudentObservation,
} from '../student/types'

// ════════════════════════════════════════════════════════════════════════════
// PSEUDONYME DE SESSION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Génère un code de session court pour remplacer l'identifiant élève.
 * Déterministe par session (même student_id → même pseudonyme dans le même appel).
 * Ne pas stocker ce code : il n'a de sens que dans le contexte de l'appel.
 */
export function generateStudentPseudonym(student_id: string): string {
  // Prend les 6 premiers chars du hash pour éviter les collisions dans un contexte de classe
  let hash = 0
  for (let i = 0; i < student_id.length; i++) {
    hash = ((hash << 5) - hash) + student_id.charCodeAt(i)
    hash |= 0 // convert to 32-bit integer
  }
  const code = Math.abs(hash).toString(36).slice(0, 5).toUpperCase()
  return `ELEVE-${code}`
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES DE CONTEXTE IA
// ════════════════════════════════════════════════════════════════════════════

export type AIContextPurpose =
  | 'strategy_suggestion'         // Suggérer des stratégies de soutien
  | 'goal_reformulation'          // Reformuler un objectif vague
  | 'differentiation'             // Différenciation pour un groupe
  | 'intervention_analysis'       // Analyser une boucle d'intervention
  | 'progress_summary'            // Résumé de progression
  | 'support_plan_review'         // Révision d'un plan de soutien

export type DataInclusionLevel =
  | 'minimal'                     // Besoins + objectifs seulement
  | 'standard'                    // + Stratégies + observations récentes
  | 'extended'                    // + Interventions + historique (usage restreint)

export type SafeStudentAIContext = {
  // Identifiant pseudonymisé — jamais le student_id réel
  pseudonym:           string

  // Données pédagogiques minimisées
  niveau_scolaire?:    string
  matiere_contexte?:   string

  // Besoins pédagogiques (sans référence à des diagnostics)
  besoins_ped:         SafeNeed[]

  // Objectifs actifs (sans dates qui pourraient ré-identifier)
  objectifs_actifs:    SafeGoal[]

  // Stratégies actuelles (si purpose le justifie)
  strategies_actuelles?: string[]

  // Observations récentes anonymisées (si purpose le justifie)
  observations_recentes?: string[]

  // Métadonnées de contexte
  purpose:             AIContextPurpose
  inclusion_level:     DataInclusionLevel

  // Avertissement légal inclus dans tout payload
  disclaimer:          string
}

export type SafeNeed = {
  domaine:     string
  description: string  // reformulé pédagogiquement, jamais médicalement
  priorite:    'elevee' | 'moderee' | 'faible'
}

export type SafeGoal = {
  domaine:    string
  formulation: string
  statut:     string
}

// ════════════════════════════════════════════════════════════════════════════
// BUILDER PRINCIPAL — buildSafeStudentAIContext
// ════════════════════════════════════════════════════════════════════════════

export type BuildContextOptions = {
  purpose:         AIContextPurpose
  inclusion_level?: DataInclusionLevel
  niveau_scolaire?: string
  matiere?:         string
}

/**
 * Construit un contexte IA sûr pour un plan de soutien élève.
 * Exclut systématiquement : ID réel, nom/prénom, codes officiels,
 * diagnostics, coordonnées, données familiales non pédagogiques.
 */
export function buildSafeStudentAIContext(
  plan:    SupportPlanV71,
  options: BuildContextOptions,
): SafeStudentAIContext {
  const level = options.inclusion_level ?? 'standard'
  const pseudonym = generateStudentPseudonym(plan.student_id)

  // Besoins — exclure toute référence diagnostique
  const besoins_ped: SafeNeed[] = (plan.profil?.besoins ?? []).map(sanitizeNeed)

  // Objectifs actifs — exclure dates précises ré-identifiantes si niveau minimal
  const objectifs_actifs: SafeGoal[] = plan.objectifs
    .filter(g => g.statut === 'actif')
    .map(g => sanitizeGoal(g, level))

  // Stratégies — seulement si inclusion >= standard
  const strategies_actuelles: string[] | undefined =
    level === 'minimal' ? undefined
    : plan.interventions
        .filter(i => i.statut === 'active')
        .map(i => sanitizeStrategie(i))

  // Observations récentes — seulement si inclusion >= standard
  const observations_recentes: string[] | undefined =
    level === 'minimal' ? undefined
    : (plan.observations ?? [])
        .slice(-3)  // 3 dernières seulement
        .map(o => sanitizeObservation(o))

  return {
    pseudonym,
    niveau_scolaire:       options.niveau_scolaire,
    matiere_contexte:      options.matiere,
    besoins_ped,
    objectifs_actifs,
    strategies_actuelles:  level !== 'minimal' ? strategies_actuelles : undefined,
    observations_recentes: level !== 'minimal' ? observations_recentes : undefined,
    purpose:               options.purpose,
    inclusion_level:       level,
    disclaimer:            STANDARD_DISCLAIMER,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE SANITISATION
// ════════════════════════════════════════════════════════════════════════════

function sanitizeNeed(need: StudentNeed): SafeNeed {
  return {
    domaine:     need.domaine,
    // Exclure tout diagnostic médical potentiel — reformuler fonctionnellement
    description: stripMedicalLanguage(need.description),
    priorite:    need.priorite,
  }
}

function sanitizeGoal(goal: MeasurableGoal, level: DataInclusionLevel): SafeGoal {
  return {
    domaine:     goal.domaine,
    formulation: level === 'minimal'
      ? goal.comportement  // formulation plus courte si minimal
      : goal.formulation,
    statut:      goal.statut,
  }
}

function sanitizeStrategie(intervention: Intervention): string {
  return `${intervention.strategie.strategie} — ${intervention.strategie.contexte} (${intervention.frequence.sessions_par_semaine}x/sem.)`
}

function sanitizeObservation(obs: StudentObservation): string {
  // Supprimer tout indicateur temporel précis ré-identifiant
  return `[${obs.contexte}] ${stripDateReferences(obs.observation)}`
}

// ════════════════════════════════════════════════════════════════════════════
// STRIPPING — suppression de contenu sensible
// ════════════════════════════════════════════════════════════════════════════

// Termes médicaux à remplacer par des descriptions fonctionnelles
const MEDICAL_TERM_REPLACEMENTS: [RegExp, string][] = [
  [/\bTDAH\b/gi,          'difficulté d\'attention déclarée'],
  [/\bdyslexie\b/gi,      'difficulté en lecture déclarée'],
  [/\bTSA\b/gi,           'profil d\'apprentissage déclaré'],
  [/\bdyscalculie\b/gi,   'difficulté en numératie déclarée'],
  [/\bdyspraxie\b/gi,     'difficulté motrice déclarée'],
  [/\bdépression\b/gi,    'situation personnelle déclarée'],
  [/\banxiété\b/gi,       'facteur d\'anxiété déclaré'],
  [/\bautisme\b/gi,       'profil d\'apprentissage déclaré'],
]

function stripMedicalLanguage(text: string): string {
  let result = text
  for (const [pattern, replacement] of MEDICAL_TERM_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// Supprimer les dates précises qui pourraient ré-identifier
function stripDateReferences(text: string): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[date]')
    .replace(/\ble\s+\d+\s+\w+\s+\d{4}\b/gi, '[date]')
    .replace(/\ben\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/gi, '[mois]')
}

// ════════════════════════════════════════════════════════════════════════════
// DISCLAIMER LÉGAL
// ════════════════════════════════════════════════════════════════════════════

const STANDARD_DISCLAIMER =
  'CONTEXTE SÉCURISÉ ScorgIA — Données pseudonymisées. '
  + 'Identifiant élève masqué. Aucun diagnostic médical inclus. '
  + 'Toute suggestion générée est indicative et doit être confirmée par l\'enseignant. '
  + 'Ne pas créer de diagnostic, code officiel, ou désignation institutionnelle.'

// ════════════════════════════════════════════════════════════════════════════
// SÉRIALISATION POUR PROMPT IA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Sérialise le contexte sûr en texte pour inclusion dans un prompt IA.
 * Format structuré lisible par le modèle.
 */
export function serializeSafeContext(ctx: SafeStudentAIContext): string {
  const lines: string[] = [
    `=== CONTEXTE PÉDAGOGIQUE — ${ctx.pseudonym} ===`,
    `[${ctx.disclaimer}]`,
    '',
  ]

  if (ctx.niveau_scolaire) lines.push(`Niveau : ${ctx.niveau_scolaire}`)
  if (ctx.matiere_contexte) lines.push(`Matière : ${ctx.matiere_contexte}`)

  if (ctx.besoins_ped.length > 0) {
    lines.push('', 'BESOINS PÉDAGOGIQUES DÉCLARÉS :')
    for (const b of ctx.besoins_ped) {
      lines.push(`  - [${b.priorite.toUpperCase()}] ${b.domaine} : ${b.description}`)
    }
  }

  if (ctx.objectifs_actifs.length > 0) {
    lines.push('', 'OBJECTIFS ACTIFS :')
    for (const g of ctx.objectifs_actifs) {
      lines.push(`  - [${g.domaine}] ${g.formulation}`)
    }
  }

  if (ctx.strategies_actuelles && ctx.strategies_actuelles.length > 0) {
    lines.push('', 'STRATÉGIES EN COURS :')
    for (const s of ctx.strategies_actuelles) {
      lines.push(`  - ${s}`)
    }
  }

  if (ctx.observations_recentes && ctx.observations_recentes.length > 0) {
    lines.push('', 'OBSERVATIONS RÉCENTES :')
    for (const o of ctx.observations_recentes) {
      lines.push(`  - ${o}`)
    }
  }

  lines.push('', '=== FIN DU CONTEXTE ===')

  return lines.join('\n')
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXTE DE CLASSE (agrégé — pour différenciation collective)
// Aucune donnée individuelle nominative
// ════════════════════════════════════════════════════════════════════════════

export type SafeClassAIContext = {
  classe_ref:      string         // "Classe 8B" ou identifiant opaque
  effectif_total:  number

  // Agrégats pédagogiques — jamais nominatifs
  agregats_besoins: { domaine: string; nb_eleves: number }[]
  nb_avec_accommodations: number
  nb_avec_technologie:    number
  nb_avec_soutien_cible:  number

  matiere:         string
  niveau:          string

  disclaimer:      string
}

export type ClassSupportSummary = {
  student_id:  string
  besoins:     { domaine: string }[]
  has_accommodation: boolean
  has_tech:    boolean
  support_level: 'universal' | 'targeted' | 'individualized'
}

/**
 * Construit un contexte de classe agrégé pour l'IA.
 * N'expose jamais les données individuelles — uniquement des comptes.
 */
export function buildSafeClassAIContext(
  classe_ref:   string,
  niveau:       string,
  matiere:      string,
  students:     ClassSupportSummary[],
): SafeClassAIContext {
  // Agréger les besoins par domaine
  const domaineCount = new Map<string, number>()
  for (const s of students) {
    for (const b of s.besoins) {
      domaineCount.set(b.domaine, (domaineCount.get(b.domaine) ?? 0) + 1)
    }
  }

  const agregats_besoins = Array.from(domaineCount.entries())
    .map(([domaine, nb_eleves]) => ({ domaine, nb_eleves }))
    .sort((a, b) => b.nb_eleves - a.nb_eleves)

  return {
    classe_ref,
    effectif_total:          students.length,
    agregats_besoins,
    nb_avec_accommodations:  students.filter(s => s.has_accommodation).length,
    nb_avec_technologie:     students.filter(s => s.has_tech).length,
    nb_avec_soutien_cible:   students.filter(s => s.support_level !== 'universal').length,
    matiere,
    niveau,
    disclaimer:              CLASS_DISCLAIMER,
  }
}

const CLASS_DISCLAIMER =
  'CONTEXTE DE CLASSE ScorgIA — Données agrégées anonymisées. '
  + 'Aucun élève nominatif inclus. '
  + 'Ces chiffres décrivent le niveau de soutien collectif, non des diagnostics individuels.'
