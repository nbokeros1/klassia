// ─── ScorgIA V7.1 — Grouping Intelligence Foundation (Missions 12+13) ──────
// Prépare le système de groupes pédagogiques.
// Connexion future avec Smart Classroom V8.
//
// RÈGLES ABSOLUES :
//   - Ne jamais écrire "élèves faibles" ou "élèves forts" dans l'interface publique
//   - Toujours fournir une justification pédagogique
//   - ScorgIA propose une STRUCTURE — l'enseignant la peuple
//   - Aucun groupe ne contient de noms d'élèves dans ce modèle collectif
//   - "Le meilleur groupement" n'existe pas — proposer + justifier + laisser modifier
// ─────────────────────────────────────────────────────────────────────────────

import type { ClassPedagogicalContext } from '../classroom/class-context'
import type { LessonPlanV7 } from '../types/index'

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type GroupWorkType =
  | 'PAIR'
  | 'TRIO'
  | 'GROUP_4'
  | 'GROUP_5'
  | 'FLEXIBLE'
  | 'HETEROGENEOUS'
  | 'TARGETED'
  | 'RANDOM'
  | 'STATION'
  | 'JIGSAW'

export type StudentRole = {
  id:          string
  nom:         string      // Noms pédagogiques — jamais "le fort" / "le faible"
  description: string
  responsabilites: string[]
}

// Rôles prédéfinis — formulations pédagogiques neutres
export const PEDAGOGICAL_ROLES: StudentRole[] = [
  {
    id: 'facilitateur',
    nom: 'Facilitateur·trice',
    description: 'Guide le déroulement de l\'activité et s\'assure que tous participent',
    responsabilites: ['Gérer le temps', 'Donner la parole', 'Résumer les avancées'],
  },
  {
    id: 'scripteur',
    nom: 'Scripteur·trice',
    description: 'Consigne les idées et décisions du groupe',
    responsabilites: ['Prendre des notes', 'Organiser les idées', 'Rédiger la synthèse'],
  },
  {
    id: 'porte_parole',
    nom: 'Porte-parole',
    description: 'Présente les résultats au groupe-classe',
    responsabilites: ['Préparer la présentation', 'Communiquer les résultats'],
  },
  {
    id: 'verificateur',
    nom: 'Vérificateur·trice',
    description: 'S\'assure que le travail répond aux critères de réussite',
    responsabilites: ['Relire les critères', 'Vérifier la qualité', 'Signaler les omissions'],
  },
  {
    id: 'chercheur',
    nom: 'Chercheur·euse',
    description: 'Recherche des informations ou des ressources pour le groupe',
    responsabilites: ['Consulter les ressources', 'Partager les trouvailles'],
  },
  {
    id: 'organisateur',
    nom: 'Organisateur·trice',
    description: 'Gère le matériel et l\'espace de travail du groupe',
    responsabilites: ['Distribuer le matériel', 'Ranger après l\'activité'],
  },
]

export type PedagogicalGroup = {
  id:             string
  nom:            string       // Nom pédagogique contextuel — ex. "Groupe consolidation — fractions"
  nb_membres:     number       // Jamais les noms des élèves ici
  roles:          StudentRole[]
  activite:       string
  competences_travaillees: string[]
  // Lien Smart Classroom V8 (Mission 13)
  zone_classe?:   string       // Zone suggérée (si Smart Classroom disponible)
}

export type GroupWorkProposal = {
  id:                    string
  type:                  GroupWorkType
  objectif_pedagogique:  string
  justification:         string        // OBLIGATOIRE — pourquoi ce type de groupement
  duree_minutes:         number
  groupes:               PedagogicalGroup[]
  competences_visees:    string[]
  considerations:        string[]      // Points d'attention pour l'enseignant
  ai_source_type:        'AI_SUGGESTION'
  teacher_confirmation_required: true
  ai_warning:            string        // Avertissement que ScorgIA ne "sait" pas le meilleur groupe
  created_at:            string
}

// ════════════════════════════════════════════════════════════════════════════
// NOMS PÉDAGOGIQUES — jamais "faibles/forts"
// ════════════════════════════════════════════════════════════════════════════

// Banque de noms pédagogiques contextuels basés sur le contenu, pas le niveau
const PEDAGOGICAL_GROUP_NAME_TEMPLATES: Record<string, string[]> = {
  consolidation:  [
    'Groupe consolidation',
    'Groupe pratique guidée',
    'Groupe de renforcement',
  ],
  exploration:    [
    'Groupe exploration',
    'Groupe approfondissement',
    'Groupe création',
  ],
  cooperation:    [
    'Équipe A',
    'Équipe B',
    'Équipe C',
    'Équipe D',
  ],
  station:        [
    'Station Lecture',
    'Station Manipulation',
    'Station Numérique',
    'Station Création',
  ],
  jigsaw:         [
    'Groupe Expert A',
    'Groupe Expert B',
    'Groupe Expert C',
  ],
}

function generateGroupName(type: GroupWorkType, index: number, matiere?: string): string {
  let bank: string[] | undefined

  switch (type) {
    case 'TARGETED':    bank = PEDAGOGICAL_GROUP_NAME_TEMPLATES.consolidation; break
    case 'FLEXIBLE':    bank = PEDAGOGICAL_GROUP_NAME_TEMPLATES.exploration; break
    case 'STATION':     bank = PEDAGOGICAL_GROUP_NAME_TEMPLATES.station; break
    case 'JIGSAW':      bank = PEDAGOGICAL_GROUP_NAME_TEMPLATES.jigsaw; break
    default:            bank = PEDAGOGICAL_GROUP_NAME_TEMPLATES.cooperation; break
  }

  const base = bank[index % bank.length]
  return matiere ? `${base} — ${matiere}` : base
}

// ════════════════════════════════════════════════════════════════════════════
// BUILDER DE PROPOSITION DE GROUPEMENT
// ════════════════════════════════════════════════════════════════════════════

export type GroupingOptions = {
  type:           GroupWorkType
  objectif:       string
  duree_minutes:  number
  competences:    string[]
  matiere?:       string
}

/**
 * Construit une proposition de groupement pédagogique.
 * ScorgIA propose une STRUCTURE — l'enseignant la peuple avec les élèves réels.
 * Le modèle ne sait pas qui mettre dans quel groupe.
 */
export function buildGroupWorkProposal(
  options:    GroupingOptions,
  ctx:        ClassPedagogicalContext,
  lesson?:    LessonPlanV7,
): GroupWorkProposal {
  const effectif = ctx.effectif_total
  const groupes  = buildGroupStructure(options, effectif, ctx)

  return {
    id:                    `gwp-${Date.now()}`,
    type:                  options.type,
    objectif_pedagogique:  options.objectif,
    justification:         buildJustification(options, ctx),
    duree_minutes:         options.duree_minutes,
    groupes,
    competences_visees:    options.competences,
    considerations:        buildConsiderations(options, ctx),
    ai_source_type:        'AI_SUGGESTION',
    teacher_confirmation_required: true,
    ai_warning:            AI_GROUPING_WARNING,
    created_at:            new Date().toISOString(),
  }
}

function buildGroupStructure(
  options:  GroupingOptions,
  effectif: number,
  ctx:      ClassPedagogicalContext,
): PedagogicalGroup[] {
  const { type, competences, matiere } = options

  // Calculer le nombre et la taille des groupes selon le type
  const { nb_groupes, taille } = computeGroupSizes(type, effectif, ctx)

  const groupes: PedagogicalGroup[] = []

  for (let i = 0; i < nb_groupes; i++) {
    const roles = selectRolesForGroup(taille, type)

    groupes.push({
      id:                     `g-${i + 1}`,
      nom:                    generateGroupName(type, i, matiere),
      nb_membres:             taille[i] ?? taille[0],
      roles,
      activite:               generateGroupActivity(type, options.objectif, i),
      competences_travaillees: competences,
      zone_classe:            ctx.smart_classroom?.zones_disponibles?.[i % (ctx.smart_classroom.zones_disponibles.length || 1)],
    })
  }

  return groupes
}

function computeGroupSizes(
  type:     GroupWorkType,
  effectif: number,
  ctx:      ClassPedagogicalContext,
): { nb_groupes: number; taille: number[] } {
  switch (type) {
    case 'PAIR': {
      const nb = Math.ceil(effectif / 2)
      return { nb_groupes: nb, taille: Array(nb).fill(2) }
    }
    case 'TRIO': {
      const nb = Math.ceil(effectif / 3)
      return { nb_groupes: nb, taille: Array(nb).fill(3) }
    }
    case 'GROUP_4': {
      const nb = Math.ceil(effectif / 4)
      return { nb_groupes: nb, taille: Array(nb).fill(4) }
    }
    case 'GROUP_5': {
      const nb = Math.ceil(effectif / 5)
      return { nb_groupes: nb, taille: Array(nb).fill(5) }
    }
    case 'TARGETED': {
      // Groupes ciblés basés sur les niveaux de soutien
      return {
        nb_groupes: 3,
        taille: [
          Math.round(ctx.nb_soutien_individualise + ctx.nb_soutien_cible),
          Math.round((effectif - ctx.nb_soutien_cible - ctx.nb_soutien_individualise) / 2),
          Math.round((effectif - ctx.nb_soutien_cible - ctx.nb_soutien_individualise) / 2),
        ].map(n => Math.max(1, n)),
      }
    }
    case 'STATION': {
      const nb = Math.min(4, Math.floor(effectif / 3))
      const base = Math.floor(effectif / nb)
      return { nb_groupes: nb, taille: Array(nb).fill(base) }
    }
    case 'JIGSAW': {
      const nb = 4
      const base = Math.floor(effectif / nb)
      return { nb_groupes: nb, taille: Array(nb).fill(base) }
    }
    default: {
      const nb = Math.ceil(effectif / 4)
      return { nb_groupes: nb, taille: Array(nb).fill(4) }
    }
  }
}

function selectRolesForGroup(taille: number[], type: GroupWorkType): StudentRole[] {
  const groupSize = taille[0] ?? 4

  if (type === 'PAIR') {
    return [PEDAGOGICAL_ROLES[0], PEDAGOGICAL_ROLES[2]] // facilitateur + porte-parole
  }

  if (groupSize <= 3) {
    return PEDAGOGICAL_ROLES.slice(0, 3)
  }

  return PEDAGOGICAL_ROLES.slice(0, Math.min(groupSize, PEDAGOGICAL_ROLES.length))
}

function generateGroupActivity(type: GroupWorkType, objectif: string, index: number): string {
  if (type === 'STATION') {
    const activities = ['Lecture indépendante', 'Manipulation', 'Pratique numérique', 'Création']
    return activities[index % activities.length]
  }
  if (type === 'JIGSAW') {
    return `Maîtriser et enseigner le sous-thème ${index + 1}`
  }
  return objectif
}

function buildJustification(options: GroupingOptions, ctx: ClassPedagogicalContext): string {
  const base = GROUP_TYPE_JUSTIFICATIONS[options.type] ?? 'Groupement pédagogique adapté au contexte.'

  const context_note = ctx.nb_soutien_cible > 0
    ? ` Contexte : ${ctx.nb_soutien_cible} élève(s) bénéficient d'un soutien ciblé — cette structure favorise la flexibilité pédagogique.`
    : ''

  return `${base}${context_note}`
}

function buildConsiderations(options: GroupingOptions, ctx: ClassPedagogicalContext): string[] {
  const considerations: string[] = [
    AI_GROUPING_WARNING,
    'Vérifier que chaque groupe a accès aux accommodations nécessaires.',
  ]

  if (ctx.indicateurs_planification.necessite_technologie_assistance) {
    considerations.push('S\'assurer que la technologie d\'assistance est disponible dans le groupe concerné.')
  }

  if (ctx.indicateurs_planification.necessite_environnement_calme) {
    considerations.push('Positionner le groupe qui nécessite un environnement calme loin des zones d\'activité intense.')
  }

  if (options.type === 'TARGETED') {
    considerations.push(
      'Les groupes ciblés ne doivent jamais être permanents ni associés à une étiquette de niveau.',
      'Recomposer régulièrement selon les objectifs — pas selon une "capacité fixe".',
    )
  }

  return considerations
}

const GROUP_TYPE_JUSTIFICATIONS: Partial<Record<GroupWorkType, string>> = {
  PAIR:          'La dyade favorise l\'échange d\'idées et le langage académique en contexte sécuritaire.',
  TRIO:          'Le trio répartit les responsabilités équitablement et réduit le déséquilibre de participation.',
  GROUP_4:       'Le groupe de 4 permet une division efficace des tâches et l\'attribution de rôles complémentaires.',
  HETEROGENEOUS: 'Le groupement hétérogène expose les élèves à diverses perspectives et favorise l\'apprentissage par les pairs.',
  TARGETED:      'Le groupement ciblé permet un enseignement plus intentionnel selon les besoins observés — temporaire et flexible.',
  STATION:       'Les stations permettent de différencier simultanément l\'accès au contenu et au processus pour toute la classe.',
  JIGSAW:        'Le jigsaw développe l\'interdépendance positive — chaque membre devient expert et transmet son savoir au groupe.',
  RANDOM:        'Le groupement aléatoire favorise les interactions variées et prévient la stratification sociale.',
  FLEXIBLE:      'Le groupement flexible s\'adapte à l\'objectif de la tâche plutôt qu\'à un regroupement fixe d\'élèves.',
}

const AI_GROUPING_WARNING =
  'ScorgIA ne peut pas déterminer le "meilleur" groupement. '
  + 'Cette proposition est basée sur les données agrégées de classe et les principes pédagogiques. '
  + 'L\'enseignant décide qui va dans quel groupe selon sa connaissance des élèves.'

// ════════════════════════════════════════════════════════════════════════════
// MISSION 13 — CONNEXION SMART CLASSROOM (fondation seulement)
// L'éditeur visuel est V8+. Ici on prépare juste le lien de données.
// ════════════════════════════════════════════════════════════════════════════

export type ClassroomGroupingLink = {
  proposal_id:     string
  smart_classroom_available: boolean
  zones_suggestions: { groupe_id: string; zone: string }[]
  note:            string
}

/**
 * Connecte une proposition de groupement au modèle Smart Classroom.
 * Ne construit PAS l'éditeur visuel — prépare uniquement le lien de données.
 */
export function linkGroupingToClassroom(
  proposal: GroupWorkProposal,
  ctx:      ClassPedagogicalContext,
): ClassroomGroupingLink {
  const has_sc = !!ctx.smart_classroom
  const zones  = ctx.smart_classroom?.zones_disponibles ?? []

  const zones_suggestions = proposal.groupes.map((g, i) => ({
    groupe_id: g.id,
    zone:      zones[i % zones.length] ?? `Zone ${i + 1}`,
  }))

  return {
    proposal_id:               proposal.id,
    smart_classroom_available: has_sc,
    zones_suggestions,
    note: has_sc
      ? 'Zones suggérées basées sur les données Smart Classroom disponibles. Éditeur visuel complet disponible en V8.'
      : 'Aucun modèle Smart Classroom configuré pour cette classe. Éditeur visuel prévu en V8.',
  }
}
