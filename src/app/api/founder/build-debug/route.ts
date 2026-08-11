// SPIE-DIAGNOSTIC-01 — Founder debug endpoint for build-year pipeline diagnosis
// GET /api/founder/build-debug?packId=...
// Protected: is_admin only (enwaha22@gmail.com or role founder/super_admin)

import { NextRequest, NextResponse }             from 'next/server'
import { createClient as createAnonClient }      from '@/lib/supabase/server'
import { createClient }                          from '@supabase/supabase-js'
import { verifyTeachingPackCompleteness }        from '@/lib/spie/build-pipeline'
import type { BuildState }                       from '@/lib/spie/build-pipeline'
import { BETA_ENTITLEMENTS }                      from '@/lib/entitlements'

const FOUNDER_ROLES = ['founder', 'super_admin']

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function assertAdmin(): Promise<{ authorized: boolean; userId?: string }> {
  const supabase = await createAnonClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false }

  const { data } = await supabase
    .from('utilisateurs')
    .select('role, is_admin')
    .eq('user_id', user.id)
    .single()
  if (!data) return { authorized: false }

  const ok = FOUNDER_ROLES.includes(data.role) || data.is_admin === true
  return { authorized: ok, userId: user.id }
}

export async function GET(req: NextRequest) {
  const { authorized } = await assertAdmin()
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const url    = new URL(req.url)
  const packId = url.searchParams.get('packId')

  if (!packId) {
    return NextResponse.json({ error: 'packId requis' }, { status: 400 })
  }

  const admin = serviceClient()

  // 1. Fetch the Teaching Pack
  const { data: pack, error: packErr } = await admin
    .from('teaching_packs')
    .select(`
      id, statut, classe_id, enseignant_id, nom,
      contenu_json, error_message, created_at, updated_at,
      programme_annuel_id
    `)
    .eq('id', packId)
    .single()

  if (packErr || !pack) {
    return NextResponse.json({ error: `Pack introuvable : ${packErr?.message ?? 'null'}` }, { status: 404 })
  }

  const classeId   = pack.classe_id as string
  const buildState = (pack.contenu_json as Record<string, unknown>)?.build_state as BuildState | undefined

  // 2. Fetch programme_annuel if linked
  let progRow: Record<string, unknown> | null = null
  if (pack.programme_annuel_id) {
    const { data: prog } = await admin
      .from('programme_annuel')
      .select('id, titre, nb_semaines, created_at, syllabus_json')
      .eq('id', pack.programme_annuel_id)
      .single()
    progRow = prog ?? null
  }

  // 3. Count fichiers_dossier (lecon_complete + quiz)
  const [{ count: leconCount }, { count: quizCount }] = await Promise.all([
    admin.from('fichiers_dossier')
      .select('id', { count: 'exact', head: true })
      .eq('classe_id', classeId)
      .eq('type_fichier', 'lecon_complete'),
    admin.from('fichiers_dossier')
      .select('id', { count: 'exact', head: true })
      .eq('classe_id', classeId)
      .eq('type_fichier', 'quiz'),
  ])

  // 4. Real-time completeness check — use Pro+ entitlement (max coverage)
  const entitlement = BETA_ENTITLEMENTS['pro_plus']
  const completeness = await verifyTeachingPackCompleteness(admin, packId, classeId, entitlement)

  // 5. Build step-by-step trace from build_state
  const steps = buildState
    ? [
        { step: 'pack',             result: buildState.pack },
        { step: 'curriculum',       result: buildState.curriculum },
        { step: 'syllabus',         result: buildState.syllabus },
        { step: 'programme_annuel', result: buildState.programme_annuel },
        { step: 'plans_lecon',      result: buildState.plans_lecon },
        { step: 'premiere_lecon',   result: buildState.premiere_lecon },
        { step: 'quiz',             result: buildState.quiz },
      ]
    : null

  const failingSteps = steps?.filter(s => s.result?.status === 'error') ?? []

  return NextResponse.json({
    // Identity
    packId,
    classeId,
    packNom:   pack.nom,
    packStatut: pack.statut,
    packCreatedAt: pack.created_at,
    packUpdatedAt: pack.updated_at,
    packErrorMessage: pack.error_message ?? null,
    programmeAnnuelId: pack.programme_annuel_id ?? null,

    // DB state
    db: {
      programmeAnnuel: progRow
        ? { id: progRow.id, titre: progRow.titre, createdAt: progRow.created_at,
            hasSyllabus: !!(progRow.syllabus_json as Record<string,unknown>)?.titre_cours }
        : null,
      leconCompleteCount: leconCount ?? 0,
      quizCount: quizCount ?? 0,
    },

    // BuildState trace (from contenu_json.build_state)
    buildState: buildState ?? null,
    buildStateAt: buildState?.startedAt ?? null,
    buildFinalized: buildState?.finalized ?? false,

    // Step-by-step trace
    steps: steps ?? [],
    failingSteps,

    // Real-time completeness (re-reads DB)
    completeness,

    // Diagnosis summary
    diagnosis: {
      hasPackInDb:          !!pack.id,
      hasProgAnnuelInDb:    !!pack.programme_annuel_id,
      hasLeconInDb:         (leconCount ?? 0) > 0,
      hasQuizInDb:          (quizCount ?? 0) > 0,
      buildStatePresent:    !!buildState,
      firstFailingStep:     failingSteps[0]?.step ?? null,
      firstFailingError:    failingSteps[0]?.result?.error ?? null,
      realStatus:           completeness.status,
      missingElements:      completeness.missingElements,
    },
  })
}
