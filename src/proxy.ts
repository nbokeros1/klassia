import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedDashboard = pathname.startsWith('/dashboard')
  const isProtectedAdmin     = pathname.startsWith('/admin')
  const isProtectedFounder   = pathname.startsWith('/founder')

  if (!isProtectedDashboard && !isProtectedAdmin && !isProtectedFounder) {
    return NextResponse.next({ request })
  }

  try {
    const response = NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // getUser() valide le JWT côté serveur — plus sûr que getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isProtectedAdmin || isProtectedFounder) {
      const { data: profil } = await supabase
        .from('utilisateurs')
        .select('is_admin, type_compte, role')
        .eq('user_id', user.id)
        .single()

      const isAdmin   = profil?.is_admin || profil?.type_compte === 'admin'
      const isFounder = isAdmin || ['founder', 'super_admin'].includes(profil?.role ?? '')

      if (isProtectedFounder && !isFounder) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (isProtectedAdmin && !isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return response
  } catch {
    // Si Supabase est injoignable, on laisse passer — la page gèrera l'auth.
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/classes/:path*', '/ia/:path*', '/admin/:path*', '/founder/:path*'],
}
