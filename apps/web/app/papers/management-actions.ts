"use server";

import { restorePaperContract, withdrawPaperContract } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { apiFetch } from "../../lib/backend";

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export async function withdrawPaper(formData: FormData) {
  if (field(formData, "confirm") !== "yes")
    throw new Error("Confirm Paper withdrawal.");
  const publicId = field(formData, "publicId");
  const body = withdrawPaperContract.request.parse({
    reason: field(formData, "reason"),
    publicNotice: field(formData, "publicNotice"),
  });
  const response = await apiFetch(
    withdrawPaperContract.path.replace(
      ":publicId",
      encodeURIComponent(publicId),
    ),
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!response.ok) throw new Error("Could not withdraw this Paper.");
  revalidatePath("/");
  revalidatePath("/papers/catalog");
  revalidatePath(`/papers/${encodeURIComponent(publicId)}`);
}

export async function restorePaper(formData: FormData) {
  if (field(formData, "confirm") !== "yes")
    throw new Error("Confirm Paper restoration.");
  const publicId = field(formData, "publicId");
  const response = await apiFetch(
    restorePaperContract.path.replace(
      ":publicId",
      encodeURIComponent(publicId),
    ),
    { method: "POST" },
  );
  if (!response.ok) throw new Error("Could not restore this Paper.");
  revalidatePath("/");
  revalidatePath("/papers/catalog");
  revalidatePath(`/papers/${encodeURIComponent(publicId)}`);
}
