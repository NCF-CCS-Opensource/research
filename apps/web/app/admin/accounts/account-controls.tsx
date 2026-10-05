"use client";

import { ROLES, type ManagedAccount } from "@repo/contracts";
import { useActionState } from "react";
import { changeRole, setStatus } from "./actions";

const confirmWith = (message: string) => (event: React.FormEvent) => {
  if (!window.confirm(message)) event.preventDefault();
};

export function AccountControls({
  account,
}: Readonly<{ account: ManagedAccount }>) {
  const [roleError, roleAction, rolePending] = useActionState(changeRole, null);
  const [statusError, statusAction, statusPending] = useActionState(
    setStatus,
    null,
  );
  const active = account.status === "ACTIVE";

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <form
        action={roleAction}
        onSubmit={confirmWith(`Change the role of ${account.name}?`)}
      >
        <input type="hidden" name="accountId" value={account.id} />
        <select name="role" defaultValue={account.role} aria-label="Role">
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role.toLowerCase()}
            </option>
          ))}
        </select>{" "}
        <input
          name="reason"
          placeholder="Reason"
          aria-label="Reason"
          required
        />{" "}
        <button type="submit" disabled={rolePending}>
          Change role
        </button>
        {roleError && <p role="alert">{roleError}</p>}
      </form>
      <form
        action={statusAction}
        onSubmit={confirmWith(
          `${active ? "Deactivate" : "Reactivate"} ${account.name}?`,
        )}
      >
        <input type="hidden" name="accountId" value={account.id} />
        <input
          type="hidden"
          name="intent"
          value={active ? "deactivate" : "reactivate"}
        />
        <input
          name="reason"
          placeholder="Reason"
          aria-label="Reason"
          required
        />{" "}
        <button type="submit" disabled={statusPending}>
          {active ? "Deactivate" : "Reactivate"}
        </button>
        {statusError && <p role="alert">{statusError}</p>}
      </form>
    </div>
  );
}
