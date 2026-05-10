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
  icon: string | null;
  totalCents: number;
  count: number;
};

export type CategoryLeaf = {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  totalCents: number;
  count: number;
};

// One group per top-level category (or "Sem categoria"). Children carry the
// subcategory breakdown; parentDirect captures transactions tagged directly
// to the parent category (no subcategory).
export type CategoryGroupRow = {
  parentCategoryId: string | null; // null for "Sem categoria"
  name: string;
  color: string | null;
  icon: string | null;
  totalCents: number;
  count: number;
  parentDirectCents: number;
  parentDirectCount: number;
  children: CategoryLeaf[];
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
  expenseGroups: CategoryGroupRow[];
  incomeGroups: CategoryGroupRow[];
  evolution: EvolutionRow[];
};

export type ComparisonData = {
  current: { from: string; to: string; summary: ReportSummary; byCategory: CategoryRow[] };
  previous: { from: string; to: string; summary: ReportSummary; byCategory: CategoryRow[] };
};

export function bucketDateExpr(mode: CreditCardReportMode): SQL<Date> {
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
        // Invoice payments are control entries; the actual expenses are the
        // individual card purchases, which are already counted via the bucket.
        sql`NOT (${transactions.tags} @> ARRAY['pagamento-fatura']::text[])`,
        gte(bucket, sql`${from}::date`),
        lte(bucket, sql`${to}::date`),
      ),
    )) as [{ income: number | string; expense: number | string; count: number }];

  const incomeCents = Number(summaryRow?.income ?? 0);
  const expenseCents = Number(summaryRow?.expense ?? 0);

  const expenseRaw = await loadCategoryRowsByType(userId, from, to, bucket, "expense");
  const incomeRaw = await loadCategoryRowsByType(userId, from, to, bucket, "income");

  const toCategoryRow = (r: RawCategoryRow): CategoryRow => ({
    categoryId: r.categoryId,
    parentId: r.parentId,
    name: r.name,
    parentName: r.parentName,
    color: r.color,
    icon: r.icon,
    totalCents: r.totalCents,
    count: r.count,
  });

  // Backwards-compatible flat list (still used by CSV export and the
  // comparison view): expenses only, ordered by total desc.
  const byCategory: CategoryRow[] = expenseRaw.map(toCategoryRow);

  // Backwards-compatible parent-aggregated flat list, expenses only.
  const byParentCategory = aggregateByParent(byCategory);

  const expenseGroups = buildGroups(expenseRaw);
  const incomeGroups = buildGroups(incomeRaw);

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
        sql`NOT (${transactions.tags} @> ARRAY['pagamento-fatura']::text[])`,
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
    expenseGroups,
    incomeGroups,
    evolution,
  };
}

type RawCategoryRow = {
  categoryId: string | null;
  parentId: string | null;
  name: string;
  parentName: string | null;
  color: string | null;
  icon: string | null;
  parentColor: string | null;
  parentIcon: string | null;
  totalCents: number;
  count: number;
};

async function loadCategoryRowsByType(
  userId: string,
  from: string,
  to: string,
  bucket: SQL<Date>,
  type: "expense" | "income",
): Promise<RawCategoryRow[]> {
  // No alias on transactions/credit_card_invoices: bucketDateExpr references
  // them by their full names, so aliasing would produce "invalid reference
  // to FROM-clause entry".
  const rows = await db.execute(sql`
    SELECT
      c.id AS category_id,
      c.parent_id AS parent_id,
      c.name AS name,
      c.color AS color,
      c.icon AS icon,
      p.name AS parent_name,
      p.color AS parent_color,
      p.icon AS parent_icon,
      SUM(transactions.amount_cents)::bigint AS total_cents,
      COUNT(*)::int AS count
    FROM transactions
    LEFT JOIN categories c ON c.id = transactions.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    LEFT JOIN credit_card_invoices ON credit_card_invoices.id = transactions.invoice_id
    WHERE transactions.user_id = ${userId}
      AND transactions.is_paid = true
      AND transactions.type = ${type}
      AND NOT (transactions.tags @> ARRAY['pagamento-fatura']::text[])
      AND ${bucket} BETWEEN ${from}::date AND ${to}::date
    GROUP BY c.id, c.parent_id, c.name, c.color, c.icon, p.name, p.color, p.icon
    ORDER BY SUM(transactions.amount_cents) DESC
  `);

  return rows.map<RawCategoryRow>((r) => ({
    categoryId: (r.category_id as string | null) ?? null,
    parentId: (r.parent_id as string | null) ?? null,
    name: (r.name as string | null) ?? "Sem categoria",
    parentName: (r.parent_name as string | null) ?? null,
    color: (r.color as string | null) ?? null,
    icon: (r.icon as string | null) ?? null,
    parentColor: (r.parent_color as string | null) ?? null,
    parentIcon: (r.parent_icon as string | null) ?? null,
    totalCents: Number(r.total_cents),
    count: Number(r.count),
  }));
}

function aggregateByParent(rows: CategoryRow[]): CategoryRow[] {
  const parentMap = new Map<string, CategoryRow>();
  for (const row of rows) {
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
        icon: row.icon,
        totalCents: row.totalCents,
        count: row.count,
      });
    }
  }
  return Array.from(parentMap.values()).sort((a, b) => b.totalCents - a.totalCents);
}

function buildGroups(rows: RawCategoryRow[]): CategoryGroupRow[] {
  // Each input row is either a parent category, a subcategory, or
  // "Sem categoria". Group everything under the top-level parent (or under
  // a synthetic "uncategorized" key) so the UI can render a tree.
  const groups = new Map<string, CategoryGroupRow>();

  const ensureGroup = (
    key: string,
    seed: {
      parentCategoryId: string | null;
      name: string;
      color: string | null;
      icon: string | null;
    },
  ): CategoryGroupRow => {
    let g = groups.get(key);
    if (!g) {
      g = {
        parentCategoryId: seed.parentCategoryId,
        name: seed.name,
        color: seed.color,
        icon: seed.icon,
        totalCents: 0,
        count: 0,
        parentDirectCents: 0,
        parentDirectCount: 0,
        children: [],
      };
      groups.set(key, g);
    } else {
      // Prefer a colored/iconed seed if the group was first created from a
      // child (which doesn't carry the parent metadata fields).
      if (!g.color && seed.color) g.color = seed.color;
      if (!g.icon && seed.icon) g.icon = seed.icon;
      if (g.parentCategoryId === null && seed.parentCategoryId) {
        g.parentCategoryId = seed.parentCategoryId;
      }
    }
    return g;
  };

  for (const row of rows) {
    if (row.categoryId === null) {
      // Sem categoria
      const g = ensureGroup("__uncategorized__", {
        parentCategoryId: null,
        name: "Sem categoria",
        color: null,
        icon: null,
      });
      g.totalCents += row.totalCents;
      g.count += row.count;
      g.parentDirectCents += row.totalCents;
      g.parentDirectCount += row.count;
      continue;
    }

    if (row.parentId === null) {
      // Row is itself a top-level category — it represents transactions
      // tagged directly to the parent (no subcategory).
      const g = ensureGroup(row.categoryId, {
        parentCategoryId: row.categoryId,
        name: row.name,
        color: row.color,
        icon: row.icon,
      });
      g.totalCents += row.totalCents;
      g.count += row.count;
      g.parentDirectCents += row.totalCents;
      g.parentDirectCount += row.count;
      continue;
    }

    // Row is a subcategory
    const g = ensureGroup(row.parentId, {
      parentCategoryId: row.parentId,
      name: row.parentName ?? "Sem categoria",
      color: row.parentColor,
      icon: row.parentIcon,
    });
    g.totalCents += row.totalCents;
    g.count += row.count;
    g.children.push({
      categoryId: row.categoryId,
      name: row.name,
      color: row.color,
      icon: row.icon,
      totalCents: row.totalCents,
      count: row.count,
    });
  }

  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      children: g.children.sort((a, b) => b.totalCents - a.totalCents),
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
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
