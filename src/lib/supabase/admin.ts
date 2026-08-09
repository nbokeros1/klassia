import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svcKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
