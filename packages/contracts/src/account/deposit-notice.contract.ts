import { z } from "zod"

export const depositNoticeSchema = z.object({ version: z.number().int().positive(), text: z.string(), publishedAt: z.string().datetime() })
export const publishDepositNoticeRequestSchema = z.object({ text: z.string().trim().min(1, "Deposit Notice text is required") })
export const getCurrentDepositNoticeContract = { method: "GET" as const, path: "/deposit-notices/get-current" as const, response: depositNoticeSchema.nullable() }
export const listDepositNoticesContract = { method: "GET" as const, path: "/deposit-notices/get-all" as const, response: z.array(depositNoticeSchema) }
export const publishDepositNoticeContract = { method: "POST" as const, path: "/deposit-notices/publish" as const, request: publishDepositNoticeRequestSchema, response: depositNoticeSchema }
