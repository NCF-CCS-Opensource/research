import { AuditLogPanel } from "@/components/features/admin-panels"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminAuditPage() {
  return <DashboardShell admin><AuditLogPanel /></DashboardShell>
}
