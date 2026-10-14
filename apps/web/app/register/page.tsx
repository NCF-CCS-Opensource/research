import { currentUser } from "@clerk/nextjs/server";
import { referenceDataContract } from "@repo/contracts";
import { redirect } from "next/navigation";
import { apiFetch, getCurrentIdentity } from "../../lib/backend";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const identity = await getCurrentIdentity();
  if (identity.state === "guest") redirect("/sign-in");
  if (identity.state !== "registering") redirect("/");

  const res = await apiFetch(referenceDataContract.path);
  if (!res.ok) throw new Error(`Reference data request failed: ${res.status}`);
  const { programs } = referenceDataContract.response.parse(
    await res.json(),
  ).data;
  const user = await currentUser();

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Register</h1>
      <p>Signed in as {identity.email}.</p>
      <RegisterForm defaultName={user?.fullName ?? ""} programs={programs} />
    </main>
  );
}
