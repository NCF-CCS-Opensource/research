"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password"))
    if (password !== form.get("confirmPassword")) {
      setError("Passwords do not match")
      return
    }
    setError(null)
    startTransition(async () => {
      const email = String(form.get("email"))
      const { error: signupError } = await getSupabase().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding` },
      })
      if (signupError) setError(signupError.message)
      else router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">Email<input name="email" type="email" required className="h-10 rounded-lg border bg-background px-3" /></label>
      <label className="grid gap-2 text-sm">Password<input name="password" type="password" required minLength={8} className="h-10 rounded-lg border bg-background px-3" /></label>
      <label className="grid gap-2 text-sm">Confirm Password<input name="confirmPassword" type="password" required minLength={8} className="h-10 rounded-lg border bg-background px-3" /></label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create Account"}</Button>
    </form>
  )
}
