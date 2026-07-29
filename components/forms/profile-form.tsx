"use client"

import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase"

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
    const supabase = getSupabase()
    Promise.all([
      supabase.from("profiles").select("first_name,middle_name,last_name,suffix,institution_id,program_id").single(),
      supabase.from("institutions").select("id,name").order("name"),
      supabase.from("programs").select("id,name").order("name"),
    ]).then(([profileResult, institutionResult, programResult]) => {
      setProfile(profileResult.data)
      setInstitutions(institutionResult.data ?? [])
      setPrograms(programResult.data ?? [])
    })
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const { error } = await getSupabase()
        .from("profiles")
        .update({
          first_name: form.get("firstName"),
          middle_name: form.get("middleName") || null,
          last_name: form.get("lastName"),
          suffix: form.get("suffix") || null,
          institution_id: form.get("institutionId") || null,
          program_id: form.get("programId") || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (await getSupabase().auth.getUser()).data.user!.id)
      setMessage(error?.message ?? "Profile updated.")
    })
  }

  if (!profile) return <p className="text-sm text-muted-foreground">Loading profile…</p>

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">Profile Settings</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">First Name<input name="firstName" required defaultValue={profile.first_name} className="h-10 rounded-lg border px-3" /></label>
        <label className="grid gap-2 text-sm">Last Name<input name="lastName" required defaultValue={profile.last_name} className="h-10 rounded-lg border px-3" /></label>
        <label className="grid gap-2 text-sm">Middle Name<input name="middleName" defaultValue={profile.middle_name ?? ""} className="h-10 rounded-lg border px-3" /></label>
        <label className="grid gap-2 text-sm">Suffix<input name="suffix" defaultValue={profile.suffix ?? ""} className="h-10 rounded-lg border px-3" /></label>
        <label className="grid gap-2 text-sm">Institution<select name="institutionId" defaultValue={profile.institution_id ?? ""} className="h-10 rounded-lg border px-3"><option value="">Not listed</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm">Program<select name="programId" defaultValue={profile.program_id ?? ""} className="h-10 rounded-lg border px-3"><option value="">Not applicable</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <Button disabled={isPending}>Save Profile</Button>
    </form>
  )
}
