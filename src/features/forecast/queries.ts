import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { listAccountsWithBalances } from "@/features/accounts/queries";
import { listRecurrences } from "@/features/recurrences/queries";
import { NOT_INVOICE_PAYMENT_SQL } from "@/features/transactions/invoice-payment";
import { projectRecurrenceMonthly } from "./projection";

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

export type MonthlyProjection = {
  month: string; // YYYY-MM-01
  // Comprometimento (mês cheio) — base do gráfico de compromisso.
  installmentCents: number;
  recurringExpenseCents: number;
  recurringIncomeCents: number;
  // Renda esperada = recorrências de receita + mediana de receitas NÃO-recorrentes.
  expectedIncomeCents: number;
  // Fluxo de caixa real (do dia presente em diante no mês corrente; mês cheio
  // daqui pra frente). Diferente do comprometimento porque desconta o que já
  // foi pago (já refletido no balance atual) e inclui lançamentos manuais
  // futuros não-recorrentes/não-parcelados.
  cashInCents: number;
  cashOutCents: number;
  netCashCents: number;
  cumulativeBalanceCents: number;
};

export type ActiveRecurrence = {
  id: string;
  description: string;
  type: "income" | "expense";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  amountCents: number;
  monthlyEquivalentCents: number;
  endDate: string | null;
  categoryName: string | null;
  parentCategoryName: string | null;
  accountName: string | null;
  cardName: string | null;
  nextDate: string | null;
};

export type ForecastSummary = {
  // Mediana mensal de receitas não-recorrentes nos N meses fechados anteriores.
  // Mediana > média porque renda variável (13º, bônus, restituição) inflaciona
  // a média; mediana descarta outliers naturalmente.
  typicalMonthlyIncomeCents: number;
  incomeMonthsSampled: number;
  recurringIncomeMonthlyCents: number;
  recurringExpenseMonthlyCents: number;
  currentMonthInstallmentCents: number;
  currentMonthCommitmentCents: number; // parcelas + despesa recorrente
  averageNext6mCommitmentCents: number;
  activePurchaseCount: number;
  activeRecurrenceCount: number;
  lastInstallmentMonth: string | null;
  // Fluxo de caixa.
  currentBalanceCents: number;
  projectedBalance30dCents: number;
  projectedBalance90dCents: number;
  worstMonth: { month: string; balanceCents: number } | null;
};

export type ForecastData = {
  fromMonth: string; // YYYY-MM-01
  toMonth: string; // YYYY-MM-01 (inclusive)
  summary: ForecastSummary;
  monthly: MonthlyProjection[];
  purchases: InstallmentPurchase[];
  recurrences: ActiveRecurrence[];
};

const DEFAULT_HORIZON_MONTHS = 12;
const INCOME_LOOKBACK_MONTHS = 6;

export async function loadForecastData(
  userId: string,
  today: Date = new Date(),
): Promise<ForecastData> {
  const fromMonth = firstOfMonth(today);
  const todayStr = toDateString(today);
  const fromMonthStr = toDateString(fromMonth);
  const incomeWindow = {
    from: addMonths(fromMonth, -INCOME_LOOKBACK_MONTHS),
    to: fromMonth, // exclusive — covers the N closed prior months
  };

  const [
    purchaseRows,
    installmentMonthlyRows,
    installmentRemainingRows,
    manualCashRows,
    incomeRows,
    recurrenceList,
    accountList,
  ] = await Promise.all([
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
        AND t.date >= ${fromMonthStr}::date
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
        AND t.date >= ${fromMonthStr}::date
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    // Parcelas remaining: a partir de hoje (não do início do mês). Usado no
    // fluxo de caixa pra não double-contar o que já foi pago no mês corrente.
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', t.date), 'YYYY-MM-DD') AS month,
        SUM(t.amount_cents)::bigint AS total
      FROM transactions t
      WHERE t.user_id = ${userId}
        AND t.credit_card_id IS NOT NULL
        AND t.installment_total IS NOT NULL
        AND t.installment_total > 1
        AND t.date >= ${todayStr}::date
        AND t.is_paid = false
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    // Lançamentos manuais futuros (não-recorrência, não-parcela), excluindo
    // pagamento de fatura (já é coberto pela soma de parcelas/recorrências
    // de cartão no comprometimento — não queremos contar 2x).
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', date), 'YYYY-MM-DD') AS month,
        type,
        SUM(amount_cents)::bigint AS total
      FROM transactions
      WHERE user_id = ${userId}
        AND is_paid = false
        AND type <> 'transfer'
        AND recurrence_id IS NULL
        AND (installment_total IS NULL OR installment_total = 1)
        AND date >= ${todayStr}::date
        AND ${NOT_INVOICE_PAYMENT_SQL}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `),
    // Renda NÃO-recorrente, somada por mês, nos N meses fechados anteriores.
    // Mediana é calculada em JS — robusta a outliers (13º, bônus). Exclui
    // recurrence_id pra não duplicar quando o salário é uma recorrência.
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', date), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(amount_cents), 0)::bigint AS total
      FROM transactions
      WHERE user_id = ${userId}
        AND is_paid = true
        AND type = 'income'
        AND recurrence_id IS NULL
        AND ${NOT_INVOICE_PAYMENT_SQL}
        AND date >= ${toDateString(incomeWindow.from)}::date
        AND date < ${toDateString(incomeWindow.to)}::date
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    listRecurrences(userId),
    listAccountsWithBalances(userId),
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

  const installmentMonthlyMap = new Map<string, number>(
    installmentMonthlyRows.map((r) => [String(r.month), Number(r.total)]),
  );
  const installmentRemainingMap = new Map<string, number>(
    installmentRemainingRows.map((r) => [String(r.month), Number(r.total)]),
  );

  const manualCashIncomeMap = new Map<string, number>();
  const manualCashExpenseMap = new Map<string, number>();
  for (const r of manualCashRows) {
    const month = String(r.month);
    const value = Number(r.total);
    if (r.type === "income") {
      manualCashIncomeMap.set(month, (manualCashIncomeMap.get(month) ?? 0) + value);
    } else if (r.type === "expense") {
      manualCashExpenseMap.set(month, (manualCashExpenseMap.get(month) ?? 0) + value);
    }
  }

  const lastInstallmentDate = purchases.reduce<string | null>(
    (acc, p) => (acc === null || p.lastDate > acc ? p.lastDate : acc),
    null,
  );

  // Horizonte: vai até a última parcela ou DEFAULT_HORIZON_MONTHS à frente,
  // o que for maior. Garante que recorrências sempre apareçam mesmo sem
  // parcelas ativas.
  const defaultEnd = addMonths(fromMonth, DEFAULT_HORIZON_MONTHS - 1);
  const installmentEnd = lastInstallmentDate
    ? firstOfMonth(parseDateString(lastInstallmentDate))
    : fromMonth;
  const toMonth = installmentEnd.getTime() > defaultEnd.getTime() ? installmentEnd : defaultEnd;

  const monthRange = enumerateMonths(fromMonth, toMonth);
  const toMonthStr = toDateString(toMonth);

  // Duas projeções por recorrência:
  //  - "compromisso": mês cheio (fromMonth) — usada no gráfico de compromisso.
  //  - "cashflow": só ocorrências a partir de hoje — usada no fluxo de caixa.
  const activeForProjection = recurrenceList.filter((r) => r.active);

  const projectedExpense = new Map<string, number>();
  const projectedIncome = new Map<string, number>();
  const cashProjectedExpense = new Map<string, number>();
  const cashProjectedIncome = new Map<string, number>();
  const recurrenceMonthly: Array<{ id: string; series: Map<string, number> }> = [];

  for (const r of activeForProjection) {
    const projectionInput = {
      id: r.id,
      amountCents: r.amountCents,
      frequency: r.frequency,
      interval: r.interval,
      dayOfMonth: r.dayOfMonth,
      dayOfWeek: r.dayOfWeek,
      startDate: r.startDate,
      endDate: r.endDate,
      maxOccurrences: r.maxOccurrences,
      lastGeneratedDate: r.lastGeneratedDate,
    };
    const fullSeries = projectRecurrenceMonthly(projectionInput, fromMonthStr, toMonthStr);
    const cashSeries = projectRecurrenceMonthly(projectionInput, todayStr, toMonthStr);

    const fullTarget = r.type === "income" ? projectedIncome : projectedExpense;
    for (const [month, cents] of fullSeries) {
      fullTarget.set(month, (fullTarget.get(month) ?? 0) + cents);
    }

    const cashTarget = r.type === "income" ? cashProjectedIncome : cashProjectedExpense;
    for (const [month, cents] of cashSeries) {
      cashTarget.set(month, (cashTarget.get(month) ?? 0) + cents);
    }

    recurrenceMonthly.push({ id: r.id, series: fullSeries });
  }

  const incomeMonthlyValues = incomeRows.map((r) => Number(r.total));
  const typicalMonthlyIncomeCents = median(incomeMonthlyValues);
  const incomeMonthsSampled = incomeMonthlyValues.length;

  // Saldo atual: soma das contas marcadas pra entrar no total e não-arquivadas.
  // Esse é o ponto de partida da linha de saldo acumulado projetado.
  const currentBalanceCents = accountList
    .filter((a) => !a.archived && a.includeInTotalBalance)
    .reduce((acc, a) => acc + a.balanceCents, 0);

  let runningBalance = currentBalanceCents;
  const monthly: MonthlyProjection[] = monthRange.map((monthKey) => {
    const installmentCents = installmentMonthlyMap.get(monthKey) ?? 0;
    const recurringExpenseCents = projectedExpense.get(monthKey) ?? 0;
    const recurringIncomeCents = projectedIncome.get(monthKey) ?? 0;

    const cashInstallment = installmentRemainingMap.get(monthKey) ?? 0;
    const cashRecurringExpense = cashProjectedExpense.get(monthKey) ?? 0;
    const cashRecurringIncome = cashProjectedIncome.get(monthKey) ?? 0;
    const manualIn = manualCashIncomeMap.get(monthKey) ?? 0;
    const manualOut = manualCashExpenseMap.get(monthKey) ?? 0;

    const cashInCents = cashRecurringIncome + manualIn;
    const cashOutCents = cashInstallment + cashRecurringExpense + manualOut;
    const netCashCents = cashInCents - cashOutCents;
    runningBalance += netCashCents;

    return {
      month: monthKey,
      installmentCents,
      recurringExpenseCents,
      recurringIncomeCents,
      expectedIncomeCents: recurringIncomeCents + typicalMonthlyIncomeCents,
      cashInCents,
      cashOutCents,
      netCashCents,
      cumulativeBalanceCents: runningBalance,
    };
  });

  // Equivalente mensal: média de N primeiros meses do horizonte (mínimo 1 mês).
  // Usa o range já calculado pra evitar problemas com endDate/maxOccurrences.
  const RANK_WINDOW = 6;
  const rankWindow = monthly.slice(0, RANK_WINDOW).map((m) => m.month);
  const recurrences: ActiveRecurrence[] = activeForProjection.map((r) => {
    const series = recurrenceMonthly.find((e) => e.id === r.id)?.series ?? new Map();
    const totalInWindow = rankWindow.reduce((acc, m) => acc + (series.get(m) ?? 0), 0);
    const monthlyEquivalentCents = Math.round(totalInWindow / Math.max(rankWindow.length, 1));
    return {
      id: r.id,
      description: r.description,
      type: r.type,
      frequency: r.frequency,
      interval: r.interval,
      amountCents: r.amountCents,
      monthlyEquivalentCents,
      endDate: r.endDate,
      categoryName: r.categoryName,
      parentCategoryName: r.parentCategoryName,
      accountName: r.accountName,
      cardName: r.creditCardName,
      nextDate: r.nextDate,
    };
  });
  recurrences.sort((a, b) => b.monthlyEquivalentCents - a.monthlyEquivalentCents);

  const currentMonthKey = toDateString(fromMonth);
  const currentMonthInstallmentCents = installmentMonthlyMap.get(currentMonthKey) ?? 0;
  const currentMonthRecurringExpenseCents = projectedExpense.get(currentMonthKey) ?? 0;
  const currentMonthCommitmentCents =
    currentMonthInstallmentCents + currentMonthRecurringExpenseCents;

  const next6 = monthly.slice(0, 6);
  const next6Commitments = next6.map((m) => m.installmentCents + m.recurringExpenseCents);
  const next6Filled = next6Commitments.filter((c) => c > 0);
  const averageNext6mCommitmentCents =
    next6Filled.length > 0
      ? Math.round(next6Filled.reduce((acc, c) => acc + c, 0) / next6Filled.length)
      : 0;

  const recurringIncomeMonthlyCents = recurrences
    .filter((r) => r.type === "income")
    .reduce((acc, r) => acc + r.monthlyEquivalentCents, 0);
  const recurringExpenseMonthlyCents = recurrences
    .filter((r) => r.type === "expense")
    .reduce((acc, r) => acc + r.monthlyEquivalentCents, 0);

  // Saldo projetado em 30/90 dias: índice 0 = fim do mês corrente, índice 2 =
  // fim do 3º mês (≈90 dias). Usa cumulative já calculado.
  const projectedBalance30dCents = monthly[0]?.cumulativeBalanceCents ?? currentBalanceCents;
  const projectedBalance90dCents = monthly[2]?.cumulativeBalanceCents ?? projectedBalance30dCents;

  // Mês mais apertado: menor saldo acumulado nos próximos 12m (ignora cauda
  // longa de parcelas; o usuário liga mais pro horizonte gerenciável).
  const worstMonth = monthly
    .slice(0, 12)
    .reduce<
      ForecastSummary["worstMonth"]
    >((acc, m) => (acc === null || m.cumulativeBalanceCents < acc.balanceCents ? { month: m.month, balanceCents: m.cumulativeBalanceCents } : acc), null);

  return {
    fromMonth: fromMonthStr,
    toMonth: toMonthStr,
    summary: {
      typicalMonthlyIncomeCents,
      incomeMonthsSampled,
      recurringIncomeMonthlyCents,
      recurringExpenseMonthlyCents,
      currentMonthInstallmentCents,
      currentMonthCommitmentCents,
      averageNext6mCommitmentCents,
      activePurchaseCount: purchases.length,
      activeRecurrenceCount: recurrences.length,
      lastInstallmentMonth: lastInstallmentDate
        ? toDateString(firstOfMonth(parseDateString(lastInstallmentDate)))
        : null,
      currentBalanceCents,
      projectedBalance30dCents,
      projectedBalance90dCents,
      worstMonth,
    },
    monthly,
    purchases,
    recurrences,
  };
}

// Date helpers use local time (not UTC) to stay consistent with the rest of
// the app — `transactions.date` is stored as a calendar date and the account
// balance helper also computes "today" in local time. Mixing UTC would shift
// the boundary at midnight in non-UTC timezones (Brazil = UTC-3).
function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function enumerateMonths(from: Date, to: Date): string[] {
  const out: string[] = [];
  const MAX_MONTHS = 36;
  let cursor = from;
  let i = 0;
  while (cursor.getTime() <= to.getTime() && i < MAX_MONTHS) {
    out.push(toDateString(cursor));
    cursor = addMonths(cursor, 1);
    i += 1;
  }
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}
