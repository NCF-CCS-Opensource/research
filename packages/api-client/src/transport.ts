import { DomainApiError, NotFoundError } from "./errors"

export type SelectOptions = {
  columns?: string
  eq?: Record<string, unknown>
  in?: { column: string; values: unknown[] }
  contains?: { column: string; value: Record<string, unknown> | unknown[] }
  ilike?: { column: string; pattern: string }
  order?: { column: string; ascending?: boolean }
  range?: { from: number; to: number }
}

export type InsertOptions = {
  upsert?: boolean
  onConflict?: string
}

export interface TransportAdapter {
  getCurrentUserId(): Promise<string | null>
  rpc<T>(fn: string, params?: Record<string, unknown>): Promise<T>
  select<T>(table: string, opts?: SelectOptions): Promise<T[]>
  selectOne<T>(table: string, opts?: SelectOptions): Promise<T>
  insert(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    opts?: InsertOptions
  ): Promise<unknown[]>
  update(
    table: string,
    values: Record<string, unknown>,
    eq: Record<string, unknown>
  ): Promise<void>
  remove(table: string, eq: Record<string, unknown>): Promise<void>
  invokeEdge<T>(action: string, params?: Record<string, unknown>): Promise<T>
}

export type InMemoryTransportConfig = {
  userId?: string | null
  rpc?: Record<string, unknown | ((params?: Record<string, unknown>) => unknown)>
  edge?: Record<string, unknown | ((params?: Record<string, unknown>) => unknown)>
  tables?: Record<string, Record<string, unknown>[]>
}

function matches(row: Record<string, unknown>, eq: Record<string, unknown>) {
  return Object.entries(eq).every(([key, value]) => row[key] === value)
}

function matchesIn(
  row: Record<string, unknown>,
  column: string,
  values: unknown[]
) {
  return values.includes(row[column])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function objectContains(
  subset: Record<string, unknown>,
  obj: Record<string, unknown>
) {
  return Object.entries(subset).every(([key, value]) => obj[key] === value)
}

function matchesContains(
  row: Record<string, unknown>,
  column: string,
  value: Record<string, unknown> | unknown[]
) {
  const cell = row[column]
  if (Array.isArray(value)) {
    if (!Array.isArray(cell)) return false
    return value.some((element) =>
      isRecord(element)
        ? cell.some((item) => isRecord(item) && objectContains(element, item))
        : cell.includes(element)
    )
  }
  return isRecord(cell) && objectContains(value, cell)
}

function matchesIlike(
  row: Record<string, unknown>,
  column: string,
  pattern: string
) {
  const value = row[column]
  const needle = pattern.replace(/^%/, "").replace(/%$/, "").toLowerCase()
  return typeof value === "string" && value.toLowerCase().includes(needle)
}

export function requireAuth(adapter: TransportAdapter) {
  return async () => {
    const userId = await adapter.getCurrentUserId()
    if (!userId) throw new DomainApiError("Authentication required", 401)
    return userId
  }
}

export function createInMemoryTransport(
  config: InMemoryTransportConfig = {}
): TransportAdapter {
  const tables = new Map<string, Record<string, unknown>[]>()
  for (const [name, rows] of Object.entries(config.tables ?? {})) {
    tables.set(name, rows.map((row) => ({ ...row })))
  }

  const rpcStore = new Map(Object.entries(config.rpc ?? {}))
  const edgeStore = new Map(Object.entries(config.edge ?? {}))

  function applySorting(
    rows: Record<string, unknown>[],
    order: NonNullable<SelectOptions["order"]>
  ) {
    const { column, ascending = true } = order
    return [...rows].sort((a, b) => {
      const left = a[column]
      const right = b[column]
      if (left === right) return 0
      if (left == null) return ascending ? 1 : -1
      if (right == null) return ascending ? -1 : 1
      const result = left < right ? -1 : 1
      return ascending ? result : -result
    })
  }

  const adapter: TransportAdapter = {
    getCurrentUserId: async () => config.userId ?? null,

    async rpc<T>(fn: string, params?: Record<string, unknown>) {
      if (!rpcStore.has(fn))
        throw new DomainApiError(`RPC "${fn}" is not stubbed`, 500)
      const value = rpcStore.get(fn)!
      return (typeof value === "function"
        ? (value as (p?: Record<string, unknown>) => unknown)(params)
        : value) as T
    },

    async select<T>(table: string, opts: SelectOptions = {}) {
      let rows = [...(tables.get(table) ?? [])]
      if (opts.eq) rows = rows.filter((row) => matches(row, opts.eq!))
      if (opts.in)
        rows = rows.filter((row) =>
          matchesIn(row, opts.in!.column, opts.in!.values)
        )
      if (opts.contains)
        rows = rows.filter((row) =>
          matchesContains(row, opts.contains!.column, opts.contains!.value)
        )
      if (opts.ilike)
        rows = rows.filter((row) =>
          matchesIlike(row, opts.ilike!.column, opts.ilike!.pattern)
        )
      if (opts.order) rows = applySorting(rows, opts.order)
      if (opts.range)
        rows = rows.slice(opts.range.from, opts.range.to + 1)
      if (opts.columns && opts.columns !== "*") {
        const columns = opts.columns.split(",").map((column) => column.trim())
        rows = rows.map((row) =>
          Object.fromEntries(
            columns.filter((column) => column in row).map((column) => [column, row[column]])
          )
        )
      }
      return rows as T[]
    },

    async selectOne<T>(table: string, opts: SelectOptions = {}) {
      const rows = await adapter.select<Record<string, unknown>>(table, opts)
      if (!rows.length) throw new NotFoundError(`${table} not found`)
      return rows[0] as T
    },

    async insert(
      table: string,
      rows: Record<string, unknown> | Record<string, unknown>[],
      opts?: InsertOptions
    ) {
      const list = Array.isArray(rows) ? rows : [rows]
      const store = tables.get(table) ?? []
      const inserted: Record<string, unknown>[] = []
      for (const row of list) {
        const next = { ...row }
        if (opts?.upsert && opts.onConflict) {
          const keys = opts.onConflict.split(",").map((key) => key.trim())
          const existing = store.find((candidate) =>
            keys.every((key) => candidate[key] === next[key])
          )
          if (existing) continue
        }
        if (next.id === undefined) next.id = `id_${store.length}_${Math.random()}`
        store.push(next)
        inserted.push(next)
      }
      tables.set(table, store)
      return inserted
    },

    async update(
      table: string,
      values: Record<string, unknown>,
      eq: Record<string, unknown>
    ) {
      const store = tables.get(table) ?? []
      tables.set(
        table,
        store.map((row) =>
          matches(row, eq) ? { ...row, ...values } : row
        )
      )
    },

    async remove(table: string, eq: Record<string, unknown>) {
      const store = tables.get(table) ?? []
      tables.set(
        table,
        store.filter((row) => !matches(row, eq))
      )
    },

    async invokeEdge<T>(action: string, params?: Record<string, unknown>) {
      if (!edgeStore.has(action))
        throw new DomainApiError(`Edge action "${action}" is not stubbed`, 500)
      const value = edgeStore.get(action)!
      return (typeof value === "function"
        ? (value as (p?: Record<string, unknown>) => unknown)(params)
        : value) as T
    },
  }

  return adapter
}
