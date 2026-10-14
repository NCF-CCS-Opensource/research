import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE } from '../../../database/database.module.js';
import type { Database } from '../../../database/database.js';
import { programs } from '../../../database/schema/index.js';
import type { ProgramReader } from '../application/program-reader.js';

@Injectable()
export class DrizzleProgramReader implements ProgramReader {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  listActive() {
    return this.db
      .select({ id: programs.id, name: programs.name })
      .from(programs)
      .where(eq(programs.active, true))
      .orderBy(asc(programs.name));
  }
}
