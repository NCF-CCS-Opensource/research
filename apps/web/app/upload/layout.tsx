import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await enforceProfileRoute("/upload")
  return children
}
