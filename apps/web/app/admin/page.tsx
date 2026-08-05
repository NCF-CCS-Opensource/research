import { DashboardPanel } from "@/components/features/dashboard-panel"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function AdminPage() {
  return (
    <DashboardShell admin>
      <DashboardPanel admin />
    </DashboardShell>
  )
}
