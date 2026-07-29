"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

export function ResetPasswordForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get("password"))
    startTransition(async () => {
      const { error: updateError } = await getSupabase().auth.updateUser({ password })
      if (updateError) setError(updateError.message)
      else router.push("/dashboard")
    })
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm">
        New password
        <input name="password" type="password" minLength={8} required className="h-10 rounded-lg border bg-background px-3" />
      </label>
      <Button disabled={isPending}>Set password</Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
