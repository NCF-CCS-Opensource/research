"use client";

import { decidePaperAccessRequestContract } from "@repo/contracts";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
export function AccessDecision({
  requestId,
  defaultDays,
  maximumDays,
}: Readonly<{ requestId: string; defaultDays: number; maximumDays: number }>) {
  const { getToken } = useAuth();
  const [error, setError] = useState("");
  async function decide(
    body:
      | { decision: "approve"; days: number }
      | { decision: "deny"; reason: string },
  ) {
    const token = await getToken();
    const response = await fetch(
      `${apiOrigin}/v1/api${decidePaperAccessRequestContract.path.replace(":requestId", encodeURIComponent(requestId))}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
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
        void decide({
          decision: "deny",
          reason: String(form.get("reason") ?? ""),
        });
      }}
    >
      <label>
        Grant length in days{" "}
        <input
          name="days"
          type="number"
          min={1}
          max={maximumDays}
          defaultValue={defaultDays}
        />
      </label>
      <button
        type="button"
        onClick={(event) => {
          const form = event.currentTarget.form;
          if (form)
            void decide({
              decision: "approve",
              days: Number(new FormData(form).get("days")),
            });
        }}
      >
        Approve
      </button>
      <label>
        Denial reason <input name="reason" required maxLength={2000} />
      </label>
      <button type="submit">Deny</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
