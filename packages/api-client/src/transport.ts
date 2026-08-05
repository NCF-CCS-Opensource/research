export type TableFilter = {
  column: string
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "ilike"
  value: unknown
}

export type TableOrder = {
  column: string
  ascending?: boolean
}

export type TableRange = {
  from: number
  to: number
}

export type SelectOptions = {
  table: string
  columns?: string
  filters?: TableFilter[]
  order?: TableOrder
  range?: TableRange
  count?: boolean
  single?: boolean
}

export type RpcParams = Record<string, unknown>

export type RpcOptions = {
  fn: string
  params: RpcParams
}

export type EdgeFunctionBody = Record<string, unknown>

export type EdgeFunctionOptions = {
  fn: string
  body: EdgeFunctionBody
}

export type SelectResult<T> = {
  data: T | null
  error: { message: string; code?: string } | null
  count: number | null
}

export type RpcResult<T> = {
  data: T | null
  error: { message: string; code?: string } | null
}

export type EdgeFunctionResult<T> = {
  data: T | null
  error: { message: string } | null
}

export interface TransportAdapter {
  select<T>(options: SelectOptions): Promise<SelectResult<T>>
  rpc<T>(options: RpcOptions): Promise<RpcResult<T>>
  invokeEdge<T>(options: EdgeFunctionOptions): Promise<EdgeFunctionResult<T>>
}
