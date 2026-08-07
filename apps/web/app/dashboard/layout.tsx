import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await enforceProfileRoute("/dashboard")
  return children
}
