"use server";

import { registerAccountContract, registerInputSchema } from "@repo/contracts";
import { redirect } from "next/navigation";
import { apiFetch, apiMessage } from "../../lib/backend";

export async function register(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const parsed = registerInputSchema.safeParse({
    name: formData.get("name"),
    programId: formData.get("programId") || null,
  });
  if (!parsed.success)
    return parsed.error.issues[0]?.message ?? "Check your details.";

  const res = await apiFetch(registerAccountContract.path, {
    method: registerAccountContract.method,
    body: JSON.stringify(parsed.data),
  });
  if (!res.ok) return apiMessage(res);
  redirect("/");
}
