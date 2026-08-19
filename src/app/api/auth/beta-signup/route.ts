import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type SignupPayload = {
  prenom?: string
  nom?: string
  email?: string
  password?: string
  ecole?: string
  type_compte?: string
  langue?: string
}

function serviceClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SignupPayload
    const email = body.email?.trim().toLowerCase()

    if (!email || !body.password || !body.prenom || !body.nom) {
      return NextResponse.json({ error: 'Informations requises manquantes.' }, { status: 400 })
    }

    const admin = serviceClient()
    const { data: invitation, error: invitationError } = await admin
      .from('beta_invitations')
      .select('id, email, statut, expire_at')
      .eq('email', email)
      .in('statut', ['en_attente', 'envoyee'])
      .gt('expire_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invitationError) {
      return NextResponse.json({ error: 'Impossible de vérifier l’invitation bêta.' }, { status: 500 })
    }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Cette bêta est privée. Utilisez l’email qui a reçu une invitation ScorgIA.' },
        { status: 403 },
      )
    }

    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password: body.password,
      options: {
        data: {
          prenom: body.prenom,
          nom: body.nom,
          ecole: body.ecole ?? '',
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Création du compte impossible.' }, { status: 500 })
    }

    await new Promise(resolve => setTimeout(resolve, 1200))

    const { data: profil, error: upsertError } = await admin
      .from('utilisateurs')
      .upsert({
        user_id: data.user.id,
        prenom: body.prenom,
        nom: body.nom,
        email,
        ecole: body.ecole ?? '',
        type_compte: body.type_compte ?? 'enseignant',
        langue: body.langue ?? 'fr',
        onboarding_complete: false,
        role: 'beta',
      }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (upsertError) {
      return NextResponse.json({ error: 'Compte créé, mais profil bêta non initialisé.' }, { status: 500 })
    }

    await admin
      .from('beta_invitations')
      .update({
        statut: 'acceptee',
        utilisateur_id: profil.id,
        activated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne pendant l’inscription bêta.' }, { status: 500 })
  }
}
