import { listAccountsContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { AccountControls } from "./account-controls";

export const dynamic = "force-dynamic";

// The API refuses non-Coordinators; the page just shows nothing for them.
export default async function AccountsPage() {
  const res = await apiFetch(listAccountsContract.path);
  if (res.status === 401 || res.status === 403) notFound();
  if (!res.ok) throw new Error(`Account list failed: ${res.status}`);
  const accounts = listAccountsContract.response.parse(await res.json()).data;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Accounts</h1>
      <p>
        <Link href="/admin/audit">Audit log</Link>
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Program</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td>{account.email}</td>
              <td>{account.role.toLowerCase()}</td>
              <td>{account.status.toLowerCase()}</td>
              <td>{account.programName ?? "None"}</td>
              <td>
                <AccountControls account={account} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
