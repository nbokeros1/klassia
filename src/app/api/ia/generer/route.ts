import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { contenu: '⚠️ Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans votre fichier .env.local.' },
      { status: 200 }
    )
  }

  try {
    const body = await request.json()
    const {
      type_contenu, sujet, duree, instructions,
      adapter_besoins, contexte, langue,
      profil_ia,        // pedagogical profile from utilisateurs.profil_ia
      profils_eleves,   // optional: [{prenom, profil_type, besoins, notes_enseignant}]
    } = body

    const client = new Anthropic({ apiKey })
    const isFr = (langue || profil_ia?.langue_ia || 'fr') !== 'en'

    // ── Studio IA mémoire injection ──────────────────────────────────────────
    let memoireSection = ''
    try {
      const supabaseMem = await createClient()
      const { data: { session: memSession } } = await supabaseMem.auth.getSession()
      if (memSession) {
        const { data: userProfilMem } = await supabaseMem.from('utilisateurs').select('id').eq('user_id', memSession.user.id).single()
        if (userProfilMem?.id) {
          const { data: memoires } = await supabaseMem.from('studio_ia_memoire').select('cle,contenu,type').eq('enseignant_id', userProfilMem.id).order('updated_at', { ascending: false }).limit(10)
          if (memoires && memoires.length > 0) {
            const memo = memoires.map((m: any) => `- [${m.type}] ${m.cle}`).join('\n')
            memoireSection = isFr
              ? `\n\nMÉMOIRE PERSONNALISÉE DE L'ENSEIGNANT(E) :\nTu connais le style et les ressources de cet enseignant :\n${memo}\nAdapte ta génération à son contexte et ses préférences.`
              : `\n\nTEACHER'S PERSONALIZED MEMORY:\nYou know this teacher's style and resources:\n${memo}\nAdapt your generation to their context and preferences.`
          }
        }
      }
    } catch { /* non-bloquant */ }

    // ── Type-specific prompt section ──────────────────────────────────────────
    const typeSpecificPrompt = (() => {
      switch (type_contenu) {
        case 'note_automatique':
          return isFr
            ? `\n\nGénère une note pédagogique courte (3-5 phrases) pour l'enseignant sur cet événement ou cette leçon. Inclure : rappels pédagogiques importants, matériel à préparer, conseils pratiques pour bien démarrer la session.`
            : `\n\nGenerate a short pedagogical note (3-5 sentences) for the teacher about this event or lesson. Include: key reminders, material to prepare, practical tips to start the session well.`
        case 'email_parents':
          return isFr
            ? `\n\nRédige un email professionnel et bienveillant pour les familles. Format : Objet en première ligne, corps structuré en paragraphes, formule de politesse. Ton chaleureux mais professionnel. Évite le jargon pédagogique excessif.`
            : `\n\nWrite a professional, caring email for families. Format: Subject on first line, structured paragraphs, closing formula. Warm but professional tone, minimal jargon.`
        case 'courrier_officiel':
          return isFr
            ? `\n\nRédige un courrier officiel selon les standards canadiens. Format strict : Date, Coordonnées expéditeur, Destinataire complet, Objet, Corps avec paragraphes numérotés si nécessaire, Formule de politesse formelle, Signature.`
            : `\n\nWrite an official letter per Canadian standards. Strict format: Date, sender info, full recipient, subject, numbered body paragraphs if needed, formal closing, signature.`
        case 'rapport_eleve':
          return isFr
            ? `\n\nGénère un rapport de progression bienveillant et constructif. Structure : Points forts observés, Défis et pistes d'amélioration concrètes, Recommandations pour les parents, Objectifs pour la prochaine période. Ton positif et factuel.`
            : `\n\nGenerate a caring, constructive progress report. Structure: Observed strengths, Challenges with concrete improvement paths, Recommendations for parents, Goals for next period. Positive and factual tone.`
        case 'image_pedagogique':
        case 'image_peda':
          return isFr
            ? `\n\nDécris précisément un visuel pédagogique à créer. Inclure : description détaillée des éléments visuels, organisation spatiale, palette de couleurs recommandée, légendes et annotations, objectif pédagogique du visuel. Format exploitable par un graphiste ou un outil IA d'image.`
            : `\n\nPrecisely describe a pedagogical visual to create. Include: detailed visual elements, spatial layout, recommended color palette, captions and annotations, pedagogical goal. Format usable by a designer or AI image tool.`
        case 'script_video':
          return isFr
            ? `\n\nRédige un script complet de capsule vidéo pédagogique. Format : [INTRO - 10s], [CORPS] avec marqueurs [PAUSE], [VISUEL: description précise], [TRANSITION], [CONCLUSION + CTA]. Une réplique par ligne. Durée totale cible : 5-8 minutes.`
            : `\n\nWrite a complete pedagogical video capsule script. Format: [INTRO - 10s], [BODY] with [PAUSE], [VISUAL: description], [TRANSITION], [CONCLUSION + CTA] markers. One line per dialogue. Target duration: 5-8 minutes.`
        case 'compte_rendu':
          return isFr
            ? `\n\nRédige un compte-rendu structuré et professionnel. Format : Date et participants, Points discutés (numérotés), Décisions prises, Actions à suivre (responsable + échéance), Prochaine étape/réunion.`
            : `\n\nWrite a structured, professional meeting summary. Format: Date and participants, Points discussed (numbered), Decisions made, Follow-up actions (owner + deadline), Next step/meeting.`
        default:
          return ''
      }
    })()

    // ── Build system prompt incorporating teacher's pedagogical profile ──────
    const styleLabel = profil_ia?.style_peda
      ? `Applique un style pédagogique "${profil_ia.style_peda}".`
      : ''

    const tonLabel = profil_ia?.ton_ia === 'informel'
      ? (isFr ? 'Utilise un ton chaleureux et accessible.' : 'Use a warm, accessible tone.')
      : profil_ia?.ton_ia === 'dynamique'
      ? (isFr ? 'Utilise un ton dynamique et engageant.' : 'Use a dynamic, engaging tone.')
      : (isFr ? 'Utilise un ton professionnel et structuré.' : 'Use a professional, structured tone.')

    const inclusionLabel = profil_ia?.inclure_differentiation
      ? (isFr ? 'Inclure une section différenciation.' : 'Include a differentiation section.')
      : ''

    const evalLabel = profil_ia?.inclure_evaluation
      ? (isFr ? 'Inclure des critères d\'évaluation.' : 'Include assessment criteria.')
      : ''

    const autochtoneLabel = profil_ia?.inclure_perspective_autochtone
      ? (isFr ? 'Intégrer une perspective autochtone si pertinent.' : 'Integrate an Indigenous perspective where relevant.')
      : ''

    const instructionsPerso = profil_ia?.instructions_perso
      ? (isFr ? `Instructions personnelles de l'enseignant : ${profil_ia.instructions_perso}` : `Teacher's personal instructions: ${profil_ia.instructions_perso}`)
      : ''

    // ── BLOC 12 — Méthodes pédagogiques actives (toutes les générations) ─────
    const methodesSection = isFr ? `

Tu connais et appliques ces méthodes selon le contexte :

APPRENTISSAGE COOPÉRATIF :
- Jigsaw : groupes d'experts + enseignement croisé entre équipes
- Think-Pair-Share : réflexion individuelle → binôme → partage classe entière
- Tournoi équipes : groupes hétérogènes + compétition saine et motivante

PBL (Apprentissage par problème) : produit final destiné à un vrai public
MÉTHODE SOCRATIQUE : questions qui guident la découverte, jamais de réponse directe
CLASSE INVERSÉE : théorie à la maison → pratique et approfondissement en classe

DÉCOUVERTE GUIDÉE — Bruner (5 phases) :
1. Situation déclenchante calibrée au niveau
2. Investigation guidée (3 niveaux d'étayage selon besoins)
3. Confrontation collective des hypothèses
4. Institutionnalisation négociée du savoir
5. Réinvestissement immédiat dans un nouveau contexte

ÉVALUATION FORMATIVE :
- Ticket de sortie (3 min en fin de cours)
- Feux tricolores (vert = compris / orange = partiel / rouge = pas compris)
- Quiz formatif questions ouvertes (pas que QCM)

STRUCTURE OBLIGATOIRE DE CHAQUE LEÇON :
1. Objectifs SMART (spécifique, mesurable, atteignable, réaliste, temporel)
2. Amorce / Engage (brise-glace, problème réel, lien avec vécu élève)
3. Présentation progressive selon Bruner :
   → Énactif (manipulation, exemple concret, situation réelle)
   → Iconique (schéma, tableau, image, graphique)
   → Symbolique (règle abstraite, formule, concept général)
4. Pratique variée :
   → Guidée : enseignant accompagne les premiers exercices
   → En groupe : activité collaborative avec rôles définis
   → Autonome : travail individuel de vérification
5. Clôture + défi pour le prochain cours :
   → Synthèse PARTICIPATIVE (élèves résument, pas l'enseignant)
   → Lien explicite avec la prochaine leçon
   → Défi ou question ouverte pour la maison`
    : `

You know and apply these methods according to context:

COOPERATIVE LEARNING:
- Jigsaw: expert groups + cross-team teaching
- Think-Pair-Share: individual → pair → whole class
- Teams-Games-Tournament: heterogeneous groups + healthy competition

PBL (Project-Based Learning): final product for a real audience
SOCRATIC METHOD: guiding questions, never direct answers
FLIPPED CLASSROOM: theory at home → practice and deepening in class

GUIDED DISCOVERY — Bruner (5 phases):
1. Calibrated triggering situation
2. Guided investigation (3 scaffolding levels)
3. Collective hypothesis confrontation
4. Negotiated institutionalization of knowledge
5. Immediate reinvestment in new context

FORMATIVE ASSESSMENT:
- Exit ticket (3 min end of class)
- Traffic lights (green / orange / red)
- Formative quiz with open questions

MANDATORY LESSON STRUCTURE:
1. SMART objectives
2. Hook / Engage (icebreaker, real problem, student experience connection)
3. Progressive Bruner presentation: Enactive → Iconic → Symbolic
4. Varied practice: Guided → Group → Autonomous
5. Closure + challenge: Participatory summary → Next lesson link → Home challenge`

    // ── Gabarit personnel si fourni ──────────────────────────────────────────
    const gabaritSection = profil_ia?.gabarit_lecon_analyse
      ? (isFr
          ? `\n\nL'enseignant utilise ce gabarit personnel — reproduis EXACTEMENT cette structure dans ta génération :\n${profil_ia.gabarit_lecon_analyse}`
          : `\n\nThe teacher uses this personal template — reproduce EXACTLY this structure:\n${profil_ia.gabarit_lecon_analyse}`)
      : ''

    // ── Différenciation : profils élèves ────────────────────────────────────
    const elevesABesoins = (profils_eleves || []).filter((e: any) => e.profil_type !== 'standard')
    const differenciationPrompt = elevesABesoins.length > 0
      ? (isFr
          ? `\n\nCette classe contient des élèves à besoins particuliers :\n${
              elevesABesoins.map((e: any) =>
                `- ${e.prenom || 'Élève'} — Type : ${e.profil_type}${e.besoins?.length ? ` — Besoins : ${e.besoins.join(', ')}` : ''}${e.notes_enseignant ? ` — Notes : ${e.notes_enseignant}` : ''}`
              ).join('\n')
            }\n\nGénère TOUJOURS deux versions :\n1. VERSION NORMALE : pour toute la classe\n2. VERSION DIFFÉRENCIÉE : adaptée pour ces élèves spécifiques\n   - Vocabulaire simplifié si difficultés de lecture\n   - Exemples concrets et visuels si compréhension abstraite difficile\n   - Supports supplémentaires intégrés\n   - Exercices graduels (du plus simple au plus complexe)\n   - Instructions claires et étape par étape\n\nSépare les deux versions avec le marqueur exact :\n=== VERSION DIFFÉRENCIÉE ===`
          : `\n\nThis class has students with special needs:\n${
              elevesABesoins.map((e: any) =>
                `- ${e.prenom || 'Student'} — Type: ${e.profil_type}${e.besoins?.length ? ` — Needs: ${e.besoins.join(', ')}` : ''}${e.notes_enseignant ? ` — Notes: ${e.notes_enseignant}` : ''}`
              ).join('\n')
            }\n\nALWAYS generate two versions:\n1. NORMAL VERSION: for the whole class\n2. DIFFERENTIATED VERSION: adapted for these students\n   - Simplified vocabulary for reading difficulties\n   - Concrete and visual examples for abstract comprehension\n   - Additional supports included\n   - Gradual exercises (simple to complex)\n   - Clear step-by-step instructions\n\nSeparate the two versions with the exact marker:\n=== VERSION DIFFÉRENCIÉE ===`)
      : ''

    // Instructions schema-svg pour les leçons complètes
    const isLeconComplete = ['lecon_complete', 'fiche_lecon'].includes(type_contenu || '')
    const matiere = contexte?.classe?.matiere?.toLowerCase() || ''
    const schemaIds: Record<string, string[]> = {
      biologie: ['corps-humain','cellule-animale','cellule-vegetale','systeme-respiratoire','systeme-circulatoire','adn-double-helice','mitose'],
      chimie:   ['atome-bohr','tableau-periodique','molecule-eau','ph-echelle'],
      physique: ['circuit-serie','circuit-parallele','diagramme-forces','ondes-sinusoide','refraction-lumiere'],
      maths:    ['plan-cartesien','triangle-rectangle','diagramme-venn','arbre-probabilite','diagramme-barres'],
    }
    const matchedMatiere = Object.keys(schemaIds).find(k => matiere.includes(k) || k.includes(matiere))
    const schemaInstructions = isLeconComplete && matchedMatiere
      ? (isFr
          ? `\nQuand tu génères du contenu pour cette matière, insère des balises schema-svg aux endroits pédagogiquement appropriés.
IDs disponibles pour ${matchedMatiere} : ${schemaIds[matchedMatiere].join(', ')}.
Format : <schema-svg id='[id]' titre='[titre descriptif]'/>
Exemple : <schema-svg id='cellule-animale' titre='Structure de la cellule animale'/>
Maximum 3 schémas par leçon. Insère-les au moment de leur utilisation pédagogique (pas tous au début).`
          : `\nWhen generating content for this subject, insert schema-svg tags at pedagogically appropriate locations.
Available IDs for ${matchedMatiere}: ${schemaIds[matchedMatiere].join(', ')}.
Format: <schema-svg id='[id]' title='[descriptive title]'/>
Example: <schema-svg id='cellule-animale' title='Animal cell structure'/>
Maximum 3 schemas per lesson. Insert them when pedagogically relevant.`)
      : ''

    // ── Section supplémentaire pour leçon complète ──────────────────────────
    const isLeconCompleteStrict = type_contenu === 'lecon_complete'
    const planJson = body.plan_json ? JSON.stringify(body.plan_json, null, 2) : null
    const ressourcesListe: string[] = body.ressources_context || []

    const leconCompleteSection = isLeconCompleteStrict ? (isFr
      ? `

Tu es un enseignant expert qui génère des leçons complètes, riches et visuellement attractives.

${planJson ? `STRUCTURE OBLIGATOIRE de la leçon :
Suis EXACTEMENT ce plan de leçon fourni :
${planJson}` : ''}

MODÈLE PÉDAGOGIQUE À RESPECTER :
1. OBJECTIFS SMART (spécifique, mesurable, atteignable, réaliste, temporel) — 1 paragraphe clair
2. AMORCE / ENGAGE (5-10 min)
   → Brise-glace OU problème réel OU lien avec vécu élève
   → Captiver AVANT d'enseigner
3. PRÉSENTATION PROGRESSIVE (mode Bruner)
   → Énactif : exemple concret, manipulation, situation réelle
   → Iconique : schéma SVG, tableau, image, graphique
   → Symbolique : règle, formule, concept abstrait
4. PRATIQUE (varier les formes)
   → Guidée : enseignant accompagne les premiers exercices
   → En groupe : activité collaborative avec rôles définis
   → Autonome : travail individuel de vérification
5. CLÔTURE + DÉFI
   → Synthèse PARTICIPATIVE (élèves résument, pas l'enseignant)
   → Lien avec la prochaine leçon
   → Défi ou question pour la maison

MISE EN FORME OBLIGATOIRE :
- Utilise des titres H1 pour les grandes parties
- Utilise des titres H2 pour les sous-parties
- Utilise des callouts colorés pour :
  <callout type='intention'> pour les objectifs
  <callout type='exemple'> pour les exemples concrets
  <callout type='activite'> pour les activités de groupe
  <callout type='exercice'> pour les exercices
  <callout type='formule'> pour les formules/calculs
  <callout type='important'> pour les points clés
- Crée des tableaux HTML colorés pour les comparaisons
- Insère <schema-svg id='[id]'/> aux endroits appropriés
- Chaque tableau doit avoir des en-têtes colorés
- Le contenu doit être RICHE, DÉTAILLÉ et COMPLET (pas un squelette — une vraie leçon prête à enseigner)
${ressourcesListe.length > 0 ? `
RESSOURCES DE L'ENSEIGNANT :
Intègre ces ressources dans la leçon :
${ressourcesListe.join('\n')}` : ''}

PROFIL PÉDAGOGIQUE :
Style : ${profil_ia?.style_peda || 'explicite'}
Ton : ${profil_ia?.ton_ia || 'professionnel'}
Instructions : ${profil_ia?.instructions_perso || 'Aucune instruction personnalisée'}`
      : `

You are an expert teacher generating complete, rich, visually attractive lessons.

${planJson ? `MANDATORY LESSON STRUCTURE :
Follow EXACTLY this lesson plan:
${planJson}` : ''}

PEDAGOGICAL MODEL :
1. SMART OBJECTIVES (specific, measurable, achievable, realistic, time-bound)
2. HOOK / ENGAGE (5-10 min) — real problem or student experience connection
3. PROGRESSIVE PRESENTATION (Bruner model) — Enactive → Iconic → Symbolic
4. PRACTICE — Guided → Collaborative → Autonomous
5. CLOSURE + CHALLENGE — Participatory summary, link to next lesson

MANDATORY FORMATTING :
- H1 for main sections, H2 for sub-sections
- Colorful callouts: <callout type='intention'|'exemple'|'activite'|'exercice'|'formule'|'important'>
- HTML tables with colored headers for comparisons
- schema-svg tags at pedagogically relevant points
- RICH, DETAILED, COMPLETE content (not a skeleton — a real ready-to-teach lesson)
${ressourcesListe.length > 0 ? `\nTEACHER RESOURCES:\n${ressourcesListe.join('\n')}` : ''}

PEDAGOGICAL PROFILE :
Style: ${profil_ia?.style_peda || 'explicit'}
Tone: ${profil_ia?.ton_ia || 'professional'}
Instructions: ${profil_ia?.instructions_perso || 'None'}`) : ''

    const systemPrompt = isFr
      ? `Tu es un assistant pédagogique expert pour enseignants. Tu génères du contenu pédagogique de qualité, pratique et directement utilisable en classe.
${styleLabel} ${tonLabel}
${inclusionLabel} ${evalLabel} ${autochtoneLabel}
${instructionsPerso}${methodesSection}${gabaritSection}${schemaInstructions}${differenciationPrompt}${leconCompleteSection}${typeSpecificPrompt}${memoireSection}
Tu ne reçois jamais de données nominatives d'élèves. Réponds toujours en français. Sois concret et structuré.`
      : `You are an expert pedagogical assistant for educators. You generate high-quality, practical instructional content.
${styleLabel} ${tonLabel}
${inclusionLabel} ${evalLabel} ${autochtoneLabel}
${instructionsPerso}${methodesSection}${gabaritSection}${schemaInstructions}${differenciationPrompt}${leconCompleteSection}${typeSpecificPrompt}${memoireSection}
Always respond in English. Be concrete and structured.`

    // ── Build user prompt ────────────────────────────────────────────────────
    const typeLabels: Record<string, string> = {
      fiche_lecon:       isFr ? 'une fiche de leçon complète AVANT / PENDANT / APRÈS' : 'a complete lesson plan Hook / During / After',
      lecon_complete:    isFr ? 'une leçon complète AVANT / PENDANT / APRÈS richement illustrée' : 'a complete lesson BEFORE / DURING / AFTER richly illustrated',
      quiz:              isFr ? 'un quiz de 10 questions avec corrigé' : 'a 10-question quiz with answer key',
      evaluation:        isFr ? 'une grille d\'évaluation avec critères et niveaux' : 'an assessment rubric with criteria and levels',
      differentiation:   isFr ? 'des stratégies de différenciation pédagogique' : 'pedagogical differentiation strategies',
      activite:          isFr ? 'une activité inclusive pour tous les profils d\'apprenants' : 'an inclusive activity for all learner profiles',
      plan_cours:        isFr ? 'un plan de cours structuré' : 'a structured course plan',
      communication:     isFr ? 'un message professionnel école-famille' : 'a professional school-family message',
      note_automatique:  isFr ? 'une note pédagogique rapide pour l\'enseignant' : 'a quick pedagogical note for the teacher',
      email_parents:     isFr ? 'un email professionnel et bienveillant pour les familles' : 'a professional, caring email for families',
      courrier_officiel: isFr ? 'un courrier officiel selon les standards canadiens' : 'an official letter per Canadian standards',
      rapport_eleve:     isFr ? 'un rapport de progression élève bienveillant et constructif' : 'a caring, constructive student progress report',
      image_pedagogique: isFr ? 'une description détaillée de visuel pédagogique' : 'a detailed pedagogical visual description',
      image_peda:        isFr ? 'une description détaillée de visuel pédagogique' : 'a detailed pedagogical visual description',
      script_video:      isFr ? 'un script de capsule vidéo pédagogique' : 'a pedagogical video capsule script',
      compte_rendu:      isFr ? 'un compte-rendu structuré de réunion' : 'a structured meeting summary',
    }

    const classeCtx = contexte?.classe
      ? (isFr
          ? `- Matière : ${contexte.classe.matiere || 'non spécifiée'}\n- Niveau : ${contexte.classe.niveau || 'non spécifié'}\n- Nombre d'élèves : ${contexte.classe.nombre_eleves || profil_ia?.groupes_typiques || 'non spécifié'}`
          : `- Subject: ${contexte.classe.matiere || 'unspecified'}\n- Level: ${contexte.classe.niveau || 'unspecified'}\n- Students: ${contexte.classe.nombre_eleves || profil_ia?.groupes_typiques || 'unspecified'}`)
      : (isFr ? '- Classe non spécifiée' : '- Class not specified')

    const dureeEffective = duree || profil_ia?.duree_typique || 75

    const userPrompt = instructions
      ? `${instructions}\n\nSujet : ${sujet}\n\nContexte :\n${classeCtx}`
      : (isFr
          ? `Génère ${typeLabels[type_contenu] || 'du contenu pédagogique'} sur : "${sujet}".\n\nContexte :\n${classeCtx}\n\nDurée : ${dureeEffective} minutes${adapter_besoins ? '\n\nInclure des adaptations pour élèves à besoins particuliers (dyslexie, TDAH, allophone).' : ''}\n\nGénère un contenu complet, structuré et directement utilisable.`
          : `Generate ${typeLabels[type_contenu] || 'pedagogical content'} on: "${sujet}".\n\nContext:\n${classeCtx}\n\nDuration: ${dureeEffective} minutes${adapter_besoins ? '\n\nInclude adaptations for students with special needs.' : ''}\n\nGenerate complete, structured and ready-to-use content.`)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: isLeconCompleteStrict ? 6000 : 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0].type === 'text'
      ? message.content[0].text
      : 'Erreur lors de la génération'

    // Parser le marqueur de différenciation
    const SEPARATOR = '=== VERSION DIFFÉRENCIÉE ==='
    let version_normale = raw
    let version_differenciee: string | null = null
    if (raw.includes(SEPARATOR)) {
      const parts = raw.split(SEPARATOR)
      version_normale = parts[0].trim()
      version_differenciee = parts[1]?.trim() || null
    }

    // ── BLOC 13 — Tâche auto après génération leçon ───────────────────────────
    if (['lecon_complete', 'fiche_lecon'].includes(type_contenu || '') && !raw.startsWith('⚠')) {
      try {
        const supabaseServer = await createClient()
        const { data: { session } } = await supabaseServer.auth.getSession()
        if (session) {
          const { data: userProfil } = await supabaseServer
            .from('utilisateurs').select('id').eq('user_id', session.user.id).single()
          if (userProfil?.id) {
            const datePrevue = body.date_prevue as string | undefined
            const dateEcheance = datePrevue
              ? new Date(new Date(datePrevue).getTime() - 86400000).toISOString().split('T')[0]
              : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            await supabaseServer.from('taches_enseignant').insert({
              enseignant_id: userProfil.id,
              titre:         `Réviser la leçon : ${sujet}`,
              type:          'preparer_lecon',
              date_echeance: dateEcheance,
              auto_generee:  true,
              est_complete:  false,
            } as any)
          }
        }
      } catch { /* non-bloquant */ }
    }

    return NextResponse.json({ contenu: raw, version_normale, version_differenciee })

  } catch (error: any) {
    console.error('Erreur API Anthropic:', error)
    const msg = error?.status === 401
      ? 'Clé API invalide. Vérifiez ANTHROPIC_API_KEY dans .env.local.'
      : error?.status === 429
      ? 'Limite de taux atteinte. Réessayez dans un instant.'
      : error?.message || 'Erreur serveur'
    return NextResponse.json({ contenu: `⚠️ ${msg}` }, { status: 200 })
  }
}
