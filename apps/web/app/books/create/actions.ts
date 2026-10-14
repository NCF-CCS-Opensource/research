"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function createBook(formData: FormData) {
  const token = await (await auth()).getToken();
  const licence = String(formData.get("licence") ?? "");
  const metadata = {
    title: String(formData.get("title") ?? ""),
    authors: String(formData.get("authors") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    year: Number(formData.get("year")),
    licence,
    ...(licence === "OTHER"
      ? { otherLicenceName: String(formData.get("otherLicenceName") ?? "") }
      : {}),
    openLicenceConfirmed: formData.get("openLicenceConfirmed") === "on",
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    publisher: String(formData.get("publisher") ?? ""),
    edition: String(formData.get("edition") ?? ""),
    isbn: String(formData.get("isbn") ?? ""),
    description: String(formData.get("description") ?? ""),
    keywords: String(formData.get("keywords") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  };
  const upload = new FormData();
  upload.set("metadata", JSON.stringify(metadata));
  const file = formData.get("file");
  if (file instanceof File) upload.set("file", file);
  const response = await fetch(
    `${process.env.API_ORIGIN ?? "http://localhost:3001"}/v1/api/books/create`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: upload,
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      "Book upload failed. Check the details and PDF, then try again.",
    );
  const envelope = await response.json();
  redirect(
    `/books/mine?uploaded=${encodeURIComponent(envelope.data.publicId)}`,
  );
}
