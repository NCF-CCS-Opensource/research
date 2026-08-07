import { PublicShell } from "@/components/layout/public-shell"
import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function OnboardingPage() {
  await enforceProfileRoute("/onboarding")
  return (
    <PublicShell>
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-heading text-4xl font-semibold">Complete your Profile</h1>
        <p className="mt-4 text-muted-foreground">
          Profile onboarding is not available yet. Please contact an administrator.
        </p>
      </main>
    </PublicShell>
  )
}
