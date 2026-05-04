import "server-only";
import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { creditCardInvoices, transactions } from "@/db/schema";
import type { CreditCardReportMode } from "@/features/settings/queries";

export type CategoryRow = {
  categoryId: string | null;
  parentId: string | null;
  name: string;
  parentName: string | null;
  color: string | null;
  totalCents: number;
  count: number;
};

export type EvolutionRow = {
  month: string; // YYYY-MM-01
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type ReportSummary = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  transactionCount: number;
};

export type ReportData = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  summary: ReportSummary;
  byCategory: CategoryRow[];
  byParentCategory: CategoryRow[];
  evolution: EvolutionRow[];
};

export type ComparisonData = {
  current: { from: string; to: string; summary: ReportSummary; byCategory: CategoryRow[] };
  previous: { from: string; to: string; summary: ReportSummary; byCategory: CategoryRow[] };
};

function bucketDateExpr(mode: CreditCardReportMode): SQL<Date> {
  switch (mode) {
    case "installment_date":
      return sql<Date>`${transactions.date}`;
    case "purchase_date":
      return sql<Date>`COALESCE(${transactions.purchaseDate}, ${transactions.date})`;
    case "invoice_date":
      return sql<Date>`CASE
        WHEN ${transactions.creditCardId} IS NOT NULL AND ${creditCardInvoices.referenceMonth} IS NOT NULL
          THEN ${creditCardInvoices.referenceMonth}
        ELSE ${transactions.date}
      END`;
  }
}

export async function loadReportData(
  userId: string,
  from: string, // YYYY-MM-DD
  to: string, // YYYY-MM-DD
  mode: CreditCardReportMode,
): Promise<ReportData> {
  const bucket = bucketDateExpr(mode);

  const [summaryRow] = (await db
    .select({
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .leftJoin(creditCardInvoices, eq(transactions.invoiceId, creditCardInvoices.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isPaid, true),
        sql`${transactions.type} <> 'transfer'`,
        gte(bucket, sql`${from}::date`),
        lte(bucket, sql`${to}::date`),
      ),
    )) as [{ income: number | string; expense: number | string; count: number }];

  const incomeCents = Number(summaryRow?.income ?? 0);
  const expenseCents = Number(summaryRow?.expense ?? 0);

  // No alias on transactions/credit_card_invoices: bucketDateExpr references
  // them by their full names (transactions.date, credit_card_invoices.reference_month),
  // so aliasing here would produce "invalid reference to FROM-clause entry".
  const byCategoryRows = await db.execute(sql`
    SELECT
      c.id AS category_id,
      c.parent_id AS parent_id,
      c.name AS name,
      c.color AS color,
      p.name AS parent_name,
      SUM(transactions.amount_cents)::bigint AS total_cents,
      COUNT(*)::int AS count
    FROM transactions
    LEFT JOIN categories c ON c.id = transactions.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    LEFT JOIN credit_card_invoices ON credit_card_invoices.id = transactions.invoice_id
    WHERE transactions.user_id = ${userId}
      AND transactions.is_paid = true
      AND transactions.type = 'expense'
      AND ${bucket} BETWEEN ${from}::date AND ${to}::date
    GROUP BY c.id, c.parent_id, c.name, c.color, p.name
    ORDER BY SUM(transactions.amount_cents) DESC
  `);

  const byCategory: CategoryRow[] = byCategoryRows.map((r) => ({
    categoryId: (r.category_id as string | null) ?? null,
    parentId: (r.parent_id as string | null) ?? null,
    name: (r.name as string | null) ?? "Sem categoria",
    parentName: (r.parent_name as string | null) ?? null,
    color: (r.color as string | null) ?? null,
    totalCents: Number(r.total_cents),
    count: Number(r.count),
  }));

  // Aggregate by top-level (parent) category — collapses subcategories into their parent.
  const parentMap = new Map<string, CategoryRow>();
  for (const row of byCategory) {
    const groupKey = row.parentId ?? row.categoryId ?? "uncategorized";
    const existing = parentMap.get(groupKey);
    if (existing) {
      existing.totalCents += row.totalCents;
      existing.count += row.count;
    } else {
      parentMap.set(groupKey, {
        categoryId: row.parentId ?? row.categoryId,
        parentId: null,
        name: row.parentName ?? row.name,
        parentName: null,
        color: row.color,
        totalCents: row.totalCents,
        count: row.count,
      });
    }
  }
  const byParentCategory = Array.from(parentMap.values()).sort(
    (a, b) => b.totalCents - a.totalCents,
  );

  const evolutionRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${bucket}), 'YYYY-MM-DD')`,
      income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amountCents} ELSE 0 END)::bigint`,
      expense: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amountCents} ELSE 0 END)::bigint`,
    })
    .from(transactions)
    .leftJoin(creditCardInvoices, eq(transactions.invoiceId, creditCardInvoices.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isPaid, true),
        sql`${transactions.type} <> 'transfer'`,
        gte(bucket, sql`${from}::date`),
        lte(bucket, sql`${to}::date`),
      ),
    )
    .groupBy(sql`date_trunc('month', ${bucket})`)
    .orderBy(sql`date_trunc('month', ${bucket})`);

  const evolutionMap = new Map<string, EvolutionRow>(
    evolutionRows.map((r) => {
      const inc = Number(r.income);
      const exp = Number(r.expense);
      return [
        r.month,
        { month: r.month, incomeCents: inc, expenseCents: exp, netCents: inc - exp },
      ];
    }),
  );
  const evolution = fillMonthlyRange(from, to, evolutionMap);

  return {
    from,
    to,
    summary: {
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      transactionCount: Number(summaryRow?.count ?? 0),
    },
    byCategory,
    byParentCategory,
    evolution,
  };
}

export async function loadComparisonData(
  userId: string,
  current: { from: string; to: string },
  previous: { from: string; to: string },
  mode: CreditCardReportMode,
): Promise<ComparisonData> {
  const [a, b] = await Promise.all([
    loadReportData(userId, current.from, current.to, mode),
    loadReportData(userId, previous.from, previous.to, mode),
  ]);

  return {
    current: {
      from: a.from,
      to: a.to,
      summary: a.summary,
      byCategory: a.byParentCategory,
    },
    previous: {
      from: b.from,
      to: b.to,
      summary: b.summary,
      byCategory: b.byParentCategory,
    },
  };
}

function fillMonthlyRange(
  from: string,
  to: string,
  map: Map<string, EvolutionRow>,
): EvolutionRow[] {
  const out: EvolutionRow[] = [];
  const [fy, fm] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number, number];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    const key = `${y}-${String(m).padStart(2, "0")}-01`;
    out.push(map.get(key) ?? { month: key, incomeCents: 0, expenseCents: 0, netCents: 0 });
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
