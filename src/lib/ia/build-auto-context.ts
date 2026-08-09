// ── Automatic Context Engine (DCE-05) ──────────────────────────────────────
//
// Sélectionne automatiquement des documents ScorgIA pertinents selon le type
// de mission. La sélection est basée sur le TYPE DE DOSSIER (structure sémantique)
// et non sur type_fichier, pour couvrir à la fois docs générés et uploadés.
//
// Pas de PKE, pas de RAG, pas d'embeddings — sélection statique par dossier + récence.
// Priorité globale : 1. Docs manuels (DCE-04)  2. Docs automatiques (ce module)
//
// TYPES RÉELS : `dossiers_systeme.type` (migration 015 CHECK) et
// `fichiers_dossier.type_fichier` (migration 012 CHECK) — toute valeur absente
// de ces contraintes ne peut exister en base et ne doit pas être ciblée.

import type { DocContextInput } from './build-document-context'

export type MissionType =
  | 'generation_lecon'
  | 'generation_evaluation'
  | 'generation_activite'
  | 'correction'
  | 'synthese'
  | 'autre'

interface CategorieConfig {
  id:           string    // identifiant unique dans la mission
  dossierTypes: string[]  // valeurs de dossiers_systeme.type (migration 015)
  limite:       number    // max docs dans cette catégorie
  maxChars:     number    // budget chars total pour la catégorie
}

// Budget par catégorie (~4 chars/token) :
// curriculum ≈ 1 800t, plan_annuel ≈ 1 500t, leçons ≈ 2 500t,
// évaluations ≈ 1 000t, ressources ≈ 1 200t → total auto max ≈ 8 000 tokens
const CATEGORIES_PAR_MISSION: Record<MissionType, CategorieConfig[]> = {
  generation_lecon: [
    { id: 'curriculum',  dossierTypes: ['curriculum'],             limite: 1, maxChars: 7_200  },
    { id: 'plan_annuel', dossierTypes: ['plan_annuel'],            limite: 1, maxChars: 6_000  },
    { id: 'lecons',      dossierTypes: ['plans_lecons', 'lecons'], limite: 3, maxChars: 10_000 },
    { id: 'ressources',  dossierTypes: ['ressources'],             limite: 3, maxChars: 4_800  },
  ],
  generation_evaluation: [
    { id: 'curriculum',  dossierTypes: ['curriculum'],              limite: 1, maxChars: 7_200 },
    { id: 'plan_annuel', dossierTypes: ['plan_annuel'],             limite: 1, maxChars: 6_000 },
    { id: 'evaluations', dossierTypes: ['evaluations_sommatives'],  limite: 2, maxChars: 4_000 },
    { id: 'ressources',  dossierTypes: ['ressources'],              limite: 3, maxChars: 4_800 },
  ],
  generation_activite: [
    { id: 'curriculum',  dossierTypes: ['curriculum'],             limite: 1, maxChars: 7_200  },
    { id: 'lecons',      dossierTypes: ['plans_lecons', 'lecons'], limite: 3, maxChars: 10_000 },
    { id: 'ressources',  dossierTypes: ['ressources'],             limite: 3, maxChars: 4_800  },
  ],
  correction: [
    { id: 'curriculum',  dossierTypes: ['curriculum'],             limite: 1, maxChars: 7_200 },
    { id: 'evaluations', dossierTypes: ['evaluations_sommatives'], limite: 2, maxChars: 4_000 },
  ],
  synthese: [
    { id: 'curriculum',  dossierTypes: ['curriculum'],             limite: 1, maxChars: 7_200  },
    { id: 'plan_annuel', dossierTypes: ['plan_annuel'],            limite: 1, maxChars: 6_000  },
    { id: 'lecons',      dossierTypes: ['plans_lecons', 'lecons'], limite: 3, maxChars: 10_000 },
  ],
  autre: [
    { id: 'curriculum',  dossierTypes: ['curriculum'],             limite: 1, maxChars: 7_200 },
  ],
}

// Types de fichier avec contenu extractible — valeurs réelles de la contrainte
// CHECK fichiers_dossier_type_fichier_check (migration 012).
// Exclut : 'image', 'video', 'audio' (pas de texte extractible).
const TYPES_TEXTE_EXTRACTIBLE = [
  'curriculum', 'plan_annuel', 'plan_lecon', 'lecon_complete',
  'activite', 'devoir', 'quiz', 'evaluation_sommative', 'ressource',
  'communication', 'courrier', 'rapport', 'note', 'autre', 'document', 'pdf',
]

export function detecterMission(typeContenu: string): MissionType {
  switch (typeContenu) {
    case 'plan_lecon':
    case 'lecon_complete':
    case 'fiche_lecon':   // type_contenu possible côté client mais jamais en DB
      return 'generation_lecon'
    case 'evaluation':    // type_contenu → type_fichier='evaluation_sommative' via TYPE_VERS_FICHIER
    case 'quiz':
      return 'generation_evaluation'
    case 'activite':
      return 'generation_activite'
    case 'curriculum':
    case 'plan_annuel':
      return 'synthese'
    default:
      return 'autre'
  }
}

function truncerAutoDoc(texte: string, max: number): string {
  if (texte.length <= max) return texte
  const extrait     = texte.substring(0, max).trimEnd()
  const dernierSaut = extrait.lastIndexOf('\n')
  return dernierSaut > extrait.length * 0.7
    ? extrait.substring(0, dernierSaut)
    : extrait
}

export interface AutoContextDoc {
  fichier_id:   string
  nom:          string
  type_fichier: string
}

export interface AutoContextResult {
  docs:               DocContextInput[]
  docs_auto_utilises: AutoContextDoc[]
  mission:            MissionType
}

export async function buildAutoContext(params: {
  supabase:     any
  enseignantId: string
  classeId:     string | undefined
  matiere:      string | null
  matieres:     string[]       // classes.matieres — pour détecter les classes multi-matières
  classeNom:    string
  typeContenu:  string
  excludeIds:   string[]       // fichier_ids déjà sélectionnés manuellement (DCE-04)
}): Promise<AutoContextResult> {
  const {
    supabase, enseignantId, classeId, matiere, matieres,
    classeNom, typeContenu, excludeIds,
  } = params

  const mission      = detecterMission(typeContenu)
  const categories   = CATEGORIES_PAR_MISSION[mission]
  const emptyResult: AutoContextResult = { docs: [], docs_auto_utilises: [], mission }

  if (!classeId) return emptyResult

  // ── Isolation multi-matière ───────────────────────────────────────────────
  // Pour une classe multi-matières, une matière active DOIT être fournie.
  // Sans elle, on risque d'injecter le contenu d'une autre matière.
  // On ne tombe PAS en défaut sur la "première matière disponible".
  const isMultiMatiere = matieres.length > 1
  if (isMultiMatiere && !matiere) return emptyResult

  const allDossierTypes = [...new Set(categories.flatMap(c => c.dossierTypes))]

  // ── Batch 1 : dossiers sémantiques de la classe ───────────────────────────
  // Filtrage par type (structure sémantique) — sécurité enseignant_id via RLS
  const { data: dossiersData } = await supabase
    .from('dossiers_systeme')
    .select('id, nom, matiere, type')
    .eq('classe_id', classeId)
    .in('type', allDossierTypes)

  if (!dossiersData?.length) return emptyResult

  // Filtre matière : garder les dossiers de la matière active + dossiers non assignés
  // (les dossiers pédagogiques portent `matiere` ; les communs ont matiere=null)
  const dossiersFiltered: any[] = matiere
    ? dossiersData.filter((d: any) => !d.matiere || d.matiere === matiere)
    : dossiersData

  if (!dossiersFiltered.length) return emptyResult

  const dossierMap = new Map<string, any>(dossiersData.map((d: any) => [d.id as string, d]))

  // Map dossier_id → CategorieConfig (assignation sémantique)
  const dossierToCat = new Map<string, CategorieConfig>()
  for (const cat of categories) {
    for (const d of dossiersFiltered) {
      if (cat.dossierTypes.includes(d.type) && !dossierToCat.has(d.id)) {
        dossierToCat.set(d.id, cat)
      }
    }
  }

  const relevantDossierIds = [...dossierToCat.keys()]
  if (!relevantDossierIds.length) return emptyResult

  // ── Batch 2 : fichiers avec contenu texte dans les dossiers ciblés ────────
  // type_fichier filtré sur TYPES_TEXTE_EXTRACTIBLE — exclut image/video/audio.
  // enseignant_id + classe_id = double vérification applicative (RLS en couche 3).
  const { data: fichiersData } = await supabase
    .from('fichiers_dossier')
    .select('id, nom, type_fichier, dossier_id, created_at')
    .in('dossier_id', relevantDossierIds)
    .eq('enseignant_id', enseignantId)
    .eq('classe_id', classeId)
    .in('type_fichier', TYPES_TEXTE_EXTRACTIBLE)
    .order('created_at', { ascending: false })

  if (!fichiersData?.length) return emptyResult

  const excludeSet        = new Set(excludeIds)
  const fichiersEligibles = (fichiersData as any[]).filter((f: any) => !excludeSet.has(f.id))
  if (!fichiersEligibles.length) return emptyResult

  // ── Batch 3 : indexation (statut=indexe, texte non null) ─────────────────
  const fichierIds = fichiersEligibles.map((f: any) => f.id as string)
  const { data: idxData } = await supabase
    .from('fichiers_indexation')
    .select('fichier_id, texte_extrait')
    .in('fichier_id', fichierIds)
    .eq('statut', 'indexe')
    .not('texte_extrait', 'is', null)

  const idxMap = new Map<string, string>(
    (idxData || []).map((i: any): [string, string] => [
      i.fichier_id as string,
      i.texte_extrait as string,
    ])
  )

  // ── Sélection par catégorie (ordre défini par CATEGORIES_PAR_MISSION) ─────
  const docs:               DocContextInput[] = []
  const docs_auto_utilises: AutoContextDoc[]  = []
  const usedIds             = new Set<string>()
  const catCompteurs        = new Map<string, number>(categories.map(c => [c.id, 0]))

  for (const categorie of categories) {
    // Budget réparti équitablement entre les docs de la catégorie, plafonné à 7 200 chars
    const maxParDoc = Math.min(Math.floor(categorie.maxChars / categorie.limite), 7_200)

    const candidats = fichiersEligibles.filter((f: any) => {
      const cat = dossierToCat.get(f.dossier_id)
      return cat?.id === categorie.id && !usedIds.has(f.id)
    })

    for (const fichier of candidats) {
      if ((catCompteurs.get(categorie.id) ?? 0) >= categorie.limite) break

      const texte = idxMap.get(fichier.id)
      if (!texte) continue

      const texte_extrait = truncerAutoDoc(texte, maxParDoc)
      if (!texte_extrait) continue

      const dossier = dossierMap.get(fichier.dossier_id) as any

      docs.push({
        fichier_id:    fichier.id,
        nom:           fichier.nom          || '',
        type_fichier:  fichier.type_fichier || '',
        classe_nom:    classeNom,
        matiere:       dossier?.matiere     || matiere || null,
        dossier_nom:   dossier?.nom         || '',
        texte_extrait,
      })

      docs_auto_utilises.push({
        fichier_id:   fichier.id,
        nom:          fichier.nom          || '',
        type_fichier: fichier.type_fichier || '',
      })

      usedIds.add(fichier.id)
      catCompteurs.set(categorie.id, (catCompteurs.get(categorie.id) ?? 0) + 1)
    }
  }

  // ── Batch 4 : leçons structurées (contenu_json) ───────────────────────────
  // Uniquement pour les missions de génération de leçon / activité.
  // Fournit un contexte pédagogique riche et structuré (phases AVANT/PENDANT/APRÈS)
  // sans dépendre de l'indexation texte — source directe : lecons.contenu_json.
  const MISSIONS_AVEC_LECON_JSON: MissionType[] = ['generation_lecon', 'generation_activite', 'synthese']
  if (MISSIONS_AVEC_LECON_JSON.includes(mission)) {
    const { data: leconsData } = await supabase
      .from('lecons')
      .select('id, titre, statut, contenu_json')
      .eq('classe_id', classeId)
      .eq('enseignant_id', enseignantId)
      .not('contenu_json', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3)

    for (const lecon of (leconsData || [])) {
      if (!lecon.contenu_json) continue
      const c = lecon.contenu_json as Record<string, any>
      const lignes: string[] = [`--- Leçon précédente: ${lecon.titre || 'sans titre'} [${lecon.statut}] ---`]
      if (c.intention)               lignes.push(`Intention: ${c.intention}`)
      if (c.rag)                     lignes.push(`RAG: ${c.rag}`)
      if (c.ras)                     lignes.push(`RAS: ${c.ras}`)
      if (c.avant_amorce)            lignes.push(`AVANT (${c.avant_duree || '?'}min): ${c.avant_amorce}`)
      if (c.pendant_modelisation)    lignes.push(`PENDANT — Modélisation: ${c.pendant_modelisation}`)
      if (c.pendant_pratique_guidee) lignes.push(`PENDANT — Pratique guidée: ${c.pendant_pratique_guidee}`)
      if (c.apres_cloture)           lignes.push(`APRÈS (${c.apres_duree || '?'}min): ${c.apres_cloture}`)
      if (c.evaluation_formative)    lignes.push(`Évaluation formative: ${c.evaluation_formative}`)

      const texte_extrait = truncerAutoDoc(lignes.join('\n'), 2_000)
      if (texte_extrait.length < 50) continue

      docs.push({
        fichier_id:   `lecon_json_${lecon.id}`,
        nom:          `Leçon précédente : ${lecon.titre || 'sans titre'}`,
        type_fichier: 'plan_lecon',
        classe_nom:   classeNom,
        matiere:      matiere || null,
        dossier_nom:  'Leçons (structurées)',
        texte_extrait,
      })
    }
  }

  return { docs, docs_auto_utilises, mission }
}
