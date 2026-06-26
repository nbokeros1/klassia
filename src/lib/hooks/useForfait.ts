'use client'

import type { ForfaitType, Utilisateur } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FonctionnaliteForfait =
  | 'classes_illimitees'
  | 'ia_illimitee'
  | 'lecon_complete'
  | 'kit_complet'
  | 'export_docx'
  | 'export_pptx'
  | 'programme_annuel'
  | 'timer'
  | 'sondage_qr'
  | 'tbi'
  | 'quiz_live'
  | 'communaute'
  | 'collaboration_temps_reel'
  | 'ressources_premium'
  | 'feedback_avance'
  | 'multi_enseignants'
  | 'dashboard_admin_ecole'

// ─── Matrice des fonctionnalités par forfait ───────────────────────────────────

export const FORFAIT_FONCTIONNALITES: Record<ForfaitType, FonctionnaliteForfait[]> = {
  gratuit: [],
  pro: [
    'classes_illimitees', 'ia_illimitee', 'lecon_complete',
    'kit_complet', 'export_docx', 'export_pptx',
    'programme_annuel', 'timer', 'sondage_qr', 'tbi',
  ],
  pro_plus: [
    'classes_illimitees', 'ia_illimitee', 'lecon_complete',
    'kit_complet', 'export_docx', 'export_pptx',
    'programme_annuel', 'timer', 'sondage_qr', 'tbi',
    'quiz_live', 'communaute', 'collaboration_temps_reel',
    'ressources_premium', 'feedback_avance',
  ],
  institution: [
    'classes_illimitees', 'ia_illimitee', 'lecon_complete',
    'kit_complet', 'export_docx', 'export_pptx',
    'programme_annuel', 'timer', 'sondage_qr', 'tbi',
    'quiz_live', 'communaute', 'collaboration_temps_reel',
    'ressources_premium', 'feedback_avance',
    'multi_enseignants', 'dashboard_admin_ecole',
  ],
}

// ─── Labels humains ───────────────────────────────────────────────────────────

export const FONCTIONNALITE_LABELS: Record<FonctionnaliteForfait, string> = {
  classes_illimitees:        'Classes illimitées',
  ia_illimitee:              'IA illimitée',
  lecon_complete:            'Génération de leçon complète',
  kit_complet:               'Kit pédagogique complet',
  export_docx:               'Export Word (.docx)',
  export_pptx:               'Export PowerPoint (.pptx)',
  programme_annuel:          'Programme annuel IA',
  timer:                     'Timer pédagogique',
  sondage_qr:                'Sondage QR code',
  tbi:                       'Projection TBI',
  quiz_live:                 'Quiz interactif en direct',
  communaute:                'Communauté d\'enseignants',
  collaboration_temps_reel:  'Collaboration en temps réel',
  ressources_premium:        'Ressources premium vérifiées',
  feedback_avance:           'Rétroaction avancée IA',
  multi_enseignants:         'Multi-enseignants (école)',
  dashboard_admin_ecole:     'Tableau de bord administrateur',
}

// ─── Prix (CAD/mois, facturation mensuelle) ───────────────────────────────────

export const FORFAIT_PRIX: Record<ForfaitType, string> = {
  gratuit:     'Gratuit',
  pro:         '14 $ CAD',
  pro_plus:    '24 $ CAD',
  institution: 'Sur devis',
}

export const FORFAIT_LABELS: Record<ForfaitType, string> = {
  gratuit:     'Gratuit',
  pro:         'Pro',
  pro_plus:    'Pro+',
  institution: 'Institution',
}

// ─── Avantages clés par forfait (pour la modal cadenas) ──────────────────────

export const FORFAIT_AVANTAGES: Record<ForfaitType, string[]> = {
  gratuit: [
    '1 classe · 5 générations IA à vie',
    'Export PDF basique',
    'Agenda intelligent',
  ],
  pro: [
    '8 classes maximum',
    '75 générations IA par mois',
    'Export Word & PowerPoint',
    'Programme annuel IA · Timer · Sondage QR · TBI',
  ],
  pro_plus: [
    'Classes illimitées · Générations IA illimitées',
    'Quiz interactif en direct (Kahoot-style)',
    'Communauté d\'enseignants · Partage de ressources',
    'Collaboration en temps réel + ressources premium',
  ],
  institution: [
    'Tout Pro+ inclus',
    'Licences multi-enseignants pour toute l\'école',
    'Tableau de bord administrateur (analytics)',
    'Déploiement personnalisé + support dédié',
  ],
}

// ─── Limites numériques réelles par forfait ───────────────────────────────────

export type LimiteForfait = {
  generations_quota_type: 'a_vie' | 'mensuel' | 'illimite'
  generations_quota_max:  number | null
  classes_max:            number | null
  matieres_par_classe_max: (palier: 'primaire' | 'secondaire' | undefined) => number | null
}

export const LIMITES_FORFAIT: Record<ForfaitType, LimiteForfait> = {
  gratuit: {
    generations_quota_type:  'a_vie',
    generations_quota_max:   5,
    classes_max:             1,
    matieres_par_classe_max: (palier) => palier === 'secondaire' ? 1 : null,
  },
  pro: {
    generations_quota_type:  'mensuel',
    generations_quota_max:   75,
    classes_max:             8,
    matieres_par_classe_max: () => null,
  },
  pro_plus: {
    generations_quota_type:  'illimite',
    generations_quota_max:   null,
    classes_max:             null,
    matieres_par_classe_max: () => null,
  },
  institution: {
    generations_quota_type:  'illimite',
    generations_quota_max:   null,
    classes_max:             null,
    matieres_par_classe_max: () => null,
  },
}

// ─── Fonctions de vérification exportées ─────────────────────────────────────

export function peutGenererContenu(
  profil: Pick<Utilisateur,
    'forfait' | 'is_admin' | 'generations_ia_total_a_vie' |
    'generations_ia_mois_courant' | 'derniere_reinit_quota'
  >,
): { autorise: boolean; raison?: string } {
  if (profil.is_admin) return { autorise: true }

  const forfait = profil.forfait || 'gratuit'
  const limites = LIMITES_FORFAIT[forfait]

  if (limites.generations_quota_type === 'illimite') return { autorise: true }

  if (limites.generations_quota_type === 'a_vie') {
    const total = profil.generations_ia_total_a_vie ?? 0
    const max   = limites.generations_quota_max!
    if (total >= max) {
      return {
        autorise: false,
        raison: `Vous avez utilisé vos ${max} générations gratuites.`,
      }
    }
    return { autorise: true }
  }

  // mensuel — vérifier si le cycle de 30 jours a expiré
  if (limites.generations_quota_type === 'mensuel') {
    const max             = limites.generations_quota_max!
    const derniereReinit  = profil.derniere_reinit_quota
      ? new Date(profil.derniere_reinit_quota)
      : new Date(0)
    const maintenant      = new Date()
    const joursEcoules    = (maintenant.getTime() - derniereReinit.getTime()) / (1000 * 60 * 60 * 24)

    // Si plus de 30 jours, le compteur doit être réinitialisé côté serveur avant de continuer
    // (la réinit est faite dans la route API après vérification)
    const compteur = joursEcoules >= 30 ? 0 : (profil.generations_ia_mois_courant ?? 0)
    if (compteur >= max) {
      return {
        autorise: false,
        raison: `Vous avez atteint la limite de ${max} générations ce mois-ci.`,
      }
    }
    return { autorise: true }
  }

  return { autorise: true }
}

export function peutCreerClasse(
  profil: Pick<Utilisateur, 'forfait' | 'is_admin'>,
  nbClassesActuelles: number,
): boolean {
  if (profil.is_admin) return true
  const forfait = profil.forfait || 'gratuit'
  const max     = LIMITES_FORFAIT[forfait].classes_max
  if (max === null) return true
  // Bloquer uniquement la création d'une nouvelle classe au-delà de la limite.
  // Les classes déjà existantes au-delà (cas grandfathering) ne sont pas supprimées.
  return nbClassesActuelles < max
}

export function peutAjouterMatiere(
  profil: Pick<Utilisateur, 'forfait' | 'is_admin' | 'palier_scolaire'>,
  nbMatieresActuelles: number,
): boolean {
  if (profil.is_admin) return true
  const forfait = profil.forfait || 'gratuit'
  const palier  = profil.palier_scolaire
  const max     = LIMITES_FORFAIT[forfait].matieres_par_classe_max(palier)
  if (max === null) return true
  return nbMatieresActuelles < max
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useForfait(forfait: ForfaitType = 'gratuit', is_admin?: boolean) {
  const peutUtiliser = (f: FonctionnaliteForfait): boolean => {
    if (is_admin) return true
    return FORFAIT_FONCTIONNALITES[forfait].includes(f)
  }

  const forfaitRequis = (f: FonctionnaliteForfait): ForfaitType => {
    if (FORFAIT_FONCTIONNALITES.pro.includes(f))         return 'pro'
    if (FORFAIT_FONCTIONNALITES.pro_plus.includes(f))    return 'pro_plus'
    return 'institution'
  }

  return { peutUtiliser, forfaitRequis, forfait }
}
