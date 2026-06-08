import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // ── Protection /admin ──────────────────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/admin')) {
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profil } = await supabase
      .from('utilisateurs')
      .select('is_admin, type_compte')
      .eq('user_id', session.user.id)
      .single()

    if (!profil?.is_admin && profil?.type_compte !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/dashboard/:path*', '/classes/:path*', '/ia/:path*', '/admin/:path*'],
}
