import { eq } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"
import type { Database } from "../../../database/database"
import type { TaxonomyRepository } from "../application/taxonomy-repository.interface"
import {
  DuplicateTaxonomyNameError,
  TaxonomyEntryNotFoundError,
  type TaxonomyLabel,
} from "../domain/taxonomy.errors"

type TaxonomyTable = PgTable & { id: PgColumn; name: PgColumn }

const UNIQUE_VIOLATION = "23505"

// Drizzle wraps driver errors, so the PostgreSQL code may sit on `cause`.
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } }
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION
}

/** One implementation for Categories, Keywords, and Programs. */
export class DrizzleTaxonomyRepository implements TaxonomyRepository {
  constructor(
    private readonly db: Database,
    private readonly table: TaxonomyTable,
    private readonly label: TaxonomyLabel
  ) {}

  async create(name: string) {
    try {
      const [row] = await this.db
        .insert(this.table)
        .values({ name })
        .returning({ id: this.table.id, name: this.table.name })
      return row as { id: string; name: string }
    } catch (error) {
      throw this.translate(error, name)
    }
  }

  async rename(id: string, name: string) {
    try {
      const [row] = await this.db
        .update(this.table)
        .set({ name })
        .where(eq(this.table.id, id))
        .returning({ id: this.table.id, name: this.table.name })
      if (!row) throw new TaxonomyEntryNotFoundError(this.label)
      return row as { id: string; name: string }
    } catch (error) {
      throw this.translate(error, name)
    }
  }

  // Profiles referencing a Program are cleared by ON DELETE SET NULL, and
  // Research Record links cascade, so the delete itself is all that's needed.
  async delete(id: string) {
    const rows = await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning({ id: this.table.id })
    if (rows.length === 0) throw new TaxonomyEntryNotFoundError(this.label)
  }

  private translate(error: unknown, name: string): unknown {
    return isUniqueViolation(error)
      ? new DuplicateTaxonomyNameError(this.label, name)
      : error
  }
}
