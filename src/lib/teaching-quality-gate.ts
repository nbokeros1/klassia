// ─── Teaching Quality Gate — Logique pure ────────────────────────────────────
// Vérifie la qualité pédagogique d'un document Teaching Pack.
// Règles explicites et documentées — aucun score arbitraire.
// Un score n'est attribué que si sa méthode de calcul est expliquée ici.
//
// MÉTHODE DE SCORE (si demandée) :
//   score = éléments_valides / (éléments_valides + erreurs_bloquantes * 3 + avertissements * 1.5 + recommandations * 0.5)
//   Seuil "Prêt" : 0 erreurs bloquantes.

import type {
  QualiteNiveau, QualiteItem, QualityGateResultat,
  PackDocumentType,
} from '@/lib/types/teaching-pack'
import type { ContenuProgramme, Unite, LeconProgramme } from '@/lib/types/database'
import type { PackSyllabus } from '@/lib/types/teaching-pack'
import type { DetailedLesson } from '@/lib/types/detailed-lesson'

function item(code: string, niveau: QualiteNiveau, message: string, detail?: string, element?: string): QualiteItem {
  return { code, niveau, message, detail, element }
}

// ─── Contrôle du plan annuel ──────────────────────────────────────────────────

export function verifierPlanAnnuel(programme: ContenuProgramme, opts?: {
  nbSemainesDisponibles?: number
  dateDebut?: string
  dateFin?: string
}): QualityGateResultat {
  const items: QualiteItem[] = []
  const sources: string[] = ['ContenuProgramme (plan annuel généré)']

  const unites = programme?.unites ?? []

  // ── Vérifications structurelles ──
  if (!programme?.titre) {
    items.push(item('PA-001', 'erreur_bloquante', 'Le plan annuel n\'a pas de titre.'))
  } else {
    items.push(item('PA-001', 'valide', `Titre présent : "${programme.titre}"`))
  }

  if (unites.length === 0) {
    items.push(item('PA-002', 'erreur_bloquante', 'Le plan annuel ne contient aucune séquence (unité).'))
  } else if (unites.length < 3) {
    items.push(item('PA-002', 'avertissement', `Seulement ${unites.length} séquence(s) — une année complète nécessite généralement 4 à 8 séquences.`))
  } else {
    items.push(item('PA-002', 'valide', `${unites.length} séquences présentes`))
  }

  // ── Vérification des séquences ordonnées ──
  let precedenteFin = 0
  let ordreOk = true
  for (const u of unites) {
    if (u.semaine_debut <= precedenteFin && unites.indexOf(u) > 0) {
      ordreOk = false
      items.push(item('PA-003', 'erreur_bloquante',
        `Séquence "${u.titre}" : semaine de début (${u.semaine_debut}) chevauche la séquence précédente (fin sem. ${precedenteFin}).`,
        undefined, u.titre))
    }
    precedenteFin = u.semaine_fin
  }
  if (ordreOk && unites.length > 0) {
    items.push(item('PA-003', 'valide', 'Séquences ordonnées sans chevauchement'))
  }

  // ── Durée totale réaliste ──
  const nbSemPlannif = unites.length > 0 ? Math.max(...unites.map(u => u.semaine_fin)) : 0
  const nbSemDispo = opts?.nbSemainesDisponibles ?? programme.nb_semaines ?? 36
  if (nbSemPlannif > nbSemDispo) {
    items.push(item('PA-004', 'erreur_bloquante',
      `Le plan dépasse le calendrier : ${nbSemPlannif} semaines planifiées pour ${nbSemDispo} semaines disponibles.`))
  } else if (nbSemPlannif < nbSemDispo * 0.85) {
    items.push(item('PA-004', 'avertissement',
      `Le plan n'utilise que ${nbSemPlannif} sur ${nbSemDispo} semaines — vérifiez si des séquences manquent.`))
  } else {
    items.push(item('PA-004', 'valide', `Durée totale cohérente (${nbSemPlannif}/${nbSemDispo} semaines)`))
  }

  // ── Chaque séquence a au moins un résultat/objectif ──
  const seqSansObjectif = unites.filter(u => !u.objectifs || u.objectifs.length === 0)
  if (seqSansObjectif.length > 0) {
    items.push(item('PA-005', 'erreur_bloquante',
      `${seqSansObjectif.length} séquence(s) sans résultat curriculaire : ${seqSansObjectif.map(u => u.titre).join(', ')}.`))
  } else {
    items.push(item('PA-005', 'valide', 'Toutes les séquences ont des objectifs'))
  }

  // ── Chaque séquence a des leçons ──
  const seqSansLecons = unites.filter(u => !u.lecons || u.lecons.length === 0)
  if (seqSansLecons.length > 0) {
    items.push(item('PA-006', 'avertissement',
      `${seqSansLecons.length} séquence(s) sans leçons planifiées.`, undefined))
  } else {
    items.push(item('PA-006', 'valide', 'Toutes les séquences contiennent des leçons'))
  }

  // ── Nombre de leçons réaliste ──
  const nbLeconsTotales = unites.reduce((s, u) => s + (u.lecons?.length ?? 0), 0)
  const periodesEstimees = nbSemDispo * 5
  if (nbLeconsTotales < periodesEstimees * 0.3) {
    items.push(item('PA-007', 'recommandation',
      `Seulement ${nbLeconsTotales} leçons pour ${nbSemDispo} semaines — il en faudrait généralement plus.`))
  } else {
    items.push(item('PA-007', 'valide', `${nbLeconsTotales} leçons planifiées`))
  }

  // ── Présence de semaines tampon ──
  if (!programme.nb_semaines || programme.nb_semaines < 2) {
    items.push(item('PA-008', 'recommandation', 'Prévoyez des semaines tampons pour les révisions et imprévus.'))
  } else {
    items.push(item('PA-008', 'valide', 'Calendrier avec semaines tampons configurées'))
  }

  return buildResultat('plan_annuel', items, sources)
}

// ─── Contrôle d'une séquence ──────────────────────────────────────────────────

export function verifierSequence(unite: Unite): QualityGateResultat {
  const items: QualiteItem[] = []
  const sources: string[] = ['Unite (séquence)']

  if (!unite.titre || unite.titre.trim().length < 3) {
    items.push(item('SEQ-001', 'erreur_bloquante', 'La séquence n\'a pas de titre.'))
  } else {
    items.push(item('SEQ-001', 'valide', `Titre présent : "${unite.titre}"`))
  }

  const nbSemaines = unite.semaine_fin - unite.semaine_debut + 1
  if (nbSemaines < 1) {
    items.push(item('SEQ-002', 'erreur_bloquante', 'Durée de la séquence invalide (fin avant le début).'))
  } else if (nbSemaines > 12) {
    items.push(item('SEQ-002', 'avertissement', `Séquence très longue (${nbSemaines} semaines) — vérifiez la répartition.`))
  } else {
    items.push(item('SEQ-002', 'valide', `Durée : ${nbSemaines} semaine(s)`))
  }

  if (!unite.objectifs || unite.objectifs.length === 0) {
    items.push(item('SEQ-003', 'erreur_bloquante', 'Aucun objectif curriculaire lié à cette séquence.'))
  } else {
    items.push(item('SEQ-003', 'valide', `${unite.objectifs.length} objectif(s) curriculaire(s)`))
  }

  const lecons = unite.lecons ?? []
  if (lecons.length < 2) {
    items.push(item('SEQ-004', 'avertissement', `Séquence avec seulement ${lecons.length} leçon(s) — généralement 3 à 8 leçons sont prévues.`))
  } else {
    items.push(item('SEQ-004', 'valide', `${lecons.length} leçons dans la séquence`))
  }

  const leconsSansObjectif = lecons.filter(l => !l.sujet || l.sujet.trim().length < 5)
  if (leconsSansObjectif.length > 0) {
    items.push(item('SEQ-005', 'recommandation', `${leconsSansObjectif.length} leçon(s) avec un sujet peu précis.`))
  } else if (lecons.length > 0) {
    items.push(item('SEQ-005', 'valide', 'Toutes les leçons ont un sujet défini'))
  }

  const hasEvaluation = lecons.some(l => l.type === 'evaluation' || l.type === 'synthese')
  if (!hasEvaluation) {
    items.push(item('SEQ-006', 'avertissement', 'Aucune leçon d\'évaluation ou de synthèse dans cette séquence.'))
  } else {
    items.push(item('SEQ-006', 'valide', 'Présence d\'une leçon d\'évaluation ou de synthèse'))
  }

  return buildResultat('sequence', items, sources, unite.numero.toString())
}

// ─── Contrôle d'un plan de leçon ─────────────────────────────────────────────

export function verifierPlanLecon(lecon: LeconProgramme & {
  contenu_markdown?: string
  objectifs_liste?: string[]
  criteres?: string[]
  materiel?: string[]
}): QualityGateResultat {
  const items: QualiteItem[] = []
  const sources: string[] = ['LeconProgramme (plan de leçon)']

  // ── Titre ──
  if (!lecon.titre || lecon.titre.trim().length < 3) {
    items.push(item('LEC-001', 'erreur_bloquante', 'La leçon n\'a pas de titre.'))
  } else {
    items.push(item('LEC-001', 'valide', `Titre : "${lecon.titre}"`))
  }

  // ── Durée réaliste ──
  if (!lecon.duree_minutes || lecon.duree_minutes < 10) {
    items.push(item('LEC-002', 'erreur_bloquante', 'Durée invalide ou manquante.'))
  } else if (lecon.duree_minutes > 200) {
    items.push(item('LEC-002', 'avertissement', `Durée de ${lecon.duree_minutes} min — vérifiez si c'est réaliste pour une période.`))
  } else {
    items.push(item('LEC-002', 'valide', `Durée : ${lecon.duree_minutes} min`))
  }

  // ── Sujet/objectif ──
  if (!lecon.sujet || lecon.sujet.trim().length < 5) {
    items.push(item('LEC-003', 'erreur_bloquante', 'Le sujet ou l\'objectif principal est manquant.'))
  } else {
    items.push(item('LEC-003', 'valide', `Sujet défini`))
  }

  // ── Contenu markdown présent ──
  if (!lecon.contenu_markdown || lecon.contenu_markdown.length < 200) {
    items.push(item('LEC-004', 'erreur_bloquante', 'Le contenu de la leçon est absent ou trop court pour être utilisable.'))
  } else {
    // Vérifications dans le contenu markdown
    const md = lecon.contenu_markdown.toLowerCase()

    if (!md.includes('objectif') && !md.includes('but') && !md.includes('apprentissage')) {
      items.push(item('LEC-005', 'erreur_bloquante', 'Aucun objectif d\'apprentissage observable identifié dans la leçon.'))
    } else {
      items.push(item('LEC-005', 'valide', 'Objectifs d\'apprentissage présents'))
    }

    if (!md.includes('critère') && !md.includes('critere') && !md.includes('réussite') && !md.includes('reussite')) {
      items.push(item('LEC-006', 'avertissement', 'Aucun critère de réussite explicite trouvé dans le contenu.'))
    } else {
      items.push(item('LEC-006', 'valide', 'Critères de réussite présents'))
    }

    if (!md.includes('différenciation') && !md.includes('differenciation') && !md.includes('adaptation')) {
      items.push(item('LEC-007', 'avertissement', 'Aucune différenciation prévue — recommandé pour une classe inclusive.'))
    } else {
      items.push(item('LEC-007', 'valide', 'Différenciation mentionnée'))
    }

    const hasFormative = md.includes('évaluation formative') || md.includes('vérification') || md.includes('billet')
    if (!hasFormative) {
      items.push(item('LEC-008', 'avertissement', 'Aucune évaluation formative explicite — ajoutez un indicateur de vérification de compréhension.'))
    } else {
      items.push(item('LEC-008', 'valide', 'Évaluation formative présente'))
    }

    const hasActivite = md.includes('pratique') || md.includes('activité') || md.includes('exercice') || md.includes('tâche')
    if (!hasActivite) {
      items.push(item('LEC-009', 'recommandation', 'Aucune activité de pratique détectée — vérifiez l\'alignement objectif-activité.'))
    } else {
      items.push(item('LEC-009', 'valide', 'Activités de pratique présentes'))
    }

    items.push(item('LEC-004', 'valide', 'Contenu de la leçon présent et substantiel'))
  }

  return buildResultat('plan_lecon', items, sources, lecon.lecon_id)
}

// ─── Contrôle du syllabus ─────────────────────────────────────────────────────

export function verifierSyllabus(syllabus: PackSyllabus): QualityGateResultat {
  const items: QualiteItem[] = []
  const sources: string[] = ['PackSyllabus']

  const requis = ['titre_cours', 'niveau', 'matiere', 'grandes_idees', 'resultats_apprentissage', 'methodes_pedagogiques', 'methodes_evaluation'] as const
  for (const champ of requis) {
    const val = syllabus[champ]
    if (!val || (Array.isArray(val) && val.length === 0)) {
      items.push(item(`SYL-${champ}`, 'avertissement', `Champ manquant dans le syllabus : ${champ}`))
    } else {
      items.push(item(`SYL-${champ}`, 'valide', `"${champ}" présent`))
    }
  }

  if ((syllabus.grandes_idees?.length ?? 0) < 2) {
    items.push(item('SYL-grandes-idees-min', 'recommandation', 'Prévoyez au moins 2-3 grandes idées structurantes.'))
  }

  if ((syllabus.resultats_apprentissage?.length ?? 0) < 3) {
    items.push(item('SYL-RA-min', 'avertissement', 'Moins de 3 résultats d\'apprentissage — le syllabus semble incomplet.'))
  }

  return buildResultat('syllabus', items, sources)
}

// ─── Contrôle d'une leçon détaillée (SPIE-BETA-03) ───────────────────────────

export function verifierDetailedLesson(lecon: DetailedLesson): QualityGateResultat {
  const items: QualiteItem[] = []
  const sources: string[] = ['DetailedLesson (SPIE-BETA-03)']

  // ── Alignement ──
  if (!lecon.titre) {
    items.push(item('DL-001', 'erreur_bloquante', 'La leçon n\'a pas de titre.'))
  } else {
    items.push(item('DL-001', 'valide', `Titre : "${lecon.titre}"`))
  }

  if (!lecon.objectifs || lecon.objectifs.length === 0) {
    items.push(item('DL-002', 'erreur_bloquante', 'Aucun objectif d\'apprentissage observable.'))
  } else {
    items.push(item('DL-002', 'valide', `${lecon.objectifs.length} objectif(s) d'apprentissage`))
  }

  const hasActiviteAvecObjectif = lecon.activites?.some(a => !!a.lien_objectif_id || !!a.ras_lie)
  if (lecon.activites?.length && !hasActiviteAvecObjectif) {
    items.push(item('DL-003', 'avertissement', 'Aucune activité n\'est explicitement reliée à un objectif.'))
  } else if (lecon.activites?.length) {
    items.push(item('DL-003', 'valide', 'Activités reliées aux objectifs'))
  }

  const hasQuizAvecObjectif = lecon.quiz?.questions?.some(q => !!q.ras_lie)
  if (lecon.quiz?.questions?.length && !hasQuizAvecObjectif) {
    items.push(item('DL-004', 'avertissement', 'Aucune question du quiz n\'est reliée à un objectif.'))
  } else if (lecon.quiz?.questions?.length) {
    items.push(item('DL-004', 'valide', 'Quiz relié aux objectifs'))
  }

  const hasCriteres = lecon.objectifs?.every(o => !!o.critere_reussite)
  if (!hasCriteres) {
    items.push(item('DL-005', 'erreur_bloquante', 'Certains objectifs n\'ont pas de critère de réussite observable.'))
  } else {
    items.push(item('DL-005', 'valide', 'Critères de réussite présents sur tous les objectifs'))
  }

  // ── Temps ──
  if (!lecon.duree_minutes || lecon.duree_minutes < 10) {
    items.push(item('DL-006', 'erreur_bloquante', 'Durée de la leçon invalide (minimum 10 min).'))
  } else if (!lecon.time_verification?.realiste) {
    items.push(item('DL-006', 'avertissement', lecon.time_verification?.avertissement ?? 'La durée totale des activités dépasse le temps prévu.'))
  } else {
    items.push(item('DL-006', 'valide', `Durée ${lecon.duree_minutes} min — timing réaliste`))
  }

  // ── Exploitabilité ──
  if (!lecon.activites || lecon.activites.length === 0) {
    items.push(item('DL-007', 'erreur_bloquante', 'Aucune activité prête à utiliser.'))
  } else {
    const activitesSansConsignes = lecon.activites.filter(a => !a.consignes_eleves || a.consignes_eleves.trim().length < 20)
    if (activitesSansConsignes.length > 0) {
      items.push(item('DL-007', 'avertissement', `${activitesSansConsignes.length} activité(s) avec consignes incomplètes pour les élèves.`))
    } else {
      items.push(item('DL-007', 'valide', `${lecon.activites.length} activité(s) avec consignes complètes`))
    }
  }

  if (!lecon.sections_contenu || lecon.sections_contenu.length === 0) {
    items.push(item('DL-008', 'avertissement', 'Aucun contenu pédagogique structuré — ajoutez des explications ou exemples.'))
  } else {
    items.push(item('DL-008', 'valide', `${lecon.sections_contenu.length} section(s) de contenu`))
  }

  if (!lecon.quiz || lecon.quiz.questions.length === 0) {
    items.push(item('DL-009', 'avertissement', 'Aucune question de quiz — impossible de vérifier l\'acquis.'))
  } else if (lecon.quiz.questions.length < 3) {
    items.push(item('DL-009', 'recommandation', `Quiz de ${lecon.quiz.questions.length} question(s) seulement — prévoir au moins 5.`))
  } else {
    items.push(item('DL-009', 'valide', `Quiz de ${lecon.quiz.questions.length} question(s)`))
  }

  if (!lecon.corrige || lecon.corrige.length === 0) {
    items.push(item('DL-010', 'avertissement', 'Corrigé absent — l\'enseignant n\'a pas de guide de correction.'))
  } else {
    items.push(item('DL-010', 'valide', 'Corrigé enseignant présent'))
  }

  // ── Qualité pédagogique ──
  const hasPhases = lecon.phases?.length >= 2
  if (!hasPhases) {
    items.push(item('DL-011', 'avertissement', 'La structure en phases (avant/pendant/après) est incomplète.'))
  } else {
    items.push(item('DL-011', 'valide', `${lecon.phases.length} phase(s) de déroulement`))
  }

  const hasDiff = lecon.differentiation?.length >= 2
  if (!hasDiff) {
    items.push(item('DL-012', 'recommandation', 'Différenciation incomplète — ajoutez soutien et enrichissement.'))
  } else {
    items.push(item('DL-012', 'valide', `${lecon.differentiation.length} niveau(x) de différenciation`))
  }

  if (!lecon.evaluation_formative?.methode) {
    items.push(item('DL-013', 'avertissement', 'Aucune évaluation formative définie.'))
  } else {
    items.push(item('DL-013', 'valide', `Évaluation formative : ${lecon.evaluation_formative.methode}`))
  }

  // ── Sécurité ──
  if (!lecon.reflexion) {
    // OK — les notes privées sont optionnelles, pas bloquant
  }

  return buildResultat('plan_lecon', items, sources, lecon.id)
}

// ─── Builder résultat ─────────────────────────────────────────────────────────

function buildResultat(
  type: PackDocumentType,
  items: QualiteItem[],
  sources: string[],
  docId?: string,
): QualityGateResultat {
  const erreurs      = items.filter(i => i.niveau === 'erreur_bloquante').length
  const avertiss     = items.filter(i => i.niveau === 'avertissement').length
  const recomm       = items.filter(i => i.niveau === 'recommandation').length
  const valides      = items.filter(i => i.niveau === 'valide').length
  const peutEtrePret = erreurs === 0

  return {
    document_type:       type,
    document_id:         docId,
    items,
    erreurs_bloquantes:  erreurs,
    avertissements:      avertiss,
    recommandations:     recomm,
    elements_valides:    valides,
    peut_marquer_pret:   peutEtrePret,
    sources_utilisees:   sources,
    generated_at:        new Date().toISOString(),
  }
}
