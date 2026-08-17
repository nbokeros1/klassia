// ─── ScorgIA V7.1 — Class Pedagogical Context (Mission 10) ─────────────────
// Agrégateur de classe — ScorgIA comprend la classe sans exposer les élèves.
// Travaille uniquement sur des données confirmées, pas des inférences.
// N'inférer JAMAIS un trouble depuis les besoins — on agrège ce qui est déclaré.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupportPlanV71, SupportLevel } from '../student/types'
import type { SmartClassroomModel } from '../types/index'

// ════════════════════════════════════════════════════════════════════════════
// TYPES DU CONTEXTE DE CLASSE
// ════════════════════════════════════════════════════════════════════════════

export type ClassSupportAggregate = {
  domaine:      string
  nb_eleves:    number     // nombre d'élèves concernés — jamais de noms
  priorite:     'elevee' | 'moderee' | 'faible'
  niveau_udl:   SupportLevel
}

export type ClassAccommodationAggregate = {
  type:         string
  nb_eleves:    number
}

export type ClassTechnologyAggregate = {
  technologie:  string
  nb_eleves:    number
}

export type ClassPedagogicalContext = {
  // Identité de la classe — jamais de noms d'élèves
  classe_ref:           string     // "Classe 8B" ou référence opaque
  matiere:              string
  niveau:               string
  effectif_total:       number
  nb_avec_plan_soutien: number

  // Agrégats de besoins pédagogiques
  besoins_agreges:      ClassSupportAggregate[]

  // Niveaux de soutien (UDL)
  nb_soutien_universel:    number  // Tous les élèves bénéficient de supports universels
  nb_soutien_cible:        number  // Élèves nécessitant soutien ciblé
  nb_soutien_individualise: number // Élèves avec plan individualisé

  // Accommodations agrégées
  accommodations_frequentes: ClassAccommodationAggregate[]

  // Technologies d'assistance
  technologies_presentes: ClassTechnologyAggregate[]

  // Indicateurs pour la planification
  indicateurs_planification: ClassPlanningIndicators

  // Connexion Smart Classroom (Mission 13)
  smart_classroom?: ClassroomContextLink

  // Métadonnées
  generated_at:  string
  data_quality:  'complet' | 'partiel' | 'insuffisant'
}

export type ClassPlanningIndicators = {
  // Ces indicateurs informent la planification sans identifier d'élèves
  necessite_supports_visuels:       boolean
  necessite_instructions_fractionnees: boolean
  necessite_supports_linguistiques: boolean
  necessite_supports_attentionnels: boolean
  necessite_technologie_assistance: boolean
  necessite_temps_supplementaire:   boolean
  necessite_environnement_calme:    boolean

  // Pour informer la différenciation
  diversite_niveau_estimee:         'faible' | 'modere' | 'elevee'

  // Note importante : ces indicateurs ne sont PAS des diagnostics
  note_methodologique:              string
}

// Lien avec le futur Smart Classroom (Mission 13 — pas encore construit)
export type ClassroomContextLink = {
  layout_type?:     string
  nb_places?:       number
  zones_disponibles?: string[]
  technologie?:     { tni: boolean; tablettes: number; ordinateurs: number }
  note:             string  // toujours rappeler que Smart Classroom est V8
}

// ════════════════════════════════════════════════════════════════════════════
// BUILDER PRINCIPAL — getClassPedagogicalContext
// ════════════════════════════════════════════════════════════════════════════

export type ClassContextInput = {
  classe_ref:    string
  matiere:       string
  niveau:        string
  effectif_total: number
  plans:         SupportPlanV71[]     // plans actifs de la classe
  smart_classroom?: SmartClassroomModel | null
}

/**
 * Construit le contexte pédagogique d'une classe à partir des plans de soutien actifs.
 * Agrège sans jamais exposer les données individuelles.
 */
export function getClassPedagogicalContext(input: ClassContextInput): ClassPedagogicalContext {
  const { classe_ref, matiere, niveau, effectif_total, plans, smart_classroom } = input

  const plans_actifs = plans.filter(p => p.statut === 'actif')

  // ── Agrégats de besoins ──────────────────────────────────────────────────
  const besoins_map = new Map<string, { count: number; priorites: string[]; niveau: SupportLevel }>()

  for (const plan of plans_actifs) {
    if (!plan.profil?.besoins) continue
    for (const besoin of plan.profil.besoins) {
      const existing = besoins_map.get(besoin.domaine)
      if (existing) {
        existing.count++
        existing.priorites.push(besoin.priorite)
      } else {
        besoins_map.set(besoin.domaine, {
          count: 1,
          priorites: [besoin.priorite],
          niveau: deriveSupportLevel(plan),
        })
      }
    }
  }

  const besoins_agreges: ClassSupportAggregate[] = Array.from(besoins_map.entries())
    .map(([domaine, data]) => ({
      domaine,
      nb_eleves: data.count,
      priorite:  dominantPriority(data.priorites),
      niveau_udl: data.niveau,
    }))
    .sort((a, b) => b.nb_eleves - a.nb_eleves)

  // ── Niveaux de soutien ───────────────────────────────────────────────────
  const niveaux = plans_actifs.map(deriveSupportLevel)
  const nb_soutien_individualise = niveaux.filter(n => n === 'individualized').length
  const nb_soutien_cible         = niveaux.filter(n => n === 'targeted').length
  const nb_soutien_universel     = effectif_total  // Tous bénéficient des supports universels

  // ── Accommodations fréquentes ────────────────────────────────────────────
  const accom_map = new Map<string, number>()
  for (const plan of plans_actifs) {
    if (!plan.support_data?.accommodations) continue
    for (const a of plan.support_data.accommodations) {
      if (!a.actif) continue
      accom_map.set(a.type, (accom_map.get(a.type) ?? 0) + 1)
    }
  }
  const accommodations_frequentes: ClassAccommodationAggregate[] =
    Array.from(accom_map.entries())
      .map(([type, nb_eleves]) => ({ type, nb_eleves }))
      .sort((a, b) => b.nb_eleves - a.nb_eleves)
      .slice(0, 5)  // Top 5 seulement

  // ── Technologies d'assistance ─────────────────────────────────────────────
  const tech_map = new Map<string, number>()
  for (const plan of plans_actifs) {
    if (!plan.support_data?.technologie_assistance) continue
    for (const t of plan.support_data.technologie_assistance) {
      tech_map.set(t.nom, (tech_map.get(t.nom) ?? 0) + 1)
    }
  }
  const technologies_presentes: ClassTechnologyAggregate[] =
    Array.from(tech_map.entries())
      .map(([technologie, nb_eleves]) => ({ technologie, nb_eleves }))
      .sort((a, b) => b.nb_eleves - a.nb_eleves)

  // ── Indicateurs de planification ──────────────────────────────────────────
  const indicateurs_planification = buildPlanningIndicators(
    besoins_agreges,
    accommodations_frequentes,
    nb_soutien_individualise + nb_soutien_cible,
    effectif_total,
  )

  // ── Lien Smart Classroom ──────────────────────────────────────────────────
  const smart_classroom_link: ClassroomContextLink | undefined = smart_classroom
    ? {
        layout_type:      smart_classroom.layouts?.[0]?.type,
        nb_places:        smart_classroom.nb_eleves,
        zones_disponibles: smart_classroom.layouts?.[0]?.type
          ? [smart_classroom.layouts[0].type]
          : undefined,
        technologie: undefined,  // V8 — Smart Classroom éditeur visuel non construit
        note: 'Smart Classroom — données de base disponibles. Éditeur visuel complet prévu V8.',
      }
    : undefined

  // ── Qualité des données ───────────────────────────────────────────────────
  const data_quality = assessDataQuality(plans_actifs, effectif_total)

  return {
    classe_ref,
    matiere,
    niveau,
    effectif_total,
    nb_avec_plan_soutien:      plans_actifs.length,
    besoins_agreges,
    nb_soutien_universel,
    nb_soutien_cible,
    nb_soutien_individualise,
    accommodations_frequentes,
    technologies_presentes,
    indicateurs_planification,
    smart_classroom:           smart_classroom_link,
    generated_at:              new Date().toISOString(),
    data_quality,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

function deriveSupportLevel(plan: SupportPlanV71): SupportLevel {
  if (plan.support_data?.modifications && plan.support_data.modifications.length > 0) {
    return 'individualized'
  }
  if (
    (plan.profil?.besoins && plan.profil.besoins.length > 0)
    || (plan.support_data?.accommodations && plan.support_data.accommodations.length > 0)
  ) {
    return 'targeted'
  }
  return 'universal'
}

function dominantPriority(priorites: string[]): 'elevee' | 'moderee' | 'faible' {
  if (priorites.includes('elevee'))  return 'elevee'
  if (priorites.includes('moderee')) return 'moderee'
  return 'faible'
}

function buildPlanningIndicators(
  besoins:         ClassSupportAggregate[],
  accommodations:  ClassAccommodationAggregate[],
  nb_avec_soutien: number,
  effectif_total:  number,
): ClassPlanningIndicators {
  const domaines = new Set(besoins.map(b => b.domaine.toLowerCase()))
  const accomTypes = new Set(accommodations.map(a => a.type.toLowerCase()))

  const ratio_soutien = effectif_total > 0 ? nb_avec_soutien / effectif_total : 0

  return {
    necessite_supports_visuels:
      domaines.has('lecture') || accomTypes.has('supports_visuels'),

    necessite_instructions_fractionnees:
      domaines.has('attention') || accomTypes.has('consignes_fractionnees'),

    necessite_supports_linguistiques:
      domaines.has('communication') || domaines.has('vocabulaire'),

    necessite_supports_attentionnels:
      domaines.has('attention') || accomTypes.has('pauses_supplementaires'),

    necessite_technologie_assistance:
      accomTypes.has('technologie_assistance'),

    necessite_temps_supplementaire:
      accomTypes.has('temps_supplementaire'),

    necessite_environnement_calme:
      accomTypes.has('environnement_calme'),

    diversite_niveau_estimee:
      ratio_soutien > 0.3 ? 'elevee'
      : ratio_soutien > 0.15 ? 'modere'
      : 'faible',

    note_methodologique:
      'Ces indicateurs sont dérivés des besoins pédagogiques DÉCLARÉS uniquement. '
      + 'Ils ne représentent pas des diagnostics et ne doivent pas être utilisés comme tels. '
      + 'Un enseignant doit valider leur pertinence avant toute action pédagogique.',
  }
}

function assessDataQuality(
  plans_actifs:  SupportPlanV71[],
  effectif:      number,
): 'complet' | 'partiel' | 'insuffisant' {
  if (effectif === 0 || plans_actifs.length === 0) return 'insuffisant'

  const plans_with_goals = plans_actifs.filter(p => p.objectifs.length > 0)
  const completeness_ratio = plans_with_goals.length / plans_actifs.length

  if (completeness_ratio >= 0.8) return 'complet'
  if (completeness_ratio >= 0.4) return 'partiel'
  return 'insuffisant'
}

// ════════════════════════════════════════════════════════════════════════════
// RÉSUMÉ TEXTE — pour inclusion dans un prompt IA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Sérialise le contexte de classe en texte pour un prompt IA.
 * Aucune donnée individuelle — uniquement des agrégats.
 */
export function serializeClassContext(ctx: ClassPedagogicalContext): string {
  const lines: string[] = [
    `=== CONTEXTE DE CLASSE — ${ctx.classe_ref} ===`,
    `Matière : ${ctx.matiere} | Niveau : ${ctx.niveau} | Effectif : ${ctx.effectif_total}`,
    `Plans de soutien actifs : ${ctx.nb_avec_plan_soutien} élève(s) concerné(s)`,
    '',
    'NIVEAUX DE SOUTIEN :',
    `  Soutien universel : ${ctx.nb_soutien_universel} élèves (tous)`,
    `  Soutien ciblé : ${ctx.nb_soutien_cible} élève(s)`,
    `  Soutien individualisé : ${ctx.nb_soutien_individualise} élève(s)`,
  ]

  if (ctx.besoins_agreges.length > 0) {
    lines.push('', 'BESOINS PÉDAGOGIQUES FRÉQUENTS :')
    for (const b of ctx.besoins_agreges.slice(0, 5)) {
      lines.push(`  - ${b.domaine} : ${b.nb_eleves} élève(s) [priorité ${b.priorite}]`)
    }
  }

  if (ctx.accommodations_frequentes.length > 0) {
    lines.push('', 'ACCOMMODATIONS FRÉQUENTES :')
    for (const a of ctx.accommodations_frequentes) {
      lines.push(`  - ${a.type} : ${a.nb_eleves} élève(s)`)
    }
  }

  const ind = ctx.indicateurs_planification
  lines.push('', 'INDICATEURS PLANIFICATION :')
  if (ind.necessite_supports_visuels)          lines.push('  ✓ Supports visuels recommandés')
  if (ind.necessite_instructions_fractionnees) lines.push('  ✓ Instructions fractionnées recommandées')
  if (ind.necessite_supports_linguistiques)    lines.push('  ✓ Supports linguistiques recommandés')
  if (ind.necessite_supports_attentionnels)    lines.push('  ✓ Supports attentionnels recommandés')
  if (ind.necessite_technologie_assistance)    lines.push('  ✓ Technologie d\'assistance présente')

  lines.push('', `[${ind.note_methodologique}]`)
  lines.push('', '=== FIN DU CONTEXTE DE CLASSE ===')

  return lines.join('\n')
}
