"use client";

import {
  cancelPaperAccessRequestContract,
  requestPaperAccessContract,
} from "@repo/contracts";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
type AccessState =
  | "guest"
  | "eligible"
  | "pending"
  | "approved"
  | "revoked"
  | "denied"
  | "expired"
  | "cancelled"
  | "unavailable"
  | "management";
export function AccessPanel({
  publicId,
  initialState,
  expiresAt,
  reason,
  requestId,
}: Readonly<{
  publicId: string;
  initialState: AccessState;
  expiresAt: string | null;
  reason: string | null;
  requestId?: string;
}>) {
  const { getToken } = useAuth();
  const state = initialState;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${apiOrigin}/v1/api${url}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok)
        throw new Error(
          (await res.json())?.error?.message ??
            "Access Request could not be saved.",
        );
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Access Request could not be saved.",
      );
      setBusy(false);
    }
  }
  const messages: Record<AccessState, string> = {
    guest: "Sign in to request access.",
    eligible: "Explain why you need to read this Paper.",
    pending: "Your Access Request is pending.",
    approved: "Access approved.",
    revoked: "Your Access Grant was revoked.",
    denied: "Your Access Request was denied.",
    expired: "Your Access Request expired.",
    cancelled: "Your Access Request was cancelled.",
    unavailable: "Full text is unavailable.",
    management: "You have management access.",
  };
  return (
    <section>
      <h2>Full text access</h2>
      <p>{messages[state]}</p>
      {state === "guest" && <Link href="/sign-in">Sign in</Link>}
      {state === "approved" && expiresAt && (
        <p>Access expires {new Date(expiresAt).toLocaleString()}</p>
      )}
      {(state === "approved" || state === "management") && (
        <p>
          <Link href={`/papers/${encodeURIComponent(publicId)}/read`}>
            Read full text
          </Link>
        </p>
      )}
      {state === "denied" && reason && <p>Reason: {reason}</p>}
      {state === "revoked" && reason && <p>Reason: {reason}</p>}
      {state === "pending" && requestId && (
        <button
          disabled={busy}
          onClick={() =>
            void call(
              cancelPaperAccessRequestContract.path.replace(
                ":requestId",
                encodeURIComponent(requestId),
              ),
              "POST",
            )
          }
        >
          Cancel request
        </button>
      )}
      {["eligible", "denied", "expired", "cancelled", "revoked"].includes(
        state,
      ) && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const purpose = String(
              new FormData(event.currentTarget).get("purpose") ?? "",
            );
            void call(
              requestPaperAccessContract.path.replace(
                ":publicId",
                encodeURIComponent(publicId),
              ),
              "POST",
              { purpose },
            );
          }}
        >
          <label>
            Purpose{" "}
            <textarea
              name="purpose"
              required
              minLength={30}
              maxLength={1500}
              rows={4}
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Request access"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
