"use server";

import {
  decideBookContract,
  restoreBookContract,
  updateBookContract,
  withdrawBookContract,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { apiFetch } from "../../lib/backend";

export async function decideBook(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const body = decideBookContract.request.parse({
    decision,
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });
  const response = await apiFetch(
    decideBookContract.path.replace(":publicId", encodeURIComponent(publicId)),
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!response.ok) throw new Error("Could not update this Book.");
  revalidatePath("/books/publication-queue");
  revalidatePath("/books/mine");
  revalidatePath("/books");
}

export async function updateBook(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const details = updateBookContract.request.parse({
    title: String(formData.get("title") ?? ""),
    authors: String(formData.get("authors") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    year: Number(formData.get("year")),
    licence: String(formData.get("licence") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    publisher: String(formData.get("publisher") ?? ""),
    edition: String(formData.get("edition") ?? ""),
    isbn: String(formData.get("isbn") ?? ""),
    description: String(formData.get("description") ?? ""),
    keywords: String(formData.get("keywords") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  });
  const response = await apiFetch(
    updateBookContract.path.replace(":publicId", encodeURIComponent(publicId)),
    { method: "PATCH", body: JSON.stringify(details) },
  );
  if (!response.ok) throw new Error("Could not update this Book.");
  revalidatePath("/books/mine");
  revalidatePath(`/books/${encodeURIComponent(publicId)}`);
}

async function changeAvailability(formData: FormData, restore: boolean) {
  const publicId = String(formData.get("publicId") ?? "");
  const contract = restore ? restoreBookContract : withdrawBookContract;
  const response = await apiFetch(
    contract.path.replace(":publicId", encodeURIComponent(publicId)),
    { method: "POST" },
  );
  if (!response.ok) throw new Error("Could not update this Book.");
  revalidatePath("/books/publication-queue");
  revalidatePath("/books/mine");
  revalidatePath("/books");
}

export async function withdrawBook(formData: FormData) {
  await changeAvailability(formData, false);
}

export async function restoreBook(formData: FormData) {
  await changeAvailability(formData, true);
}
