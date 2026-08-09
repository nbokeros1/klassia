// ── Document Context Engine — Construction du contexte documentaire (DCE-04) ──
//
// Reçoit des documents déjà validés et autorisés côté serveur.
// Construit un bloc texte structuré à injecter dans le prompt système.
// Applique un budget de tokens par document et global.

// ~4 caractères par token (contenu FR/mixte)
const MAX_CHARS_PAR_DOC = 7_200  // ≈ 1 800 tokens
const MAX_CHARS_TOTAL   = 24_000 // ≈ 6 000 tokens

export interface DocContextInput {
  fichier_id:    string
  nom:           string
  type_fichier:  string
  classe_nom:    string
  matiere:       string | null
  dossier_nom:   string
  texte_extrait: string
}

export interface ContexteDocumentaire {
  bloc:          string    // texte complet à injecter dans le prompt
  docs_utilises: string[]  // fichier_ids effectivement inclus
}

// Troncature propre : on préfère couper sur un saut de ligne plutôt qu'au milieu d'une phrase
function truncerProprement(texte: string, max: number): { texte: string; tronque: boolean } {
  if (texte.length <= max) return { texte, tronque: false }
  const extrait = texte.substring(0, max).trimEnd()
  const dernierSaut = extrait.lastIndexOf('\n')
  const coupe = dernierSaut > extrait.length * 0.7 ? extrait.substring(0, dernierSaut) : extrait
  return { texte: coupe, tronque: true }
}

export interface BuildDocContextOpts {
  maxCharsTotal?: number  // override du budget total (défaut: MAX_CHARS_TOTAL)
  maxCharsParDoc?: number // override du budget par doc  (défaut: MAX_CHARS_PAR_DOC)
}

export function buildDocumentContext(docs: DocContextInput[], opts?: BuildDocContextOpts): ContexteDocumentaire {
  if (docs.length === 0) return { bloc: '', docs_utilises: [] }

  const MAX_TOTAL = opts?.maxCharsTotal ?? MAX_CHARS_TOTAL
  const MAX_DOC   = opts?.maxCharsParDoc ?? MAX_CHARS_PAR_DOC

  const blocs:         string[] = []
  const docs_utilises: string[] = []
  let totalChars = 0

  for (let i = 0; i < docs.length; i++) {
    if (totalChars >= MAX_TOTAL) break
    const d = docs[i]

    const budget = Math.min(MAX_DOC, MAX_TOTAL - totalChars)
    const { texte, tronque } = truncerProprement(d.texte_extrait, budget)
    const contenu = tronque ? texte + '\n[… contenu tronqué pour respecter la limite de contexte]' : texte

    const lignes: string[] = [
      `=== DOCUMENT KLASSIA ${i + 1} ===`,
      `Nom : ${d.nom}`,
      `Type : ${d.type_fichier}`,
      `Classe : ${d.classe_nom}`,
      ...(d.matiere ? [`Matière : ${d.matiere}`] : []),
      `Dossier : ${d.dossier_nom}`,
      '',
      'Contenu :',
      contenu,
      '',
      `=== FIN DU DOCUMENT ===`,
    ]

    const bloc = lignes.join('\n')
    blocs.push(bloc)
    totalChars += bloc.length
    docs_utilises.push(d.fichier_id)
  }

  return {
    bloc:          blocs.join('\n\n'),
    docs_utilises,
  }
}
