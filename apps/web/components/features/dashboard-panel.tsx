"use client"

import Link from "next/link"
import { useEffect, useId, useMemo, useState } from "react"
import {
  ArrowRight,
  Bell,
  Bookmark,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Quote,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { accountWorkspace } from "@/lib/web-transport"
import { chartPoints, comparisonLabel } from "@/lib/dashboard"
import type { DashboardData, DashboardMetric } from "@repo/api-client"

const metricLabels: Record<DashboardMetric, string> = {
  researchViews: "Research Views",
  authorizedDownloads: "Authorized Downloads",
  citationExports: "Citation Exports",
}

const number = new Intl.NumberFormat("en")
const date = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
})
const dateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function DashboardPanel({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<30 | 90>(30)
  const [metric, setMetric] = useState<DashboardMetric>("researchViews")
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    accountWorkspace.getDashboard(admin ? "admin" : "personal", period)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load dashboard"
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [admin, period, refresh])

  function reload() {
    setLoading(true)
    setError(null)
    setRefresh((value) => value + 1)
  }

  if (!data && loading) return <DashboardSkeleton />

  if (!data && error) {
    return (
      <Card role="alert" className="border-destructive/40">
        <CardHeader>
          <CardTitle>Dashboard unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reload}>Try again</Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const heading =
    data.mode === "admin"
      ? "Administrative Research Pulse"
      : data.mode === "owner"
        ? "My Research Workspace"
        : "My Reader Workspace"

  return (
    <div className="archive-grid space-y-6 rounded-2xl p-1" aria-busy={loading}>
      <header className="flex flex-col gap-5 border-b border-foreground/15 bg-background/90 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <Badge variant={data.mode === "admin" ? "default" : "secondary"}>
            {data.mode === "admin"
              ? "Administrative scope"
              : data.mode === "owner"
                ? "Personal · Owner scope"
                : "Personal · Reader scope"}
          </Badge>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {data.mode === "admin"
              ? "System-wide archive operations and anonymous Engagement Trends."
              : data.mode === "owner"
                ? "Your Research Records, Engagement Trends, and work awaiting action."
                : "Your saved Research, PDF access activity, and notifications."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.isAdmin ? (
            <Button variant="outline" asChild>
              <Link href={data.mode === "admin" ? "/dashboard" : "/admin"}>
                {data.mode === "admin"
                  ? "My Research Workspace"
                  : "Administrative Workspace"}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" disabled={loading} onClick={reload}>
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
          <p className="w-full font-mono text-[10px] tracking-wide text-muted-foreground sm:w-auto">
            Updated{" "}
            <time dateTime={data.generatedAt}>
              {dateTime.format(new Date(data.generatedAt))}
            </time>
          </p>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="mx-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          Refresh failed: {error}
        </p>
      ) : null}

      <StatCards data={data} />

      {data.mode === "reader" ? (
        <ReaderActivity items={data.recentActivity} />
      ) : (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
            <ResearchPulse
              pulse={data.pulse!}
              metric={metric}
              period={data.pulse!.period}
              onMetricChange={setMetric}
              onPeriodChange={(value) => {
                setLoading(true)
                setError(null)
                setPeriod(value)
              }}
            />
            <ActionDocket mode={data.mode} items={data.docket} />
          </div>
          {data.mode === "owner" ? (
            <ResearchComparison rows={data.comparisons} metric={metric} />
          ) : (
            <RecentAudit items={data.recentAudit} />
          )}
        </>
      )}
    </div>
  )
}

function StatCards({ data }: { data: DashboardData }) {
  const cards =
    data.mode === "admin"
      ? [
          {
            label: "Ready for Moderation",
            value: data.cards.readyForModeration,
            detail: "Completed Uploads awaiting review",
            href: "/admin/research",
            icon: ClipboardCheck,
          },
          {
            label: "Active Accounts",
            value: data.cards.activeAccounts,
            detail: `${number.format(data.cards.recentRegistrations ?? 0)} registered in 30 days`,
            href: "/admin/users",
            icon: Users,
          },
          {
            label: "Approved Research",
            value: data.cards.approvedResearch,
            detail: "Public archive records",
            href: "/admin/research",
            icon: ShieldCheck,
          },
          {
            label: "PDF Access Requests",
            value: data.cards.pdfAccessRequestsLast30Days,
            detail: "Aggregate count · last 30 days",
            icon: FileText,
          },
        ]
      : data.mode === "owner"
        ? [
            {
              label: "Owned Research",
              value: data.cards.ownedResearch,
              detail: "Research Records in this workspace",
              href: "/dashboard/papers",
              icon: FileText,
            },
            {
              label: "Research Views",
              value: data.cards.researchViews,
              detail: "Approved detail-page opens",
              icon: Eye,
            },
            {
              label: "Authorized Downloads",
              value: data.cards.authorizedDownloads,
              detail: "Granted access exercised",
              icon: Download,
            },
            {
              label: "Citation Exports",
              value: data.cards.citationExports,
              detail: "Successful copies and BibTeX exports",
              icon: Quote,
            },
          ]
        : [
            {
              label: "Saved Research",
              value: data.cards.savedResearch,
              detail: "Research in your Collection",
              href: "/dashboard/collections",
              icon: Bookmark,
            },
            {
              label: "Pending PDF Access",
              value: data.cards.pendingPdfRequests,
              detail: "Requests awaiting an Owner",
              href: "/dashboard/pdf-requests",
              icon: FileText,
            },
            {
              label: "Granted Research PDFs",
              value: data.cards.grantedResearchPdfs,
              detail: "Research PDFs available to you",
              href: "/dashboard/pdf-requests",
              icon: Download,
            },
            {
              label: "Unread Notifications",
              value: data.cards.unreadNotifications,
              detail: "Workflow updates to review",
              href: "/dashboard/notifications",
              icon: Bell,
            },
          ]

  return (
    <section aria-labelledby="dashboard-headlines">
      <h2 id="dashboard-headlines" className="sr-only">
        Dashboard headline totals
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="relative border-l-4 border-l-accent"
          >
            <CardHeader>
              <card.icon className="size-4 text-primary" aria-hidden />
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-4xl font-semibold tabular-nums">
                {number.format(card.value ?? 0)}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {card.detail}
              </p>
              {card.href ? (
                <Button variant="link" className="mt-2 h-auto px-0" asChild>
                  <Link href={card.href}>
                    Open workflow <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ResearchPulse({
  pulse,
  metric,
  period,
  onMetricChange,
  onPeriodChange,
}: {
  pulse: NonNullable<DashboardData["pulse"]>
  metric: DashboardMetric
  period: 30 | 90
  onMetricChange: (metric: DashboardMetric) => void
  onPeriodChange: (period: 30 | 90) => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const points = chartPoints(pulse.days, metric)
  const current = pulse.current[metric]
  const previous = pulse.previous[metric]

  return (
    <Card className="animate-fade-up min-w-0">
      <CardHeader className="border-b">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Research Pulse
          </p>
          <CardTitle>
            <h2 className="mt-1 text-2xl">Anonymous Engagement Trend</h2>
          </CardTitle>
        </div>
        <CardDescription>
          One raw metric at a time, compared with the immediately preceding
          period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div className="flex flex-wrap gap-1" aria-label="Engagement metric">
            {(Object.keys(metricLabels) as DashboardMetric[]).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={metric === item ? "default" : "outline"}
                aria-pressed={metric === item}
                onClick={() => onMetricChange(item)}
              >
                {metricLabels[item]}
              </Button>
            ))}
          </div>
          <div className="flex gap-1" aria-label="Engagement period">
            {([30, 90] as const).map((days) => (
              <Button
                key={days}
                size="sm"
                variant={period === days ? "secondary" : "outline"}
                aria-pressed={period === days}
                onClick={() => onPeriodChange(days)}
              >
                {days} days
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {metricLabels[metric]} · current {period} days
            </p>
            <p className="mt-1 font-heading text-4xl font-semibold tabular-nums">
              {number.format(current)}
            </p>
          </div>
          <Badge variant="outline">
            {comparisonLabel(current, previous, period)}
          </Badge>
        </div>

        {pulse.days.length ? (
          <figure className="mt-6">
            <svg
              viewBox="0 0 720 220"
              className="h-auto w-full overflow-visible"
              role="img"
              aria-labelledby={`${titleId} ${descriptionId}`}
            >
              <title id={titleId}>
                {metricLabels[metric]} for the current {period}-day period
              </title>
              <desc id={descriptionId}>
                {number.format(current)} in the current period compared with{" "}
                {number.format(previous)} in the preceding period.
              </desc>
              {[0, 55, 110, 165, 220].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="720"
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <polyline
                points={points}
                fill="none"
                className="stroke-primary"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <figcaption className="mt-3 flex flex-wrap justify-between gap-2 font-mono text-[10px] text-muted-foreground">
              <span>{formatUtcDate(pulse.days[0].date)}</span>
              <span>
                Daily data available from{" "}
                {pulse.earliestAvailableDate
                  ? formatUtcDate(pulse.earliestAvailableDate)
                  : "no recorded date"}
              </span>
              <span>{formatUtcDate(pulse.days.at(-1)!.date)}</span>
            </figcaption>
            <details className="mt-4 rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Read daily {metricLabels[metric]} values
              </summary>
              <div className="mt-3 max-h-56 overflow-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 font-medium">UTC date</th>
                      <th className="py-2 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulse.days.map((day) => (
                      <tr key={day.date} className="border-b last:border-0">
                        <td className="py-2">{formatUtcDate(day.date)}</td>
                        <td className="py-2 text-right tabular-nums">
                          {number.format(day[metric])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </figure>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">Trend history is not available yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cumulative totals remain intact. Daily history begins with the
              first recorded Engagement activity and is never backfilled.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActionDocket({
  mode,
  items,
}: {
  mode: "owner" | "admin"
  items: DashboardData["docket"]
}) {
  return (
    <Card className="animate-fade-up xl:translate-y-10">
      <CardHeader className="border-b">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Action Docket
        </p>
        <CardTitle>
          <h2 className="text-2xl">
            {mode === "admin" ? "Ready for Moderation" : "Your next actions"}
          </h2>
        </CardTitle>
        <CardDescription>
          {mode === "admin"
            ? "Oldest eligible Research Records first."
            : "Summaries link to the complete workflow."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-1">
          {items.map((item, index) => (
            <li key={item.id ?? item.kind}>
              <Link
                href={item.href}
                className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b py-4 last:border-0 focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {item.title ?? item.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.detail ??
                      (item.createdAt
                        ? `Submitted ${dateTime.format(new Date(item.createdAt))}`
                        : "Open complete workflow")}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {item.count !== undefined ? (
                    <Badge
                      variant={item.count ? "secondary" : "outline"}
                      className="tabular-nums"
                    >
                      {number.format(item.count)}
                    </Badge>
                  ) : null}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {!items.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No work is waiting in this docket.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ReaderActivity({ items }: { items: DashboardData["recentActivity"] }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2 className="text-2xl">Recent workspace activity</h2>
        </CardTitle>
        <CardDescription>
          Your latest Collection and PDF access updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {items.map((item) => (
            <Link
              key={`${item.kind}-${item.occurredAt}-${item.title}`}
              href={item.href}
              className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.detail} · {dateTime.format(new Date(item.occurredAt))}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          ))}
          {!items.length ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No recent activity</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Saved Research and PDF access updates will appear here.
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ResearchComparison({
  rows,
  metric,
}: {
  rows: DashboardData["comparisons"]
  metric: DashboardMetric
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b[metric] - a[metric]),
    [rows, metric]
  )

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2 className="text-2xl">Research Record comparison</h2>
        </CardTitle>
        <CardDescription>
          Raw measures, sorted by {metricLabels[metric]}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length ? (
          <>
            <div className="grid gap-3 md:hidden">
              {sorted.map((row) => (
                <article key={row.id} className="rounded-lg border p-4">
                  <Link
                    href={`/research/${row.id}`}
                    className="font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {row.title}
                  </Link>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Views" value={row.researchViews} />
                    <Metric label="Downloads" value={row.authorizedDownloads} />
                    <Metric label="Exports" value={row.citationExports} />
                    <Metric
                      label="Pending requests"
                      value={row.pendingRequests}
                    />
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Research Record</th>
                    <th className="px-3 py-3 text-right font-medium">Views</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Downloads
                    </th>
                    <th className="px-3 py-3 text-right font-medium">
                      Citation Exports
                    </th>
                    <th className="py-3 pl-3 text-right font-medium">
                      Pending Requests
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="max-w-72 py-4 pr-4">
                        <Link
                          href={`/research/${row.id}`}
                          className="font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">
                        {number.format(row.researchViews)}
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">
                        {number.format(row.authorizedDownloads)}
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">
                        {number.format(row.citationExports)}
                      </td>
                      <td className="py-4 pl-3 text-right tabular-nums">
                        {number.format(row.pendingRequests)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No Research Records to compare.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono tabular-nums">{number.format(value)}</dd>
    </div>
  )
}

function RecentAudit({ items }: { items: DashboardData["recentAudit"] }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2 className="text-2xl">Recent audited activity</h2>
        </CardTitle>
        <CardDescription>
          A concise summary; the complete record remains in the Audit Log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {items.map((item) => (
            <Link
              key={`${item.action}-${item.createdAt}`}
              href={item.href}
              className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span>
                <span className="font-medium capitalize">
                  {item.action.replaceAll("-", " ")}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.title} · {dateTime.format(new Date(item.createdAt))}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          ))}
          {!items.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No audited activity yet.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" role="status">
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Loading dashboard data</span>
    </div>
  )
}

function formatUtcDate(value: string) {
  return date.format(new Date(`${value}T00:00:00Z`))
}
