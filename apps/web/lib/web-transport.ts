import { getSupabase } from "@/lib/supabase"
import {
  createAccountWorkspace,
  createDiscovery,
  createPdfAccess,
  createResearchLifecycle,
  DomainApiError,
  normalizeDomainError,
  USER_ERROR_MESSAGE,
  type InsertOptions,
  type SelectOptions,
  type TransportAdapter,
} from "@repo/api-client"

function selectQuery(table: string, opts: SelectOptions) {
  let query = getSupabase().from(table).select(opts.columns ?? "*")
  if (opts.eq) {
    for (const [key, value] of Object.entries(opts.eq)) {
      query = query.eq(key, value)
    }
  }
  if (opts.in) query = query.in(opts.in.column, opts.in.values)
  if (opts.contains)
    query = query.contains(
      opts.contains.column,
      JSON.stringify(opts.contains.value)
    )
  if (opts.ilike)
    query = query.ilike(opts.ilike.column, opts.ilike.pattern)
  if (opts.order)
    query = query.order(opts.order.column, {
      ascending: opts.order.ascending ?? true,
    })
  if (opts.range) query = query.range(opts.range.from, opts.range.to)
  return query
}

const webTransport: TransportAdapter = {
  getCurrentUserId: async () =>
    typeof window === "undefined" ? null : (window.Clerk?.user?.id ?? null),
  async rpc<T>(fn: string, params?: Record<string, unknown>): Promise<T> {
    const { data, error } = await getSupabase().rpc(fn, params)
    if (error) throw normalizeDomainError(error.message, error.code, 500)
    return data as T
  },
  async select<T>(table: string, opts: SelectOptions = {}): Promise<T[]> {
    const { data, error } = await selectQuery(table, opts)
    if (error) throw normalizeDomainError(error.message, error.code, 500)
    return data as T[]
  },
  async selectOne<T>(table: string, opts: SelectOptions = {}): Promise<T> {
    const { data, error } = await selectQuery(table, opts).single()
    if (error) throw normalizeDomainError(error.message, error.code, 500)
    return data as T
  },
  async insert(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    opts?: InsertOptions
  ): Promise<unknown[]> {
    const supabase = getSupabase()
    const query = opts?.upsert
      ? supabase.from(table).upsert(rows, {
          onConflict: opts.onConflict,
          ignoreDuplicates: true,
        })
      : supabase.from(table).insert(rows)
    const { data, error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 400)
    return (data ?? []) as unknown[]
  },
  async update(
    table: string,
    values: Record<string, unknown>,
    eq: Record<string, unknown>
  ): Promise<void> {
    let query = getSupabase().from(table).update(values)
    for (const [key, value] of Object.entries(eq)) {
      query = query.eq(key, value)
    }
    const { error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 400)
  },
  async remove(
    table: string,
    eq: Record<string, unknown>
  ): Promise<void> {
    let query = getSupabase().from(table).delete()
    for (const [key, value] of Object.entries(eq)) {
      query = query.eq(key, value)
    }
    const { error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 400)
  },
  async invokeEdge<T>(
    action: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return callR2<T>({ action, ...params })
  },
}

export const researchLifecycle = createResearchLifecycle(webTransport)
export const pdfAccess = createPdfAccess(webTransport)
export const accountWorkspace = createAccountWorkspace(webTransport)
export const discovery = createDiscovery(webTransport)

async function callR2<T>(
  body: { action: string } & Record<string, unknown>
) {
  const { data, error } = await getSupabase().functions.invoke("r2", { body })
  if (error) {
    const context = "context" in error ? error.context : undefined
    let message = USER_ERROR_MESSAGE
    if (context instanceof Response) {
      try {
        const data = (await context.json()) as { error?: unknown }
        if (typeof data.error === "string") message = data.error
      } catch {
        // Use the safe fallback when the Edge Function body is unreadable.
      }
    }
    throw new DomainApiError(message, context?.status ?? 500, { cause: error })
  }
  return data as T
}
