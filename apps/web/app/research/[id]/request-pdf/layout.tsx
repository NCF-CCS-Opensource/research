import { enforceProfileRoute } from "@/lib/profile-routing"

export default async function PdfRequestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await enforceProfileRoute("/research/request-pdf")
  return children
}
