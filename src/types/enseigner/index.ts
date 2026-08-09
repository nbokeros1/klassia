// ─── KlassIA+ — Types module Enseigner ────────────────────────────────────────
// SC-03C / SC-03D objects métier

export type ActivityType =
  | 'amorce'
  | 'modelisation'
  | 'pratique_guidee'
  | 'pratique_autonome'
  | 'cloture'
  | 'billet'
  | 'libre'

export type ActivityState =
  | 'prevue'
  | 'prete'
  | 'en_cours'
  | 'pausee'
  | 'terminee'
  | 'ignoree'    // ⏩ skippée volontairement pendant le cours
  | 'reportee'
  | 'annulee'

export type SessionState =
  | 'idle'      // avant démarrage (briefing)
  | 'active'    // cours en cours
  | 'paused'    // pause
  | 'panic'     // imprévu / mode panique
  | 'closing'   // dialogue de fin
  | 'done'      // terminé, synthèse prête

export type NoteTag = 'cours' | 'eleve' | 'action' | 'question'

export interface TeachingActivity {
  id: string
  type: ActivityType
  titre: string
  phase: 'avant' | 'pendant' | 'apres' | 'libre'
  emoji: string
  contenu: string            // markdown
  objectif: string           // objectif spécifique à cette activité
  support: string | null     // référence ressource / document
  duree_prevue: number       // minutes
  duree_reelle: number | null // minutes — calculé à la complétion
  etat: ActivityState
  ordre: number
  started_at: number | null  // timestamp ms
  ended_at: number | null    // timestamp ms
}

export interface QuickNote {
  id: string
  texte: string
  tag: NoteTag
  priorite: 'normale' | 'importante'
  activite_id: string | null
  timestamp: number
}

export interface IASuggestion {
  id: string
  source: 'time' | 'memory' | 'panic'
  texte: string
  etat: 'visible' | 'acceptee' | 'refusee'
  emise_at: number
}

export interface TeachingSessionMeta {
  lecon_id: string
  lecon_titre: string
  classe_nom: string
  matiere: string
  date: string
  duree_prevue: number   // minutes total
  objectifs: string
}
