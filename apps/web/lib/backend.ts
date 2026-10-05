import "server-only";
import { auth } from "@clerk/nextjs/server";
import {
  errorEnvelopeSchema,
  getCurrentAccountContract,
  type CurrentIdentity,
} from "@repo/contracts";

const origin = () => process.env.API_ORIGIN ?? "http://localhost:3001";

/** Calls the API with the caller's Clerk session token. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await (await auth()).getToken();
  return fetch(`${origin()}/v1/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function apiMessage(res: Response): Promise<string> {
  const parsed = errorEnvelopeSchema.safeParse(await res.json().catch(() => null));
  return parsed.success ? parsed.data.error.message : "Something went wrong. Please try again.";
}

export async function getCurrentIdentity(): Promise<CurrentIdentity> {
  const res = await apiFetch(getCurrentAccountContract.path);
  if (!res.ok) throw new Error(`Identity request failed: ${res.status}`);
  return getCurrentAccountContract.response.parse(await res.json()).data;
}

