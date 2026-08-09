// ─── KlassIA+ — Time Intelligence Engine types (SC-03G) ──────────────────────
// Moteur d'interprétation temporelle — prédit, compare, conseille

export interface ActivityTiming {
  activite_id:   string
  activite_titre: string
  duree_prevue:  number   // min
  duree_reelle:  number   // min (0 si pas encore terminée)
  variance:      number   // min (positif = avance, négatif = retard)
  started_at:    number | null
  ended_at:      number | null
  en_cours:      boolean
  elapsed_min:   number   // calculé live
}

export interface SessionTiming {
  duree_prevue_totale: number  // min
  duree_reelle_live:   number  // min elapsed so far (excl. pauses)
  duree_pause_totale:  number  // min
  variance_cumulative: number  // min (positif = avance, négatif = retard)
  heure_fin_prevue:    number  // timestamp ms — as planned (static)
  heure_fin_estimee:   number  // timestamp ms — live-adjusted estimate
  heure_fin_ideale:    number  // timestamp ms — if no delay
  percent_complete:    number  // 0–100
}

export type AlertSeverity = 'douce' | 'moyenne' | 'importante' | 'critique'

export interface TimeAlert {
  id:         string
  severity:   AlertSeverity
  message:    string
  context:    string   // ex: "Modélisation dépasse 5 min"
  emise_at:   number
  dismissed:  boolean
}

export type SuggestionType =
  | 'accelerate'      // accélérer l'activité courante
  | 'skip_next'       // ignorer la prochaine activité
  | 'merge_next'      // fusionner avec la suivante
  | 'send_homework'   // passer en devoir
  | 'take_pause'      // pause suggérée
  | 'bonus_review'    // revue bonus si avance
  | 'shorten'         // raccourcir l'activité courante

export interface TimeSuggestion {
  id:          string
  type:        SuggestionType
  message:     string
  justification: string
  activite_id: string | null
  emise_at:    number
}

export interface TimeStats {
  temps_moyen_par_type:    Record<string, number>  // type → min moyen
  ecart_moyen_global:      number  // min
  taux_respect_durees:     number  // 0–1
  temps_vraiment_enseigne: number  // min (excl. pauses et transitions)
  temps_perdu:             number  // min (time lost to overruns/setup)
}

export interface TimeIntelligenceState {
  activityTimings:    ActivityTiming[]
  sessionTiming:      SessionTiming
  alerts:             TimeAlert[]
  suggestions:        TimeSuggestion[]
  stats:              TimeStats
  lastUpdated:        number
}
