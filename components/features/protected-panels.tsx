"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { clientAction, clientEnvelope, clientPaginated } from "@/lib/client-api"
import type {
  AnalyticsOverview,
  AnalyticsPoint,
  Category,
  CollectionItem,
  Keyword,
  MyPdfAccessItem,
  NotificationItem,
  PendingPdfRequestItem,
  ResearchSummary,
  UserProfile,
} from "@/types/api"

function AuthNotice({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {error}
    </div>
  )
}

function StatGrid({ overview }: { overview: AnalyticsOverview | null }) {
  const stats = [
    ["Papers", overview?.totalResearches],
    ["Views", overview?.totalViews],
    ["Downloads", overview?.totalDownloads],
    ["Citations", overview?.totalCitations],
    ...(overview?.totalUsers === undefined ? [] : [["Users", overview.totalUsers] as [string, number]]),
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-background p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value ?? "--"}</p>
        </div>
      ))}
    </div>
  )
}

type UploadsByRole = { role: string; uploads: number }

type AuditLogEntry = {
  id: string
  action: "approve" | "reject" | "delete"
  createdAt: string
  admin: { firstName: string; lastName: string } | null
  research: { id: string; title: string } | null
  meta: { reason?: string } | null
}

export function AnalyticsPanel({ admin = false }: { admin?: boolean }) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [trend, setTrend] = useState<AnalyticsPoint[]>([])
  const [uploadsByRole, setUploadsByRole] = useState<UploadsByRole[]>([])
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prefix = admin ? "/analytics/admin" : "/analytics/user"
    clientEnvelope<AnalyticsOverview>(`${prefix}/overview`)
      .then(setOverview)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load analytics"))

    if (admin) {
      clientEnvelope<UploadsByRole[]>("/analytics/admin/uploads-by-role")
        .then(setUploadsByRole)
        .catch(() => {})
    }
  }, [admin])

  useEffect(() => {
    const prefix = admin ? "/analytics/admin" : "/analytics/user"
    clientEnvelope<AnalyticsPoint[]>(`${prefix}/trends?period=${period}&metric=views`)
      .then(setTrend)
      .catch(() => {})
  }, [admin, period])

  const periodLabels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{admin ? "Admin Dashboard" : "User Dashboard"}</h1>
      <p className="mt-3 text-muted-foreground">Live analytics from the backend.</p>
      <div className="mt-8"><AuthNotice error={error} /></div>
      <div className="mt-6"><StatGrid overview={overview} /></div>

      <div className="mt-8 rounded-xl border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Views</h2>
          <div className="flex gap-1 rounded-lg border bg-muted/30 p-0.5">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {trend.map((point) => (
            <div key={point.date} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>{new Date(point.date).toLocaleDateString()}</span>
              <span className="font-medium">{point.count}</span>
            </div>
          ))}
          {!trend.length && <p className="text-sm text-muted-foreground">No trend data yet.</p>}
        </div>
      </div>

      {admin && uploadsByRole.length > 0 && (
        <div className="mt-6 rounded-xl border bg-background p-5">
          <h2 className="font-semibold">Uploads by role</h2>
          <div className="mt-4 grid gap-2">
            {uploadsByRole.map((row) => (
              <div key={row.role} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="capitalize">{row.role}</span>
                <span className="font-medium">{row.uploads} uploads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
}

export function MyPapersPanel() {
  const [papers, setPapers] = useState<ResearchSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    clientPaginated<ResearchSummary>("/research/my")
      .then((response) => setPapers(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load papers"))
  }

  useEffect(load, [])

  function remove(id: string) {
    if (!window.confirm("Delete this paper? This cannot be undone.")) return
    startTransition(async () => {
      try {
        await clientAction(`/research/${id}`, "DELETE")
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed")
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">My Papers</h1>
        <Button asChild><Link href="/upload">Submit new</Link></Button>
      </div>
      <div className="mt-6"><AuthNotice error={error} /></div>
      {papers.length ? (
        <div className="mt-6 grid gap-3">
          {papers.map((paper) => (
            <div key={paper.id} className="flex items-start justify-between gap-4 rounded-xl border bg-background p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/research/${paper.id}`} className="font-medium hover:text-primary line-clamp-1 transition-colors">
                  {paper.title}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`rounded border px-1.5 py-0.5 font-medium capitalize ${STATUS_STYLES[paper.status ?? "pending"] ?? ""}`}>
                    {paper.status ?? "pending"}
                  </span>
                  <span className="capitalize">{paper.filePrivacy ?? "public"}</span>
                  <span>{paper.viewCount ?? 0} views</span>
                </div>
                {paper.status === "rejected" && paper.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    Rejection reason: {paper.rejectionReason}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(paper.status === "pending" || paper.status === "rejected") && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/papers/${paper.id}/edit`}>Edit</Link>
                    </Button>
                    {paper.status === "rejected" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          if (!window.confirm("Resubmit this paper for review?")) return
                          startTransition(async () => {
                            try {
                              await clientAction(`/research/${paper.id}/resubmit`, "PATCH")
                              load()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Resubmit failed")
                            }
                          })
                        }}
                      >
                        Resubmit
                      </Button>
                    )}
                    <Button variant="outline" size="sm" disabled={isPending} onClick={() => remove(paper.id)}
                      className="text-destructive hover:text-destructive">
                      Delete
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/research/${paper.id}`}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">No papers yet. Submit your first research.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/upload">Submit a paper</Link>
            </Button>
          </div>
        )
      )}
    </section>
  )
}

export function CollectionsPanel() {
  const [items, setItems] = useState<CollectionItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    clientEnvelope<CollectionItem[]>("/collections")
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load collections"))
  }

  useEffect(load, [])

  function remove(researchId: string) {
    startTransition(async () => {
      try {
        await clientAction(`/collections/${researchId}`, "DELETE")
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Remove failed")
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">My Collections</h1>
      <div className="mt-6"><AuthNotice error={error} /></div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item.researchId} className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <Link href={`/research/${item.researchId}`} className="font-medium hover:text-primary">{item.research.title}</Link>
            <Button variant="outline" disabled={isPending} onClick={() => remove(item.researchId)}>Remove</Button>
          </div>
        ))}
        {!items.length && !error && <p className="text-sm text-muted-foreground">No saved papers yet.</p>}
      </div>
    </section>
  )
}

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    clientPaginated<NotificationItem>("/notifications")
      .then((response) => setItems(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load notifications"))
  }

  useEffect(load, [])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <Button disabled={isPending} onClick={() => startTransition(async () => { await clientAction("/notifications/read-all", "PATCH"); load() })}>
          Mark all read
        </Button>
      </div>
      <div className="mt-6"><AuthNotice error={error} /></div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <p className={item.read ? "text-muted-foreground" : "font-medium"}>{item.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        ))}
        {!items.length && !error && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
      </div>
    </section>
  )
}

export function PdfRequestsPanel() {
  const [mine, setMine] = useState<MyPdfAccessItem[]>([])
  const [pending, setPending] = useState<PendingPdfRequestItem[]>([])
  const [error, setError] = useState<string | null>(null)

  function load() {
    void Promise.all([
      clientEnvelope<MyPdfAccessItem[]>("/pdf-requests/mine").then(setMine),
      clientEnvelope<PendingPdfRequestItem[]>("/pdf-requests/pending").then(setPending),
    ]).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Unable to load PDF access"),
    )
  }

  useEffect(load, [])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">PDF Access</h1>
      <div className="mt-6"><AuthNotice error={error} /></div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold">My PDF Access</h2>
        <div className="mt-4 grid gap-3">
          {mine.map((request) => (
            <div key={request.id} className="rounded-xl border p-4">
              {request.research.id ? (
                <Link href={`/research/${request.research.id}`} className="font-medium hover:underline">
                  {request.research.title}
                </Link>
              ) : (
                <p className="font-medium">{request.research.title}</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">Owner: {request.ownerName}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{request.requestNote}</p>
              <p className="mt-2 text-xs capitalize text-muted-foreground">
                {request.status} · {new Date(request.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {!mine.length && !error && <p className="text-sm text-muted-foreground">No PDF access requests yet.</p>}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold">Pending Requests</h2>
        <div className="mt-4 grid gap-3">
          {pending.map((request) => (
            <div key={request.id} className="rounded-xl border p-4">
              <Link href={`/research/${request.research.id}`} className="font-medium hover:underline">
                {request.research.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.requester.fullName} · {request.requester.institution.name}
                {request.requester.program ? ` · ${request.requester.program.name}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{request.requestNote}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Requested {new Date(request.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {!pending.length && !error && <p className="text-sm text-muted-foreground">No pending requests.</p>}
        </div>
      </div>
    </section>
  )
}

export function SettingsPanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [picMessage, setPicMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picError, setPicError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isPicPending, startPicTransition] = useTransition()
  const [pwMessage, setPwMessage] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)
  const [isPwPending, startPwTransition] = useTransition()

  useEffect(() => {
    clientEnvelope<UserProfile>("/users/me")
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load profile"))
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        const updated = await clientAction<UserProfile>("/users/me", "PATCH", {
          firstName: form.get("firstName"),
          middleName: form.get("middleName") || null,
          lastName: form.get("lastName"),
          suffix: form.get("suffix") || null,
        })
        setProfile(updated)
        setProfileMessage("Profile updated")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  function onPicUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const file = (new FormData(event.currentTarget).get("picture")) as File | null
    setPicError(null)
    setPicMessage(null)

    if (!file || file.size === 0) { setPicError("Select an image file."); return }
    if (!file.type.startsWith("image/")) { setPicError("Only image files are accepted."); return }
    if (file.size > 5 * 1024 * 1024) { setPicError("Image must be under 5 MB."); return }

    startPicTransition(async () => {
      try {
        const { uploadUrl } = await clientAction<{ uploadUrl: string; key: string }>("/users/me/profile-picture", "POST", { contentType: file.type })
        const r2 = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
        if (!r2.ok) throw new Error("Upload to storage failed")
        setPicMessage("Profile picture updated.")
      } catch (err) {
        setPicError(err instanceof Error ? err.message : "Upload failed")
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Account Settings</h1>
      <div className="mt-6"><AuthNotice error={error} /></div>

      {/* Profile picture */}
      <div className="mt-8 border-t pt-8">
        <h2 className="font-semibold">Profile Picture</h2>
        <form onSubmit={onPicUpload} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Image file
            <input name="picture" type="file" accept="image/*" className="rounded-lg border bg-background p-2 text-sm" />
          </label>
          <Button type="submit" variant="outline" disabled={isPicPending}>
            {isPicPending ? "Uploading…" : "Upload"}
          </Button>
        </form>
        {picMessage && <p className="mt-2 text-sm text-muted-foreground">{picMessage}</p>}
        {picError && <p className="mt-2 text-sm text-destructive">{picError}</p>}
      </div>

      {/* Profile fields */}
      {profile && (
        <form onSubmit={onSubmit} className="mt-8 grid max-w-2xl gap-4 border-t pt-8">
          <h2 className="font-semibold">Personal Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">First Name<input name="firstName" defaultValue={profile.firstName} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-2 text-sm">Last Name<input name="lastName" defaultValue={profile.lastName} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-2 text-sm">Middle Name<input name="middleName" defaultValue={profile.middleName ?? ""} className="h-10 rounded-lg border bg-background px-3" /></label>
            <label className="grid gap-2 text-sm">Suffix<input name="suffix" defaultValue={profile.suffix ?? ""} className="h-10 rounded-lg border bg-background px-3" /></label>
          </div>
          <div className="grid gap-1 text-sm text-muted-foreground">
            <span>Email: {profile.email}</span>
            {profile.institution && <span>Institution: {profile.institution.name}</span>}
            {profile.program && <span>Program: {profile.program.name}</span>}
          </div>
          {profileMessage && <p className="text-sm text-muted-foreground">{profileMessage}</p>}
          <Button disabled={isPending} className="w-fit">Save changes</Button>
        </form>
      )}

      {/* Change password */}
      <div className="mt-8 border-t pt-8">
        <h2 className="font-semibold">Change Password</h2>
        <form
          className="mt-4 grid max-w-sm gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            const currentPassword = String(form.get("currentPassword") ?? "")
            const newPassword = String(form.get("newPassword") ?? "")
            const confirm = String(form.get("confirmPassword") ?? "")
            setPwError(null)
            setPwMessage(null)

            if (newPassword !== confirm) {
              setPwError("New passwords do not match.")
              return
            }

            startPwTransition(async () => {
              try {
                const res = await clientAction<{ message: string }>("/auth/change-password", "PATCH", {
                  currentPassword,
                  newPassword,
                })
                setPwMessage(res.message)
                ;(e.target as HTMLFormElement).reset()
              } catch (err) {
                setPwError(err instanceof Error ? err.message : "Password change failed")
              }
            })
          }}
        >
          <label className="grid gap-2 text-sm">
            Current Password
            <input name="currentPassword" type="password" required className="h-10 rounded-lg border bg-background px-3" />
          </label>
          <label className="grid gap-2 text-sm">
            New Password
            <input name="newPassword" type="password" required minLength={8} className="h-10 rounded-lg border bg-background px-3" />
          </label>
          <label className="grid gap-2 text-sm">
            Confirm New Password
            <input name="confirmPassword" type="password" required minLength={8} className="h-10 rounded-lg border bg-background px-3" />
          </label>
          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwMessage && <p className="text-sm text-muted-foreground">{pwMessage}</p>}
          <Button type="submit" variant="outline" disabled={isPwPending} className="w-fit">
            {isPwPending ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </div>
    </section>
  )
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function load() {
    clientPaginated<UserProfile>("/users")
      .then((response) => setUsers(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load users"))
  }

  useEffect(load, [])

  function remove(id: string) {
    if (!window.confirm("Delete this user? This cannot be undone.")) return
    startTransition(async () => {
      try {
        await clientAction(`/users/${id}`, "DELETE")
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed")
      }
    })
  }

  function saveEdit(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        await clientAction(`/users/${id}`, "PATCH", {
          role: form.get("role"),
          status: form.get("status"),
        })
        setEditingId(null)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Manage Users</h1>
      <div className="mt-6"><AuthNotice error={error} /></div>
      <div className="mt-6 grid gap-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl border bg-background p-4">
            {editingId === user.id ? (
              <form onSubmit={(e) => saveEdit(e, user.id)} className="grid gap-3">
                <p className="font-medium">{user.firstName} {user.lastName} <span className="text-sm font-normal text-muted-foreground">· {user.email}</span></p>
                <div className="flex flex-wrap gap-3">
                  <label className="grid gap-1 text-xs">
                    Role
                    <select name="role" defaultValue={user.role} className="h-8 rounded border bg-background px-2 text-sm">
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs">
                    Status
                    <select name="status" defaultValue={user.status} className="h-8 rounded border bg-background px-2 text-sm">
                      <option value="unverified">unverified</option>
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isPending}>Save</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{user.role}</span>
                    <span>·</span>
                    <span className="capitalize">{user.status}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(user.id)}>Edit</Button>
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => remove(user.id)}
                    className="text-destructive hover:text-destructive">Delete</Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!users.length && !error && <p className="text-sm text-muted-foreground">No users found.</p>}
      </div>
    </section>
  )
}

export function AdminResearchPanel({ statusFilter = "" }: { statusFilter?: string }) {
  const [papers, setPapers] = useState<ResearchSummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeStatus, setActiveStatus] = useState(statusFilter)
  const [aiResult, setAiResult] = useState<{ paperId: string; type: string; text: string } | null>(null)
  const [isAiPending, startAiTransition] = useTransition()

  function load(status: string) {
    const path = status ? `/research/admin/all?status=${status}` : "/research/admin/all"
    clientPaginated<ResearchSummary>(path, 1, 50)
      .then((response) => {
        setPapers(response.data)
        setTotal(response.meta.total)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load research"))
  }

  useEffect(() => { load(activeStatus) }, [activeStatus])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const pending = papers.filter((p) => p.status === "pending")
    if (selected.size === pending.length && pending.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pending.map((p) => p.id)))
    }
  }

  function bulkApprove() {
    if (!selected.size) return
    if (!window.confirm(`Approve ${selected.size} paper(s)?`)) return
    startTransition(async () => {
      const results = await Promise.allSettled(
        [...selected].map((id) => clientAction(`/research/${id}/approve`, "PATCH"))
      )
      const failed = results.filter((r) => r.status === "rejected").length
      setSelected(new Set())
      if (failed > 0) setError(`${failed} approval(s) failed — please try again.`)
      load(activeStatus)
    })
  }

  function decide(id: string, action: "approve" | "reject") {
    if (action === "reject") {
      const reason = window.prompt("Rejection reason:")
      if (!reason?.trim()) return
      startTransition(async () => {
        try {
          await clientAction(`/research/${id}/reject`, "PATCH", { reason })
          load(activeStatus)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Reject failed")
        }
      })
    } else {
      startTransition(async () => {
        try {
          await clientAction(`/research/${id}/approve`, "PATCH")
          load(activeStatus)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Approve failed")
        }
      })
    }
  }

  function runAi(paper: ResearchSummary, type: "summarize" | "suggest-rejection" | "suggest-tags") {
    setAiResult(null)
    startAiTransition(async () => {
      try {
        const { result } = await clientAction<{ result: string }>(
          `/ai/${type}`,
          "POST",
          { title: paper.title, abstract: paper.abstract ?? "" },
        )
        setAiResult({ paperId: paper.id, type, text: result })
      } catch (err) {
        setAiResult({
          paperId: paper.id,
          type,
          text: err instanceof Error ? err.message : "AI request failed",
        })
      }
    })
  }

  const statusTabs = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ]

  const pendingCount = papers.filter((p) => p.status === "pending").length

  return (
    <section className="rounded-3xl border bg-card p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Manage Research</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} total papers</p>
        </div>
        {selected.size > 0 && (
          <Button disabled={isPending} onClick={bulkApprove}>
            Approve {selected.size} selected
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border bg-muted/30 p-1 w-fit">
        {statusTabs.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setActiveStatus(value); setSelected(new Set()) }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === value
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6"><AuthNotice error={error} /></div>

      {/* Select-all row for pending */}
      {(activeStatus === "" || activeStatus === "pending") && pendingCount > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.size === pendingCount} onChange={toggleAll} className="accent-primary" />
          <span className="text-muted-foreground">Select all pending ({pendingCount})</span>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {papers.map((paper) => (
          <div key={paper.id} className="flex items-start gap-3 rounded-xl border bg-background p-4">
            {paper.status === "pending" && (
              <input
                type="checkbox"
                checked={selected.has(paper.id)}
                onChange={() => toggleSelect(paper.id)}
                className="mt-1 accent-primary"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{paper.title}</h2>
                <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[paper.status ?? "pending"] ?? ""}`}>
                  {paper.status}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{paper.abstract}</p>

              {/* AI Assistant — for any paper with an abstract */}
              {paper.abstract && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">AI Assistant</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      disabled={isAiPending}
                      onClick={() => runAi(paper, "summarize")}
                      className="rounded-lg border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Summarize
                    </button>
                    {paper.status === "pending" && (
                      <button
                        disabled={isAiPending}
                        onClick={() => runAi(paper, "suggest-rejection")}
                        className="rounded-lg border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Draft rejection
                      </button>
                    )}
                    <button
                      disabled={isAiPending}
                      onClick={() => runAi(paper, "suggest-tags")}
                      className="rounded-lg border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Suggest tags
                    </button>
                  </div>

                  {/* Result card — shows below the paper whose AI was triggered */}
                  {aiResult?.paperId === paper.id && (
                    <div className="mt-3 rounded-xl border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold capitalize text-muted-foreground">
                          {aiResult.type.replace(/-/g, " ")}
                        </p>
                        <button
                          onClick={() => setAiResult(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5">{aiResult.text}</pre>
                      {aiResult.type === "suggest-rejection" && (
                        <button
                          className="mt-2 rounded-lg border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                          onClick={() => {
                            const reason = aiResult.text
                            if (confirm(`Use this as rejection reason?\n\n"${reason}"`)) {
                              clientAction(`/research/${paper.id}/reject`, "PATCH", { reason })
                                .then(() => { setAiResult(null); load(activeStatus) })
                                .catch(() => {})
                            }
                          }}
                        >
                          Use as rejection reason
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {paper.status === "pending" && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" disabled={isPending} onClick={() => decide(paper.id, "approve")}>Approve</Button>
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => decide(paper.id, "reject")}>Reject</Button>
              </div>
            )}
          </div>
        ))}
        {!papers.length && !error && <p className="text-sm text-muted-foreground">No papers found.</p>}
      </div>
    </section>
  )
}

export function TaxonomyManager({ title, endpoint }: { title: string; endpoint: string }) {
  const [items, setItems] = useState<Array<Category | Keyword>>([])
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [isPending, startTransition] = useTransition()

  function load() {
    clientEnvelope<Array<Category | Keyword>>(endpoint)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : `Unable to load ${title}`))
  }

  useEffect(load, [endpoint, title])

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = new FormData(event.currentTarget).get("name")
    startTransition(async () => {
      try {
        await clientAction(endpoint, "POST", { name })
        ;(event.target as HTMLFormElement).reset()
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed")
      }
    })
  }

  function startEdit(item: Category | Keyword) {
    setEditingId(item.id)
    setEditName(item.name)
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      try {
        await clientAction(`${endpoint}/${id}`, "PATCH", { name: editName })
        setEditingId(null)
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await clientAction(`${endpoint}/${id}`, "DELETE")
        load()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed")
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6"><AuthNotice error={error} /></div>
      <form onSubmit={create} className="mt-6 flex max-w-xl gap-2">
        <input name="name" required className="h-10 flex-1 rounded-lg border bg-background px-3" placeholder="Name" />
        <Button disabled={isPending}>Create</Button>
      </form>
      <div className="mt-6 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl border p-3">
            {editingId === item.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 flex-1 rounded border bg-background px-2 text-sm"
                  autoFocus
                />
                <Button size="sm" disabled={isPending} onClick={() => saveEdit(item.id)}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1">{item.name}</span>
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => startEdit(item)}>Rename</Button>
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => remove(item.id)}>Delete</Button>
              </>
            )}
          </div>
        ))}
        {!items.length && !error && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>}
      </div>
    </section>
  )
}

const ACTION_STYLES: Record<string, string> = {
  approve: "text-green-700 bg-green-50 border-green-200",
  reject: "text-red-700 bg-red-50 border-red-200",
  delete: "text-gray-700 bg-gray-50 border-gray-200",
}

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    clientPaginated<AuditLogEntry>("/audit-logs", 1, 50)
      .then((r) => setEntries(r.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load audit log"))
  }, [])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Audit Log</h1>
      <p className="mt-2 text-sm text-muted-foreground">All admin actions on research papers.</p>
      <div className="mt-6"><AuthNotice error={error} /></div>
      <div className="mt-6 grid gap-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${ACTION_STYLES[entry.action] ?? ""}`}>
                {entry.action}
              </span>
              <span className="text-sm font-medium">
                {entry.admin ? `${entry.admin.firstName} ${entry.admin.lastName}` : "Unknown admin"}
              </span>
              <span className="text-sm text-muted-foreground">→</span>
              <span className="text-sm">
                {entry.research ? entry.research.title : "Deleted paper"}
              </span>
            </div>
            {entry.meta?.reason && (
              <p className="mt-2 text-xs text-muted-foreground">Reason: {entry.meta.reason}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {!entries.length && !error && (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        )}
      </div>
    </section>
  )
}
