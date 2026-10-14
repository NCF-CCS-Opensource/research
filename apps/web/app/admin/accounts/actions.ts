"use server";

import {
  accountStatusChangeInputSchema,
  changeAccountRoleContract,
  changeAccountRoleInputSchema,
  deactivateAccountContract,
  reactivateAccountContract,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { apiFetch, apiMessage } from "../../../lib/backend";

type Result = string | null;

async function send(
  contract: { path: string; method: string },
  body: object,
): Promise<Result> {
  const res = await apiFetch(contract.path, {
    method: contract.method,
    body: JSON.stringify(body),
  });
  if (!res.ok) return apiMessage(res);
  revalidatePath("/admin/accounts");
  return null;
}

export async function changeRole(
  _previous: Result,
  formData: FormData,
): Promise<Result> {
  const parsed = changeAccountRoleInputSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    return parsed.error.issues[0]?.message ?? "Check your details.";
  return send(changeAccountRoleContract, parsed.data);
}

export async function setStatus(
  _previous: Result,
  formData: FormData,
): Promise<Result> {
  const { intent, ...fields } = Object.fromEntries(formData);
  const parsed = accountStatusChangeInputSchema.safeParse(fields);
  if (!parsed.success)
    return parsed.error.issues[0]?.message ?? "Check your details.";
  return send(
    intent === "reactivate"
      ? reactivateAccountContract
      : deactivateAccountContract,
    parsed.data,
  );
}
