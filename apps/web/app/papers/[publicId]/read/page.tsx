import { getPaperContract } from "@repo/contracts";
import { notFound } from "next/navigation";
import { getCurrentIdentity, apiFetch } from "../../../../lib/backend";
import { PaperReader } from "./paper-reader";

export const dynamic = "force-dynamic";

export default async function PaperReadPage({
  params,
}: Readonly<{ params: Promise<{ publicId: string }> }>) {
  const { publicId } = await params;
  const path = getPaperContract.path.replace(
    ":publicId",
    encodeURIComponent(publicId),
  );
  const [response, identity] = await Promise.all([
    apiFetch(path),
    getCurrentIdentity().catch(() => null),
  ]);
  if (!response.ok) notFound();
  const parsed = getPaperContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) notFound();
  const coordinator =
    identity?.state === "active" && identity.account.role === "COORDINATOR";

  return (
    <main style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
      <h1>{parsed.data.title}</h1>
      {coordinator && parsed.data.publicationStatus !== "published" && (
        <p
          role="status"
          style={{ padding: "0.75rem", border: "1px solid currentColor" }}
        >
          Management access: this Paper is {parsed.data.publicationStatus}.
        </p>
      )}
      <PaperReader publicId={publicId} />
    </main>
  );
}
