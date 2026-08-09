// ── Mission Engine — Planning Provider ────────────────────────────────────
//
// Charge les données de planification : profil enseignant + classe active.
// Valide aussi que la classe appartient bien à l'enseignant (protection CLASSE_FORBIDDEN).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EnseignantSnapshot, ClasseSnapshot } from '../types'
import { MissionDataError } from '../types'

interface PlanningProviderDeps {
  supabase: SupabaseClient
}

export class PlanningProvider {
  private supabase: SupabaseClient

  constructor({ supabase }: PlanningProviderDeps) {
    this.supabase = supabase
  }

  async loadEnseignant(enseignantId: string): Promise<EnseignantSnapshot> {
    const { data, error } = await this.supabase
      .from('utilisateurs')
      .select('id, prenom, nom, province, langue')
      .eq('id', enseignantId)
      .single()

    if (error || !data) {
      throw new MissionDataError(
        'ENSEIGNANT_NOT_FOUND',
        `Enseignant ${enseignantId} introuvable`,
      )
    }

    return {
      id:       data.id as string,
      prenom:   data.prenom as string,
      nom:      data.nom as string,
      province: (data.province as string | null) ?? null,
      langue:   (data.langue as string) ?? 'fr',
    }
  }

  async loadClasse(enseignantId: string, classeId: string): Promise<ClasseSnapshot> {
    const { data, error } = await this.supabase
      .from('classes')
      .select('id, nom, niveau, matiere, matieres, enseignant_id')
      .eq('id', classeId)
      .single()

    if (error || !data) {
      throw new MissionDataError(
        'CLASSE_NOT_FOUND',
        `Classe ${classeId} introuvable`,
      )
    }

    if ((data.enseignant_id as string) !== enseignantId) {
      throw new MissionDataError(
        'CLASSE_FORBIDDEN',
        `Accès interdit à la classe ${classeId}`,
      )
    }

    return {
      id:       data.id as string,
      nom:      data.nom as string,
      niveau:   (data.niveau as string | null) ?? null,
      matiere:  (data.matiere as string | null) ?? null,
      matieres: (data.matieres as string[] | null) ?? [],
    }
  }
}
