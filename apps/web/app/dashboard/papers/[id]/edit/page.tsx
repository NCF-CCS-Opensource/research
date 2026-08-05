import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { EditResearchForm } from "@/components/forms/edit-research-form"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function EditPaperPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <DashboardShell>
      <section className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/papers"
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to My Papers
        </Link>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Edit Research
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes apply immediately. Approved papers retain their status after
            edits.
          </p>
          <div className="mt-8">
            <EditResearchForm id={id} />
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
