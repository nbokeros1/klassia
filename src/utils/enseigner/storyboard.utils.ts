// ─── Storyboard Engine — utility operations (SC-03F) ─────────────────────────
// Pure functions — no React, no side effects

import type { TeachingActivity, ActivityState } from '@/types/enseigner'

export function reorderActivities(
  activities: TeachingActivity[],
  fromIndex: number,
  toIndex: number,
): TeachingActivity[] {
  if (fromIndex === toIndex) return activities
  const arr = [...activities]
  const [item] = arr.splice(fromIndex, 1)
  arr.splice(toIndex, 0, item)
  return arr.map((a, i) => ({ ...a, ordre: i }))
}

export function duplicateActivity(
  activities: TeachingActivity[],
  index: number,
): { activities: TeachingActivity[]; newId: string } {
  const source = activities[index]
  const newId = `${source.id}_copy_${Date.now()}`
  const copy: TeachingActivity = {
    ...source,
    id:          newId,
    titre:       `${source.titre} (copie)`,
    etat:        'prevue' as ActivityState,
    started_at:  null,
    ended_at:    null,
    duree_reelle: null,
    ordre:       index + 1,
  }
  const arr = [...activities]
  arr.splice(index + 1, 0, copy)
  return {
    activities: arr.map((a, i) => ({ ...a, ordre: i })),
    newId,
  }
}

export function mergeActivities(
  activities: TeachingActivity[],
  indexA: number,
  indexB: number,
): TeachingActivity[] {
  const a = activities[indexA]
  const b = activities[indexB]
  if (!a || !b) return activities

  const merged: TeachingActivity = {
    ...a,
    titre:        `${a.titre} + ${b.titre}`,
    contenu:      b.contenu
                    ? `${a.contenu}\n\n---\n\n${b.contenu}`
                    : a.contenu,
    objectif:     [a.objectif, b.objectif].filter(Boolean).join(' · '),
    duree_prevue: a.duree_prevue + b.duree_prevue,
  }

  return activities
    .map((act, i) => {
      if (i === indexA) return merged
      if (i === indexB) return { ...act, etat: 'annulee' as ActivityState }
      return act
    })
    .map((act, i) => ({ ...act, ordre: i }))
}

export function createLiveActivity(
  leconId: string,
  titre: string,
  dureeMin: number,
  objectif: string,
  contenu: string,
  insertAfterIndex: number,
  activities: TeachingActivity[],
): { activities: TeachingActivity[]; newId: string } {
  const newId = `${leconId}-live-${Date.now()}`
  const newActivity: TeachingActivity = {
    id:           newId,
    type:         'libre',
    titre,
    phase:        'libre',
    emoji:        '⚡',
    contenu,
    objectif,
    support:      null,
    duree_prevue: dureeMin,
    duree_reelle: null,
    etat:         'prete' as ActivityState,
    ordre:        insertAfterIndex + 1,
    started_at:   null,
    ended_at:     null,
  }
  const arr = [...activities]
  arr.splice(insertAfterIndex + 1, 0, newActivity)
  return {
    activities: arr.map((a, i) => ({ ...a, ordre: i })),
    newId,
  }
}

/** Move activity up (swap with previous) */
export function moveUp(activities: TeachingActivity[], index: number): TeachingActivity[] {
  if (index <= 0) return activities
  return reorderActivities(activities, index, index - 1)
}

/** Move activity down (swap with next) */
export function moveDown(activities: TeachingActivity[], index: number): TeachingActivity[] {
  if (index >= activities.length - 1) return activities
  return reorderActivities(activities, index, index + 1)
}
