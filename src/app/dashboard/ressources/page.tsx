// @deprecated — redirige vers /dashboard/bibliotheque. Conservé pour rétrocompatibilité des URLs.
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RessourcesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/bibliotheque') }, [])
  return null
}
