import { DashboardPanel } from "@/components/features/dashboard-panel"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardPanel />
    </DashboardShell>
  )
}
