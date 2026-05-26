// @ts-nocheck
// lib/supabase/client.ts
// Browser-side Supabase client — safe to use in Client Components.
// Uses @supabase/ssr createBrowserClient for correct cookie handling.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for use outside React (utility functions, etc.)
let _client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!_client) _client = createClient()
  return _client
}

