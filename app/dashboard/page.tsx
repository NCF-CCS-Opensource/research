import { EngagementPanel } from "@/components/features/engagement-panel"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <EngagementPanel />
    </DashboardShell>
  )
}
