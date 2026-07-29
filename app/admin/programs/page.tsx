import { MetadataManager } from "@/components/features/admin-panels"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminProgramsPage() {
  return <DashboardShell admin><MetadataManager title="Manage Programs" table="programs" /></DashboardShell>
}
