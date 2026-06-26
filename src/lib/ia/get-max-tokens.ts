export function getMaxTokens(type_contenu: string): number {
  const tokens: Record<string, number> = {
    // Contenu long — leçon complète Alberta (8 sections) + schéma SVG = 4000-6000 tokens
    lecon_complete:    6000,
    fiche_lecon:       5000,
    kit_complet:       2000,
    plan_sequence:     1500,
    curriculum:        4000,
    programme_annuel:  4000,

    // Contenu moyen
    plan_lecon:        1200,
    activite_groupe:   1000,
    evaluation:        1000,
    devoir:             800,
    rapport_eleve:      800,

    // Contenu court
    quiz:               800,
    email_parents:      600,
    courrier_officiel:  700,
    note_automatique:   300,
    compte_rendu:       500,
    nuage_mots:         200,
    analyse_quiz:       600,
    analyser_gabarit:  1000,
    script_video:      1500,
    image_pedagogique:  600,
    image_peda:         600,
  }
  return tokens[type_contenu] ?? 1000
}
