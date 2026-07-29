"use client"

import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { getProfileSettings, updateProfileSettings } from "@/lib/api"

type Option = { id: string; name: string }
type Profile = {
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  institution_id: string | null
  program_id: string | null
}

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [institutions, setInstitutions] = useState<Option[]>([])
  const [programs, setPrograms] = useState<Option[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getProfileSettings().then(({ profile, institutions, programs }) => {
      setProfile(profile)
      setInstitutions(institutions)
      setPrograms(programs)
    })
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        await updateProfileSettings({
          first_name: String(form.get("firstName")),
          middle_name: String(form.get("middleName") || "") || null,
          last_name: String(form.get("lastName")),
          suffix: String(form.get("suffix") || "") || null,
          institution_id: String(form.get("institutionId") || "") || null,
          program_id: String(form.get("programId") || "") || null,
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
          Institution
          <select
            name="institutionId"
            defaultValue={profile.institution_id ?? ""}
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
        <label className="grid gap-2 text-sm">
          Program
          <select
            name="programId"
            defaultValue={profile.program_id ?? ""}
            className="h-10 rounded-lg border px-3"
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
      {message ? <p className="text-sm">{message}</p> : null}
      <Button disabled={isPending}>Save Profile</Button>
    </form>
  )
}
