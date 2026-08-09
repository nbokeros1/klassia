// ── Mission Engine — Documents Provider ────────────────────────────────────
//
// Charge les documents pédagogiques depuis Supabase (lecture seule).
// Stratégie : dossiers_systeme → fichiers_dossier → fichiers_indexation (3 requêtes).
// Le filtre matière est appliqué côté JavaScript pour éviter les edge cases
// de l'opérateur .or() avec des valeurs contenant des caractères spéciaux.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DocumentSnapshot } from '../types'

interface DocumentsProviderDeps {
  supabase: SupabaseClient
}

interface DossierRow {
  id:      string
  type:    string
  matiere: string | null
}

interface FichierRow {
  id:          string
  nom:         string
  type_fichier: string | null
  contenu_html: string | null
  created_at:  string
  dossier_id:  string
}

interface IndexRow {
  fichier_id:   string
  texte_extrait: string
}

export class DocumentsProvider {
  private supabase: SupabaseClient

  constructor({ supabase }: DocumentsProviderDeps) {
    this.supabase = supabase
  }

  // ── Requête mutualisée ──────────────────────────────────────────────────────

  private async queryDocuments(params: {
    enseignantId:  string
    classeId:      string
    matiere:       string | null
    dossierTypes:  string[]
    fichiersTypes: string[]
    limite:        number
  }): Promise<DocumentSnapshot[]> {
    const { enseignantId, classeId, matiere, dossierTypes, fichiersTypes, limite } = params

    // 1. Trouver les dossiers pertinents pour cette classe
    const { data: rawDossiers } = await this.supabase
      .from('dossiers_systeme')
      .select('id, type, matiere')
      .eq('classe_id', classeId)
      .in('type', dossierTypes)

    const allDossiers = (rawDossiers ?? []) as DossierRow[]

    // Filtre matière côté JS : inclure les dossiers sans matière (rétrocompatibilité
    // classes mono-matière) et ceux affectés à la matière active
    const dossiers = matiere
      ? allDossiers.filter(d => d.matiere === matiere || d.matiere === null)
      : allDossiers

    if (dossiers.length === 0) return []

    const dossierIds  = dossiers.map(d => d.id)
    const dossierMap  = new Map<string, DossierRow>(dossiers.map(d => [d.id, d]))

    // 2. Fichiers dans ces dossiers (triés par date de création décroissante)
    const { data: rawFichiers } = await this.supabase
      .from('fichiers_dossier')
      .select('id, nom, type_fichier, contenu_html, created_at, dossier_id')
      .in('dossier_id', dossierIds)
      .eq('enseignant_id', enseignantId)
      .eq('classe_id', classeId)
      .in('type_fichier', fichiersTypes)
      .order('created_at', { ascending: false })
      .limit(limite)

    const fichiers = (rawFichiers ?? []) as FichierRow[]
    if (fichiers.length === 0) return []

    // 3. Texte extrait (indexation)
    const fichierIds = fichiers.map(f => f.id)
    const { data: rawIndex } = await this.supabase
      .from('fichiers_indexation')
      .select('fichier_id, texte_extrait')
      .in('fichier_id', fichierIds)
      .eq('statut', 'indexe')
      .not('texte_extrait', 'is', null)

    const indexMap = new Map<string, string>(
      ((rawIndex ?? []) as IndexRow[]).map(i => [i.fichier_id, i.texte_extrait]),
    )

    return fichiers.map(f => {
      const dossier = dossierMap.get(f.dossier_id)
      return {
        id:           f.id,
        nom:          f.nom,
        type_fichier: f.type_fichier ?? 'autre',
        texteExtrait: indexMap.get(f.id) ?? null,
        createdAt:    new Date(f.created_at),
        dossierType:  dossier?.type,
        matiere:      dossier?.matiere ?? null,
        contenuHtml:  f.contenu_html ?? null,
      }
    })
  }

  // ── API publique ────────────────────────────────────────────────────────────

  async loadProgrammeAnnuel(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<DocumentSnapshot | null> {
    const docs = await this.queryDocuments({
      enseignantId,
      classeId,
      matiere,
      dossierTypes:  ['plan_annuel'],
      fichiersTypes: ['plan_annuel'],
      limite:        1,
    })
    return docs[0] ?? null
  }

  async loadCurriculum(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<DocumentSnapshot | null> {
    const docs = await this.queryDocuments({
      enseignantId,
      classeId,
      matiere,
      dossierTypes:  ['curriculum'],
      fichiersTypes: ['curriculum'],
      limite:        1,
    })
    return docs[0] ?? null
  }

  async loadDernieresLecons(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<DocumentSnapshot[]> {
    return this.queryDocuments({
      enseignantId,
      classeId,
      matiere,
      dossierTypes:  ['plans_lecons', 'lecons'],
      fichiersTypes: ['plan_lecon', 'lecon_complete'],
      limite:        5,
    })
  }

  async loadDernieresEvaluations(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<DocumentSnapshot[]> {
    return this.queryDocuments({
      enseignantId,
      classeId,
      matiere,
      dossierTypes:  ['evaluations_sommatives'],
      fichiersTypes: ['evaluation_sommative'],
      limite:        3,
    })
  }

  async loadRessources(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<DocumentSnapshot[]> {
    return this.queryDocuments({
      enseignantId,
      classeId,
      matiere,
      dossierTypes:  ['ressources'],
      fichiersTypes: ['ressource', 'document', 'pdf'],
      limite:        5,
    })
  }

  async loadTravaux(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<DocumentSnapshot[]> {
    return this.queryDocuments({
      enseignantId,
      classeId,
      matiere,
      dossierTypes:  ['travaux', 'devoirs'],
      fichiersTypes: ['travail', 'devoir', 'exercice', 'projet'],
      limite:        10,
    })
  }
}
