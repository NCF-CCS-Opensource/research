import "server-only"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { authDestination, type ProfileAccess } from "@/lib/auth-routing"
import { createServerSupabase } from "@/lib/supabase-server"

export async function enforceProfileRoute(pathname: string) {
  const { userId } = await auth()
  let profile: ProfileAccess | null = null

  if (userId) {
    profile = (
      await (await createServerSupabase())
        .rpc("get_current_profile_access")
        .maybeSingle()
    ).data as typeof profile
  }

  const destination = authDestination(pathname, userId, profile)
  if (destination) redirect(destination)
}
