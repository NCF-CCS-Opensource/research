"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get("email"))
    setError(null)
    startTransition(async () => {
      const { error: resetError } =
        await getSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
        })
      if (resetError) setError(resetError.message)
      else setMessage("Check your email for the password reset link.")
    })
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="h-10 rounded-lg border bg-background px-3"
        />
      </label>
      <Button disabled={isPending}>Send reset link</Button>
      {message ? (
        <p className="rounded-lg bg-secondary p-3 text-sm">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
