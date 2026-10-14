import { getPaperContract, getPublicPaperContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, getCurrentIdentity } from "../../../lib/backend";
import { PaperFileUpload } from "./paper-file-upload";
import { SubmissionPanel } from "./submission-panel";
import { PaperDecision } from "../adviser-queue/paper-decision";
import { CitationActions } from "./citation-actions";
import { checkPaperAccessContract } from "@repo/contracts";
import { AccessPanel } from "./access-panel";

export const dynamic = "force-dynamic";

export default async function PaperPage({
  params,
}: Readonly<{ params: Promise<{ publicId: string }> }>) {
  const { publicId } = await params;
  const publicPath = getPublicPaperContract.path.replace(
    ":publicId",
    encodeURIComponent(publicId),
  );
  const publicResponse = await apiFetch(publicPath);
  if (publicResponse.ok) {
    const paper = getPublicPaperContract.response.safeParse(
      (await publicResponse.json())?.data,
    );
    if (paper.success) {
      const siteOrigin = new URL(
        process.env.WEB_ORIGIN ?? "http://localhost:3000",
      ).origin;
      const canonicalUrl = new URL(
        `/papers/${encodeURIComponent(publicId)}`,
        siteOrigin,
      ).toString();
      const accessPath = checkPaperAccessContract.path.replace(
        ":publicId",
        encodeURIComponent(publicId),
      );
      const accessResponse = await apiFetch(accessPath);
      const access = accessResponse.ok
        ? checkPaperAccessContract.response.safeParse(
            (await accessResponse.json())?.data,
          )
        : null;
      return (
        <main style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
          <h1>{paper.data.title}</h1>
          <CitationActions paper={paper.data} url={canonicalUrl} />
          <p>
            {paper.data.authors.map((author) => author.displayName).join(", ")}
          </p>
          <h2>Abstract</h2>
          <p>{paper.data.abstract}</p>
          <p>
            <strong>Keywords:</strong> {paper.data.keywords.join(", ")}
          </p>
          <dl>
            <dt>Program</dt>
            <dd>{paper.data.program}</dd>
            <dt>Year</dt>
            <dd>{paper.data.year}</dd>
            <dt>Research Type</dt>
            <dd>{paper.data.researchType}</dd>
            <dt>Publication date</dt>
            <dd>
              {new Date(paper.data.publishedAt).toLocaleDateString("en", {
                dateStyle: "long",
                timeZone: "UTC",
              })}
            </dd>
          </dl>
          {access?.success ? (
            <AccessPanel
              publicId={publicId}
              initialState={access.data.state}
              expiresAt={access.data.expiresAt}
              reason={access.data.reason}
              requestId={access.data.requestId ?? undefined}
            />
          ) : (
            <aside>
              <h2>Full text access</h2>
              <p>
                The full text is restricted. Guests must{" "}
                <Link href="/sign-in">sign in</Link> to request access.
              </p>
            </aside>
          )}
        </main>
      );
    }
  }
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
  const identity = await getCurrentIdentity();
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
      {identity.state === "active" && identity.account.role !== "STUDENT" && (
        <PaperDecision
          publicId={publicId}
          canEndorse={
            parsed.data.status === "submitted" &&
            parsed.data.adviserId === identity.account.id
          }
          canReturnOrReject={
            parsed.data.status === "submitted" ||
            (identity.account.role === "COORDINATOR" &&
              parsed.data.status === "endorsed")
          }
          visible={
            (identity.account.role === "COORDINATOR" &&
              ["submitted", "endorsed"].includes(parsed.data.status)) ||
            (identity.account.id === parsed.data.adviserId &&
              parsed.data.status === "submitted")
          }
        />
      )}
    </main>
  );
}
