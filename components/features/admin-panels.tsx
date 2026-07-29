"use client"

import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  callR2,
  createMetadata,
  deleteMetadata,
  getAdminResearches,
  getAuditLogs,
  getMetadata,
  getProfiles,
  type MetadataTable,
  moderateResearch,
  renameMetadata,
  updateAccount,
} from "@/lib/api"

type Research = Awaited<ReturnType<typeof getAdminResearches>>[number]
type Profile = Awaited<ReturnType<typeof getProfiles>>[number]
type AuditLog = Awaited<ReturnType<typeof getAuditLogs>>[number]

function message(reason: unknown) {
  return reason instanceof Error ? reason.message : "Something went wrong"
}

export function AdminResearchPanel() {
  const [papers, setPapers] = useState<Research[]>([])
  const [status, setStatus] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    getAdminResearches(status).then(setPapers).catch((reason) => setError(message(reason)))
  }

  useEffect(load, [status])

  function decide(id: string, decision: "approved" | "rejected") {
    const reason = decision === "rejected" ? window.prompt("Rejection reason:") : undefined
    if (decision === "rejected" && !reason?.trim()) return
    startTransition(async () => {
      try {
        await moderateResearch(id, decision, reason ?? undefined)
        load()
      } catch (cause) {
        setError(message(cause))
      }
    })
  }

  function viewPdf(id: string) {
    startTransition(async () => {
      try {
        const { url } = await callR2<{ url: string }>({ action: "moderation-download", researchId: id })
        window.open(url, "_blank", "noopener,noreferrer")
      } catch (cause) {
        setError(message(cause))
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Manage Research</h1>
        <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {papers.map((paper) => (
          <div key={paper.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="font-medium">{paper.title}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{paper.status} · {paper.uploadComplete ? "PDF ready" : "PDF incomplete"}</p>
            </div>
            <div className="flex gap-2">
              {paper.uploadComplete ? <Button variant="outline" size="sm" disabled={isPending} onClick={() => viewPdf(paper.id)}>View PDF</Button> : null}
              {paper.status === "pending" ? <>
                <Button size="sm" disabled={isPending || !paper.uploadComplete} onClick={() => decide(paper.id, "approved")}>Approve</Button>
                <Button variant="destructive" size="sm" disabled={isPending} onClick={() => decide(paper.id, "rejected")}>Reject</Button>
              </> : null}
            </div>
          </div>
        ))}
        {!papers.length && !error ? <p className="text-sm text-muted-foreground">No Research Records found.</p> : null}
      </div>
    </section>
  )
}

export function AdminUsersPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    getProfiles().then(setProfiles).catch((reason) => setError(message(reason)))
  }

  useEffect(load, [])

  function change(profile: Profile, field: "role" | "status", value: "user" | "admin" | "active" | "suspended") {
    startTransition(async () => {
      try {
        await updateAccount(
          profile.id,
          field === "role" ? value as "user" | "admin" : profile.role,
          field === "status" ? value as "active" | "suspended" : profile.status
        )
        load()
      } catch (cause) {
        setError(message(cause))
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">Manage Accounts</h1>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="font-medium">{profile.first_name} {profile.last_name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="flex gap-2">
              <select aria-label={`Role for ${profile.email}`} disabled={isPending} className="rounded-lg border bg-background px-3 py-2 text-sm" value={profile.role} onChange={(event) => change(profile, "role", event.target.value as "user" | "admin")}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <select aria-label={`Status for ${profile.email}`} disabled={isPending} className="rounded-lg border bg-background px-3 py-2 text-sm" value={profile.status} onChange={(event) => change(profile, "status", event.target.value as "active" | "suspended")}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function MetadataManager({ title, table }: { title: string; table: MetadataTable }) {
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([])
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    getMetadata(table).then(setItems).catch((reason) => setError(message(reason)))
  }

  useEffect(load, [table])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <form className="mt-6 flex gap-2" onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim()) return
        startTransition(async () => {
          try {
            await createMetadata(table, name)
            setName("")
            load()
          } catch (cause) {
            setError(message(cause))
          }
        })
      }}>
        <input aria-label="Name" required className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" value={name} onChange={(event) => setName(event.target.value)} />
        <Button disabled={isPending}>Add</Button>
      </form>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <span>{item.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => {
                const next = window.prompt("New name:", item.name)
                if (!next?.trim() || next.trim() === item.name) return
                startTransition(async () => { try { await renameMetadata(table, item.id, next); load() } catch (cause) { setError(message(cause)) } })
              }}>Rename</Button>
              <Button variant="destructive" size="sm" disabled={isPending} onClick={() => {
                if (!window.confirm(`Delete “${item.name}”?`)) return
                startTransition(async () => { try { await deleteMetadata(table, item.id); load() } catch (cause) { setError(message(cause)) } })
              }}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuditLogs().then(setLogs).catch((reason) => setError(message(reason)))
  }, [])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">Audit Log</h1>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border p-4">
            <p className="font-medium capitalize">{log.action.replaceAll("-", " ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{log.research_id ?? "Account or metadata action"} · {new Date(log.created_at).toLocaleString()}</p>
          </div>
        ))}
        {!logs.length && !error ? <p className="text-sm text-muted-foreground">No audit events yet.</p> : null}
      </div>
    </section>
  )
}
