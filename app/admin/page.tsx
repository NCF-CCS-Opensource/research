import { EngagementPanel } from "@/components/features/engagement-panel"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminPage() {
  return <DashboardShell admin><EngagementPanel admin /></DashboardShell>
}
