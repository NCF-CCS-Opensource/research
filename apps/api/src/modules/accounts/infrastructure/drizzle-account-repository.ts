import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE } from '../../../database/database.module.js';
import type { Database } from '../../../database/database.js';
import {
  accounts,
  auditEvents,
  programs,
} from '../../../database/schema/index.js';
import type {
  Account,
  AccountStatus,
  Role,
} from '../../../shared/domain/account.js';
import type {
  AccountRepository,
  ChangeOutcome,
  ManagedAccount,
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

  async list(): Promise<ManagedAccount[]> {
    return this.managedQuery().orderBy(accounts.name);
  }

  private managedQuery(executor: Pick<Database, 'select'> = this.db) {
    return executor
      .select({
        id: accounts.id,
        clerkUserId: accounts.clerkUserId,
        name: accounts.name,
        email: accounts.email,
        role: accounts.role,
        status: accounts.status,
        programId: accounts.programId,
        programName: programs.name,
      })
      .from(accounts)
      .leftJoin(programs, eq(programs.id, accounts.programId));
  }

  changeRole(change: {
    actorId: string;
    accountId: string;
    role: Role;
    reason: string;
  }) {
    const { role, reason } = change;
    return this.mutate(change, (target) =>
      target.role === role
        ? null
        : {
            set: { role },
            keepsCoordinator: role === 'COORDINATOR',
            action: 'ACCOUNT_ROLE_CHANGED',
            details: { from: target.role, to: role, reason },
          },
    );
  }

  setStatus(change: {
    actorId: string;
    accountId: string;
    status: AccountStatus;
    reason: string;
  }) {
    const { status, reason } = change;
    return this.mutate(change, (target) =>
      target.status === status
        ? null
        : {
            set: { status },
            keepsCoordinator: status === 'ACTIVE',
            action:
              status === 'ACTIVE'
                ? 'ACCOUNT_REACTIVATED'
                : 'ACCOUNT_DEACTIVATED',
            details: { reason },
          },
    );
  }

  /**
   * Locks every active Coordinator before deciding, so two concurrent changes
   * serialise and the second sees the first's result.
   */
  private mutate(
    { actorId, accountId }: { actorId: string; accountId: string },
    plan: (target: Account) => {
      set: Partial<Pick<Account, 'role' | 'status'>>;
      keepsCoordinator: boolean;
      action: string;
      details: object;
    } | null,
  ): Promise<ChangeOutcome> {
    return this.db.transaction(async (tx) => {
      const activeCoordinators = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(eq(accounts.role, 'COORDINATOR'), eq(accounts.status, 'ACTIVE')),
        )
        .orderBy(accounts.id)
        .for('update');
      const [target] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .for('update');
      if (!target) return { outcome: 'not_found' };

      const change = plan(target);
      if (!change) return { outcome: 'unchanged' };
      const isLastCoordinator =
        activeCoordinators.length === 1 &&
        activeCoordinators[0].id === target.id;
      if (isLastCoordinator && !change.keepsCoordinator) {
        return { outcome: 'last_coordinator' };
      }

      await tx
        .update(accounts)
        .set(change.set)
        .where(eq(accounts.id, accountId));
      await tx.insert(auditEvents).values({
        actorAccountId: actorId,
        action: change.action,
        subjectType: 'ACCOUNT',
        subjectId: accountId,
        details: change.details,
      });
      const [account] = await this.managedQuery(tx).where(
        eq(accounts.id, accountId),
      );
      return { outcome: 'changed', account };
    });
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
