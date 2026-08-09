// ── Mission Engine — Student Provider (ME-09) ────────────────────────────────
//
// Charge les données élèves depuis Supabase.
//
// État ME-09 :
//   loadStudents()    → RÉEL  (table `eleves` existe)
//   loadAttendance()  → STUB  (table non disponible)
//   loadResults()     → STUB  (table non disponible)
//   loadStudentWork() → STUB  (table non disponible)

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  StudentSnapshot,
  StudentAttendanceSnapshot,
  StudentResultSnapshot,
  StudentWorkSnapshot,
} from '../types'

interface StudentProviderDeps {
  supabase: SupabaseClient
}

export class StudentProvider {
  private supabase: SupabaseClient

  constructor({ supabase }: StudentProviderDeps) {
    this.supabase = supabase
  }

  async loadStudents(classeId: string): Promise<StudentSnapshot[]> {
    const { data, error } = await this.supabase
      .from('eleves')
      .select('id, prenom, nom, classe_id, actif, profil_type, besoins')
      .eq('classe_id', classeId)
      .eq('actif', true)
      .order('nom', { ascending: true })

    if (error || !data) return []

    return data.map((row: {
      id: string
      prenom: string | null
      nom: string | null
      classe_id: string
      actif: boolean
      profil_type?: string | null
      besoins?: string[] | null
    }) => {
      const firstName = row.prenom ?? null
      const lastName  = row.nom ?? null
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || `Élève ${row.id.slice(0, 6)}`

      return {
        id:          row.id,
        firstName,
        lastName,
        displayName,
        classeId:    row.classe_id,
        active:      row.actif,
        profilType:  row.profil_type ?? undefined,
        besoins:     row.besoins ?? undefined,
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadAttendance(_classeId: string): Promise<StudentAttendanceSnapshot[]> {
    // Table de présences non disponible en ME-09 — stub vide
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadResults(_classeId: string): Promise<StudentResultSnapshot[]> {
    // Table de résultats non disponible en ME-09 — stub vide
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadStudentWork(_classeId: string): Promise<StudentWorkSnapshot[]> {
    // Table de travaux élèves non disponible en ME-09 — stub vide
    return []
  }
}
