"use client"

import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { accountWorkspace } from "@/lib/web-transport"

type Option = { id: string; name: string; institutionId?: string | null }
type Profile = {
  email: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  institution_id: string | null
  custom_institution: string | null
  program_id: string | null
  custom_program: string | null
}

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [institutions, setInstitutions] = useState<Option[]>([])
  const [programs, setPrograms] = useState<Option[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    accountWorkspace
      .getProfileSettings()
      .then(({ profile, institutions, programs }) => {
        setProfile(profile)
        setInstitutions(institutions)
        setPrograms(programs)
        setInstitutionId(profile.institution_id ?? "")
      })
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        await accountWorkspace.updateProfileSettings({
          first_name: String(form.get("firstName")),
          middle_name: String(form.get("middleName") || "") || null,
          last_name: String(form.get("lastName")),
          suffix: String(form.get("suffix") || "") || null,
          institution_id: String(form.get("institutionId") || "") || null,
          custom_institution:
            String(form.get("customInstitution") || "") || null,
          program_id: String(form.get("programId") || "") || null,
          custom_program: String(form.get("customProgram") || "") || null,
        })
        setMessage("Profile updated.")
      } catch (reason) {
        setMessage(
          reason instanceof Error ? reason.message : "Profile update failed"
        )
      }
    })
  }

  if (!profile)
    return <p className="text-sm text-muted-foreground">Loading profile…</p>

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-3xl border bg-card p-8"
    >
      <h1 className="text-3xl font-semibold">Profile Settings</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          First Name
          <input
            name="firstName"
            required
            defaultValue={profile.first_name}
            className="h-10 rounded-lg border px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Last Name
          <input
            name="lastName"
            required
            defaultValue={profile.last_name}
            className="h-10 rounded-lg border px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Middle Name
          <input
            name="middleName"
            defaultValue={profile.middle_name ?? ""}
            className="h-10 rounded-lg border px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Suffix
          <input
            name="suffix"
            defaultValue={profile.suffix ?? ""}
            className="h-10 rounded-lg border px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Contact Email
          <input
            value={profile.email}
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
            Program
            <select
              name="programId"
              defaultValue={profile.program_id ?? ""}
              className="h-10 rounded-lg border px-3"
            >
              <option value="">Not applicable</option>
              {programs
                .filter((item) => item.institutionId === institutionId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <>
            <label className="grid gap-2 text-sm">
              Unlisted Institution
              <input
                name="customInstitution"
                required
                defaultValue={profile.custom_institution ?? ""}
                className="h-10 rounded-lg border px-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Program (optional)
              <input
                name="customProgram"
                defaultValue={profile.custom_program ?? ""}
                className="h-10 rounded-lg border px-3"
              />
            </label>
          </>
        )}
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <Button disabled={isPending}>Save Profile</Button>
    </form>
  )
}
