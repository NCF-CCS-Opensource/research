"use client";

import { decidePaperContract } from "@repo/contracts";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
export function PaperDecision({
  publicId,
  canEndorse = true,
  canReturnOrReject = true,
  visible = true,
}: Readonly<{
  publicId: string;
  canEndorse?: boolean;
  canReturnOrReject?: boolean;
  visible?: boolean;
}>) {
  const { getToken } = useAuth();
  const [error, setError] = useState("");
  if (!visible) return null;
  async function decide(
    decision: "endorse" | "revision_request" | "reject",
    reason?: string,
  ) {
    const token = await getToken();
    const response = await fetch(
      `${apiOrigin}/v1/api${decidePaperContract.path.replace(":publicId", encodeURIComponent(publicId))}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision, reason }),
      },
    );
    if (!response.ok)
      setError(
        (await response.json())?.error?.message ??
          "Decision could not be saved.",
      );
    else window.location.reload();
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const reason = form.get("reason");
        void decide(
          form.get("decision") as "revision_request" | "reject",
          typeof reason === "string" ? reason : undefined,
        );
      }}
    >
      {canReturnOrReject && (
        <label>
          Reason for revision or rejection <input name="reason" />
        </label>
      )}
      {canEndorse && (
        <button type="button" onClick={() => void decide("endorse")}>
          Endorse
        </button>
      )}
      {canReturnOrReject && (
        <>
          <button type="submit" name="decision" value="revision_request">
            Request revision
          </button>
          <button type="submit" name="decision" value="reject">
            Reject
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
