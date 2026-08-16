// ─── Teaching Events — résolution état V5 ─────────────────────────────────────
// Source de vérité : table teaching_events (append-only).
// Fallback transparent : état V4 contenu_json (champ statut sur LeconProgramme).
// Ne jamais appeler depuis les composants — passer lessonStateMap en prop.

import type { TeachingEvent } from '@/lib/types/database'
import type { ContenuProgramme, LeconProgramme } from '@/lib/types/database'
import type { LessonTeachingState } from '@/lib/types/school-year-dashboard'

// ─── Clé de la map d'état ─────────────────────────────────────────────────────

export function makeLessonKey(seqIdx: number, leconIdx: number): string {
  return `${seqIdx}:${leconIdx}`
}

// ─── Référence stable persistée en DB ────────────────────────────────────────

export function makeLessonRef(packId: string, seqIdx: number, leconIdx: number): string {
  return `${packId}:${seqIdx}:${leconIdx}`
}

// ─── Résolution d'une leçon individuelle ─────────────────────────────────────
//
// Résolution : dernier événement chronologique pour (seqIdx, leconIdx) dans
// les events du pack. Si aucun event, fallback sur le champ V4 de la leçon.
//
// Règle "dernier événement gagne" :
//   lesson_taught          → isTaught = true
//   lesson_taught_cancelled → isTaught = false

export function getLessonTeachingState(
  seqIdx: number,
  leconIdx: number,
  events: TeachingEvent[],
  fallbackLecon: LeconProgramme | null,
): LessonTeachingState {
  // Filtrer les events pour cette leçon (tri already assumed ASC by occurred_at)
  const relevant = events.filter(
    e => e.sequence_index === seqIdx && e.lecon_index === leconIdx,
  )

  if (relevant.length > 0) {
    const last = relevant[relevant.length - 1]
    const isTaught = last.event_type === 'lesson_taught'
    return {
      isTaught,
      taughtAt: isTaught ? (last.occurred_at.slice(0, 10)) : null,
      note: isTaught ? (last.note ?? null) : null,
      source: 'events',
    }
  }

  // Fallback V4
  if (fallbackLecon?.statut === 'enseignee') {
    return {
      isTaught: true,
      taughtAt: fallbackLecon.date_enseignee ?? null,
      note: fallbackLecon.note_enseignement ?? null,
      source: 'legacy',
    }
  }

  return { isTaught: false, taughtAt: null, note: null, source: 'events' }
}

// ─── Construction de la map complète pour un pack ────────────────────────────
//
// Itère contenu_json.unites[seqIdx].lecons[leconIdx] — indices 0-based.
// O(U × L) avec un seul parcours des events par clé grâce au groupBy préalable.

export function buildLessonStateMap(
  contenu: ContenuProgramme,
  events: TeachingEvent[],
): Record<string, LessonTeachingState> {
  // Grouper les events par clé pour éviter N parcours répétés
  const grouped = new Map<string, TeachingEvent[]>()
  for (const ev of events) {
    const k = makeLessonKey(ev.sequence_index, ev.lecon_index)
    const bucket = grouped.get(k)
    if (bucket) {
      bucket.push(ev)
    } else {
      grouped.set(k, [ev])
    }
  }

  const map: Record<string, LessonTeachingState> = {}
  const unites = contenu.unites ?? []

  for (let si = 0; si < unites.length; si++) {
    const unite = unites[si]
    const lecons = unite.lecons ?? []
    for (let li = 0; li < lecons.length; li++) {
      const k = makeLessonKey(si, li)
      const eventsForLecon = grouped.get(k) ?? []
      map[k] = getLessonTeachingState(si, li, eventsForLecon, lecons[li])
    }
  }

  return map
}

// ─── Comptage d'après la map ──────────────────────────────────────────────────

export function countTaughtFromMap(map: Record<string, LessonTeachingState>): number {
  return Object.values(map).filter(s => s.isTaught).length
}
