// ── GET + POST /api/ia/memory (SC-02H — Teacher Memory Engine) ────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import type { MemoryDelta }          from '@/lib/ia/teacher-memory-engine'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveEnseignant(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data, error: errUser } = await supabase
    .from('utilisateurs')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (errUser) {
    console.error('[KLASSIA][MEMORY][AUTH]', errUser.message)
    return null
  }
  return (data as { id: string } | null)?.id ?? null
}

// ── GET /api/ia/memory?classe_id=...&matiere=... ──────────────────────────────

export async function GET(req: NextRequest) {
  const supabase      = await createClient()
  const enseignantId  = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const classeId = searchParams.get('classe_id')
  const matiere  = searchParams.get('matiere')

  let query = supabase
    .from('teacher_memory')
    .select('id, type_memoire, cle, valeur, confiance, source, actif, compte_observations, classe_id, matiere, niveau, created_at, updated_at')
    .eq('enseignant_id', enseignantId)
    .eq('actif', true)
    .order('confiance', { ascending: false })

  if (classeId) query = query.eq('classe_id', classeId)
  if (matiere)  query = query.eq('matiere', matiere)

  const { data, error } = await query

  if (error) {
    console.error('[KLASSIA][MEMORY][GET]', error.message)
    return NextResponse.json({ error: 'Erreur de lecture' }, { status: 500 })
  }

  return NextResponse.json({ memories: data ?? [] })
}

// ── POST /api/ia/memory — upsert de deltas (parallèle) ───────────────────────

export async function POST(req: NextRequest) {
  const supabase     = await createClient()
  const enseignantId = await resolveEnseignant(supabase)

  if (!enseignantId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { deltas?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  if (!Array.isArray(body.deltas)) {
    return NextResponse.json({ error: 'deltas requis (tableau)' }, { status: 400 })
  }

  const deltas = (body.deltas as MemoryDelta[]).slice(0, 10)

  // Phase 1 — lire toutes les entrées existantes en parallèle (O(n) → 1 aller-retour)
  const lookups = await Promise.all(
    deltas.map(delta =>
      supabase
        .from('teacher_memory')
        .select('id, compte_observations')
        .eq('enseignant_id', enseignantId)
        .eq('type_memoire', delta.type_memoire)
        .eq('cle', delta.cle)
        .is('classe_id', delta.classe_id ?? null)
        .is('matiere',   delta.matiere   ?? null)
        .maybeSingle()
    )
  )

  // Phase 2 — écrire toutes les entrées en parallèle
  const writes = await Promise.all(
    deltas.map((delta, i) => {
      const existing = lookups[i]?.data as { id: string; compte_observations: number } | null

      if (existing) {
        const nouveauCompte     = (existing.compte_observations ?? 1) + 1
        const nouvelleConfiance = Math.min(5, Math.floor(nouveauCompte / 2) + 1)
        return supabase
          .from('teacher_memory')
          .update({
            compte_observations: nouveauCompte,
            confiance:           nouvelleConfiance,
            valeur:              delta.valeur,
            updated_at:          new Date().toISOString(),
          })
          .eq('id', existing.id)
      }

      return supabase
        .from('teacher_memory')
        .insert({
          enseignant_id:       enseignantId,
          type_memoire:        delta.type_memoire,
          cle:                 delta.cle,
          valeur:              delta.valeur,
          source:              delta.source,
          classe_id:           delta.classe_id ?? null,
          matiere:             delta.matiere   ?? null,
          niveau:              delta.niveau    ?? null,
          confiance:           1,
          compte_observations: 1,
          actif:               true,
        })
    })
  )

  const errors = writes.filter(r => r.error)
  if (errors.length > 0) {
    console.error('[KLASSIA][MEMORY][POST]', errors.map(r => r.error?.message).join(', '))
  }

  return NextResponse.json({
    ok:       true,
    upserted: writes.length - errors.length,
    errors:   errors.length,
  })
}
