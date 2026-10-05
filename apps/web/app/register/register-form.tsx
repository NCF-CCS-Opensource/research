"use client";

import { useActionState } from "react";
import { register } from "./actions";

export function RegisterForm({
  defaultName,
  programs,
}: {
  defaultName: string;
  programs: { id: string; name: string }[];
}) {
  const [error, action, pending] = useActionState(register, null);
  return (
    <form action={action} style={{ display: "grid", gap: "1rem", maxWidth: "24rem" }}>
      <label>
        Name
        <input name="name" defaultValue={defaultName} required />
      </label>
      <label>
        Program (optional)
        <select name="programId" defaultValue="">
          <option value="">None</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>
        Register
      </button>
    </form>
  );
}
