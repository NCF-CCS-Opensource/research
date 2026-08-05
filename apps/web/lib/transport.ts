import type {
  EdgeFunctionBody,
  EdgeFunctionOptions,
  EdgeFunctionResult,
  RpcOptions,
  RpcResult,
  SelectOptions,
  SelectResult,
  TransportAdapter,
} from "@repo/api-client"
import { getSupabase } from "./supabase"

export function createSupabaseTransportAdapter(): TransportAdapter {
  return {
    async select<T>(options: SelectOptions): Promise<SelectResult<T>> {
      const supabase = getSupabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from(options.table)
        .select(options.columns ?? "*", { count: options.count ? "exact" : undefined })

      if (options.filters) {
        for (const filter of options.filters) {
          switch (filter.op) {
            case "eq":
              query = query.eq(filter.column, filter.value as string)
              break
            case "neq":
              query = query.neq(filter.column, filter.value as string)
              break
            case "gt":
              query = query.gt(filter.column, filter.value as string)
              break
            case "gte":
              query = query.gte(filter.column, filter.value as string)
              break
            case "lt":
              query = query.lt(filter.column, filter.value as string)
              break
            case "lte":
              query = query.lte(filter.column, filter.value as string)
              break
            case "in":
              query = query.in(filter.column, filter.value as string[])
              break
            case "contains":
              query = query.contains(
                filter.column,
                filter.value as Record<string, unknown>
              )
              break
            case "ilike":
              query = query.ilike(filter.column, filter.value as string)
              break
          }
        }
      }

      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true,
        })
      }

      if (options.range) {
        query = query.range(options.range.from, options.range.to)
      }

      if (options.single) {
        query = query.single()
      }

      const { data, error, count } = await query

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: error.code },
          count: null,
        }
      }

      return {
        data: data as T,
        error: null,
        count: count ?? null,
      }
    },

    async rpc<T>(options: RpcOptions): Promise<RpcResult<T>> {
      const { data, error } = await getSupabase().rpc(
        options.fn,
        options.params as Record<string, unknown>
      )

      if (error) {
        return {
          data: null,
          error: { message: error.message, code: error.code },
        }
      }

      return { data: data as T, error: null }
    },

    async invokeEdge<T>(options: EdgeFunctionOptions): Promise<EdgeFunctionResult<T>> {
      const { data, error } = await getSupabase().functions.invoke(
        options.fn,
        { body: options.body as Record<string, unknown> }
      )

      if (error) {
        return { data: null, error: { message: error.message } }
      }

      return { data: data as T, error: null }
    },
  }
}
