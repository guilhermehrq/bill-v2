import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  color: string | null;
  icon: string | null;
  initialBalanceCents: number;
  currency: string;
  archived: boolean;
  includeInTotalBalance: boolean;
  balanceCents: number;
  transactionCount: number;
};

export async function listAccountsWithBalances(userId: string): Promise<AccountWithBalance[]> {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      institution: accounts.institution,
      color: accounts.color,
      icon: accounts.icon,
      initialBalanceCents: accounts.initialBalanceCents,
      currency: accounts.currency,
      archived: accounts.archived,
      includeInTotalBalance: accounts.includeInTotalBalance,
      balanceDelta: sql<number>`COALESCE(SUM(
        CASE
          WHEN ${transactions.type} = 'income'  THEN ${transactions.amountCents}
          WHEN ${transactions.type} = 'expense' THEN -${transactions.amountCents}
          WHEN ${transactions.type} = 'transfer' AND ${transactions.transferDirection} = 'in'  THEN ${transactions.amountCents}
          WHEN ${transactions.type} = 'transfer' AND ${transactions.transferDirection} = 'out' THEN -${transactions.amountCents}
          ELSE 0
        END
      ) FILTER (WHERE ${transactions.isPaid} = true), 0)::bigint`,
      transactionCount: sql<number>`COUNT(${transactions.id})::int`,
    })
    .from(accounts)
    .leftJoin(
      transactions,
      and(eq(transactions.accountId, accounts.id), eq(transactions.userId, accounts.userId)),
    )
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(accounts.archived, accounts.createdAt);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    institution: r.institution,
    color: r.color,
    icon: r.icon,
    initialBalanceCents: Number(r.initialBalanceCents),
    currency: r.currency,
    archived: r.archived,
    includeInTotalBalance: r.includeInTotalBalance,
    balanceCents: Number(r.initialBalanceCents) + Number(r.balanceDelta),
    transactionCount: Number(r.transactionCount),
  }));
}

export async function getAccount(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .limit(1);
  return row ?? null;
}
