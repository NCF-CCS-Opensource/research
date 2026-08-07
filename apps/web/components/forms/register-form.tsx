"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getSupabase } from "@/lib/supabase"

type InstitutionOption = { id: string; name: string }
type ProgramOption = InstitutionOption & { institution_id: string | null }

export function RegisterForm({
  institutions,
  programs,
}: {
  institutions: InstitutionOption[]
  programs: ProgramOption[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState("")
  const [isPending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    if (password !== String(form.get("confirmPassword") ?? "")) {
      setError("Passwords do not match.")
      return
    }
    setError(null)
    startTransition(async () => {
      const optionalTrimmedValue = (name: string) =>
        String(form.get(name) ?? "").trim() || null
      const email = String(form.get("email") ?? "").trim()
      const { error: signupError } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            first_name: optionalTrimmedValue("firstName"),
            middle_name: optionalTrimmedValue("middleName"),
            last_name: optionalTrimmedValue("lastName"),
            suffix: optionalTrimmedValue("suffix"),
            institution_id: optionalTrimmedValue("institutionId"),
            custom_institution: optionalTrimmedValue("customInstitution"),
            program_id: optionalTrimmedValue("programId"),
            custom_program: optionalTrimmedValue("customProgram"),
          },
        },
      })
      if (signupError) setError(signupError.message)
      else router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First Name"
          name="firstName"
          required
          maxLength={100}
        />
        <TextField label="Last Name" name="lastName" required maxLength={100} />
        <TextField label="Middle Name" name="middleName" maxLength={100} />
        <TextField label="Suffix" name="suffix" maxLength={20} />
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={255}
            className="h-10"
          />
        </Field>
        <Field data-invalid={error === "Passwords do not match."}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="h-10"
            aria-invalid={error === "Passwords do not match."}
          />
        </Field>
        <Field data-invalid={error === "Passwords do not match."}>
          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="h-10"
            aria-invalid={error === "Passwords do not match."}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="institutionId">Institution</FieldLabel>
          <select
            id="institutionId"
            name="institutionId"
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Not listed</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
        </Field>
        {institutionId ? (
          <Field>
            <FieldLabel htmlFor="programId">Program (optional)</FieldLabel>
            <select
              id="programId"
              name="programId"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Not applicable</option>
              {programs
                .filter((program) => program.institution_id === institutionId)
                .map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
            </select>
          </Field>
        ) : (
          <>
            <TextField
              label="Unlisted Institution"
              name="customInstitution"
              required
              maxLength={255}
            />
            <TextField
              label="Program (optional)"
              name="customProgram"
              maxLength={255}
            />
          </>
        )}
      </FieldGroup>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Creating…" : "Create Account"}
      </Button>
    </form>
  )
}

function TextField({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} className="h-10" {...props} />
    </Field>
  )
}
