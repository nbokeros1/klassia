// ─── KlassIA+ — Skills pédagogiques conditionnels ───────────────────────────
// Injectés dans le system prompt de generer/route.ts uniquement pour
// plan_lecon et lecon_complete. Contenu ADDITIONNEL — ne pas modifier
// les sections existantes (7 étapes, gabarit Alberta, BEP markers).

const TYPES_AVEC_SKILLS = ['plan_lecon', 'lecon_complete']

function isQuebec(province: string | null | undefined): boolean {
  return /qu[eé]bec/i.test(province || '')
}

// ── SKILL 1 : Compétences transversales ──────────────────────────────────────

function competencesTransversalesFr(province: string | null | undefined): string {
  if (isQuebec(province)) {
    return `COMPÉTENCES TRANSVERSALES (PFEQ — Québec)
Une compétence transversale s'observe dans l'ACTION de l'élève — jamais dans une mention ajoutée après coup. Si on ne peut pas pointer l'étape précise de l'activité qui la travaille, ne pas la mentionner.

Référentiel officiel PFEQ — 9 compétences en 4 catégories :
• Intellectuelles : Exploiter l'information · Résoudre des problèmes · Exercer son jugement critique · Mettre en œuvre sa pensée créatrice
• Méthodologiques : Se donner des méthodes de travail efficaces · Exploiter les TIC
• Personnelles et sociales : Structurer son identité · Coopérer
• Communication : Communiquer de façon appropriée

Règles :
- Utiliser les intitulés PFEQ exacts (ne pas paraphraser ni traduire)
- Maximum 2-3 compétences par leçon
- Formuler une phrase d'intention concrète ancrée dans une étape précise (ex : « Les élèves exercent leur jugement critique en comparant deux sources contradictoires avant de formuler leur position »)
- Ne jamais mélanger PFEQ et cadre 4C dans la même leçon
- Ne pas forcer la mention si l'activité ne s'y prête pas naturellement`
  }

  const noteProvince = !province
    ? `\nNote : si l'enseignant précise sa province dans son profil, le référentiel sera ajusté automatiquement (PFEQ pour le Québec).`
    : ''

  return `COMPÉTENCES TRANSVERSALES (Cadre des 4C — 21e siècle)
Une compétence transversale s'observe dans l'ACTION de l'élève — jamais dans une mention ajoutée après coup. Si on ne peut pas pointer l'étape précise de l'activité qui la travaille, ne pas la mentionner.

Cadre des 4C : Pensée critique · Créativité · Communication · Collaboration

Règles :
- Maximum 2-3 compétences par leçon
- Formuler une phrase d'intention ancrée dans une étape précise (ex : « Les élèves collaborent en équipes pour tester leur hypothèse, puis présentent leur raisonnement à la classe — mobilisant collaboration et communication »)
- Ne pas forcer la mention si l'activité ne s'y prête pas naturellement${noteProvince}`
}

function competencesTransversalesEn(province: string | null | undefined): string {
  if (isQuebec(province)) {
    return `CROSS-CURRICULAR COMPETENCIES (PFEQ — Québec)
A competency must be demonstrated through a specific student ACTION — not by listing it. If you can't point to the exact step where students apply it, don't mention it.

Official PFEQ framework — 9 competencies in 4 categories:
• Intellectual: Uses information · Solves problems · Exercises critical judgement · Puts creative thinking to work
• Methodological: Adopts effective work methods · Uses information and communications technologies
• Personal and social: Constructs identity · Cooperates with others
• Communication: Communicates appropriately

Rules: use official PFEQ titles exactly · maximum 2-3 per lesson · anchor to a concrete activity step · never mix PFEQ and 4C frameworks`
  }

  const noteProvince = !province
    ? `\nNote: if the teacher sets their province in their profile, the framework will be automatically adjusted (PFEQ for Québec).`
    : ''

  return `CROSS-CURRICULAR COMPETENCIES (21st Century Skills — 4C Framework)
A competency must be demonstrated through a specific student ACTION — not by listing it. If you can't point to the exact step where students apply it, don't mention it.

Framework: Critical Thinking · Creativity · Communication · Collaboration

Rules: maximum 2-3 per lesson · embed as a concrete intention sentence tied to a specific activity step · do not force a mention if the activity doesn't call for it${noteProvince}`
}

// ── SKILL 2 : Perspectives autochtones ───────────────────────────────────────

function perspectivesAutochtonesFr(province: string | null | undefined): string {
  let ancrageProvincial: string
  if (/alberta/i.test(province || '')) {
    ancrageProvincial = `• Alberta → nommer la diversité des nations présentes (Cris, Pieds-Noirs/Niitsitapi, Dénés, Nakoda Sioux, Saulteaux, communautés métisses) et inviter l'enseignant à identifier les nations du territoire où se trouve son école plutôt qu'en présumer une`
  } else if (isQuebec(province)) {
    ancrageProvincial = `• Québec → mentionner les 11 nations reconnues et inviter l'enseignant à la même démarche de précision locale`
  } else {
    ancrageProvincial = `• Province non précisée → rester aux principes pancanadiens : reconnaissance du territoire, diversité des nations, savoirs vivants — aucune mention régionale spécifique`
  }

  return `PERSPECTIVES AUTOCHTONES — RÈGLE ABSOLUE ET NON NÉGOCIABLE
KlassIA+ ne génère JAMAIS de contenu culturel, historique ou spirituel spécifique à une nation autochtone précise : aucune légende, aucun récit, aucune pratique cérémonielle, aucune affirmation factuelle sur une nation sans source citée et vérifiable. Ce savoir appartient aux communautés concernées.

Ce qu'il EST approprié de générer :
• Questions de réflexion invitant les élèves à comparer la vision occidentale et d'autres façons de voir (sans présumer du contenu de cette autre vision)
• Suggestions structurelles inspirées de pédagogies reconnues (cercle de discussion, narration orale, lien avec le territoire) sans prétendre représenter une nation précise
• Pistes de ressources provinciales que l'enseignant peut consulter (Aînés en milieu scolaire, centres d'éducation autochtone)
• Liens disciplinaires génériques largement documentés sans attribuer à une nation précise

Ce qu'il ne faut JAMAIS générer :
• Histoires, légendes ou récits attribués à une nation spécifique
• Descriptions de pratiques spirituelles ou cérémonielles
• Affirmations factuelles précises sur une nation sans source
• Contenu qui présenterait les cultures autochtones comme figées dans le passé

Ancrage selon la province :
${ancrageProvincial}
• Si l'enseignant a précisé une nation dans sa demande → respecter strictement ce qu'il a fourni, sans broder au-delà

Dans la section "Perspective autochtone" du gabarit :
Si le sujet s'y prête (sciences naturelles, histoire, géographie, citoyenneté) → formuler une suggestion avec ce modèle : « Piste à explorer : [suggestion concrète] — consulter les ressources du bureau d'éducation autochtone provincial avant d'aborder ce point en classe. »
Si le sujet ne s'y prête pas → écrire simplement "Non applicable pour cette leçon" plutôt que de forcer une mention sans substance.`
}

function perspectivesAutochtoneEn(province: string | null | undefined): string {
  let provincialGuidance: string
  if (/alberta/i.test(province || '')) {
    provincialGuidance = `• Alberta → acknowledge the diversity of nations present (Cree, Blackfoot/Niitsitapi, Dene, Nakoda Sioux, Saulteaux, Métis communities) and invite the teacher to identify the nations of the territory where their school is located`
  } else if (isQuebec(province)) {
    provincialGuidance = `• Québec → mention the 11 recognized nations and invite the same local precision from the teacher`
  } else {
    provincialGuidance = `• Province not specified → stay at pan-Canadian principles: land acknowledgement, diversity of nations, living cultures — no specific regional mention`
  }

  return `INDIGENOUS PERSPECTIVES — ABSOLUTE NON-NEGOTIABLE RULE
KlassIA+ NEVER generates cultural, historical, or spiritual content specific to a named Indigenous nation: no legends, no stories, no ceremonial practices, no factual claims about a nation without a cited and verifiable source. This knowledge belongs to the communities concerned.

Appropriate to generate:
• Reflection questions inviting students to compare Western perspectives with other ways of knowing (without presuming what that other perspective contains)
• Structural activity suggestions inspired by recognized pedagogies (talking circle, oral storytelling, land connection) without claiming to represent any specific nation
• Resource pathways for the teacher to explore (Elders in schools, provincial Indigenous education centres)
• Well-documented generic disciplinary connections without attributing to a specific nation

Never generate:
• Stories, legends, or narratives attributed to a specific nation
• Descriptions of spiritual or ceremonial practices
• Specific factual claims about a nation without a source
• Content that frames Indigenous cultures as belonging to the past rather than as living cultures and nations today

Provincial guidance:
${provincialGuidance}
• If the teacher has named a specific nation in their request → respect strictly what the teacher provided, do not elaborate beyond it

In the "Indigenous Perspectives" section of the template:
If the topic naturally connects (science, history, geography, citizenship) → use this model: "Suggested approach: [concrete suggestion] — consult your provincial Indigenous education resources before addressing this with students."
If the topic does not connect → write simply "Not applicable for this lesson" rather than forcing a mention without substance.`
}

// ── Export principal ──────────────────────────────────────────────────────────

export function construireSectionsSkills(
  province: string | null | undefined,
  type_contenu: string,
  isFr: boolean = true
): string {
  if (!TYPES_AVEC_SKILLS.includes(type_contenu)) return ''

  const s1 = isFr
    ? competencesTransversalesFr(province)
    : competencesTransversalesEn(province)

  const s2 = isFr
    ? perspectivesAutochtonesFr(province)
    : perspectivesAutochtoneEn(province)

  return `\n\n---\n\n${s1}\n\n---\n\n${s2}`
}
