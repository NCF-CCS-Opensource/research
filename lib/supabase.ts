import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key)
    throw new Error("Supabase public environment is not configured")

  return (client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }))
}
