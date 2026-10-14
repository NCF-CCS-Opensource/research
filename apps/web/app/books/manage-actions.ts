"use server";

import {
  decideBookContract,
  restoreBookContract,
  updateBookContract,
  withdrawBookContract,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { apiFetch } from "../../lib/backend";

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export async function decideBook(formData: FormData) {
  const publicId = field(formData, "publicId");
  const decision = field(formData, "decision");
  const body = decideBookContract.request.parse({
    decision,
    reason: field(formData, "reason").trim() || undefined,
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
  const publicId = field(formData, "publicId");
  const details = updateBookContract.request.parse({
    title: field(formData, "title"),
    authors: field(formData, "authors")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    year: Number(field(formData, "year")),
    licence: field(formData, "licence"),
    sourceUrl: field(formData, "sourceUrl"),
    publisher: field(formData, "publisher"),
    edition: field(formData, "edition"),
    isbn: field(formData, "isbn"),
    description: field(formData, "description"),
    keywords: field(formData, "keywords")
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
  const publicId = field(formData, "publicId");
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
