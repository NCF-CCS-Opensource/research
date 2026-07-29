import { UploadResearchForm } from "@/components/forms/upload-research-form"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function UploadPage() {
  return <DashboardShell><section className="rounded-3xl border bg-card p-8"><h1 className="text-3xl font-semibold tracking-tight">Upload Research</h1><p className="mt-3 text-muted-foreground">Metadata is created first, then the PDF uploads directly to R2, then Supabase confirms the upload.</p><div className="mt-8"><UploadResearchForm /></div></section></DashboardShell>
}
