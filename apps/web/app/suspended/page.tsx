import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
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
        <form action="/api/auth/logout" method="POST">
          <Button variant="outline" type="submit" className="mt-8">
            Sign Out
          </Button>
        </form>
      </main>
    </PublicShell>
  )
}
