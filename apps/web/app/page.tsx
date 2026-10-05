import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "../lib/backend";

// Rendered per request so builds do not need the API running.
export const dynamic = "force-dynamic";

// Routing here is a convenience; the API decides what each identity may do.
export default async function Home() {
  const identity = await getCurrentIdentity();
  if (identity.state === "registering") redirect("/register");
  if (identity.state === "deactivated") redirect("/deactivated");

  return (
    <main style={{ padding: "2rem" }}>
      <h1>CCS Research Repository</h1>
      {identity.state === "guest" ? (
        <Link href="/sign-in">Sign in</Link>
      ) : (
        <p>
          Signed in as {identity.account.name} ({identity.account.role.toLowerCase()}).
        </p>
      )}
    </main>
  );
}
