import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Suspense } from "react"

import { LoginForm } from "@/components/forms/login-form"
import { PublicShell } from "@/components/layout/public-shell"

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-fade-up w-full max-w-sm">
          {/* logo mark */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpen className="size-5" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                CCS Research Hub
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <Suspense
              fallback={
                <div className="text-sm text-muted-foreground">Loading…</div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

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
