import { PublicShell } from "@/components/layout/public-shell"
import { enforceProfileRoute } from "@/lib/profile-routing"
import { createServerSupabase } from "@/lib/supabase-server"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  await enforceProfileRoute("/onboarding")
  const supabase = await createServerSupabase()
  const [userResult, { next }, institutions, programs] = await Promise.all([
    supabase.auth.getUser(),
    searchParams,
    supabase.from("institutions").select("id,name").order("name"),
    supabase.from("programs").select("id,name,institution_id").order("name"),
  ])
  const user = userResult.data.user
  if (!user?.email) return null

  return (
    <PublicShell>
      <main className="mx-auto max-w-2xl px-4 py-16">
        <OnboardingForm
          email={user.email}
          firstName={String(user.user_metadata.first_name ?? "")}
          lastName={String(user.user_metadata.last_name ?? "")}
          next={next ?? "/dashboard"}
          institutions={institutions.data ?? []}
          programs={programs.data ?? []}
        />
      </main>
    </PublicShell>
  )
}
