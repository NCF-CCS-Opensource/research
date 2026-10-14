"use client";

import {
  getPaperFileStatusContract,
  uploadPaperFileContract,
} from "@repo/contracts";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
const rejection: Record<string, string> = {
  CORRUPT_PDF:
    "This PDF could not be opened. Export it again and upload the new file.",
  ENCRYPTED_PDF:
    "This PDF is password protected. Remove the password and upload it again.",
  ACTIVE_CONTENT:
    "This PDF contains scripts or embedded content. Remove them and upload it again.",
  MALWARE:
    "The safety scan rejected this PDF. Choose a different file and contact support if you think this is an error.",
};

export function PaperFileUpload({ publicId }: Readonly<{ publicId: string }>) {
  const { getToken } = useAuth();
  const [upload, setUpload] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [validation, setValidation] = useState<string>("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(
      "pdf",
    ) as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setValidation("");
    setUpload(0);
    setUploading(true);
    try {
      const token = await getToken();
      const body = new FormData();
      body.set("file", file);
      const result = await new Promise<{ fileId: string }>(
        (resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open(
            "POST",
            `${apiOrigin}/v1/api${uploadPaperFileContract.path.replace(":publicId", encodeURIComponent(publicId))}`,
          );
          if (token)
            request.setRequestHeader("Authorization", `Bearer ${token}`);
          request.upload.onprogress = (event) => {
            if (event.lengthComputable)
              setUpload(Math.round((event.loaded / event.total) * 100));
          };
          request.onerror = () =>
            reject(
              new Error(
                "The upload was interrupted. Check your connection and try again.",
              ),
            );
          request.onload = () => {
            let response: unknown;
            try {
              response = JSON.parse(request.responseText || "null");
            } catch {
              response = null;
            }
            const parsed = uploadPaperFileContract.response.safeParse(
              (response as { data?: unknown } | null)?.data,
            );
            if (request.status !== 202 || !parsed.success)
              reject(
                new Error(
                  (response as { error?: { message?: string } } | null)?.error
                    ?.message ?? "The PDF could not be uploaded.",
                ),
              );
            else resolve(parsed.data);
          };
          request.send(body);
        },
      );
      setUpload(100);
      setUploading(false);
      setValidation("PENDING");
      let status = "PENDING";
      while (status === "PENDING") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const response = await fetch(
          `${apiOrigin}/v1/api${getPaperFileStatusContract.path.replace(":fileId", result.fileId)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: "no-store",
          },
        );
        const parsed = getPaperFileStatusContract.response.safeParse(
          (await response.json())?.data,
        );
        if (!response.ok || !parsed.success)
          throw new Error(
            "Could not check PDF validation. Refresh this page to check again.",
          );
        status = parsed.data.status;
        setValidation(
          status === "REJECTED"
            ? (rejection[parsed.data.reason ?? ""] ?? "The PDF was rejected.")
            : status === "CLEAN"
              ? "Validation complete: PDF is clean."
              : status === "FAILED"
                ? "Validation failed after retries. Upload the PDF again."
                : "PENDING",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The PDF could not be uploaded.",
      );
      setUploading(false);
    }
  }

  return (
    <section
      aria-labelledby="pdf-title"
      style={{ display: "grid", gap: "0.75rem", maxWidth: 520 }}
    >
      <h2 id="pdf-title">Draft PDF</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <label htmlFor="paper-pdf">Choose a PDF (up to 25 MiB)</label>
        <input
          id="paper-pdf"
          name="pdf"
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={uploading}
        />
        <button type="submit" disabled={uploading}>
          Upload PDF
        </button>
      </form>
      {uploading && <p role="status">Uploading: {upload}%</p>}
      {validation && <p role="status">Validation: {validation}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
