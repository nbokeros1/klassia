import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — créer un compte admin avec un mot de passe temporaire ─────────────────
// Affiche le mot de passe généré une seule fois dans la réponse.

function genererMotDePasse(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérification admin côté serveur
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: appelant } = await supabase
      .from('utilisateurs')
      .select('id, is_admin, role_admin')
      .eq('user_id', user.id)
      .single()

    if (!appelant || appelant.is_admin !== true) {
      return NextResponse.json({ error: 'Accès refusé — super_admin requis' }, { status: 403 })
    }
    if (appelant.role_admin !== 'super_admin') {
      return NextResponse.json({ error: 'Seul un super_admin peut inviter d\'autres admins' }, { status: 403 })
    }

    let body: any
    try { body = await req.json() }
    catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

    const { email, role_admin = 'support', prenom = 'Admin', nom = 'ScorgIA' } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email valide requis' }, { status: 400 })
    }
    if (!['super_admin', 'support', 'developpeur'].includes(role_admin)) {
      return NextResponse.json({ error: 'role_admin invalide' }, { status: 400 })
    }

    // Créer le compte Supabase Auth
    const mdp = genererMotDePasse()
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password:       mdp,
      email_confirm:  true,
    })

    if (createError || !authData.user) {
      return NextResponse.json(
        { error: createError?.message || 'Erreur création compte Auth' },
        { status: 500 },
      )
    }

    // Créer la ligne utilisateurs
    const { error: insertError } = await supabase
      .from('utilisateurs')
      .insert({
        user_id:             authData.user.id,
        email,
        prenom,
        nom,
        type_compte:         'admin',
        is_admin:            true,
        role_admin,
        langue:              'fr',
        onboarding_complete: true,
        forfait:             'pro_plus',
      })

    if (insertError) {
      // Rollback : supprimer le compte Auth créé
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erreur création profil : ' + insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok:         true,
      email,
      role_admin,
      mot_de_passe_temporaire: mdp,
      note: 'Ce mot de passe est affiché une seule fois. Transmettez-le de façon sécurisée et demandez à l\'admin de le changer immédiatement.',
    })

  } catch (err: any) {
    console.error('[admin/inviter] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
