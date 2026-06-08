// @deprecated — redirige vers /dashboard/profil-ia puis /dashboard/studio-ia. Conservé pour rétrocompatibilité des URLs.
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StudioRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/profil-ia') }, [])
  return null
}
