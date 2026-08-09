import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

// Wrap fetch to silently handle network errors (offline, DNS failure).
// Without this, GoTrue spams console.error with "TypeError: Failed to fetch"
// on every retry while the device is disconnected.
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (err) {
    if (err instanceof TypeError) {
      return new Response(
        JSON.stringify({ error: 'network_request_failed', error_description: 'Offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }
    throw err
  }
}

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: resilientFetch } },
    )
  }
  return client
}
