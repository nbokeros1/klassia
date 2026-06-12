'use client'

import type { ForfaitType } from '@/lib/types/database'

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
    '3 classes · 5 leçons par classe',
    '10 générations IA par mois',
    'Export PDF basique',
  ],
  pro: [
    'Classes et leçons illimitées',
    'Génération IA illimitée + leçon complète Bruner',
    'Export Word & PowerPoint',
    'Programme annuel IA · Timer · Sondage QR · TBI',
  ],
  pro_plus: [
    'Tout Pro +',
    'Quiz interactif en direct (Kahoot-style)',
    'Communauté d\'enseignants · Partage de ressources',
    'Collaboration en temps réel + ressources premium',
  ],
  institution: [
    'Tout Pro+ +',
    'Licences multi-enseignants pour toute l\'école',
    'Tableau de bord administrateur (analytics)',
    'Déploiement personnalisé + support dédié',
  ],
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
