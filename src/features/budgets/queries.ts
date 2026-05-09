import "server-only";
import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import type { CreditCardReportMode } from "@/features/settings/queries";

export type BudgetRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  parentCategoryId: string | null; // null when this row is itself a top-level category
  parentName: string | null;
  amountCents: number;
  spentCents: number;
  forecastCents: number; // unpaid expenses, included in spentCents only when forecasts are on
  pctUsed: number;
};

// One group per top-level expense category that has any budget (own or in a child).
// Used by the view to render a parent row with its budgeted children indented
// below, and to compute non-double-counted totals.
export type BudgetGroup = {
  parentCategoryId: string;
  parentCategoryName: string;
  parentCategoryColor: string | null;
  parentCategoryIcon: string | null;
  parentRow: BudgetRow | null; // present if user explicitly budgeted the parent
  children: BudgetRow[];
  // Effective totals for the group (parent + children, no double count).
  budgetedCents: number;
  spentCents: number;
  forecastCents: number;
  pctUsed: number;
};

export type BudgetsOverview = {
  month: string; // YYYY-MM-01
  budgets: BudgetRow[];
  groups: BudgetGroup[];
  unbudgetedCategoryIds: string[];
  unbudgetedCategoryNames: string[];
  totalBudgetedCents: number;
  totalSpentCents: number;
  totalForecastCents: number;
  daysElapsed: number;
  daysInMonth: number;
  includeForecasts: boolean;
};

export async function loadBudgetsOverview(
  userId: string,
  month: string, // YYYY-MM-01
  mode: CreditCardReportMode = "purchase_date",
  options: { includeForecasts?: boolean } = {},
): Promise<BudgetsOverview> {
  const monthStart = month;
  const monthEnd = lastDayOfMonth(month);
  const includeForecasts = options.includeForecasts ?? false;

  // Select a single date-bucket expression per mode.
  // The sub-query below filters by this bucket against the budget's month.
  const bucketSQL = bucketExprInSubquery(mode);

  const rows = await db.execute(sql`
    SELECT
      b.id,
      b.category_id,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      c.parent_id AS parent_category_id,
      p.name AS parent_name,
      b.amount_cents::bigint AS amount_cents,
      COALESCE((
        SELECT SUM(t.amount_cents)
        FROM transactions t
        LEFT JOIN categories tc ON tc.id = t.category_id
        LEFT JOIN credit_card_invoices ci ON ci.id = t.invoice_id
        WHERE t.user_id = ${userId}
          AND t.type = 'expense'
          AND t.is_paid = true
          AND (tc.id = b.category_id OR tc.parent_id = b.category_id)
          AND ${bucketSQL} BETWEEN ${monthStart}::date AND ${monthEnd}::date
      ), 0)::bigint AS spent_cents,
      COALESCE((
        SELECT SUM(t.amount_cents)
        FROM transactions t
        LEFT JOIN categories tc ON tc.id = t.category_id
        LEFT JOIN credit_card_invoices ci ON ci.id = t.invoice_id
        WHERE t.user_id = ${userId}
          AND t.type = 'expense'
          AND t.is_paid = false
          AND (tc.id = b.category_id OR tc.parent_id = b.category_id)
          AND ${bucketSQL} BETWEEN ${monthStart}::date AND ${monthEnd}::date
      ), 0)::bigint AS forecast_cents
    FROM budgets b
    INNER JOIN categories c ON c.id = b.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    WHERE b.user_id = ${userId} AND b.month = ${monthStart}::date
    ORDER BY c.name
  `);

  const budgetRows: BudgetRow[] = rows.map((r) => {
    const amount = Number(r.amount_cents);
    const spent = Number(r.spent_cents);
    const forecast = Number(r.forecast_cents);
    const effectiveSpent = includeForecasts ? spent + forecast : spent;
    return {
      id: r.id as string,
      categoryId: r.category_id as string,
      categoryName: r.category_name as string,
      categoryColor: (r.category_color as string | null) ?? null,
      categoryIcon: (r.category_icon as string | null) ?? null,
      parentCategoryId: (r.parent_category_id as string | null) ?? null,
      parentName: (r.parent_name as string | null) ?? null,
      amountCents: amount,
      spentCents: effectiveSpent,
      forecastCents: forecast,
      pctUsed: amount > 0 ? (effectiveSpent / amount) * 100 : 0,
    };
  });

  // Group rows by their top-level parent so the view can render a hierarchy
  // and totals can avoid double-counting (a parent budget's spent already
  // includes its children's transactions, per the SQL above).
  const parentByCategoryId = new Map<string, BudgetRow>();
  const childrenByParentId = new Map<string, BudgetRow[]>();
  for (const row of budgetRows) {
    if (row.parentCategoryId === null) {
      parentByCategoryId.set(row.categoryId, row);
    } else {
      const list = childrenByParentId.get(row.parentCategoryId) ?? [];
      list.push(row);
      childrenByParentId.set(row.parentCategoryId, list);
    }
  }

  const groupKeys = new Set<string>([...parentByCategoryId.keys(), ...childrenByParentId.keys()]);

  const groups: BudgetGroup[] = [];
  for (const parentId of groupKeys) {
    const parent = parentByCategoryId.get(parentId) ?? null;
    const children = (childrenByParentId.get(parentId) ?? []).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName, "pt-BR"),
    );

    const childrenBudgeted = children.reduce((s, c) => s + c.amountCents, 0);
    const budgetedCents = (parent?.amountCents ?? 0) + childrenBudgeted;

    // Parent's spent already aggregates all children's transactions (whether
    // they have their own budget or not). When the parent has no budget row,
    // we fall back to summing the children's spent.
    const spentCents = parent ? parent.spentCents : children.reduce((s, c) => s + c.spentCents, 0);
    const forecastCents = parent
      ? parent.forecastCents
      : children.reduce((s, c) => s + c.forecastCents, 0);

    // Resolve display info for the parent category from either source.
    const meta = parent
      ? {
          name: parent.categoryName,
          color: parent.categoryColor,
          icon: parent.categoryIcon,
        }
      : children[0]
        ? {
            name: children[0].parentName ?? "Sem categoria",
            color: null,
            icon: null,
          }
        : { name: "Sem categoria", color: null, icon: null };

    groups.push({
      parentCategoryId: parentId,
      parentCategoryName: meta.name,
      parentCategoryColor: meta.color,
      parentCategoryIcon: meta.icon,
      parentRow: parent,
      children,
      budgetedCents,
      spentCents,
      forecastCents,
      pctUsed: budgetedCents > 0 ? (spentCents / budgetedCents) * 100 : 0,
    });
  }

  // If the parent has no budget, we look up its display info (name/icon/color)
  // from a separate query, since our budget rows wouldn't carry it.
  const orphanParentIds = groups.filter((g) => !g.parentRow).map((g) => g.parentCategoryId);
  if (orphanParentIds.length > 0) {
    const parentMeta = await db
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
        icon: categories.icon,
      })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, orphanParentIds)));
    const metaById = new Map(parentMeta.map((m) => [m.id, m]));
    for (const g of groups) {
      if (g.parentRow) continue;
      const meta = metaById.get(g.parentCategoryId);
      if (meta) {
        g.parentCategoryName = meta.name;
        g.parentCategoryColor = meta.color ?? null;
        g.parentCategoryIcon = meta.icon ?? null;
      }
    }
  }

  groups.sort((a, b) => a.parentCategoryName.localeCompare(b.parentCategoryName, "pt-BR"));

  const totalBudgeted = groups.reduce((acc, g) => acc + g.budgetedCents, 0);
  const totalSpent = groups.reduce((acc, g) => acc + g.spentCents, 0);
  const totalForecast = groups.reduce((acc, g) => acc + g.forecastCents, 0);

  // Top-level expense categories not yet budgeted this month.
  const budgetedCategoryIds = budgetRows.map((b) => b.categoryId);
  const unbudgeted = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.type, "expense"),
        isNull(categories.parentId),
        budgetedCategoryIds.length > 0 ? notInArray(categories.id, budgetedCategoryIds) : or(),
      ),
    )
    .orderBy(categories.name);

  const now = new Date();
  const monthYear = Number(monthStart.slice(0, 4));
  const monthNum = Number(monthStart.slice(5, 7));
  const daysInMonth = new Date(monthYear, monthNum, 0).getDate();
  const isCurrentMonth = now.getFullYear() === monthYear && now.getMonth() + 1 === monthNum;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;

  return {
    month: monthStart,
    budgets: budgetRows,
    groups,
    unbudgetedCategoryIds: unbudgeted.map((c) => c.id),
    unbudgetedCategoryNames: unbudgeted.map((c) => c.name),
    totalBudgetedCents: totalBudgeted,
    totalSpentCents: totalSpent,
    totalForecastCents: totalForecast,
    daysElapsed,
    daysInMonth,
    includeForecasts,
  };
}

// Returns the SQL fragment to use as the "when this transaction counts"
// date inside a sub-query. Assumes aliases `t` for transactions and `ci`
// for credit_card_invoices.
function bucketExprInSubquery(mode: CreditCardReportMode) {
  switch (mode) {
    case "installment_date":
      return sql`t.date`;
    case "purchase_date":
      return sql`COALESCE(t.purchase_date, t.date)`;
    case "invoice_date":
      return sql`CASE
        WHEN t.credit_card_id IS NOT NULL AND ci.reference_month IS NOT NULL
          THEN ci.reference_month
        ELSE t.date
      END`;
  }
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number, number];
  const last = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

// Helper available in the page to pick a month we already have data for
// (for the "copy from previous" flow).
export async function listMonthsWithBudgets(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ month: budgets.month })
    .from(budgets)
    .where(eq(budgets.userId, userId))
    .orderBy(budgets.month);
  return rows.map((r) => r.month);
}
