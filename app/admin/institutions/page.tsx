import { MetadataManager } from "@/components/features/admin-panels"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminInstitutionsPage() {
  return <DashboardShell admin><MetadataManager title="Manage Institutions" table="institutions" /></DashboardShell>
}
