import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, goals, transactions } from "@/db/schema";

export type GoalRow = {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
  accountId: string | null;
  accountName: string | null;
  icon: string | null;
  color: string | null;
  archived: boolean;
  pctAchieved: number;
  monthsToTarget: number | null;
  projectedCompletionDate: string | null;
};

export async function listGoals(userId: string): Promise<GoalRow[]> {
  const rows = await db
    .select({
      id: goals.id,
      name: goals.name,
      targetCents: goals.targetCents,
      currentCents: goals.currentCents,
      targetDate: goals.targetDate,
      accountId: goals.accountId,
      accountName: accounts.name,
      accountInitialBalanceCents: accounts.initialBalanceCents,
      icon: goals.icon,
      color: goals.color,
      archived: goals.archived,
    })
    .from(goals)
    .leftJoin(accounts, eq(goals.accountId, accounts.id))
    .where(eq(goals.userId, userId))
    .orderBy(goals.archived, goals.createdAt);

  if (rows.length === 0) return [];

  // For account-backed goals we recompute `current` from the linked account's
  // balance. For manual goals, `current_cents` stored on the row is the truth.
  const linkedAccountIds = rows.map((r) => r.accountId).filter((id): id is string => id !== null);
  const today = isoDate(new Date());

  const balanceDeltas = linkedAccountIds.length
    ? await db
        .select({
          accountId: transactions.accountId,
          delta: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${transactions.type} = 'income'  THEN ${transactions.amountCents}
              WHEN ${transactions.type} = 'expense' THEN -${transactions.amountCents}
              WHEN ${transactions.type} = 'transfer' AND ${transactions.transferDirection} = 'in'  THEN ${transactions.amountCents}
              WHEN ${transactions.type} = 'transfer' AND ${transactions.transferDirection} = 'out' THEN -${transactions.amountCents}
              ELSE 0
            END
          ), 0)::bigint`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.isPaid, true),
            lte(transactions.date, today),
            sql`${transactions.accountId} = ANY(${linkedAccountIds})`,
          ),
        )
        .groupBy(transactions.accountId)
    : [];

  const deltaByAccount = new Map<string, number>();
  for (const r of balanceDeltas) {
    if (r.accountId) deltaByAccount.set(r.accountId, Number(r.delta));
  }

  // Past-90-day income velocity per account (to estimate projection).
  const ninetyDaysAgo = isoDate(addDays(new Date(), -90));
  const velocityRows = linkedAccountIds.length
    ? await db
        .select({
          accountId: transactions.accountId,
          netCents: sql<number>`COALESCE(SUM(
            CASE
              WHEN ${transactions.type} = 'income'  THEN ${transactions.amountCents}
              WHEN ${transactions.type} = 'expense' THEN -${transactions.amountCents}
              WHEN ${transactions.type} = 'transfer' AND ${transactions.transferDirection} = 'in'  THEN ${transactions.amountCents}
              WHEN ${transactions.type} = 'transfer' AND ${transactions.transferDirection} = 'out' THEN -${transactions.amountCents}
              ELSE 0
            END
          ), 0)::bigint`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.isPaid, true),
            gte(transactions.date, ninetyDaysAgo),
            sql`${transactions.accountId} = ANY(${linkedAccountIds})`,
          ),
        )
        .groupBy(transactions.accountId)
    : [];

  const velocityByAccount = new Map<string, number>();
  for (const r of velocityRows) {
    if (r.accountId) velocityByAccount.set(r.accountId, Number(r.netCents));
  }

  return rows.map<GoalRow>((r) => {
    const initial = Number(r.accountInitialBalanceCents ?? 0);
    const current =
      r.accountId !== null
        ? Math.max(0, initial + (deltaByAccount.get(r.accountId) ?? 0))
        : Number(r.currentCents);

    const target = Number(r.targetCents);
    const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

    // Projection: if account-backed and net velocity (90d) is positive,
    // compute how many months needed to reach the remainder.
    let monthsToTarget: number | null = null;
    let projectedCompletionDate: string | null = null;

    if (r.accountId && current < target) {
      const monthlyNet = (velocityByAccount.get(r.accountId) ?? 0) / 3; // 90d / 3 months
      if (monthlyNet > 0) {
        const missing = target - current;
        const months = Math.ceil(missing / monthlyNet);
        monthsToTarget = months;
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        projectedCompletionDate = isoDate(d);
      }
    }

    return {
      id: r.id,
      name: r.name,
      targetCents: target,
      currentCents: current,
      targetDate: r.targetDate,
      accountId: r.accountId,
      accountName: r.accountName,
      icon: r.icon,
      color: r.color,
      archived: r.archived,
      pctAchieved: pct,
      monthsToTarget,
      projectedCompletionDate,
    };
  });
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
