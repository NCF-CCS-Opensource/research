import {
  listAdvisersContract,
  referenceDataContract,
  RESEARCH_TYPES,
} from "@repo/contracts";
import { notFound } from "next/navigation";
import { apiFetch, getCurrentIdentity } from "../../../lib/backend";
import { createLegacyDeposit } from "./actions";

export const dynamic = "force-dynamic";

export default async function LegacyDepositPage() {
  const identity = await getCurrentIdentity();
  if (identity.state !== "active" || identity.account.role !== "COORDINATOR")
    notFound();
  const [referenceResponse, adviserResponse] = await Promise.all([
    apiFetch(referenceDataContract.path),
    apiFetch(listAdvisersContract.path),
  ]);
  if (!referenceResponse.ok || !adviserResponse.ok) notFound();
  const references = referenceDataContract.response.safeParse(
    await referenceResponse.json(),
  );
  const advisers = listAdvisersContract.response.safeParse(
    (await adviserResponse.json())?.data,
  );
  if (!references.success || !advisers.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Create Legacy Deposit</h1>
      <form
        action={createLegacyDeposit}
        style={{ display: "grid", gap: "1rem", maxWidth: 640 }}
      >
        <label>
          Title <input name="title" required minLength={10} maxLength={300} />
        </label>
        <label>
          Authors, one per line <textarea name="authors" required />
        </label>
        <label>
          Abstract{" "}
          <textarea name="abstract" required minLength={100} maxLength={5000} />
        </label>
        <label>
          Keywords, comma separated <input name="keywords" required />
        </label>
        <label>
          Program{" "}
          <select name="programId" required defaultValue="">
            <option value="" disabled>
              Select a Program
            </option>
          {references.data.data.programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year{" "}
          <input
            name="year"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            required
          />
        </label>
        <label>
          Research Type{" "}
          <select name="researchType" required defaultValue="">
            <option value="" disabled>
              Select a Research Type
            </option>
            {RESEARCH_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Adviser (optional){" "}
          <select name="adviserId" defaultValue="">
            <option value="">No Adviser</option>
            {advisers.data.map((adviser) => (
              <option key={adviser.id} value={adviser.id}>
                {adviser.fullName}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Create Legacy Deposit</button>
      </form>
    </main>
  );
}
