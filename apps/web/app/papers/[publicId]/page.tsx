import { getPaperContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { PaperFileUpload } from "./paper-file-upload";
import { SubmissionPanel } from "./submission-panel";
import { PaperDecision } from "../adviser-queue/paper-decision";

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
  if (!parsed.success) notFound();
  const editable = ["draft", "revision_requested"].includes(parsed.data.status);
  const noticeResponse = editable
    ? await apiFetch("/deposit-notices/get-current")
    : null;
  const notice = noticeResponse?.ok
    ? (await noticeResponse.json())?.data
    : null;
  return (
    <main style={{ padding: "2rem", display: "grid", gap: "1.5rem" }}>
      <h1>{parsed.data.title}</h1>
      <p>Status: {parsed.data.status}</p>
      <Link
        prefetch={false}
        href={`/papers/${encodeURIComponent(publicId)}/read`}
      >
        Read PDF
      </Link>
      {editable && <PaperFileUpload publicId={publicId} />}
      {editable && notice && (
        <SubmissionPanel publicId={publicId} notice={notice} />
      )}
      <h2>Decision history</h2>
      <ol>
        {parsed.data.decisionHistory.map((item, index) => (
          <li key={`${item.createdAt}-${index}`}>
            {item.decision}
            {item.reason && `: ${item.reason}`}
          </li>
        ))}
      </ol>
      {["submitted", "endorsed"].includes(parsed.data.status) && (
        <PaperDecision publicId={publicId} />
      )}
    </main>
  );
}
