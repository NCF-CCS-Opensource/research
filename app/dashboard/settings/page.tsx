import { ProfileForm } from "@/components/forms/profile-form"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function SettingsPage() {
  return (
    <DashboardShell>
      <ProfileForm />
    </DashboardShell>
  )
}
