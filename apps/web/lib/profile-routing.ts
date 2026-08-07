import "server-only"

import { redirect } from "next/navigation"

import { authDestination, type ProfileAccess } from "@/lib/auth-routing"
import { createServerSupabase } from "@/lib/supabase-server"

export async function enforceProfileRoute(pathname: string) {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null
  let profile: ProfileAccess | null = null

  if (userId) {
    profile = (
      await supabase.rpc("get_current_profile_access").maybeSingle()
    ).data as typeof profile
  }

  const destination = authDestination(pathname, userId, profile)
  if (destination) redirect(destination)
}
