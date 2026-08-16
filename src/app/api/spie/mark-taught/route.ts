import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'
import type { ContenuProgramme, TeachingEventType } from '@/lib/types/database'
import { makeLessonRef } from '@/lib/spie/teaching-events'

// ─── POST /api/spie/mark-taught ──────────────────────────────────────────────
// V5 : INSERT append-only dans teaching_events (remplace JSONB mutation V4).
// Corps : {
//   programmeAnnuelId : string (UUID)
//   teachingPackId    : string (UUID)
//   sequenceIndex     : number (0-based)
//   lessonIndex       : number (0-based)
//   eventType         : 'lesson_taught' | 'lesson_taught_cancelled'
//   occurredAt?       : string (ISO date YYYY-MM-DD, défaut = now)
//   note?             : string (max 2000 chars)
// }

const VALID_EVENT_TYPES: TeachingEventType[] = ['lesson_taught', 'lesson_taught_cancelled']

export async function POST(request: Request) {
  const { error: authError, user } = await requireAuth()
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => null)

  // ── Validation des champs obligatoires ────────────────────────────────────
  if (
    !body?.programmeAnnuelId
    || !body?.teachingPackId
    || body?.sequenceIndex == null
    || body?.lessonIndex == null
    || !body?.eventType
  ) {
    return NextResponse.json(
      { error: 'programmeAnnuelId, teachingPackId, sequenceIndex, lessonIndex, eventType requis' },
      { status: 400 },
    )
  }

  const {
    programmeAnnuelId,
    teachingPackId,
    sequenceIndex,
    lessonIndex,
    eventType,
    occurredAt,
    note,
  } = body as {
    programmeAnnuelId: string
    teachingPackId:    string
    sequenceIndex:     number
    lessonIndex:       number
    eventType:         string
    occurredAt?:       string
    note?:             string
  }

  // ── Validation runtime (BUG-04) ───────────────────────────────────────────
  if (!VALID_EVENT_TYPES.includes(eventType as TeachingEventType)) {
    return NextResponse.json({ error: `eventType invalide : "${eventType}"` }, { status: 400 })
  }

  if (!Number.isInteger(sequenceIndex) || sequenceIndex < 0) {
    return NextResponse.json({ error: 'sequenceIndex doit être un entier >= 0' }, { status: 400 })
  }

  if (!Number.isInteger(lessonIndex) || lessonIndex < 0) {
    return NextResponse.json({ error: 'lessonIndex doit être un entier >= 0' }, { status: 400 })
  }

  if (note !== undefined && note !== null && note.length > 2000) {
    return NextResponse.json({ error: 'note : maximum 2000 caractères' }, { status: 400 })
  }

  // occurredAt : accepter YYYY-MM-DD ou ISO datetime, rejeter tout le reste
  let resolvedOccurredAt: string
  if (occurredAt) {
    const d = new Date(occurredAt)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'occurredAt : date invalide' }, { status: 400 })
    }
    resolvedOccurredAt = d.toISOString()
  } else {
    resolvedOccurredAt = new Date().toISOString()
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── Chaîne d'autorisation ──────────────────────────────────────────────────
  const { data: profil } = await supabase
    .from('utilisateurs').select('id').eq('user_id', user.id).single()
  if (!profil) return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })

  const { data: prog } = await supabase
    .from('programme_annuel')
    .select('id, classe_id, contenu_json')
    .eq('id', programmeAnnuelId)
    .single()
  if (!prog) return NextResponse.json({ error: 'Programme annuel introuvable' }, { status: 404 })

  // Classe appartient à cet enseignant
  const { data: classe } = await supabase
    .from('classes')
    .select('id, enseignant_id')
    .eq('id', prog.classe_id)
    .eq('enseignant_id', profil.id)
    .single()
  if (!classe) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  // Teaching pack appartient à cette classe
  const { data: pack } = await supabase
    .from('teaching_packs')
    .select('id, classe_id')
    .eq('id', teachingPackId)
    .eq('classe_id', classe.id)
    .single()
  if (!pack) return NextResponse.json({ error: 'Teaching pack introuvable ou accès refusé' }, { status: 404 })

  // Vérifier que la leçon existe dans contenu_json (BUG-04 : bounds check)
  const contenu = (prog.contenu_json ?? {}) as ContenuProgramme
  const unites  = contenu.unites ?? []
  if (sequenceIndex >= unites.length) {
    return NextResponse.json({ error: 'sequenceIndex hors limites' }, { status: 400 })
  }
  const lecons = unites[sequenceIndex].lecons ?? []
  if (lessonIndex >= lecons.length) {
    return NextResponse.json({ error: 'lessonIndex hors limites' }, { status: 400 })
  }

  // ── INSERT append-only (BUG-02 fermé) ─────────────────────────────────────
  const lessonRef = makeLessonRef(teachingPackId, sequenceIndex, lessonIndex)

  const { data: event, error: insertError } = await supabase
    .from('teaching_events')
    .insert({
      enseignant_id:       profil.id,
      classe_id:           classe.id,
      teaching_pack_id:    teachingPackId,
      programme_annuel_id: programmeAnnuelId,
      sequence_index:      sequenceIndex,
      lecon_index:         lessonIndex,
      lesson_ref:          lessonRef,
      event_type:          eventType,
      occurred_at:         resolvedOccurredAt,
      note:                note ?? null,
      metadata_json:       {},
    })
    .select('id, event_type, occurred_at, note')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Échec de l\'enregistrement', detail: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success:       true,
    eventId:       event.id,
    eventType:     event.event_type,
    occurredAt:    event.occurred_at,
    note:          event.note,
    lessonRef,
    sequenceIndex,
    lessonIndex,
  })
}
