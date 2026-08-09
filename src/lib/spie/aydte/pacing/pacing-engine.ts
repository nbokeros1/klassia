// SPIE-04 — Pacing Engine
// Calculates the pace of instruction: estimated vs real time, advance/delay, margins.
// Independent of curriculum — works with any set of sequences and a calendar.

import type {
  AnnualPacingModel,
  SequencePacing,
  PaceStatus,
  PacingAdjustment,
  PacingImpact,
} from '../types/pacing'
import type { SequenceBlock } from '../types/twin'
import type { SchoolCalendar } from '../types/calendar'

// ─── Pace status from delay ────────────────────────────────────────────────────

function pacingStatusFromDelay(avanceRetardSemaines: number): PaceStatus {
  if (avanceRetardSemaines > 1) return 'en_avance'
  if (avanceRetardSemaines >= -1) return 'dans_les_temps'
  if (avanceRetardSemaines >= -2) return 'leger_retard'
  if (avanceRetardSemaines >= -4) return 'retard_modere'
  return 'retard_critique'
}

// ─── Pacing Engine ────────────────────────────────────────────────────────────

export class PacingEngine {
  // Build the annual pacing model from sequences + calendar
  buildPacingModel(
    twinId: string,
    academicYear: string,
    sequences: SequenceBlock[],
    calendar: SchoolCalendar,
    minutesParSemaine: number,
  ): AnnualPacingModel {
    const today = new Date().toISOString().split('T')[0]
    const activeSemaines = calendar.semaines.filter(s => s.actif)
    const restantes = activeSemaines.filter(s => s.startDate >= today)

    const semaineActuelle = activeSemaines.findIndex(s => s.startDate >= today) + 1 || 1
    const semainesRestantes = restantes.length
    const minutesRestantes = restantes.reduce((sum, s) => sum + s.minutesDisponibles, 0)

    // Build per-sequence pacing
    const sequencePacings: SequencePacing[] = sequences.map(seq => {
      const heuresPrevues = seq.dureeEstimeeHeures
      const heuresReelles = seq.dureeReelleHeures

      let avanceRetard = 0
      let statut: SequencePacing['statut'] = 'non_commencee'

      if (seq.statut === 'terminee') {
        statut = 'terminee'
        if (heuresReelles !== undefined && seq.semainesFin !== undefined && seq.semaineDébut !== undefined) {
          const realDuration = seq.semainesFin - seq.semaineDébut + 1
          const plannedDuration = Math.ceil((heuresPrevues * 60) / minutesParSemaine)
          avanceRetard = plannedDuration - realDuration
        }
      } else if (seq.statut === 'en_cours') {
        statut = 'en_cours'
        const semainesPrevues = Math.ceil((heuresPrevues * 60) / minutesParSemaine)
        if (seq.semaineDébut !== undefined) {
          const semainesEcoulees = semaineActuelle - seq.semaineDébut
          avanceRetard = semainesPrevues - semainesEcoulees
          if (avanceRetard < -1) statut = 'en_retard'
        }
      }

      const semainesPrevues = Math.ceil((heuresPrevues * 60) / minutesParSemaine)
      const bufferSemaines = Math.max(0, Math.floor(semainesPrevues * 0.1))

      return {
        sequenceId: seq.id,
        sequenceTitre: seq.titre,
        semainePrevueDébut: seq.semaineDébut ?? 0,
        semainePrevueFin: seq.semainesFin ?? (seq.semaineDébut ?? 0) + semainesPrevues,
        heuresPrevues,
        heuresReelles,
        statut,
        avanceRetardSemaines: avanceRetard,
        bufferSemaines,
      }
    })

    // Global delay = average of all active sequences
    const activeSeqs = sequencePacings.filter(s => s.statut !== 'non_commencee')
    const avanceRetardGlobal = activeSeqs.length > 0
      ? Math.round(activeSeqs.reduce((sum, s) => sum + s.avanceRetardSemaines, 0) / activeSeqs.length)
      : 0

    // Buffer remaining
    const totalHeuresPlanifiees = sequences.reduce((sum, s) => sum + s.dureeEstimeeHeures, 0)
    const totalMinutesPlanifiees = totalHeuresPlanifiees * 60
    const totalMinutesDisponibles = activeSemaines.reduce((sum, s) => sum + s.minutesDisponibles, 0)
    const bufferMinutes = totalMinutesDisponibles - totalMinutesPlanifiees
    const bufferSemaines = Math.floor(bufferMinutes / minutesParSemaine)

    // Coverage
    const outcomesTotaux = sequences.reduce((sum, s) => sum + s.outcomeIds.length, 0)
    const outcomesTermines = sequences
      .filter(s => s.statut === 'terminee')
      .reduce((sum, s) => sum + s.outcomeIds.length, 0)
    const coverageActuelle = outcomesTotaux > 0 ? Math.round((outcomesTermines / outcomesTotaux) * 100) : 0

    // Projected coverage
    const heuresPossibles = minutesRestantes / 60
    const heuresRestantesPlanifiees = sequences
      .filter(s => s.statut !== 'terminee')
      .reduce((sum, s) => sum + s.dureeEstimeeHeures, 0)
    const coverageAttendue = heuresPossibles >= heuresRestantesPlanifiees
      ? 100
      : Math.round((heuresPossibles / heuresRestantesPlanifiees) * (100 - coverageActuelle) + coverageActuelle)

    const recommandations: string[] = []
    const status = pacingStatusFromDelay(avanceRetardGlobal)
    if (status === 'retard_critique') recommandations.push('Prioriser les outcomes essentiels, envisager de regrouper certaines séquences.')
    if (status === 'retard_modere') recommandations.push('Revoir le rythme des prochaines séquences pour rattraper le retard.')
    if (bufferSemaines < 1) recommandations.push('Marge de temps très faible — tout retard supplémentaire sera difficile à rattraper.')
    if (coverageAttendue < 80) recommandations.push(`Couverture curriculaire projetée : ${coverageAttendue}%. Certains outcomes risquent de ne pas être couverts.`)

    return {
      twinId,
      academicYear,
      semaineActuelle,
      semainesRestantes,
      minutesRestantes,
      sequences: sequencePacings,
      statutGlobal: status,
      avanceRetardSemainesGlobal: avanceRetardGlobal,
      coverageAttenduePercent: coverageAttendue,
      coverageActuellePercent: coverageActuelle,
      bufferSemainesRestant: Math.max(0, bufferSemaines),
      recommandations,
      calculatedAt: new Date().toISOString(),
    }
  }

  // Calculate the impact of a pacing adjustment
  simulateAdjustment(
    adjustment: PacingAdjustment,
    sequences: SequenceBlock[],
    totalMinutesDisponibles: number,
    minutesParSemaine: number,
  ): PacingImpact {
    const affected = adjustment.sequenceIds
    const avertissements: string[] = []

    let heuresSauvegardees = 0
    let coverageChangement = 0

    switch (adjustment.type) {
      case 'compresser':
        heuresSauvegardees = affected.reduce((sum, id) => {
          const seq = sequences.find(s => s.id === id)
          return sum + (seq ? seq.dureeEstimeeHeures * 0.2 : 0)  // 20% compression
        }, 0)
        avertissements.push('La compression peut réduire la profondeur pédagogique.')
        break
      case 'supprimer':
        heuresSauvegardees = affected.reduce((sum, id) => {
          const seq = sequences.find(s => s.id === id)
          return sum + (seq ? seq.dureeEstimeeHeures : 0)
        }, 0)
        const outcomesSupprimes = affected.reduce((sum, id) => {
          const seq = sequences.find(s => s.id === id)
          return sum + (seq ? seq.outcomeIds.length : 0)
        }, 0)
        const totalOutcomes = sequences.reduce((sum, s) => sum + s.outcomeIds.length, 0)
        coverageChangement = totalOutcomes > 0 ? -Math.round((outcomesSupprimes / totalOutcomes) * 100) : 0
        avertissements.push(`La suppression affecte la couverture curriculaire de ${Math.abs(coverageChangement)}%.`)
        break
      case 'fusionner':
        if (affected.length >= 2) {
          heuresSauvegardees = 1  // Transition time saved
          avertissements.push('La fusion peut rendre la séquence plus dense pédagogiquement.')
        }
        break
      default:
        break
    }

    return {
      heuresSauvegardees,
      coverageChangement,
      sequencesAffectees: affected,
      avertissements,
    }
  }
}

export const pacingEngine = new PacingEngine()
