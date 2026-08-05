import type {
  EdgeFunctionBody,
  EdgeFunctionOptions,
  EdgeFunctionResult,
  RpcOptions,
  RpcResult,
  SelectOptions,
  SelectResult,
  TableFilter,
  TransportAdapter,
} from "./transport"

function applyFilter<T extends Record<string, unknown>>(
  row: T,
  filter: TableFilter
): boolean {
  const val = row[filter.column]
  switch (filter.op) {
    case "eq":
      return val === filter.value
    case "neq":
      return val !== filter.value
    case "gt":
      return Number(val) > Number(filter.value)
    case "gte":
      return Number(val) >= Number(filter.value)
    case "lt":
      return Number(val) < Number(filter.value)
    case "lte":
      return Number(val) <= Number(filter.value)
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(val)
    case "contains":
      if (Array.isArray(val)) {
        const needle =
          typeof filter.value === "string" ? JSON.parse(filter.value) : filter.value
        return Array.isArray(needle)
          ? needle.every(
              (item: Record<string, unknown>) =>
                Array.isArray(val) &&
                val.some((v: Record<string, unknown>) => v.id === item.id)
            )
          : true
      }
      return false
    case "ilike":
      if (typeof val === "string" && typeof filter.value === "string") {
        const pattern = filter.value.replace(/%/g, "").toLowerCase()
        return val.toLowerCase().includes(pattern)
      }
      return false
    default:
      return true
  }
}

function pickColumns<T>(row: T, columns?: string): unknown {
  if (!columns || columns === "*") return row
  const keys = columns.split(",").map((k) => k.trim())
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if ((row as Record<string, unknown>)[key] !== undefined) {
      result[key] = (row as Record<string, unknown>)[key]
    }
  }
  return result
}

export type TableData = Record<string, unknown>[]

export type InMemoryStore = {
  [tableName: string]: TableData
}

export type RpcHandler = (
  fn: string,
  params: Record<string, unknown>
) => unknown

export type EdgeHandler = (
  fn: string,
  body: EdgeFunctionBody
) => unknown

export class InMemoryTransportAdapter implements TransportAdapter {
  private store: InMemoryStore
  private rpcHandlers: Map<string, RpcHandler> = new Map()
  private edgeHandlers: Map<string, EdgeHandler> = new Map()

  constructor(initialStore: InMemoryStore = {}) {
    this.store = {}
    for (const [key, value] of Object.entries(initialStore)) {
      this.store[key] = [...value]
    }
  }

  getTable(name: string): TableData {
    if (!this.store[name]) this.store[name] = []
    return this.store[name]
  }

  setTable(name: string, data: TableData): void {
    this.store[name] = [...data]
  }

  registerRpc(fn: string, handler: RpcHandler): void {
    this.rpcHandlers.set(fn, handler)
  }

  registerEdge(fn: string, handler: EdgeHandler): void {
    this.edgeHandlers.set(fn, handler)
  }

  async select<T>(options: SelectOptions): Promise<SelectResult<T>> {
    try {
      const table = this.getTable(options.table)
      let rows = [...table]

      if (options.filters) {
        rows = rows.filter((row) =>
          options.filters!.every((f) => applyFilter(row, f))
        )
      }

      if (options.order) {
        const { column, ascending = true } = options.order
        rows.sort((a, b) => {
          const aVal = a[column]
          const bVal = b[column]
          if (aVal == null && bVal == null) return 0
          if (aVal == null) return ascending ? -1 : 1
          if (bVal == null) return ascending ? 1 : -1
          if (aVal < bVal) return ascending ? -1 : 1
          if (aVal > bVal) return ascending ? 1 : -1
          return 0
        })
      }

      const total = rows.length

      if (options.range) {
        rows = rows.slice(options.range.from, options.range.to + 1)
      }

      const mapped = rows.map((row) => pickColumns(row, options.columns))

      if (options.single) {
        const first = (mapped[0] ?? null) as T | null
        return { data: first, error: null, count: options.count ? total : null }
      }

      return {
        data: mapped as T,
        error: null,
        count: options.count ? total : null,
      }
    } catch (err) {
      return {
        data: null,
        error: { message: (err as Error).message },
        count: null,
      }
    }
  }

  async rpc<T>(options: RpcOptions): Promise<RpcResult<T>> {
    const handler = this.rpcHandlers.get(options.fn)
    if (!handler) {
      return { data: null, error: { message: `No handler for RPC: ${options.fn}` } }
    }
    try {
      const result = handler(options.fn, options.params)
      return { data: result as T, error: null }
    } catch (err) {
      return { data: null, error: { message: (err as Error).message } }
    }
  }

  async invokeEdge<T>(options: EdgeFunctionOptions): Promise<EdgeFunctionResult<T>> {
    const handler = this.edgeHandlers.get(options.fn)
    if (!handler) {
      return { data: null, error: { message: `No handler for edge function: ${options.fn}` } }
    }
    try {
      const result = handler(options.fn, options.body)
      return { data: result as T, error: null }
    } catch (err) {
      return { data: null, error: { message: (err as Error).message } }
    }
  }
}
