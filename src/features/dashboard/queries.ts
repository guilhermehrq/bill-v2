import "server-only";
import { and, between, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";

export type MonthlyFlow = {
  month: string; // YYYY-MM-01
  incomeCents: number;
  expenseCents: number;
};

export type DashboardData = {
  totalBalanceCents: number;
  activeAccountCount: number;
  currentMonth: {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  };
  previousMonth: {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  };
  cashflow: MonthlyFlow[]; // last 6 months including current
  expensesByCategory: Array<{
    categoryId: string | null;
    name: string;
    color: string | null;
    totalCents: number;
  }>;
  upcoming: Array<{
    id: string;
    date: string;
    description: string;
    amountCents: number;
    type: "income" | "expense" | "transfer";
    accountName: string | null;
    categoryName: string | null;
  }>;
};

export async function loadDashboard(userId: string): Promise<DashboardData> {
  const now = new Date();
  const currentMonthStart = toFirstOfMonth(now);
  const currentMonthEnd = toLastOfMonth(now);
  const previousMonthStart = toFirstOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const previousMonthEnd = toLastOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sixMonthsAgo = toFirstOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const today = toISODate(now);
  const sevenDaysAhead = toISODate(addDays(now, 7));

  const [balanceRow] = (await db
    .select({
      total: sql<number>`COALESCE(SUM(${accounts.initialBalanceCents}), 0)::bigint`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))) as [
    { total: number | string; count: number },
  ];

  const [balanceDeltaRow] = (await db
    .select({
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
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(accounts.archived, false),
        eq(transactions.isPaid, true),
      ),
    )) as [{ delta: number | string }];

  const totalBalanceCents = Number(balanceRow?.total ?? 0) + Number(balanceDeltaRow?.delta ?? 0);
  const activeAccountCount = Number(balanceRow?.count ?? 0);

  const [currentMonth, previousMonth] = await Promise.all([
    loadMonthTotals(userId, currentMonthStart, currentMonthEnd),
    loadMonthTotals(userId, previousMonthStart, previousMonthEnd),
  ]);

  const cashflowRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${transactions.date}), 'YYYY-MM-DD')`,
      income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amountCents} ELSE 0 END)::bigint`,
      expense: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amountCents} ELSE 0 END)::bigint`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isPaid, true),
        gte(transactions.date, sixMonthsAgo),
        lte(transactions.date, currentMonthEnd),
      ),
    )
    .groupBy(sql`date_trunc('month', ${transactions.date})`)
    .orderBy(sql`date_trunc('month', ${transactions.date})`);

  const cashflowByMonth = new Map(
    cashflowRows.map((r) => [
      r.month,
      { incomeCents: Number(r.income), expenseCents: Number(r.expense) },
    ]),
  );
  const cashflow: MonthlyFlow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toISODate(d);
    const entry = cashflowByMonth.get(key) ?? { incomeCents: 0, expenseCents: 0 };
    cashflow.push({ month: key, ...entry });
  }

  const categoryRows = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      color: categories.color,
      total: sql<number>`SUM(${transactions.amountCents})::bigint`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        eq(transactions.isPaid, true),
        between(transactions.date, currentMonthStart, currentMonthEnd),
      ),
    )
    .groupBy(categories.id)
    .orderBy(sql`SUM(${transactions.amountCents}) DESC`)
    .limit(8);

  const upcomingRows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amountCents: transactions.amountCents,
      type: transactions.type,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isPaid, false),
        gte(transactions.date, today),
        lte(transactions.date, sevenDaysAhead),
      ),
    )
    .orderBy(transactions.date)
    .limit(5);

  return {
    totalBalanceCents,
    activeAccountCount,
    currentMonth,
    previousMonth,
    cashflow,
    expensesByCategory: categoryRows.map((r) => ({
      categoryId: r.categoryId,
      name: r.name ?? "Sem categoria",
      color: r.color,
      totalCents: Number(r.total),
    })),
    upcoming: upcomingRows.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amountCents: Number(r.amountCents),
      type: r.type,
      accountName: r.accountName,
      categoryName: r.categoryName,
    })),
  };
}

async function loadMonthTotals(
  userId: string,
  from: string,
  to: string,
): Promise<{ incomeCents: number; expenseCents: number; netCents: number }> {
  const [row] = (await db
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isPaid, true),
        between(transactions.date, from, to),
      ),
    )) as [{ income: number | string; expense: number | string }];

  const incomeCents = Number(row?.income ?? 0);
  const expenseCents = Number(row?.expense ?? 0);
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}

function toFirstOfMonth(d: Date): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function toLastOfMonth(d: Date): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Unused re-export guard for desc (kept for future cursor-based pagination use).
void desc;
