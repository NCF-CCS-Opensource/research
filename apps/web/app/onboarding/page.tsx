import { PublicShell } from "@/components/layout/public-shell"
import { enforceProfileRoute } from "@/lib/profile-routing"
import { createServerSupabase } from "@/lib/supabase-server"
import { currentUser } from "@clerk/nextjs/server"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  await enforceProfileRoute("/onboarding")
  const supabase = await createServerSupabase()
  const [user, { next }, institutions, programs] = await Promise.all([
    currentUser(),
    searchParams,
    supabase.from("institutions").select("id,name").order("name"),
    supabase.from("programs").select("id,name,institution_id").order("name"),
  ])
  if (!user?.primaryEmailAddress) return null

  return (
    <PublicShell>
      <main className="mx-auto max-w-2xl px-4 py-16">
        <OnboardingForm
          email={user.primaryEmailAddress.emailAddress}
          firstName={user.firstName ?? ""}
          lastName={user.lastName ?? ""}
          next={next ?? "/dashboard"}
          institutions={institutions.data ?? []}
          programs={programs.data ?? []}
        />
      </main>
    </PublicShell>
  )
}
