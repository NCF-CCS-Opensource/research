"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { completeOnboarding } from "./actions"

type Option = { id: string; name: string; institution_id?: string | null }

export function OnboardingForm({
  email,
  firstName,
  lastName,
  next,
  institutions,
  programs,
}: {
  email: string
  firstName: string
  lastName: string
  next: string
  institutions: Option[]
  programs: Option[]
}) {
  const [state, action, pending] = useActionState(completeOnboarding, {})
  const [institutionId, setInstitutionId] = useState("")

  return (
    <form action={action} className="grid gap-4 rounded-3xl border bg-card p-8">
      <h1 className="font-heading text-3xl font-semibold">
        Complete your Profile
      </h1>
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First Name"
          name="firstName"
          defaultValue={firstName}
          required
        />
        <Field
          label="Last Name"
          name="lastName"
          defaultValue={lastName}
          required
        />
        <Field label="Middle Name" name="middleName" />
        <Field label="Suffix" name="suffix" />
        <label className="grid gap-2 text-sm sm:col-span-2">
          Contact Email
          <input
            value={email}
            readOnly
            className="h-10 rounded-lg border bg-muted px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Institution
          <select
            name="institutionId"
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            className="h-10 rounded-lg border px-3"
          >
            <option value="">Not listed</option>
            {institutions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {institutionId ? (
          <label className="grid gap-2 text-sm">
            Program (optional)
            <select name="programId" className="h-10 rounded-lg border px-3">
              <option value="">Not applicable</option>
              {programs
                .filter((item) => item.institution_id === institutionId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <>
            <Field
              label="Unlisted Institution"
              name="customInstitution"
              required
            />
            <Field label="Program (optional)" name="customProgram" />
          </>
        )}
      </div>
      {state.error ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button disabled={pending}>{pending ? "Saving…" : "Continue"}</Button>
    </form>
  )
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2 text-sm">
      {label}
      <input {...props} className="h-10 rounded-lg border px-3" />
    </label>
  )
}
