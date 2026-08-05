import { MetadataManager } from "@/components/features/admin-panels"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminCategoriesPage() {
  return (
    <DashboardShell admin>
      <MetadataManager title="Manage Categories" table="categories" />
    </DashboardShell>
  )
}
