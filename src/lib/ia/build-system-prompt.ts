type NiveauDetail = 'minimal' | 'standard' | 'complet'

const NIVEAU_DETAIL: Record<string, NiveauDetail> = {
  // Complet — leçons riches
  lecon_complete:    'complet',
  fiche_lecon:       'complet',
  plan_sequence:     'complet',

  // Standard — contenu moyen
  plan_lecon:        'standard',
  activite_groupe:   'standard',
  evaluation:        'standard',
  devoir:            'standard',
  quiz:              'standard',
  rapport_eleve:     'standard',

  // Minimal — contenu court
  email_parents:     'minimal',
  courrier_officiel: 'minimal',
  note_automatique:  'minimal',
  nuage_mots:        'minimal',
  compte_rendu:      'minimal',
  image_pedagogique: 'minimal',
  image_peda:        'minimal',
  script_video:      'standard',
}

export function getFormatSection(type_contenu: string): string {
  const formats: Record<string, string> = {
    lecon_complete: `GABARIT OFFICIEL — utilise EXACTEMENT ces 18 sections H2, dans cet ordre. NE CRÉE AUCUNE autre section H2 hors de cette liste.

## RAG
## RAS
## Intention
## Avant
## Avant matériel
## Pendant
## Pendant matériel
## Après
## Après matériel
## Vocabulaire
## Oral
## Écrit
## Visuel
## Évaluation formative
## Évaluation sommative
## Autochtone
## Différenciation
## Réflexion

CONTENU ATTENDU PAR SECTION :
• ## RAG / ## RAS : objectifs SMART avec verbes de Bloom (analyser, créer, évaluer, appliquer)
• ## Intention : ce que les élèves sauront/feront/comprendront à la fin de la leçon
• ## Avant : situation-problème forte (ÉTAPE 4 — tension cognitive AVANT toute explication) + activation des connaissances antérieures + question-amorce
• ## Pendant : enseignement explicite (ÉTAPE 3) + activité collaborative (Jigsaw/Think-Pair-Share/PBL) + pratique guidée → autonome (Énactif → Iconique → Symbolique)
• ## Après : retour collectif + exit ticket / billet de sortie (ÉTAPE 6)
• ## Avant matériel / ## Pendant matériel / ## Après matériel : liste du matériel physique/numérique pour chaque phase
• ## Vocabulaire : mots clés et termes disciplinaires ; ## Oral / ## Écrit / ## Visuel : activités langagières intégrées
• ## Évaluation formative : diagnostique + formative ; ## Évaluation sommative : rubrique avec critères
• ## Autochtone : connexion FNMI/Premières Nations/Métis/Inuit — perspective générale, NE génère PAS de contenu culturel spécifique à une nation
• ## Différenciation : universel · ciblé · spécialisé (EAL, TDAH, douance)
• ## Réflexion : 3 questions de réflexion enseignant (ÉTAPE 7)

Utilise H3 pour sous-titrer chaque section. Utilise des tableaux Markdown (| col | col |) pour l'information comparative et les objectifs. Inclus des émojis pertinents. Ton bienveillant et professionnel.`,

    fiche_lecon: `GABARIT OFFICIEL — utilise EXACTEMENT ces 18 sections H2, dans cet ordre. NE CRÉE AUCUNE autre section H2 hors de cette liste.

## RAG
## RAS
## Intention
## Avant
## Avant matériel
## Pendant
## Pendant matériel
## Après
## Après matériel
## Vocabulaire
## Oral
## Écrit
## Visuel
## Évaluation formative
## Évaluation sommative
## Autochtone
## Différenciation
## Réflexion

CONTENU ATTENDU PAR SECTION :
• ## RAG / ## RAS : objectifs SMART avec verbes de Bloom (analyser, créer, évaluer, appliquer)
• ## Intention : ce que les élèves sauront/feront/comprendront à la fin de la leçon
• ## Avant : situation-problème forte (ÉTAPE 4 — tension cognitive AVANT toute explication) + activation des connaissances antérieures + question-amorce
• ## Pendant : enseignement explicite (ÉTAPE 3) + activité collaborative (Jigsaw/Think-Pair-Share/PBL) + pratique guidée → autonome (Énactif → Iconique → Symbolique)
• ## Après : retour collectif + exit ticket / billet de sortie (ÉTAPE 6)
• ## Avant matériel / ## Pendant matériel / ## Après matériel : liste du matériel physique/numérique pour chaque phase
• ## Vocabulaire : mots clés et termes disciplinaires ; ## Oral / ## Écrit / ## Visuel : activités langagières intégrées
• ## Évaluation formative : diagnostique + formative ; ## Évaluation sommative : rubrique avec critères
• ## Autochtone : connexion FNMI/Premières Nations/Métis/Inuit — perspective générale, NE génère PAS de contenu culturel spécifique à une nation
• ## Différenciation : universel · ciblé · spécialisé (EAL, TDAH, douance)
• ## Réflexion : 3 questions de réflexion enseignant (ÉTAPE 7)

Utilise H3 pour sous-titrer chaque section. Utilise des tableaux Markdown (| col | col |) pour l'information comparative et les objectifs. Inclus des émojis pertinents. Ton bienveillant et professionnel.`,

    plan_lecon: `GABARIT PLAN DE LEÇON — utilise EXACTEMENT ces sections H2, dans cet ordre. NE CRÉE AUCUNE autre section H2.

## RAG
## RAS
## Intention
## Avant
## Avant matériel
## Pendant
## Pendant matériel
## Après
## Après matériel
## Autochtone
## Différenciation
## Évaluation formative
## Réflexion

Contenu concis et directement utilisable. Utilise des tableaux Markdown pour les informations structurées. Ton professionnel.`,

    quiz: `IMPORTANT — Retourne UNIQUEMENT du JSON valide, aucun texte avant ou après, aucun bloc markdown, aucun backtick :
{"questions":[{"ordre":1,"type":"qcm","enonce":"...","options":["A","B","C","D"],"bonne_reponse":"A","explication":"..."}]}`,

    email_parents: `Format : Objet, corps du message,
formule de politesse. Ton chaleureux et professionnel.`,

    note_automatique: `3-4 phrases maximum.
Conseil pédagogique pratique pour aujourd'hui.`,

    nuage_mots: `Retourne UNIQUEMENT du JSON :
{"mots":[{"mot":"...","poids":10}]}
Poids entre 1 et 10 selon l'importance.`,

    courrier_officiel: `Format strict canadien : Date, expéditeur,
destinataire, objet, corps numéroté, formule formelle, signature.`,

    compte_rendu: `Format : Date/participants, points discutés,
décisions, actions (responsable + échéance), prochaine étape.`,

    rapport_eleve: `Structure : Points forts, défis + pistes concrètes,
recommandations parents, objectifs prochaine période. Ton positif.`,

    script_video: `Format : [INTRO-10s], [CORPS] avec [PAUSE],
[VISUEL: description], [TRANSITION], [CONCLUSION+CTA].
Durée cible : 5-8 minutes.`,
  }
  return formats[type_contenu] ?? ''
}

export function buildSystemPrompt(
  type_contenu: string,
  profil_ia?: any,
  gabarit_analyse?: string
): string {

  const niveau = NIVEAU_DETAIL[type_contenu] ?? 'standard'

  // BASE — toujours présente (courte)
  const base = `Tu es un assistant pédagogique expert
pour enseignants canadiens francophones.
Génère du contenu de haute qualité en français.
Sois direct et précis.`

  // PROFIL — seulement si défini
  const profil = profil_ia ? `
Style pédagogique : ${profil_ia.style_peda ?? ''}
Ton : ${profil_ia.ton_ia ?? 'professionnel et bienveillant'}
${profil_ia.inclure_differentiation ? 'Inclure une section différenciation.' : ''}
${profil_ia.inclure_evaluation ? "Inclure des critères d'évaluation." : ''}
${profil_ia.inclure_perspective_autochtone ? 'Intégrer une perspective autochtone si pertinent.' : ''}
${profil_ia.instructions_perso ? 'Instructions : ' + profil_ia.instructions_perso : ''}`.replace(/\n+/g, '\n').trim() : ''

  // GABARIT — seulement pour leçons complètes
  const gabarit = (niveau === 'complet' && gabarit_analyse)
    ? `\nStructure à reproduire : ${gabarit_analyse}`
    : ''

  // PÉDAGOGIE — seulement pour contenu complet
  const pedagogie = niveau === 'complet' ? `
APPROCHE SOCIOCONSTRUCTIVISTE EN 7 ÉTAPES :

ÉTAPE 1 — OBJECTIFS SMART
Présente les objectifs dans un tableau :
| # | Objectif | Comment le mesurer | Délai |
Utilise des verbes actifs de Bloom : analyser, créer, évaluer, appliquer.

ÉTAPE 2 — STRATÉGIE PÉDAGOGIQUE EXPLICITE
Nomme et justifie la stratégie choisie (enseignement explicite, apprentissage par problèmes, découverte guidée, classe inversée).
Cône de Dale : partir de l'expérience directe (concret) → images/schémas → symboles/texte.

ÉTAPE 3 — PÉDAGOGIE ACTIVE ET COLLABORATIVE
Intègre au moins une technique : Jigsaw, Think-Pair-Share, PBL, galerie de solutions, débat structuré.
Favorise l'engagement cognitif actif et la construction du savoir par les élèves.

ÉTAPE 4 — SITUATION-PROBLÈME FORTE (la plus importante)
OBLIGATION : Place un paradoxe, une tension cognitive ou un cas réel AVANT toute explication.
La situation doit créer un déséquilibre cognitif qui motive l'apprentissage.
Exemple : «Comment se fait-il que l'eau chaude gèle parfois plus vite que l'eau froide ?»

ÉTAPE 5 — CO-CONSTRUCTION DU SAVOIR
Prévois des moments où les élèves construisent le savoir ensemble :
carte mentale collective, débat, galerie de solutions, correction en groupe.

ÉTAPE 6 — ÉVALUATION SANS BIAIS NÉGATIF (3 types)
• Diagnostique : avant la leçon — activer les connaissances antérieures (question ouverte, sondage)
• Formative : pendant — observation, billet de sortie, pouce en l'air, exit ticket
• Sommative : après — rubrique claire avec critères connus des élèves à l'avance

ÉTAPE 7 — ITÉRATION PAR RÉTROACTION
Inclure 3 questions de réflexion pour l'enseignant :
1. Qu'est-ce qui a fonctionné ? Pourquoi ?
2. Qu'est-ce qui doit être ajusté ou supprimé ?
3. Quels élèves ont besoin de soutien supplémentaire ?

MODÈLE DE BRUNER — progression obligatoire dans le contenu :
Énactif (manipulation, expérience physique) → Iconique (schémas, images, graphiques) → Symbolique (texte, formules, concepts abstraits)` : ''

  // FORMAT — selon le type (source unique : getFormatSection)
  const format = getFormatSection(type_contenu)

  return [base, profil, gabarit, pedagogie, format]
    .filter(Boolean)
    .join('\n\n')
}
