import { formatPaperCitations, getPublicPaperContract } from "@repo/contracts";
import { apiFetch } from "../../../../lib/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const path = getPublicPaperContract.path.replace(
    ":publicId",
    encodeURIComponent(publicId),
  );
  const response = await apiFetch(path);
  if (!response.ok) return new Response("Paper not found", { status: 404 });
  const parsed = getPublicPaperContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) return new Response("Paper not found", { status: 404 });
  const siteOrigin = new URL(process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .origin;
  const url = new URL(
    `/papers/${encodeURIComponent(publicId)}`,
    siteOrigin,
  ).toString();
  const bibtex = formatPaperCitations(parsed.data, url).bibtex;
  return new Response(bibtex, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${publicId}.bib"`,
      "Cache-Control": "no-store",
    },
  });
}
