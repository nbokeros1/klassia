// ── Mission Engine — Mission Data Provider ──────────────────────────────────
//
// Porte d'entrée unique des données métier pour le Mission Engine.
// Orchestre les providers spécialisés et valide le contexte avant chargement.
// Le moteur et les détecteurs ne lisent jamais Supabase directement.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MissionDataContext } from '../types'
import { MissionDataError }    from '../types'
import { DocumentsProvider }   from './documents-provider'
import { PlanningProvider }    from './planning-provider'
import { HistoryProvider }     from './history-provider'
import { CalendarProvider }    from './calendar-provider'
import { StudentProvider }     from './student-provider'

interface MissionDataProviderDeps {
  supabase: SupabaseClient
}

export class MissionDataProvider {
  private supabase:  SupabaseClient
  private documents: DocumentsProvider
  private planning:  PlanningProvider
  private history:   HistoryProvider
  private calendar:  CalendarProvider
  private students:  StudentProvider

  constructor({ supabase }: MissionDataProviderDeps) {
    this.supabase  = supabase
    this.documents = new DocumentsProvider({ supabase })
    this.planning  = new PlanningProvider({ supabase })
    this.history   = new HistoryProvider({ supabase })
    this.calendar  = new CalendarProvider({ supabase })
    this.students  = new StudentProvider({ supabase })
  }

  /**
   * Charge l'ensemble du contexte métier nécessaire au Mission Engine.
   * Valide la propriété de la classe avant tout chargement documentaire.
   *
   * @throws {MissionDataError} INVALID_CONTEXT si les IDs sont absents
   * @throws {MissionDataError} ENSEIGNANT_NOT_FOUND si le profil est introuvable
   * @throws {MissionDataError} CLASSE_NOT_FOUND si la classe est introuvable
   * @throws {MissionDataError} CLASSE_FORBIDDEN si la classe n'appartient pas à l'enseignant
   */
  async loadMissionContext(
    enseignantId: string,
    classeId:     string,
    matiere:      string | null,
  ): Promise<MissionDataContext> {
    if (!enseignantId || !classeId) {
      throw new MissionDataError(
        'INVALID_CONTEXT',
        'enseignantId et classeId sont requis',
      )
    }

    // Charger et valider enseignant + classe (PlanningProvider vérifie la propriété)
    const [enseignant, classe] = await Promise.all([
      this.planning.loadEnseignant(enseignantId),
      this.planning.loadClasse(enseignantId, classeId),
    ])

    // Résoudre la matière active : paramètre explicite ou matière principale de la classe
    const matiereActive = matiere ?? classe.matiere

    const today = new Date()

    // Charger tout le reste en parallèle (documents + élèves + calendrier + statuts)
    const [
      programmeAnnuel,
      curriculum,
      dernieresLecons,
      dernieresEvaluations,
      ressources,
      travaux,
      conversationIA,
      calendarEvents,
      calendarDeadlines,
      students,
      attendance,
      studentResults,
      studentWork,
      leconsStatutsData,
    ] = await Promise.all([
      this.documents.loadProgrammeAnnuel(enseignantId, classeId, matiereActive),
      this.documents.loadCurriculum(enseignantId, classeId, matiereActive),
      this.documents.loadDernieresLecons(enseignantId, classeId, matiereActive),
      this.documents.loadDernieresEvaluations(enseignantId, classeId, matiereActive),
      this.documents.loadRessources(enseignantId, classeId, matiereActive),
      this.documents.loadTravaux(enseignantId, classeId, matiereActive),
      this.history.loadConversation(enseignantId, classeId),
      this.calendar.loadEvents(enseignantId, classeId, matiereActive),
      this.calendar.loadDeadlines(enseignantId, classeId, matiereActive, today),
      this.students.loadStudents(classeId),
      this.students.loadAttendance(classeId),
      this.students.loadResults(classeId),
      this.students.loadStudentWork(classeId),
      // Compteurs de leçons par statut (BETA-07)
      (async (): Promise<Record<string, number>> => {
        try {
          const { data } = await this.supabase
            .from('lecons').select('statut')
            .eq('classe_id', classeId).eq('enseignant_id', enseignantId)
          const counts: Record<string, number> = {}
          for (const l of ((data as { statut: string }[] | null) ?? [])) {
            counts[l.statut] = (counts[l.statut] ?? 0) + 1
          }
          return counts
        } catch { return {} }
      })(),
    ])

    const leconsParStatut = leconsStatutsData as Record<string, number>

    return {
      enseignant,
      classe,
      matiere:          matiereActive,
      programmeAnnuel,
      curriculum,
      dernieresLecons,
      dernieresEvaluations,
      ressources,
      travaux,
      students,
      attendance,
      studentResults,
      studentWork,
      conversationIA,
      dateCourante:     today,
      calendarEvents,
      calendarDeadlines,
      leconsParStatut,
    }
  }
}
