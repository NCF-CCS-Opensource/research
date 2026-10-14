import { formatBookCitations, getPublicBookContract } from "@repo/contracts";
import { apiFetch } from "../../../../lib/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const path = getPublicBookContract.path.replace(
    ":publicId",
    encodeURIComponent(publicId),
  );
  const response = await apiFetch(path);
  if (!response.ok) return new Response("Book not found", { status: 404 });
  const parsed = getPublicBookContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) return new Response("Book not found", { status: 404 });
  const url = new URL(
    `/books/${encodeURIComponent(publicId)}`,
    process.env.WEB_ORIGIN ?? "http://localhost:3000",
  ).toString();
  return new Response(formatBookCitations(parsed.data, url).bibtex, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${publicId}.bib"`,
      "Cache-Control": "no-store",
    },
  });
}
