// ─── SC-02G — Teacher Reasoning Engine ───────────────────────────────────────
// Moteur de raisonnement pédagogique algorithmique.
// Analyse la demande de l'enseignant et construit un plan pédagogique interne
// AVANT d'envoyer le message à l'IA.
// Ce plan est injecté dans le message API — jamais visible dans l'UI.
//
// Règle absolue : aucun appel API ici, raisonnement 100% déterministe.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentGenerationType =
  | 'lecon_complete'
  | 'fiche_lecon'
  | 'plan_lecon'
  | 'evaluation'
  | 'quiz'
  | 'activite'
  | 'curriculum'
  | 'email_parents'
  | 'differentiation'
  | 'devoir'
  | 'autre'

export type PedagogicalMethod =
  | 'enseignement_explicite'
  | 'decouverte_guidee'
  | 'apprentissage_cooperatif'
  | 'resolution_problemes'
  | 'approche_projet'
  | 'classe_inversee'
  | 'enseignement_differencie'
  | 'demonstration_pratique'

export interface PedagogyContext {
  classe_nom?:  string
  matiere?:     string
  niveau?:      string
}

export interface PedagogicalPlan {
  requestType:          ContentGenerationType
  methode:              PedagogicalMethod
  raisonMethode:        string
  dureeEstimee:         number              // minutes
  structure:            StructureBlock[]
  prerequis:            string[]
  difficultesPrevisibles: string[]
  objectifsType:        string             // taxonomie de Bloom ciblée
  differenciationFlag:  boolean
  evaluationType:       'formative' | 'sommative' | 'diagnostique' | 'aucune'
  validations:          ValidationCheck[]
  contexteNote:         string             // note libre sur le contexte
}

export interface StructureBlock {
  phase:   'avant' | 'pendant' | 'apres'
  titre:   string
  dureeMin: number
  note:    string
}

export interface ValidationCheck {
  critere: string
  ok:      boolean
}

// ─── Détection du type de contenu ─────────────────────────────────────────────

export function detectContentType(message: string): ContentGenerationType {
  const m = message.toLowerCase()

  if (/leçon complète|lecon complète|leçon complete|lecon complete|fiche de leçon|fiche de lecon/.test(m))
    return 'lecon_complete'
  if (/fiche.{0,10}leçon|fiche.{0,10}lecon/.test(m))
    return 'fiche_lecon'
  if (/plan de leçon|plan de lecon|planifi(er|cation)|plan de cours/.test(m))
    return 'plan_lecon'
  if (/évaluation sommative|evaluation sommative|examen|test sommati/.test(m))
    return 'evaluation'
  if (/quiz|questionnaire|qcm|choix multiples/.test(m))
    return 'quiz'
  if (/activité|activite|atelier|exercice|jeu pédagogique|jeu pedagogique/.test(m))
    return 'activite'
  if (/curriculum|programme annuel|progression annuelle|planification annuelle/.test(m))
    return 'curriculum'
  if (/email|courriel|lettre aux parents|lettre pour les parents|message aux parents/.test(m))
    return 'email_parents'
  if (/différenciation|differenciation|adaptat|soutien|enrichissement/.test(m))
    return 'differentiation'
  if (/devoir|travail.{0,10}maison|homework/.test(m))
    return 'devoir'

  return 'autre'
}

// ─── Sélection de la méthode pédagogique ──────────────────────────────────────

function selectMethod(
  type: ContentGenerationType,
  message: string,
  ctx: PedagogyContext,
): { methode: PedagogicalMethod; raison: string } {
  const m      = message.toLowerCase()
  const matiere = (ctx.matiere || '').toLowerCase()
  const niv     = (ctx.niveau  || '').toLowerCase()
  const isPrimaire = /primaire|1re|2e|3e|4e|5e|6e|ère|maternelle|jardin/.test(niv)
  const isSciences = /science|biolog|chimie|physique|nature/.test(matiere)
  const isMath     = /math|calcul|algèbre|géométrie|géom/.test(matiere)
  const isArts     = /art|musique|dessin|théâtre|théater/.test(matiere)
  const hasGroupe  = /groupe|équipe|collaborat|coopéra|pair/.test(m)
  const hasManip   = /manipul|expéri|laborat|concret|objet/.test(m)
  const hasProjet  = /projet|création|produire|créer|réaliser/.test(m)

  if (type === 'quiz' || type === 'evaluation')
    return { methode: 'enseignement_explicite', raison: 'L\'évaluation suit la séquence d\'enseignement direct déjà réalisée' }

  if (type === 'differentiation')
    return { methode: 'enseignement_differencie', raison: 'Différenciation pédagogique — adapter aux besoins variés des apprenants' }

  if (type === 'curriculum')
    return { methode: 'approche_projet', raison: 'La progression annuelle nécessite une vision de projet à long terme' }

  if (hasProjet || isArts)
    return { methode: 'approche_projet', raison: 'La demande implique une production concrète ou une démarche créative' }

  if (hasGroupe)
    return { methode: 'apprentissage_cooperatif', raison: 'La demande mentionne explicitement le travail en groupe ou collaboratif' }

  if ((isSciences || hasManip) && !isPrimaire)
    return { methode: 'decouverte_guidee', raison: 'Les sciences et manipulations favorisent la découverte guidée (concret → abstrait)' }

  if ((isSciences || hasManip) && isPrimaire)
    return { methode: 'demonstration_pratique', raison: 'Au primaire, la démonstration concrète précède l\'exploration autonome' }

  if (isMath && !isPrimaire)
    return { methode: 'resolution_problemes', raison: 'Les mathématiques au secondaire bénéficient de l\'apprentissage par résolution de problèmes' }

  if (isMath && isPrimaire)
    return { methode: 'enseignement_explicite', raison: 'Au primaire en mathématiques, l\'enseignement explicite structuré est le plus efficace' }

  // Défaut selon le niveau de détail du type
  if (['lecon_complete', 'fiche_lecon'].includes(type))
    return { methode: 'enseignement_explicite', raison: 'L\'enseignement explicite (modélisation → pratique guidée → autonome) est la méthode de référence pour une leçon complète' }

  return { methode: 'enseignement_explicite', raison: 'Méthode universelle par défaut — efficace pour tout niveau et toute matière' }
}

// ─── Estimation de la durée ───────────────────────────────────────────────────

function estimateDuration(type: ContentGenerationType, message: string): number {
  const m = message.toLowerCase()

  // Durée explicite dans le message
  const explicit = m.match(/(\d{2,3})\s*min/)
  if (explicit) return parseInt(explicit[1])

  // Durée par période mentionnée
  if (/double période|deux périodes|2 périodes/.test(m)) return 90
  if (/période|cours|séance/.test(m)) return 60

  // Défauts par type
  const defaults: Record<ContentGenerationType, number> = {
    lecon_complete: 60,
    fiche_lecon:    60,
    plan_lecon:     45,
    evaluation:     50,
    quiz:           20,
    activite:       30,
    curriculum:     0,   // annuel — pas en minutes
    email_parents:  0,
    differentiation: 45,
    devoir:         30,
    autre:          0,
  }
  return defaults[type] ?? 45
}

// ─── Structure recommandée selon type et méthode ─────────────────────────────

function buildStructure(
  type: ContentGenerationType,
  methode: PedagogicalMethod,
  duree: number,
): StructureBlock[] {
  if (!duree || type === 'curriculum' || type === 'email_parents') return []

  if (type === 'quiz') return [
    { phase: 'avant',  titre: 'Instructions',           dureeMin: 2,  note: 'Consignes claires, barème' },
    { phase: 'pendant', titre: 'Questions',              dureeMin: duree - 4, note: 'QCM ou réponses courtes' },
    { phase: 'apres',  titre: 'Correction collective',   dureeMin: 2,  note: 'Révision et rétroaction immédiate' },
  ]

  if (type === 'evaluation') return [
    { phase: 'avant',  titre: 'Mise en contexte',        dureeMin: 5,   note: 'Rappel des critères, consignes' },
    { phase: 'pendant', titre: 'Évaluation',              dureeMin: duree - 10, note: 'Tâche sommative' },
    { phase: 'apres',  titre: 'Rétroaction différée',     dureeMin: 5,   note: 'Planifier la correction et la remédiation' },
  ]

  if (type === 'activite') return [
    { phase: 'avant',  titre: 'Lancement activité',      dureeMin: 5,   note: 'Contexte et consignes' },
    { phase: 'pendant', titre: 'Réalisation',             dureeMin: duree - 10, note: 'Activité principale' },
    { phase: 'apres',  titre: 'Mise en commun',           dureeMin: 5,   note: 'Synthèse et rétroaction' },
  ]

  // Leçon (tous types) — structure AVANT / PENDANT / APRÈS
  const avant  = Math.round(duree * 0.15)
  const apres  = Math.round(duree * 0.15)
  const pendant = duree - avant - apres

  if (methode === 'resolution_problemes') return [
    { phase: 'avant',  titre: 'Situation-problème',       dureeMin: avant,      note: 'Présenter une situation concrète et déstabilisante sans donner la solution' },
    { phase: 'pendant', titre: 'Exploration et résolution', dureeMin: Math.round(pendant * 0.55), note: 'Travail individuel ou en équipe — l\'enseignant guide sans donner les réponses' },
    { phase: 'pendant', titre: 'Institutionnalisation',    dureeMin: Math.round(pendant * 0.45), note: 'Correction collective, formalisation du concept, liens avec le curriculum' },
    { phase: 'apres',  titre: 'Évaluation formative',      dureeMin: apres,      note: 'Billet de sortie, exercice de transfert' },
  ]

  if (methode === 'apprentissage_cooperatif') return [
    { phase: 'avant',  titre: 'Activation et équipes',    dureeMin: avant,      note: 'Former les équipes, clarifier les rôles, activer les connaissances antérieures' },
    { phase: 'pendant', titre: 'Travail coopératif',       dureeMin: Math.round(pendant * 0.6), note: 'Activité Jigsaw, Think-Pair-Share, ou galerie de solutions' },
    { phase: 'pendant', titre: 'Mise en commun',           dureeMin: Math.round(pendant * 0.4), note: 'Partage des résultats, construction collective du savoir' },
    { phase: 'apres',  titre: 'Retour réflexif',           dureeMin: apres,      note: 'Évaluation de la collaboration + trace individuelle du savoir acquis' },
  ]

  if (methode === 'decouverte_guidee') return [
    { phase: 'avant',  titre: 'Mise en situation',         dureeMin: avant,      note: 'Créer un déséquilibre cognitif — paradoxe, phénomène surprenant, question déstabilisante' },
    { phase: 'pendant', titre: 'Exploration',              dureeMin: Math.round(pendant * 0.5), note: 'Observation, manipulation, collecte de données — élèves actifs' },
    { phase: 'pendant', titre: 'Construction du concept',  dureeMin: Math.round(pendant * 0.5), note: 'Formulation des règles par les élèves, validation par l\'enseignant' },
    { phase: 'apres',  titre: 'Application et évaluation', dureeMin: apres,      note: 'Exercice de transfert + évaluation formative' },
  ]

  // Enseignement explicite (défaut)
  return [
    { phase: 'avant',  titre: 'Mise en situation',         dureeMin: avant,      note: 'Activation des connaissances antérieures, intention pédagogique partagée avec les élèves' },
    { phase: 'pendant', titre: 'Modélisation',              dureeMin: Math.round(pendant * 0.3), note: 'Je fais — enseignant modèle à haute voix, rend la pensée visible' },
    { phase: 'pendant', titre: 'Pratique guidée',           dureeMin: Math.round(pendant * 0.4), note: 'On fait ensemble — soutien graduel, vérification de la compréhension en temps réel' },
    { phase: 'pendant', titre: 'Pratique autonome',         dureeMin: Math.round(pendant * 0.3), note: 'Tu fais — application individuelle, différenciation selon les besoins' },
    { phase: 'apres',  titre: 'Retour et évaluation',       dureeMin: apres,      note: 'Synthèse collective + évaluation formative (billet de sortie, pouce, exit ticket)' },
  ]
}

// ─── Prérequis courants ────────────────────────────────────────────────────────

function inferPrerequis(message: string, ctx: PedagogyContext): string[] {
  const m       = message.toLowerCase()
  const matiere = (ctx.matiere || '').toLowerCase()
  const niv     = (ctx.niveau  || '').toLowerCase()
  const isSecondaire = /secondaire|lycée|lycee|high/.test(niv)

  const prereqs: string[] = []

  if (/fraction|décimale|decimale/.test(m) || (matiere.includes('math') && isSecondaire))
    prereqs.push('Maîtrise des opérations de base')
  if (/lecture/.test(m) || /français|francais|langue/.test(matiere))
    prereqs.push('Lecture autonome du niveau')
  if (/expérience|expérience|laborat/.test(m))
    prereqs.push('Notions de sécurité en laboratoire')
  if (prereqs.length === 0)
    prereqs.push('Connaissances antérieures identifiées dans le curriculum')

  return prereqs
}

// ─── Difficultés prévisibles ──────────────────────────────────────────────────

function inferDifficultes(message: string, ctx: PedagogyContext): string[] {
  const m       = message.toLowerCase()
  const niv     = (ctx.niveau || '').toLowerCase()
  const isPrimaire   = /primaire|1re|2e|3e|4e|5e|6e|maternelle/.test(niv)
  const isSecondaire = /secondaire|lycée|lycee|high/.test(niv)

  const diffs: string[] = []

  if (isPrimaire)
    diffs.push('Gestion de l\'attention et de l\'engagement sur la durée')
  if (isSecondaire)
    diffs.push('Motivation intrinsèque — relier le contenu à leur réalité')
  if (/abstrait|théori|theori|concept/.test(m))
    diffs.push('Passage du concret à l\'abstrait — prévoir des supports visuels')
  if (/groupe|équipe/.test(m))
    diffs.push('Inégale participation dans les équipes — prévoir des rôles définis')
  if (diffs.length === 0)
    diffs.push('Rythmes d\'apprentissage variés — différenciation à prévoir')

  return diffs
}

// ─── Taxonomie de Bloom cible ─────────────────────────────────────────────────

function detectBloomLevel(message: string): string {
  const m = message.toLowerCase()
  if (/créer|composer|concevoir|inventer|formuler|produire/.test(m)) return 'Créer (Bloom 6)'
  if (/évaluer|juger|défendre|critiquer|justifier|choisir/.test(m)) return 'Évaluer (Bloom 5)'
  if (/analyser|comparer|distinguer|classer|décomposer/.test(m)) return 'Analyser (Bloom 4)'
  if (/appliquer|utiliser|démontrer|résoudre|calculer/.test(m)) return 'Appliquer (Bloom 3)'
  if (/comprendre|expliquer|décrire|interpréter|résumer/.test(m)) return 'Comprendre (Bloom 2)'
  return 'Mémoriser et comprendre (Bloom 1-2)'
}

// ─── Validations ─────────────────────────────────────────────────────────────

function buildValidations(
  plan: Omit<PedagogicalPlan, 'validations'>,
): ValidationCheck[] {
  const checks: ValidationCheck[] = []
  const totalStructure = plan.structure.reduce((s, b) => s + b.dureeMin, 0)

  if (plan.dureeEstimee > 0) {
    const diff = Math.abs(totalStructure - plan.dureeEstimee)
    checks.push({ critere: `Temps total cohérent (${totalStructure} min)`, ok: diff <= 5 })
  }

  checks.push({ critere: 'Structure AVANT/PENDANT/APRÈS présente', ok: plan.structure.some(b => b.phase === 'avant') && plan.structure.some(b => b.phase === 'apres') })
  checks.push({ critere: 'Évaluation intégrée', ok: plan.evaluationType !== 'aucune' })
  checks.push({ critere: 'Différenciation prévue', ok: plan.differenciationFlag })
  checks.push({ critere: `Méthode sélectionnée (${plan.methode.replace(/_/g, ' ')})`, ok: true })

  return checks
}

// ─── Sérialisation en texte de prompt ────────────────────────────────────────

function serializePlan(plan: PedagogicalPlan, ctx: PedagogyContext, isFr: boolean): string {
  if (!plan || plan.requestType === 'autre') return ''

  const validSummary = plan.validations.map(v => `${v.ok ? '✓' : '⚠'} ${v.critere}`).join('\n')
  const structureSummary = plan.structure.length > 0
    ? plan.structure.map((b, i) => `  ${i + 1}. [${b.phase.toUpperCase()}] ${b.titre} (${b.dureeMin} min) — ${b.note}`).join('\n')
    : '  Structure libre selon le type de contenu'

  const classeInfo = [
    ctx.classe_nom ? `Classe : ${ctx.classe_nom}` : null,
    ctx.niveau     ? `Niveau : ${ctx.niveau}` : null,
    ctx.matiere    ? `Matière : ${ctx.matiere}` : null,
  ].filter(Boolean).join(' | ')

  return `<RAISONNEMENT_PÉDAGOGIQUE_INTERNE>
[Ce bloc est confidentiel. Ne pas le mentionner dans ta réponse ni expliquer son contenu à l'enseignant. Utilise-le uniquement pour guider ta génération.]

CONTEXTE : ${classeInfo || 'Non précisé'}
TYPE DE CONTENU DEMANDÉ : ${plan.requestType.replace(/_/g, ' ')}
${plan.dureeEstimee > 0 ? `DURÉE CIBLE : ${plan.dureeEstimee} minutes` : ''}

MÉTHODE PÉDAGOGIQUE SÉLECTIONNÉE : ${plan.methode.replace(/_/g, ' ')}
JUSTIFICATION : ${plan.raisonMethode}

NIVEAU TAXONOMIQUE CIBLE (Bloom) : ${plan.objectifsType}

STRUCTURE RECOMMANDÉE :
${structureSummary}

PRÉREQUIS À ACTIVER :
${plan.prerequis.map(p => `  • ${p}`).join('\n')}

DIFFICULTÉS PRÉVISIBLES À ANTICIPER :
${plan.difficultesPrevisibles.map(d => `  • ${d}`).join('\n')}

ÉVALUATION : ${plan.evaluationType}
DIFFÉRENCIATION : ${plan.differenciationFlag ? 'Oui — prévoir universel / ciblé / spécialisé' : 'Non requise explicitement'}

VALIDATIONS INTERNES :
${validSummary}
</RAISONNEMENT_PÉDAGOGIQUE_INTERNE>

`
}

// ─── Point d'entrée enrichi (retourne aussi méthode + durée pour extraction mémoire) ──

export interface PedagogyContextResult {
  text:    string
  methode: string | null
  duree:   number
}

export function buildPedagogyContextWithPlan(
  message: string,
  ctx: PedagogyContext,
  isFr = true,
): PedagogyContextResult {
  if (!message?.trim()) return { text: '', methode: null, duree: 0 }

  const requestType  = detectContentType(message)
  if (requestType === 'autre' || requestType === 'email_parents')
    return { text: '', methode: null, duree: 0 }

  const { methode, raison: raisonMethode } = selectMethod(requestType, message, ctx)
  const dureeEstimee  = estimateDuration(requestType, message)
  const structure     = buildStructure(requestType, methode, dureeEstimee)
  const prerequis     = inferPrerequis(message, ctx)
  const difficultesPrevisibles = inferDifficultes(message, ctx)
  const objectifsType = detectBloomLevel(message)
  const differenciationFlag = !/email|curriculum/.test(requestType)
  const evaluationType: PedagogicalPlan['evaluationType'] = (() => {
    if (/sommati|examen|test/.test(message.toLowerCase())) return 'sommative'
    if (/diagnos|avant|prérequis/.test(message.toLowerCase())) return 'diagnostique'
    if (requestType === 'evaluation') return 'sommative'
    if (['lecon_complete', 'fiche_lecon', 'plan_lecon'].includes(requestType)) return 'formative'
    return 'aucune'
  })()

  const partial = {
    requestType, methode, raisonMethode, dureeEstimee, structure,
    prerequis, difficultesPrevisibles, objectifsType, differenciationFlag,
    evaluationType, contexteNote: '',
  }
  const validations = buildValidations(partial)
  const plan: PedagogicalPlan = { ...partial, validations }
  const text = serializePlan(plan, ctx, isFr)

  return { text, methode, duree: dureeEstimee }
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

export function buildPedagogyContext(
  message: string,
  ctx: PedagogyContext,
  isFr = true,
): string {
  if (!message?.trim()) return ''

  const requestType  = detectContentType(message)

  // Pour les types conversationnels, pas de plan pédagogique
  if (requestType === 'autre' || requestType === 'email_parents') return ''

  const { methode, raison: raisonMethode } = selectMethod(requestType, message, ctx)
  const dureeEstimee  = estimateDuration(requestType, message)
  const structure     = buildStructure(requestType, methode, dureeEstimee)
  const prerequis     = inferPrerequis(message, ctx)
  const difficultesPrevisibles = inferDifficultes(message, ctx)
  const objectifsType = detectBloomLevel(message)
  const differenciationFlag = !/email|curriculum/.test(requestType)
  const evaluationType: PedagogicalPlan['evaluationType'] = (() => {
    if (/sommati|examen|test/.test(message.toLowerCase())) return 'sommative'
    if (/diagnos|avant|prérequis/.test(message.toLowerCase())) return 'diagnostique'
    if (requestType === 'evaluation') return 'sommative'
    if (['lecon_complete', 'fiche_lecon', 'plan_lecon'].includes(requestType)) return 'formative'
    return 'aucune'
  })()

  const partial = {
    requestType,
    methode,
    raisonMethode,
    dureeEstimee,
    structure,
    prerequis,
    difficultesPrevisibles,
    objectifsType,
    differenciationFlag,
    evaluationType,
    contexteNote: '',
  }

  const validations = buildValidations(partial)
  const plan: PedagogicalPlan = { ...partial, validations }

  return serializePlan(plan, ctx, isFr)
}
