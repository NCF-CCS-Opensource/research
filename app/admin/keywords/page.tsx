import { MetadataManager } from "@/components/features/admin-panels"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminKeywordsPage() {
  return <DashboardShell admin><MetadataManager title="Manage Keywords" table="keywords" /></DashboardShell>
}
