import { SignOut } from "@/components/auth/sign-out"
import { PublicShell } from "@/components/layout/public-shell"
import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function SuspendedPage() {
  await enforceProfileRoute("/suspended")
  return (
    <PublicShell>
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-heading text-4xl font-semibold">Account suspended</h1>
        <p className="mt-4 text-muted-foreground">
          Your account cannot access protected Research Hub features. Contact an administrator for help.
        </p>
        <SignOut className="mt-8" />
      </main>
    </PublicShell>
  )
}
