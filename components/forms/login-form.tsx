"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
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
      try {
        const supabase = getSupabase()
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: String(form.get("email")),
          password: String(form.get("password")),
        })
        if (loginError) throw loginError
        const { data: profile } = await supabase
          .from("profiles")
          .select("role,status")
          .eq("id", data.user.id)
          .single()
        if (!profile || profile.status !== "active") {
          await supabase.auth.signOut()
          throw new Error("This account is suspended")
        }
        const next = searchParams.get("next")
        const fallback = profile.role === "admin" ? "/admin" : "/dashboard"
        router.push(next?.startsWith("/") && !next.startsWith("//") ? next : fallback)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        Email
        <input name="email" type="email" required className="h-10 rounded-lg border bg-background px-3" />
      </label>
      <label className="grid gap-2 text-sm">
        Password
        <input name="password" type="password" required className="h-10 rounded-lg border bg-background px-3" />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? "Signing in..." : "Sign In"}</Button>
    </form>
  )
}
