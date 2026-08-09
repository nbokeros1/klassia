// ─── Conversion Lecon → TeachingActivity[] ────────────────────────────────────
// Parse le contenu_json d'une Lecon en activités pédagogiques pour le storyboard

import type { TeachingActivity, ActivityType } from '@/types/enseigner'

export function parseMinutes(v: unknown): number {
  if (typeof v === 'number') return Math.max(0, Math.floor(v))
  if (typeof v === 'string') {
    const m = v.match(/\d+/)
    return m ? Math.max(0, parseInt(m[0], 10)) : 0
  }
  return 0
}

export function calcDureeLecon(contenuJson: Record<string, unknown> | null): number {
  if (!contenuJson) return 0
  const avant   = parseMinutes(contenuJson.avant_duree)
  const pendant = parseMinutes(contenuJson.pendant_duree)
  const apres   = parseMinutes(contenuJson.apres_duree)
  const total   = avant + pendant + apres
  if (total > 0) return total
  return parseMinutes(contenuJson.duree ?? contenuJson.duree_totale)
}

interface ActivityDef {
  key: string
  type: ActivityType
  titre: string
  phase: 'avant' | 'pendant' | 'apres'
  emoji: string
  dureeKey: string
  dureeShare?: number // fraction of the phase duration if not dedicated
}

const ACTIVITY_DEFS: ActivityDef[] = [
  { key: 'avant_amorce',           type: 'amorce',           titre: 'Amorce',             phase: 'avant',   emoji: '✦', dureeKey: 'avant_duree' },
  { key: 'pendant_modelisation',   type: 'modelisation',     titre: 'Modélisation',        phase: 'pendant', emoji: '📖', dureeKey: 'pendant_duree', dureeShare: 0.4 },
  { key: 'pendant_pratique_guidee',type: 'pratique_guidee',  titre: 'Pratique guidée',     phase: 'pendant', emoji: '✏️', dureeKey: 'pendant_duree', dureeShare: 0.35 },
  { key: 'pendant_pratique_autonome',type:'pratique_autonome',titre: 'Pratique autonome',   phase: 'pendant', emoji: '🎯', dureeKey: 'pendant_duree', dureeShare: 0.25 },
  { key: 'apres_cloture',          type: 'cloture',          titre: 'Clôture',             phase: 'apres',   emoji: '✅', dureeKey: 'apres_duree' },
  { key: 'apres_billet',           type: 'billet',           titre: 'Billet de sortie',    phase: 'apres',   emoji: '📝', dureeKey: 'apres_duree', dureeShare: 0.4 },
]

export function leconToActivities(lecon: Record<string, unknown>): TeachingActivity[] {
  const c = (lecon.contenu_json as Record<string, unknown>) || {}
  const activities: TeachingActivity[] = []
  let ordre = 0

  for (const def of ACTIVITY_DEFS) {
    const contenu = typeof c[def.key] === 'string' ? (c[def.key] as string).trim() : ''
    const baseDuree = parseMinutes(c[def.dureeKey])

    // Skip empty activities that have no content and no duration
    const phaseTotal = baseDuree
    if (!contenu && phaseTotal === 0) continue

    const duree = def.dureeShare
      ? Math.max(1, Math.round(baseDuree * def.dureeShare))
      : baseDuree || 10

    activities.push({
      id:           `${lecon.id as string}-${def.key}`,
      type:         def.type,
      titre:        def.titre,
      phase:        def.phase,
      emoji:        def.emoji,
      contenu:      contenu,
      objectif:     typeof c.objectifs === 'string' ? (c.objectifs as string) : '',
      support:      null,
      duree_prevue: duree,
      duree_reelle: null,
      etat:         'prevue',
      ordre:        ordre++,
      started_at:   null,
      ended_at:     null,
    })
  }

  // Ensure at least one activity
  if (activities.length === 0) {
    activities.push({
      id:           `${lecon.id as string}-libre`,
      type:         'libre',
      titre:        lecon.titre as string || 'Séance',
      phase:        'libre',
      emoji:        '📚',
      contenu:      '',
      objectif:     '',
      support:      null,
      duree_prevue: calcDureeLecon(c) || 60,
      duree_reelle: null,
      etat:         'prevue',
      ordre:        0,
      started_at:   null,
      ended_at:     null,
    })
  }

  return activities
}

export function formatDuree(ms: number): string {
  const totalS = Math.floor(ms / 1000)
  const h = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function getActivityStateLabel(etat: string): string {
  const map: Record<string, string> = {
    prevue: 'À venir', prete: 'Prête',
    en_cours: 'En cours', pausee: 'En pause',
    terminee: 'Terminée', reportee: 'Reportée',
    annulee: 'Annulée',
  }
  return map[etat] ?? etat
}
