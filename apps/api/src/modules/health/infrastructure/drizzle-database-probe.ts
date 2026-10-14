import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE } from '../../../database/database.module.js';
import type { Database } from '../../../database/database.js';
import type { DatabaseProbe } from '../application/database-probe.js';

@Injectable()
export class DrizzleDatabaseProbe implements DatabaseProbe {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async ping() {
    await this.db.execute(sql`select 1`);
  }
}
