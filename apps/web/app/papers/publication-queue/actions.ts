"use server";

import { publishPaperContract } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/backend";

export async function publishPaper(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const response = await apiFetch(
    publishPaperContract.path.replace(
      ":publicId",
      encodeURIComponent(publicId),
    ),
    { method: "POST" },
  );
  if (!response.ok) throw new Error("Could not publish this Paper.");
  revalidatePath("/");
  revalidatePath("/papers/publication-queue");
}
