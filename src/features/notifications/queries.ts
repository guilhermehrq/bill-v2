import "server-only";
import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import {
  DEFAULT_BUDGET_ALERT_THRESHOLDS,
  type CreditCardReportMode,
} from "@/features/settings/constants";

export type BillNotification = {
  kind: "bill";
  id: string;
  occurredAt: string; // ISO timestamp used for unread/read comparison
  status: "due_soon" | "overdue";
  transactionId: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
  date: string; // YYYY-MM-DD
  daysUntil: number; // negative for overdue
  accountName: string | null;
  categoryName: string | null;
};

export type BudgetAlertNotification = {
  kind: "budget";
  id: string;
  occurredAt: string;
  threshold: number;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  parentName: string | null;
  amountCents: number;
  spentCents: number;
  pctUsed: number;
};

export type Notification = BillNotification | BudgetAlertNotification;

export type NotificationsBundle = {
  unread: Notification[];
  read: Notification[];
  unreadCount: number;
  totalCount: number;
};

const DUE_SOON_WINDOW_DAYS = 7;
const OVERDUE_WINDOW_DAYS = 30;

export async function loadNotifications(
  userId: string,
  options: {
    notificationsLastSeenAt: string | null;
    budgetAlertThresholds: number[];
    creditCardReportMode: CreditCardReportMode;
  },
): Promise<NotificationsBundle> {
  const now = new Date();
  const today = toISODate(now);
  const dueSoonEnd = toISODate(addDays(now, DUE_SOON_WINDOW_DAYS));
  const overdueStart = toISODate(addDays(now, -OVERDUE_WINDOW_DAYS));

  const billsRows = await db
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
        or(eq(transactions.type, "income"), eq(transactions.type, "expense")),
        gte(transactions.date, overdueStart),
        lte(transactions.date, dueSoonEnd),
      ),
    )
    .orderBy(asc(transactions.date));

  const billNotifications: BillNotification[] = billsRows
    .filter((r) => r.type === "income" || r.type === "expense")
    .map((r) => {
      const daysUntil = daysBetween(today, r.date);
      const status: "due_soon" | "overdue" = daysUntil < 0 ? "overdue" : "due_soon";
      // For unread/read comparison: overdue items are "occurring now" (today),
      // due-soon items occur on their due date.
      const occurredAt =
        status === "overdue"
          ? new Date(`${today}T00:00:00.000Z`).toISOString()
          : new Date(`${r.date}T00:00:00.000Z`).toISOString();
      return {
        kind: "bill" as const,
        id: `bill:${r.id}`,
        occurredAt,
        status,
        transactionId: r.id,
        description: r.description,
        amountCents: Number(r.amountCents),
        type: r.type as "income" | "expense",
        date: r.date,
        daysUntil,
        accountName: r.accountName,
        categoryName: r.categoryName,
      };
    });

  const budgetNotifications = await loadBudgetAlerts(
    userId,
    options.budgetAlertThresholds,
    options.creditCardReportMode,
  );

  const all = [...billNotifications, ...budgetNotifications].sort((a, b) =>
    a.occurredAt < b.occurredAt ? 1 : -1,
  );

  const lastSeen = options.notificationsLastSeenAt;
  const unread: Notification[] = [];
  const read: Notification[] = [];
  for (const n of all) {
    if (lastSeen && n.occurredAt <= lastSeen) {
      read.push(n);
    } else {
      unread.push(n);
    }
  }

  return {
    unread,
    read,
    unreadCount: unread.length,
    totalCount: all.length,
  };
}

async function loadBudgetAlerts(
  userId: string,
  thresholds: number[],
  mode: CreditCardReportMode,
): Promise<BudgetAlertNotification[]> {
  const list = (thresholds.length > 0 ? thresholds : [...DEFAULT_BUDGET_ALERT_THRESHOLDS])
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 200)
    .sort((a, b) => a - b);

  if (list.length === 0) return [];

  const now = new Date();
  const monthStart = toFirstOfMonth(now);
  const monthEnd = toLastOfMonth(now);
  const bucketSQL = bucketExprInSubquery(mode);

  const rows = await db.execute(sql`
    SELECT
      b.id,
      b.category_id,
      c.name AS category_name,
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
  `);

  const out: BudgetAlertNotification[] = [];
  // For "occurredAt" we use the start of the current month so that
  // "mark as read" persists for the rest of the month even as spend grows.
  const occurredAt = new Date(`${monthStart}T00:00:00.000Z`).toISOString();

  for (const r of rows) {
    const amount = Number(r.amount_cents);
    const spent = Number(r.spent_cents);
    if (amount <= 0) continue;
    const pct = (spent / amount) * 100;

    // Find the highest threshold the budget has crossed.
    let crossed: number | null = null;
    for (const t of list) {
      if (pct >= t) crossed = t;
    }
    if (crossed === null) continue;

    out.push({
      kind: "budget",
      id: `budget:${r.id}:${crossed}`,
      occurredAt,
      threshold: crossed,
      budgetId: r.id as string,
      categoryId: r.category_id as string,
      categoryName: r.category_name as string,
      parentName: (r.parent_name as string | null) ?? null,
      amountCents: amount,
      spentCents: spent,
      pctUsed: pct,
    });
  }

  return out;
}

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

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toFirstOfMonth(d: Date): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function toLastOfMonth(d: Date): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
