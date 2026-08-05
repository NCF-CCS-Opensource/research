import Link from "next/link"
import { BookOpenText } from "lucide-react"
import { Suspense } from "react"

import { LoginForm } from "@/components/forms/login-form"
import { PublicShell } from "@/components/layout/public-shell"
import { Card } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="archive-grid mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-fade-up w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center bg-primary text-primary-foreground shadow-[5px_5px_0_var(--accent)]">
              <BookOpenText className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to continue your research.
              </p>
            </div>
          </div>

          <Card className="rounded-none p-8 shadow-[7px_7px_0_var(--primary)]">
            <Suspense
              fallback={
                <div className="text-sm text-muted-foreground">Loading…</div>
              }
            >
              <LoginForm />
            </Suspense>
          </Card>

          <div className="mt-5 flex justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              Forgot password?
            </Link>
            <Link
              href="/register"
              className="font-medium transition-colors duration-150 hover:text-primary"
            >
              Register
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
