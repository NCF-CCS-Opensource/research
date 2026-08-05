"use client"

import { useCallback, useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { accountWorkspace, pdfAccess } from "@/lib/web-transport"
import type { PdfAccessDashboard } from "@repo/api-client"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong"
}

export function NotificationsPanel() {
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof accountWorkspace.getNotifications>>
  >([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const load = useCallback(() => {
    accountWorkspace.getNotifications()
      .then(setItems)
      .catch((reason) => setError(errorMessage(reason)))
  }, [])

  useEffect(() => {
    load()
    const focus = () => load()
    window.addEventListener("focus", focus)
    return () => window.removeEventListener("focus", focus)
  }, [load])

  return (
    <section className="rounded-3xl border bg-card p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Notifications</h1>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await accountWorkspace.markNotificationsRead()
              load()
            })
          }
        >
          Mark all read
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <p className={item.read ? "text-muted-foreground" : "font-medium"}>
              {item.message}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {!items.length && !error ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : null}
      </div>
    </section>
  )
}

export function PdfRequestsPanel() {
  const [data, setData] = useState<PdfAccessDashboard>({
    mine: [],
    pending: [],
    grants: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const load = useCallback(() => {
    pdfAccess.getAccessDashboard()
      .then(setData)
      .catch((reason) => setError(errorMessage(reason)))
  }, [])

  useEffect(() => {
    load()
    const focus = () => load()
    window.addEventListener("focus", focus)
    return () => window.removeEventListener("focus", focus)
  }, [load])

  function act(id: string, action: "cancel" | "approve" | "reject" | "revoke") {
    startTransition(async () => {
      try {
        await pdfAccess.transitionRequest(id, action)
        load()
      } catch (reason) {
        setError(errorMessage(reason))
      }
    })
  }

  function download(id: string) {
    startTransition(async () => {
      try {
        const { url } = await pdfAccess.getAuthorizedDownloadUrl(id)
        window.open(url, "_blank", "noopener,noreferrer")
      } catch (reason) {
        setError(errorMessage(reason))
      }
    })
  }

  return (
    <section className="rounded-3xl border bg-card p-8">
      <h1 className="text-3xl font-semibold">PDF Access</h1>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <RequestGroup title="My Requests" empty="No PDF access requests yet.">
        {data.mine.map((item) => (
          <RequestCard
            key={item.id}
            title={item.researchTitle}
            subtitle={`Owner: ${item.ownerName}`}
            note={item.requestNote}
            status={item.status}
          >
            {item.status === "pending" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => act(item.id, "cancel")}
              >
                Cancel
              </Button>
            ) : null}
            {item.status === "granted" ? (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => download(item.id)}
              >
                Download
              </Button>
            ) : null}
          </RequestCard>
        ))}
      </RequestGroup>
      <RequestGroup title="Pending Requests" empty="No pending requests.">
        {data.pending.map((item) => (
          <RequestCard
            key={item.id}
            title={item.researchTitle}
            subtitle={[
              item.requesterName,
              item.requesterInstitution,
              item.requesterProgram,
            ]
              .filter(Boolean)
              .join(" · ")}
            note={item.requestNote}
            status={item.status}
          >
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => act(item.id, "approve")}
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => act(item.id, "reject")}
            >
              Reject
            </Button>
          </RequestCard>
        ))}
      </RequestGroup>
      <RequestGroup title="Active Grants" empty="No active Grants.">
        {data.grants.map((item) => (
          <RequestCard
            key={item.id}
            title={item.researchTitle}
            subtitle={[
              item.requesterName,
              item.requesterInstitution,
              item.requesterProgram,
            ]
              .filter(Boolean)
              .join(" · ")}
            status={item.status}
          >
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => act(item.id, "revoke")}
            >
              Revoke
            </Button>
          </RequestCard>
        ))}
      </RequestGroup>
    </section>
  )
}

function RequestGroup({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const rows = Array.isArray(children) ? children : [children]
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.length ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  )
}

function RequestCard({
  title,
  subtitle,
  note,
  status,
  children,
}: {
  title: string
  subtitle: string
  note?: string
  status: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      {note ? <p className="mt-2 text-sm whitespace-pre-wrap">{note}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground capitalize">
          {status}
        </span>
        <div className="flex gap-2">{children}</div>
      </div>
    </div>
  )
}
