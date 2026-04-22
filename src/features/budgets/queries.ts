import "server-only";
import { and, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import type { CreditCardReportMode } from "@/features/settings/queries";

export type BudgetRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  parentName: string | null;
  amountCents: number;
  spentCents: number;
  pctUsed: number;
};

export type BudgetsOverview = {
  month: string; // YYYY-MM-01
  budgets: BudgetRow[];
  unbudgetedCategoryIds: string[];
  unbudgetedCategoryNames: string[];
  totalBudgetedCents: number;
  totalSpentCents: number;
  daysElapsed: number;
  daysInMonth: number;
};

export async function loadBudgetsOverview(
  userId: string,
  month: string, // YYYY-MM-01
  mode: CreditCardReportMode = "purchase_date",
): Promise<BudgetsOverview> {
  const monthStart = month;
  const monthEnd = lastDayOfMonth(month);

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
      ), 0)::bigint AS spent_cents
    FROM budgets b
    INNER JOIN categories c ON c.id = b.category_id
    LEFT JOIN categories p ON p.id = c.parent_id
    WHERE b.user_id = ${userId} AND b.month = ${monthStart}::date
    ORDER BY c.name
  `);

  const budgetRows: BudgetRow[] = rows.map((r) => {
    const amount = Number(r.amount_cents);
    const spent = Number(r.spent_cents);
    return {
      id: r.id as string,
      categoryId: r.category_id as string,
      categoryName: r.category_name as string,
      categoryColor: (r.category_color as string | null) ?? null,
      categoryIcon: (r.category_icon as string | null) ?? null,
      parentName: (r.parent_name as string | null) ?? null,
      amountCents: amount,
      spentCents: spent,
      pctUsed: amount > 0 ? (spent / amount) * 100 : 0,
    };
  });

  const totalBudgeted = budgetRows.reduce((acc, b) => acc + b.amountCents, 0);
  const totalSpent = budgetRows.reduce((acc, b) => acc + b.spentCents, 0);

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
    unbudgetedCategoryIds: unbudgeted.map((c) => c.id),
    unbudgetedCategoryNames: unbudgeted.map((c) => c.name),
    totalBudgetedCents: totalBudgeted,
    totalSpentCents: totalSpent,
    daysElapsed,
    daysInMonth,
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
