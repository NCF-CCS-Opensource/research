"use server";

import {
  createLegacyDepositContract,
  publishLegacyDepositContract,
} from "@repo/contracts";
import { redirect } from "next/navigation";
import { apiFetch, apiMessage } from "../../../lib/backend";

export async function createLegacyDeposit(formData: FormData) {
  const parsed = createLegacyDepositContract.request.safeParse({
    title: formData.get("title"),
    abstract: formData.get("abstract"),
    authors: String(formData.get("authors") ?? "")
      .split("\n")
      .filter((name) => name.trim())
      .map((displayName) => ({ displayName, kind: "person" as const })),
    year: Number(formData.get("year")),
    researchType: formData.get("researchType"),
    keywords: String(formData.get("keywords") ?? "").split(","),
    programId: formData.get("programId"),
    adviserId: formData.get("adviserId") || null,
  });
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid Paper details.",
    );
  const response = await apiFetch(createLegacyDepositContract.path, {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });
  if (!response.ok) throw new Error(await apiMessage(response));
  const paper = createLegacyDepositContract.response.parse(
    (await response.json())?.data,
  );
  redirect(`/papers/${encodeURIComponent(paper.publicId)}`);
}

export async function publishLegacyDeposit(formData: FormData) {
  const publicId = String(formData.get("publicId") ?? "");
  const response = await apiFetch(
    publishLegacyDepositContract.path.replace(
      ":publicId",
      encodeURIComponent(publicId),
    ),
    { method: "POST" },
  );
  if (!response.ok) throw new Error(await apiMessage(response));
  redirect(`/papers/${encodeURIComponent(publicId)}`);
}
