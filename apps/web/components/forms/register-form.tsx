"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { accountWorkspace } from "@/lib/web-transport"
import type { MetadataItem } from "@repo/api-client"
import { getSupabase } from "@/lib/supabase"

type Option = { id: string; name: string }

export function RegisterForm() {
  const router = useRouter()
  const [institutions, setInstitutions] = useState<Option[]>([])
  const [programs, setPrograms] = useState<Option[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    Promise.all([
      accountWorkspace.manageMetadata<MetadataItem[]>({ action: "list", table: "institutions" }),
      accountWorkspace.manageMetadata<MetadataItem[]>({ action: "list", table: "programs" })
    ])
      .then(([institutions, programs]) => {
        setInstitutions(institutions)
        setPrograms(programs)
      })
      .catch(() => {})
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    const confirmPassword = String(form.get("confirmPassword") ?? "")
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    startTransition(async () => {
      try {
        const email = String(form.get("email") ?? "")
        const { error: signupError } = await getSupabase().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
            data: {
              first_name: form.get("firstName"),
              middle_name: form.get("middleName") || undefined,
              last_name: form.get("lastName"),
              suffix: form.get("suffix") || undefined,
              institution_id: form.get("institutionId") || undefined,
              program_id: form.get("programId") || undefined,
            },
          },
        })
        if (signupError) throw signupError
        setMessage("Check your email to confirm your account.")
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to register")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          First Name
          <input
            name="firstName"
            required
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Last Name
          <input
            name="lastName"
            required
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Middle Name
          <input
            name="middleName"
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Suffix
          <input
            name="suffix"
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="h-10 rounded-lg border bg-background px-3"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Confirm
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Institution
          <select
            name="institutionId"
            className="h-10 rounded-lg border bg-background px-3"
          >
            <option value="">External / not listed</option>
            {institutions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          Program
          <select
            name="programId"
            className="h-10 rounded-lg border bg-background px-3"
          >
            <option value="">Not applicable</option>
            {programs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="rounded-lg bg-secondary p-3 text-sm">
          {message}{" "}
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Account"}
      </Button>
    </form>
  )
}
