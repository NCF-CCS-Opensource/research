import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await enforceProfileRoute("/admin")
  return children
}
