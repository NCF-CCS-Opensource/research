import { AdminUsersPanel } from "@/components/features/admin-panels"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminUsersPage() {
  return <DashboardShell admin><AdminUsersPanel /></DashboardShell>
}
