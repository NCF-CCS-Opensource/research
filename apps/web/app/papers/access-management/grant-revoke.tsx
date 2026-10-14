"use client";

import { revokeAccessGrantContract } from "@repo/contracts";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
export function GrantRevoke({ grantId }: Readonly<{ grantId: string }>) {
  const { getToken } = useAuth();
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        );
        void getToken()
          .then((token) =>
            fetch(
              `${apiOrigin}/v1/api${revokeAccessGrantContract.path.replace(":grantId", encodeURIComponent(grantId))}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ reason }),
              },
            ),
          )
          .then(async (response) => {
            if (!response.ok)
              setError(
                (await response.json())?.error?.message ??
                  "Access Grant could not be revoked.",
              );
            else window.location.reload();
          })
          .catch(() => setError("Access Grant could not be revoked."));
      }}
    >
      <label>
        Revocation reason <input name="reason" required maxLength={2000} />
      </label>
      <button type="submit">Revoke Access Grant</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
