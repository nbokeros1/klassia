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
    lecon_complete: `GABARIT LEÇON COMPLÈTE — 7 blocs en tableaux Markdown, dans cet ordre exact.
Aucune section supplémentaire (pas de « Réflexion enseignant » séparée, pas de « Matériels » séparés — tout matériel dans la colonne droite de chaque bloc).
Document 3-5 pages. Écriture efficace : puces d'action, sous-étapes concrètes, quelques répliques entre guillemets — jamais de script intégral mot-à-mot.

| Nom | Niveau scolaire | Matière | Durée | Leçon # |
|:---|:---|:---|:---|:---|

| Programme d'étude — RAG et RAS (texte officiel exact) | Intention pédagogique |
|:---|:---|
| | Ce que les élèves sauront/feront/comprendront à la fin (1-2 phrases) |

| Intégration de la langue (vocabulaire, oral, écrit, visuel) | Évaluation |
|:---|:---|
| 3-5 termes disciplinaires + activités langagières (oral, écrit, visuel) | Support CONCRET de la trace : billet de sortie / fiche écrite / présentation orale. Jamais « l'élève démontre » sans préciser le support. |

| Intégration de la perspective autochtone | Différenciation pédagogique |
|:---|:---|
| 2-3 puces — piste FNMI/Premières Nations/Métis/Inuit pertinente (ou « Non applicable pour cette leçon »). | **Universel :** ... **Ciblé :** ... **Spécialisé :** ... |

**AVANT** — Préparation/activation (amorce, introduction)
| Temps prévu | Connexion et connaissances antérieures | Matériaux/ressources |
|:---|:---|:---|
| __ min | • Activation des connaissances antérieures • Mise en situation (tension cognitive ou question-amorce) • Partage explicite de l'intention pédagogique AUX ÉLÈVES ⚠️ Jamais de contenu d'enseignement nouveau ici. | |

**PENDANT** — Réalisation (développement)
| Temps prévu | Déroulement | Matériaux/ressources |
|:---|:---|:---|
| __ min | **Modélisation :** [enseignement explicite — lié à un RAS déclaré] **Pratique guidée :** [activité avec l'enseignant] **Pratique autonome :** [élèves seuls] ⚠️ Chaque activité doit découler d'un RAS déclaré. Questions ouvertes : préciser le type de réponse attendu entre parenthèses. | |

**APRÈS** — Intégration/évaluation (retour sur les apprentissages)
| Temps prévu | Retour sur les apprentissages | Matériaux/ressources |
|:---|:---|:---|
| __ min | Retour collectif + lien avec le(s) RAS + évaluation formative/sommative avec trace concrète (préciser laquelle). | |`,

    fiche_lecon: `GABARIT FICHE DE LEÇON — 7 blocs en tableaux Markdown, dans cet ordre exact.
Aucune section supplémentaire (pas de « Réflexion enseignant » séparée, pas de « Matériels » séparés — tout matériel dans la colonne droite de chaque bloc).
Document 2-3 pages maximum. Écriture dense : puces courtes, directes, quelques répliques entre guillemets.

| Nom | Niveau scolaire | Matière | Durée | Leçon # |
|:---|:---|:---|:---|:---|

| Programme d'étude — RAG et RAS (texte officiel exact) | Intention pédagogique |
|:---|:---|
| | Ce que les élèves sauront/feront/comprendront à la fin (1-2 phrases) |

| Intégration de la langue (vocabulaire, oral, écrit, visuel) | Évaluation |
|:---|:---|
| 3-5 termes disciplinaires + activités langagières | Support CONCRET de la trace : billet de sortie / fiche / présentation orale. Jamais « l'élève démontre » sans préciser le support. |

| Intégration de la perspective autochtone | Différenciation pédagogique |
|:---|:---|
| 2-3 puces — piste FNMI pertinente (ou « Non applicable pour cette leçon »). | **Universel :** ... **Ciblé :** ... **Spécialisé :** ... |

**AVANT** — Préparation/activation (amorce, introduction)
| Temps prévu | Connexion et connaissances antérieures | Matériaux/ressources |
|:---|:---|:---|
| __ min | • Activation des connaissances antérieures • Mise en situation (tension cognitive ou question-amorce) • Partage explicite de l'intention pédagogique AUX ÉLÈVES ⚠️ Jamais de contenu d'enseignement nouveau ici. | |

**PENDANT** — Réalisation (développement)
| Temps prévu | Déroulement | Matériaux/ressources |
|:---|:---|:---|
| __ min | **Modélisation :** [enseignement explicite — lié à un RAS déclaré] **Pratique guidée :** [activité avec l'enseignant] **Pratique autonome :** [élèves seuls] ⚠️ Chaque activité doit découler d'un RAS déclaré. | |

**APRÈS** — Intégration/évaluation (retour sur les apprentissages)
| Temps prévu | Retour sur les apprentissages | Matériaux/ressources |
|:---|:---|:---|
| __ min | Retour collectif + lien avec le(s) RAS + évaluation formative avec trace concrète (préciser laquelle). | |`,

    plan_lecon: `GABARIT PLAN DE LEÇON — 7 blocs en tableaux Markdown, dans cet ordre exact.
Aucune section supplémentaire (pas de « Réflexion enseignant » séparée, pas de « Matériels » séparés — tout matériel dans la colonne droite de chaque bloc).
Document 2-3 pages maximum. Écriture dense : puces d'action concises, quelques répliques entre guillemets — jamais de paragraphes explicatifs.

| Nom | Niveau scolaire | Matière | Durée | Leçon # |
|:---|:---|:---|:---|:---|

| Programme d'étude — RAG et RAS (texte officiel exact) | Intention pédagogique |
|:---|:---|
| | Ce que les élèves sauront/feront/comprendront à la fin (1-2 phrases) |

| Intégration de la langue (vocabulaire, oral, écrit, visuel) | Évaluation |
|:---|:---|
| 3-5 termes disciplinaires + activités langagières | Support CONCRET de la trace : billet de sortie / fiche écrite / présentation orale. Jamais « l'élève démontre » sans préciser le support. |

| Intégration de la perspective autochtone | Différenciation pédagogique |
|:---|:---|
| 2-3 puces — piste FNMI pertinente (ou « Non applicable pour cette leçon »). | **Universel :** ... **Ciblé :** ... **Spécialisé :** ... |

**AVANT** — Préparation/activation (amorce, introduction)
| Temps prévu | Connexion et connaissances antérieures | Matériaux/ressources |
|:---|:---|:---|
| __ min | • Activation des connaissances antérieures • Mise en situation (tension cognitive ou question-amorce) • Partage explicite de l'intention pédagogique AUX ÉLÈVES ⚠️ Jamais de contenu d'enseignement nouveau ici. | |

**PENDANT** — Réalisation (développement)
| Temps prévu | Déroulement | Matériaux/ressources |
|:---|:---|:---|
| __ min | **Modélisation :** [enseignement explicite — lié à un RAS déclaré] **Pratique guidée :** [activité avec l'enseignant] **Pratique autonome :** [élèves seuls] ⚠️ Chaque activité doit découler d'un RAS déclaré. Questions ouvertes : préciser le type de réponse attendu entre parenthèses. | |

**APRÈS** — Intégration/évaluation (retour sur les apprentissages)
| Temps prévu | Retour sur les apprentissages | Matériaux/ressources |
|:---|:---|:---|
| __ min | Retour collectif + lien avec le(s) RAS + évaluation formative avec trace concrète (préciser laquelle). | |`,

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

Progression pédagogique : partir du concret (manipulation, expérience directe) → représentation visuelle (schémas, images) → abstraction (texte, formules, concepts).` : ''

  // FORMAT — selon le type (source unique : getFormatSection)
  const format = getFormatSection(type_contenu)

  return [base, profil, gabarit, pedagogie, format]
    .filter(Boolean)
    .join('\n\n')
}
