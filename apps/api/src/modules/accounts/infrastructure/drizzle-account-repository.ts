import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE } from '../../../database/database.module.js';
import type { Database } from '../../../database/database.js';
import {
  accounts,
  auditEvents,
  programs,
} from '../../../database/schema/index.js';
import type { Account } from '../../../shared/domain/account.js';
import type {
  AccountRepository,
  NewAccount,
} from '../application/account-repository.js';

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps the driver error, so check the cause as well.
  const e = error as { code?: string; cause?: { code?: string } };
  return e.code === UNIQUE_VIOLATION || e.cause?.code === UNIQUE_VIOLATION;
}

@Injectable()
export class DrizzleAccountRepository implements AccountRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByClerkUserId(clerkUserId: string): Promise<Account | null> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.clerkUserId, clerkUserId));
    return row ?? null;
  }

  async isActiveProgram(programId: string) {
    const [row] = await this.db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, programId), eq(programs.active, true)));
    return Boolean(row);
  }

  async register(input: NewAccount): Promise<Account | null> {
    try {
      return await this.db.transaction(async (tx) => {
        const [account] = await tx.insert(accounts).values(input).returning();
        await tx.insert(auditEvents).values({
          actorAccountId: account.id,
          action: 'ACCOUNT_REGISTERED',
          subjectType: 'ACCOUNT',
          subjectId: account.id,
          details: { role: account.role, programId: account.programId },
        });
        return account;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async updateEmail(id: string, email: string) {
    try {
      const [row] = await this.db
        .update(accounts)
        .set({ email })
        .where(eq(accounts.id, id))
        .returning();
      return row ?? null;
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async updateProfile(
    id: string,
    profile: { name: string; programId: string | null },
  ) {
    const [row] = await this.db
      .update(accounts)
      .set(profile)
      .where(eq(accounts.id, id))
      .returning();
    return row;
  }
}
