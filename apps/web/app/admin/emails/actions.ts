"use server";

import { retryEmailJobContract } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/backend";

export async function retryEmailJob(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const res = await apiFetch(
    retryEmailJobContract.path.replace(":jobId", encodeURIComponent(jobId)),
    {
      method: "POST",
    },
  );
  if (!res.ok) throw new Error("Could not retry this email.");
  revalidatePath("/admin/emails");
}
