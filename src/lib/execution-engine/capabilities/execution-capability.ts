// ── Execution Capability (ME-13.5) ────────────────────────────────────────────
//
// Identités métier stables des actions demandées à l'enseignant.
// Indépendantes du texte affiché, de la langue, de la route et du statut.
// Ne pas utiliser des libellés français comme identifiants.
//
// RÈGLE DE VERSIONNEMENT
// Incrémenter execution-recipe-v1 si :
//   - une capability est renommée ou supprimée ;
//   - la sémantique d'une capability change ;
//   - un champ required est ajouté.
// Une correction de typo dans un titre n'exige pas de changement de version.

export type ExecutionCapability =
  // ── Revue ────────────────────────────────────────────────────────────────
  | 'review_class_context'
  | 'review_annual_plan'
  | 'review_curriculum'
  | 'review_latest_lesson'
  | 'review_taught_content'
  | 'review_learning_objectives'
  | 'review_deadline'
  | 'review_assignments'
  | 'review_student_signals'
  // ── Sélection ────────────────────────────────────────────────────────────
  | 'select_topic'
  | 'select_content'
  | 'select_learning_objectives'
  | 'select_students_for_follow_up'
  // ── Navigation ───────────────────────────────────────────────────────────
  | 'navigate_to_prepare'
  | 'navigate_to_class'
  | 'navigate_to_students'
  | 'navigate_to_calendar'
  | 'navigate_to_library'
  // ── Création ─────────────────────────────────────────────────────────────
  | 'create_annual_plan'
  | 'create_lesson'
  | 'create_evaluation'
  | 'adapt_planning'
  // ── Correction ───────────────────────────────────────────────────────────
  | 'correct_assignments'
  | 'record_results'
  | 'add_feedback'
  | 'add_follow_up'
  // ── Planification ────────────────────────────────────────────────────────
  | 'schedule_evaluation'
  // ── Vérification ─────────────────────────────────────────────────────────
  | 'verify_document'
  | 'verify_evaluation'
  | 'verify_feedback'
  | 'verify_follow_up'
  // ── Sauvegarde et confirmation ────────────────────────────────────────────
  | 'save_document'
  | 'confirm_completion'
  // ── Générique (fallback) ──────────────────────────────────────────────────
  | 'generic_review'
  | 'generic_action'
  | 'generic_verify'
