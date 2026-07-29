import Link from "next/link"

import { Navbar } from "@/components/layout/navbar"
import { NotificationLink } from "@/components/layout/notification-link"

const userLinks = [
  ["/dashboard", "Overview"],
  ["/dashboard/papers", "My Papers"],
  ["/dashboard/collections", "Collections"],
  ["/dashboard/pdf-requests", "PDF Access"],
  ["/dashboard/settings", "Settings"],
  ["/upload", "Upload Research"],
]

const adminLinks = [
  ["/admin", "Overview"],
  ["/admin/research", "Research"],
  ["/admin/users", "Users"],
  ["/admin/audit", "Audit Log"],
  ["/admin/categories", "Categories"],
  ["/admin/keywords", "Keywords"],
  ["/admin/institutions", "Institutions"],
  ["/admin/programs", "Programs"],
]

export function DashboardShell({
  children,
  admin = false,
}: {
  children: React.ReactNode
  admin?: boolean
}) {
  const links = admin ? adminLinks : userLinks

  return (
    <div className="min-h-svh bg-muted/20">
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-fit rounded-xl border bg-card p-3">
          <nav className="grid gap-1">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            {!admin && <NotificationLink />}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  )
}
