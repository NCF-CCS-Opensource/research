"use server"

import { currentUser } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { onboardingProfile } from "@/lib/onboarding"
import { safeNextPath } from "@/lib/safe-next-path"

export type OnboardingState = { error?: string }

export async function completeOnboarding(
  _state: OnboardingState,
  form: FormData
): Promise<OnboardingState> {
  const user = await currentUser()
  const email = user?.primaryEmailAddress
  if (!user || !email || email.verification?.status !== "verified")
    return { error: "A verified Google account is required." }

  const profile = onboardingProfile(
    { id: user.id, email: email.emailAddress },
    form
  )
  if (typeof profile === "string") return { error: profile }

  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  if (profile.program_id) {
    const program = await service
      .from("programs")
      .select("id")
      .eq("id", profile.program_id)
      .eq("institution_id", profile.institution_id)
      .maybeSingle()
    if (!program.data)
      return { error: "Program must belong to the selected Institution." }
  }

  const { error: insertError } = await service.from("profiles").insert(profile)

  if (insertError?.code === "23505") redirect("/dashboard")
  if (insertError) return { error: "Unable to complete your Profile." }
  redirect(safeNextPath(String(form.get("next") ?? ""), "/dashboard"))
}
