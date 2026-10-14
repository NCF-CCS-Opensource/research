import { getPaperContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { PaperFileUpload } from "./paper-file-upload";

export const dynamic = "force-dynamic";

export default async function PaperDraftPage({
  params,
}: Readonly<{ params: Promise<{ publicId: string }> }>) {
  const { publicId } = await params;
  const path = getPaperContract.path.replace(
    ":publicId",
    encodeURIComponent(publicId),
  );
  const response = await apiFetch(path);
  if (!response.ok) notFound();
  const parsed = getPaperContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success || parsed.data.status !== "draft") notFound();
  return (
    <main style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
      <h1>{parsed.data.title}</h1>
      <Link
        prefetch={false}
        href={`/papers/${encodeURIComponent(publicId)}/read`}
      >
        Read PDF
      </Link>
      <PaperFileUpload publicId={publicId} />
    </main>
  );
}
