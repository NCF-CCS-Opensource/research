import Link from "next/link"

import { Navbar } from "@/components/layout/navbar"
import { NotificationLink } from "@/components/layout/notification-link"
import { Card } from "@/components/ui/card"

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
    <div className="min-h-svh">
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 lg:py-10">
        <Card className="h-fit gap-0 py-0">
          <div className="border-b px-4 py-4">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {admin ? "Administration" : "Workspace"}
            </p>
            <p className="mt-1 font-heading text-xl">
              {admin ? "Archive control" : "Your research"}
            </p>
          </div>
          <nav className="grid p-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="border-l-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:bg-muted hover:text-foreground focus-visible:border-primary focus-visible:bg-muted focus-visible:outline-none"
              >
                {label}
              </Link>
            ))}
            {!admin && <NotificationLink />}
          </nav>
        </Card>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
