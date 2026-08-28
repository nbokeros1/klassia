// ── GET + PATCH /api/founder/feedback/[id] (V7.8C — Feedback Inbox) ──────────

import { NextRequest, NextResponse } from 'next/server'
import { requireFounderOrAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUTS = ['nouveau', 'en_traitement', 'resolu', 'ferme'] as const
type Statut = typeof ALLOWED_STATUTS[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── GET /api/founder/feedback/[id] ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, profil } = await requireFounderOrAdmin()
  if (error || !profil) return error ?? NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  if (!UUID_RE.test(id ?? '')) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const db = createAdminClient()

  // ── Feedback (includes full description) ─────────────────────────────────
  const { data: feedback, error: fbErr } = await db
    .from('beta_feedback')
    .select('id, type, titre, description, page_url, statut, created_at, utilisateur_id')
    .eq('id', id)
    .single()

  if (fbErr || !feedback) {
    return NextResponse.json({ error: 'Feedback introuvable' }, { status: 404 })
  }

  // ── Teacher info (full name + email) ──────────────────────────────────────
  const { data: teacher } = feedback.utilisateur_id
    ? await db
        .from('utilisateurs')
        .select('id, prenom, nom, email, onboarding_complete, created_at')
        .eq('id', feedback.utilisateur_id as string)
        .single()
    : { data: null }

  // ── Internal notes (graceful if migration 048 not yet applied) ────────────
  const { data: notesRaw, error: notesErr } = await db
    .from('beta_feedback_notes')
    .select('id, contenu, auteur_id, created_at')
    .eq('feedback_id', id)
    .order('created_at', { ascending: true })

  if (notesErr) {
    console.warn('[feedback/detail] beta_feedback_notes not available yet:', notesErr.message)
  }

  // Resolve note author names
  const auteurIds = [...new Set((notesRaw ?? []).map(n => n.auteur_id as string))]
  const { data: auteurs } = auteurIds.length
    ? await db.from('utilisateurs').select('id, prenom, nom').in('id', auteurIds)
    : { data: [] }
  const auteurMap = Object.fromEntries(
    (auteurs ?? []).map(a => [a.id, [a.prenom, a.nom].filter(Boolean).join(' ').trim() || 'Founder']),
  )

  const notes = (notesRaw ?? []).map(n => ({
    id:        n.id as string,
    contenu:   n.contenu as string,
    auteur:    auteurMap[n.auteur_id as string] ?? 'Founder',
    created_at: n.created_at as string,
  }))

  // ── Founder responses (graceful if migration 048 not yet applied) ─────────
  const { data: responsesRaw, error: respErr } = await db
    .from('beta_feedback_responses')
    .select('id, contenu, delivered, created_at')
    .eq('feedback_id', id)
    .order('created_at', { ascending: true })

  if (respErr) {
    console.warn('[feedback/detail] beta_feedback_responses not available yet:', respErr.message)
  }

  const responses = (responsesRaw ?? []).map(r => ({
    id:         r.id as string,
    contenu:    r.contenu as string,
    delivered:  r.delivered as boolean,
    created_at: r.created_at as string,
  }))

  return NextResponse.json({
    feedback: {
      id:          feedback.id,
      type:        feedback.type,
      titre:       feedback.titre,
      description: feedback.description,
      page_url:    feedback.page_url,
      statut:      feedback.statut,
      created_at:  feedback.created_at,
    },
    teacher: teacher ? {
      id:         teacher.id,
      prenom:     teacher.prenom,
      nom:        teacher.nom,
      email:      teacher.email,
      onboarding: teacher.onboarding_complete,
      beta_since: teacher.created_at,
    } : null,
    notes,
    responses,
  })
}

// ── PATCH /api/founder/feedback/[id] ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, profil } = await requireFounderOrAdmin()
  if (error || !profil) return error ?? NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  if (!UUID_RE.test(id ?? '')) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  let body: { action?: unknown; statut?: unknown; contenu?: unknown }
  try {
    body = await req.json() as { action?: unknown; statut?: unknown; contenu?: unknown }
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const db = createAdminClient()

  // Verify feedback exists (server-side — never trust client)
  const { data: existing } = await db
    .from('beta_feedback')
    .select('id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Feedback introuvable' }, { status: 404 })

  // ── Action: status ────────────────────────────────────────────────────────
  if (body.action === 'status') {
    const statut = typeof body.statut === 'string' ? body.statut : null
    if (!statut || !(ALLOWED_STATUTS as readonly string[]).includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    const { error: upErr } = await db
      .from('beta_feedback')
      .update({ statut: statut as Statut })
      .eq('id', id)

    if (upErr) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
    return NextResponse.json({ ok: true, statut })
  }

  // ── Action: note ──────────────────────────────────────────────────────────
  if (body.action === 'note') {
    const raw = typeof body.contenu === 'string' ? body.contenu.trim() : ''
    if (!raw || raw.length > 2000) {
      return NextResponse.json({ error: 'Contenu invalide (1-2000 caractères)' }, { status: 400 })
    }
    const { data: note, error: noteErr } = await db
      .from('beta_feedback_notes')
      .insert({ feedback_id: id, auteur_id: profil.id, contenu: raw })
      .select('id, contenu, created_at')
      .single()

    if (noteErr || !note) {
      console.error('[feedback/note] insert failed:', noteErr?.message)
      return NextResponse.json({ error: 'Impossible d\'ajouter la note (migration 048 appliquée ?)' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, note })
  }

  // ── Action: response ──────────────────────────────────────────────────────
  if (body.action === 'response') {
    const raw = typeof body.contenu === 'string' ? body.contenu.trim() : ''
    if (!raw || raw.length > 3000) {
      return NextResponse.json({ error: 'Contenu invalide (1-3000 caractères)' }, { status: 400 })
    }
    const { data: response, error: respErr } = await db
      .from('beta_feedback_responses')
      .insert({ feedback_id: id, auteur_id: profil.id, contenu: raw, delivered: false })
      .select('id, contenu, delivered, created_at')
      .single()

    if (respErr || !response) {
      console.error('[feedback/response] insert failed:', respErr?.message)
      return NextResponse.json({ error: 'Impossible d\'enregistrer la réponse (migration 048 appliquée ?)' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      response,
      delivery_note: 'Réponse enregistrée. Notification enseignant non encore activée.',
    })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
