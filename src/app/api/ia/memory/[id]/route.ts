// ── PATCH + DELETE /api/ia/memory/[id] (SC-02H — Teacher Memory Engine) ───────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveEnseignant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

// ── Ownership check ───────────────────────────────────────────────────────────

async function checkOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enseignantId: string,
  id: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('teacher_memory')
    .select('id')
    .eq('id', id)
    .eq('enseignant_id', enseignantId)
    .maybeSingle()
  return !!data
}

// ── PATCH /api/ia/memory/[id] ─────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const owns = await checkOwnership(supabase, enseignantId, id)
  if (!owns) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  if (typeof body.actif  === 'boolean')       patch.actif  = body.actif
  if (body.valeur !== undefined &&
      typeof body.valeur === 'object' &&
      body.valeur !== null)                   patch.valeur = body.valeur

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 })
  }

  const { error } = await supabase
    .from('teacher_memory')
    .update(patch)
    .eq('id', id)
    .eq('enseignant_id', enseignantId)

  if (error) {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// ── DELETE /api/ia/memory/[id]?hard=true ─────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id }  = await params
  const hard    = req.nextUrl.searchParams.get('hard') === 'true'

  const owns = await checkOwnership(supabase, enseignantId, id)
  if (!owns) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  if (hard) {
    const { error } = await supabase
      .from('teacher_memory')
      .delete()
      .eq('id', id)
      .eq('enseignant_id', enseignantId)

    if (error) {
      return NextResponse.json({ error: 'Erreur de suppression' }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from('teacher_memory')
      .update({ actif: false })
      .eq('id', id)
      .eq('enseignant_id', enseignantId)

    if (error) {
      return NextResponse.json({ error: 'Erreur de désactivation' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
