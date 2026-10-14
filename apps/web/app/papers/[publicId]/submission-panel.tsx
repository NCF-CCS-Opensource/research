"use client";

import { submitPaperContract } from "@repo/contracts";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";

export function SubmissionPanel({
  publicId,
  notice,
}: {
  publicId: string;
  notice: { version: number; text: string };
}) {
  const { getToken } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(
        `${apiOrigin}/v1/api${submitPaperContract.path.replace(":publicId", encodeURIComponent(publicId))}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ noticeVersion: notice.version }),
        },
      );
      if (!res.ok)
        throw new Error(
          (await res.json())?.error?.message ?? "Paper could not be submitted.",
        );
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Paper could not be submitted.",
      );
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Submit Paper</h2>
      <p>{notice.text}</p>
      <p>Deposit Notice version {notice.version}</p>
      <form onSubmit={submit}>
        <label>
          <input type="checkbox" required /> I acknowledge this Deposit Notice
          and confirm I may deposit this Paper.
        </label>
        <button disabled={busy}>
          {busy ? "Submitting…" : "Submit for endorsement"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
