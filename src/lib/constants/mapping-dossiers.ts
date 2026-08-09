// Source unique de vérité : type_contenu → nom du dossier (colonne `nom` de dossiers_systeme)
// Tout type_contenu ABSENT de cet objet → pas d'auto-sauvegarde, modal manuel uniquement.
// Conforme à ARCHITECTURE.md §4.

export const DOSSIER_PAR_TYPE_CONTENU: Record<string, string> = {
  curriculum:       'Curriculum',
  plan_annuel:      'Plan annuel',
  plan_sequence:    'Plans de leçons',
  plan_lecon:       'Plans de leçons',
  fiche_lecon:      'Plans de leçons',
  lecon_complete:   'Leçons',
  lecon_developpee: 'Leçons',
  activite:         'Leçons',
  quiz:             'Évaluations sommatives',
  evaluation:       'Évaluations sommatives',
  corrige:          'Évaluations sommatives',
  email_parents:    'Parents',
  // 'ressource' intentionnellement absent : type non reconnu → pas d'auto-sauvegarde (ARCHITECTURE.md §3)
}
