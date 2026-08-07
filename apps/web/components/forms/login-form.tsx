"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ProfileAccess } from "@/lib/auth-routing"
import { safeNextPath } from "@/lib/safe-next-path"
import { getSupabase } from "@/lib/supabase"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    startTransition(async () => {
      const supabase = getSupabase()
      try {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: String(form.get("email")),
          password: String(form.get("password")),
        })
        if (loginError) throw loginError
        const profile = (
          await supabase.rpc("get_current_profile_access").maybeSingle()
        ).data as ProfileAccess | null
        if (!profile) {
          router.push(`/onboarding?next=${encodeURIComponent(safeNextPath(searchParams.get("next"), "/dashboard"))}`)
        } else if (profile.status !== "active") {
          await supabase.auth.signOut()
          throw new Error("This account is suspended")
        } else {
          const fallback = profile.role === "admin" ? "/admin" : "/dashboard"
          router.push(safeNextPath(searchParams.get("next"), fallback))
        }
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to sign in")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        Email
        <Input name="email" type="email" required className="h-10" />
      </label>
      <label className="grid gap-2 text-sm">
        Password
        <Input name="password" type="password" required className="h-10" />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}
