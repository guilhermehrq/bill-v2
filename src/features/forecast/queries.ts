import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { NOT_INVOICE_PAYMENT_SQL } from "@/features/transactions/invoice-payment";

export type InstallmentPurchase = {
  purchaseId: string;
  description: string;
  cardId: string;
  cardName: string;
  cardColor: string | null;
  nextInstallment: number;
  installmentTotal: number;
  remainingCount: number;
  remainingCents: number;
  monthlyCents: number;
  nextDate: string; // YYYY-MM-DD
  lastDate: string; // YYYY-MM-DD
};

export type MonthlyInstallment = {
  month: string; // YYYY-MM-01
  totalCents: number;
};

export type ForecastSummary = {
  averageMonthlyIncomeCents: number;
  currentMonthCommitmentCents: number;
  averageNext6mCommitmentCents: number;
  activePurchaseCount: number;
  lastInstallmentMonth: string | null;
};

export type ForecastData = {
  fromMonth: string; // YYYY-MM-01
  toMonth: string; // YYYY-MM-01 (last month with an installment, or fromMonth)
  summary: ForecastSummary;
  monthly: MonthlyInstallment[];
  purchases: InstallmentPurchase[];
};

export async function loadForecastData(
  userId: string,
  today: Date = new Date(),
): Promise<ForecastData> {
  const fromMonth = firstOfMonth(today);
  const incomeWindow = {
    from: addMonths(fromMonth, -3),
    to: fromMonth, // exclusive — covers the 3 closed prior months
  };

  const [purchaseRows, monthlyRows, incomeRow] = await Promise.all([
    db.execute(sql`
      SELECT
        COALESCE(t.installment_of_id, t.id)::text AS purchase_id,
        t.credit_card_id::text AS card_id,
        cc.name AS card_name,
        cc.color AS card_color,
        MIN(t.installment_number) AS next_installment,
        MAX(t.installment_total) AS installment_total,
        COUNT(*)::int AS remaining_count,
        SUM(t.amount_cents)::bigint AS remaining_cents,
        MAX(t.amount_cents)::bigint AS monthly_cents,
        to_char(MIN(t.date), 'YYYY-MM-DD') AS next_date,
        to_char(MAX(t.date), 'YYYY-MM-DD') AS last_date,
        (ARRAY_AGG(t.description ORDER BY t.installment_number ASC, t.date ASC))[1] AS description
      FROM transactions t
      LEFT JOIN credit_cards cc ON cc.id = t.credit_card_id
      WHERE t.user_id = ${userId}
        AND t.credit_card_id IS NOT NULL
        AND t.installment_total IS NOT NULL
        AND t.installment_total > 1
        AND t.date >= ${toDateString(fromMonth)}::date
      GROUP BY 1, 2, 3, 4
      ORDER BY MAX(t.date) ASC, description ASC
    `),
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', t.date), 'YYYY-MM-DD') AS month,
        SUM(t.amount_cents)::bigint AS total
      FROM transactions t
      WHERE t.user_id = ${userId}
        AND t.credit_card_id IS NOT NULL
        AND t.installment_total IS NOT NULL
        AND t.installment_total > 1
        AND t.date >= ${toDateString(fromMonth)}::date
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
      FROM transactions
      WHERE user_id = ${userId}
        AND is_paid = true
        AND type = 'income'
        AND ${NOT_INVOICE_PAYMENT_SQL}
        AND date >= ${toDateString(incomeWindow.from)}::date
        AND date < ${toDateString(incomeWindow.to)}::date
    `),
  ]);

  const purchases: InstallmentPurchase[] = purchaseRows.map((r) => ({
    purchaseId: String(r.purchase_id),
    description: (r.description as string | null) ?? "(sem descrição)",
    cardId: String(r.card_id),
    cardName: (r.card_name as string | null) ?? "Cartão",
    cardColor: (r.card_color as string | null) ?? null,
    nextInstallment: Number(r.next_installment),
    installmentTotal: Number(r.installment_total),
    remainingCount: Number(r.remaining_count),
    remainingCents: Number(r.remaining_cents),
    monthlyCents: Number(r.monthly_cents),
    nextDate: String(r.next_date),
    lastDate: String(r.last_date),
  }));

  const monthlyMap = new Map<string, number>(
    monthlyRows.map((r) => [String(r.month), Number(r.total)]),
  );

  const lastDate = purchases.reduce<string | null>(
    (acc, p) => (acc === null || p.lastDate > acc ? p.lastDate : acc),
    null,
  );

  const toMonth = lastDate ? firstOfMonth(parseDateString(lastDate)) : fromMonth;
  const monthly = fillMonthlyRange(fromMonth, toMonth, monthlyMap);

  const currentMonthCommitmentCents = monthlyMap.get(toDateString(fromMonth)) ?? 0;

  // Mean over the next 6 months of commitments (only months that have data —
  // empty months don't dilute the average; if you have no parcela in 4 of the
  // next 6 months, that's already useful information via the chart).
  const next6 = monthly.slice(0, 6);
  const next6Filled = next6.filter((m) => m.totalCents > 0);
  const averageNext6mCommitmentCents =
    next6Filled.length > 0
      ? Math.round(next6Filled.reduce((acc, m) => acc + m.totalCents, 0) / next6Filled.length)
      : 0;

  const incomeTotalCents = Number(incomeRow[0]?.total ?? 0);
  const averageMonthlyIncomeCents = Math.round(incomeTotalCents / 3);

  return {
    fromMonth: toDateString(fromMonth),
    toMonth: toDateString(toMonth),
    summary: {
      averageMonthlyIncomeCents,
      currentMonthCommitmentCents,
      averageNext6mCommitmentCents,
      activePurchaseCount: purchases.length,
      lastInstallmentMonth: lastDate ? toDateString(firstOfMonth(parseDateString(lastDate))) : null,
    },
    monthly,
    purchases,
  };
}

function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function toDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fillMonthlyRange(from: Date, to: Date, map: Map<string, number>): MonthlyInstallment[] {
  const out: MonthlyInstallment[] = [];
  // Hard cap to keep the chart sane if someone has a 60x installment.
  const MAX_MONTHS = 36;
  let cursor = from;
  let i = 0;
  while (cursor.getTime() <= to.getTime() && i < MAX_MONTHS) {
    const key = toDateString(cursor);
    out.push({ month: key, totalCents: map.get(key) ?? 0 });
    cursor = addMonths(cursor, 1);
    i += 1;
  }
  return out;
}
