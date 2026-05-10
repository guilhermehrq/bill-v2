import "server-only";
import { and, eq, gte, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { accounts, creditCardInvoices, creditCards, transactions } from "@/db/schema";
import {
  searchTransactions,
  type StatementMode,
  type TransactionFilters,
  type TransactionListItem,
} from "./list-queries";

export type InvoiceListItem = {
  kind: "invoice";
  id: string;
  date: string; // due_date
  cardId: string;
  cardName: string;
  cardColor: string | null;
  cardIcon: string | null;
  referenceMonth: string;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  status: "open" | "closed" | "paid" | "overdue" | "partial";
};

export type TxListItem = TransactionListItem & { kind: "transaction" };

export type StatementItem = TxListItem | InvoiceListItem;

export type StatementTotals =
  | {
      mode: "all_entries";
      incomeCents: number;
      expenseCents: number;
      totalCents: number; // income - expense
    }
  | {
      mode: "cashflow";
      previousBalanceCents: number; // balance just before `from`
      realizedIncomeCents: number;
      forecastedIncomeCents: number;
      realizedExpenseCents: number;
      forecastedExpenseCents: number;
      // Saldo atual = previous + realized in/out
      currentBalanceCents: number;
      // Previsão = current + forecasted in/out
      forecastBalanceCents: number;
    };

export async function loadStatement(
  userId: string,
  filters: TransactionFilters,
  page: number,
): Promise<{
  items: StatementItem[];
  hasMore: boolean;
  total: number;
  totals: StatementTotals;
}> {
  const mode: StatementMode = filters.mode ?? "all_entries";

  const result = await searchTransactions(userId, filters, page);
  const txItems: TxListItem[] = result.items.map((t) => ({ ...t, kind: "transaction" as const }));

  let invoiceItems: InvoiceListItem[] = [];
  if (mode === "cashflow") {
    invoiceItems = await loadInvoiceVirtualItems(userId, filters);
  }

  // Merge and sort by date descending. Use createdAt-equivalent tie-breaker
  // by keeping invoices before transactions on the same date for visual clarity.
  const merged: StatementItem[] = [...txItems, ...invoiceItems].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.kind !== b.kind) return a.kind === "invoice" ? -1 : 1;
    return 0;
  });

  const totals = await computeTotals(userId, filters, mode);

  return {
    items: merged,
    hasMore: result.hasMore,
    total: result.total + invoiceItems.length,
    totals,
  };
}

async function loadInvoiceVirtualItems(
  userId: string,
  filters: TransactionFilters,
): Promise<InvoiceListItem[]> {
  const clauses = [eq(creditCardInvoices.userId, userId)];
  if (filters.from) clauses.push(gte(creditCardInvoices.dueDate, filters.from));
  if (filters.to) clauses.push(lte(creditCardInvoices.dueDate, filters.to));
  // Only show invoices that aren't fully paid AND are at least closed (no point
  // listing an "open" invoice that's still receiving purchases).
  clauses.push(sql`${creditCardInvoices.status} IN ('closed', 'overdue', 'partial', 'paid')`);

  const rows = await db
    .select({
      id: creditCardInvoices.id,
      dueDate: creditCardInvoices.dueDate,
      referenceMonth: creditCardInvoices.referenceMonth,
      totalCents: creditCardInvoices.totalCents,
      paidCents: creditCardInvoices.paidCents,
      status: creditCardInvoices.status,
      cardId: creditCards.id,
      cardName: creditCards.name,
      cardColor: creditCards.color,
      cardIcon: creditCards.icon,
    })
    .from(creditCardInvoices)
    .innerJoin(creditCards, eq(creditCardInvoices.creditCardId, creditCards.id))
    .where(and(...clauses));

  return rows.map<InvoiceListItem>((r) => {
    const total = Number(r.totalCents);
    const paid = Number(r.paidCents);
    return {
      kind: "invoice" as const,
      id: r.id,
      date: r.dueDate,
      cardId: r.cardId,
      cardName: r.cardName,
      cardColor: r.cardColor,
      cardIcon: r.cardIcon,
      referenceMonth: r.referenceMonth,
      totalCents: total,
      paidCents: paid,
      remainingCents: Math.max(0, total - paid),
      status: r.status,
    };
  });
}

// Adds the same scoping clauses (account/card/category/type/search) that
// `searchTransactions` applies, so the bottom-bar totals always reflect what
// the visible list contains.
function appendListFilters(clauses: SQL[], filters: TransactionFilters) {
  if (filters.accountIds && filters.accountIds.length > 0)
    clauses.push(inArray(transactions.accountId, filters.accountIds));
  if (filters.cardIds && filters.cardIds.length > 0)
    clauses.push(inArray(transactions.creditCardId, filters.cardIds));
  if (filters.categoryIds && filters.categoryIds.length > 0)
    clauses.push(inArray(transactions.categoryId, filters.categoryIds));
  if (filters.types && filters.types.length > 0)
    clauses.push(inArray(transactions.type, filters.types));
  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    clauses.push(
      or(
        sql`${transactions.description} ILIKE ${"%" + term + "%"}`,
        sql`similarity(${transactions.description}, ${term}) > 0.3`,
      )!,
    );
  }
}

async function computeTotals(
  userId: string,
  filters: TransactionFilters,
  mode: StatementMode,
): Promise<StatementTotals> {
  const from = filters.from;
  const to = filters.to;

  if (mode === "all_entries") {
    const clauses: SQL[] = [
      eq(transactions.userId, userId),
      sql`NOT (${transactions.tags} @> ARRAY['pagamento-fatura']::text[])`,
    ];
    if (from) clauses.push(gte(transactions.date, from));
    if (to) clauses.push(lte(transactions.date, to));
    appendListFilters(clauses, filters);

    const [row] = (await db
      .select({
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      })
      .from(transactions)
      .where(and(...clauses))) as [{ income: number | string; expense: number | string }];

    const income = Number(row?.income ?? 0);
    const expense = Number(row?.expense ?? 0);
    return {
      mode: "all_entries",
      incomeCents: income,
      expenseCents: expense,
      totalCents: income - expense,
    };
  }

  // cashflow: account-only entries (no card purchases). All filters are
  // applied so the totals match the displayed list.
  const baseClauses: SQL[] = [
    eq(transactions.userId, userId),
    sql`${transactions.creditCardId} IS NULL`,
  ];
  appendListFilters(baseClauses, filters);

  // Initial balance respects the account filter: if the user is looking at a
  // single account, only that account's seed counts.
  const accountClauses: SQL[] = [eq(accounts.userId, userId), eq(accounts.archived, false)];
  if (filters.accountIds && filters.accountIds.length > 0)
    accountClauses.push(inArray(accounts.id, filters.accountIds));

  const [initRow] = (await db
    .select({
      total: sql<number>`COALESCE(SUM(${accounts.initialBalanceCents}), 0)::bigint`,
    })
    .from(accounts)
    .where(and(...accountClauses))) as [{ total: number | string }];

  const initialBalance = Number(initRow?.total ?? 0);

  const [prevRow] = from
    ? ((await db
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
        .where(
          and(...baseClauses, eq(transactions.isPaid, true), lt(transactions.date, from)),
        )) as [{ delta: number | string }])
    : [{ delta: 0 }];

  const previousBalance = initialBalance + Number(prevRow?.delta ?? 0);

  // In-range totals. Transfers are not "income" or "expense" but their legs
  // do affect a single account's balance, so we track them in a separate
  // delta and fold it into the current/forecast balances.
  const [rangeRow] = (await db
    .select({
      realizedIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.isPaid} = true THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      forecastIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.isPaid} = false THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      realizedExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.isPaid} = true THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      forecastExpense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.isPaid} = false THEN ${transactions.amountCents} ELSE 0 END), 0)::bigint`,
      realizedTransferDelta: sql<number>`COALESCE(SUM(
        CASE
          WHEN ${transactions.type} = 'transfer' AND ${transactions.isPaid} = true AND ${transactions.transferDirection} = 'in'  THEN ${transactions.amountCents}
          WHEN ${transactions.type} = 'transfer' AND ${transactions.isPaid} = true AND ${transactions.transferDirection} = 'out' THEN -${transactions.amountCents}
          ELSE 0
        END
      ), 0)::bigint`,
      forecastTransferDelta: sql<number>`COALESCE(SUM(
        CASE
          WHEN ${transactions.type} = 'transfer' AND ${transactions.isPaid} = false AND ${transactions.transferDirection} = 'in'  THEN ${transactions.amountCents}
          WHEN ${transactions.type} = 'transfer' AND ${transactions.isPaid} = false AND ${transactions.transferDirection} = 'out' THEN -${transactions.amountCents}
          ELSE 0
        END
      ), 0)::bigint`,
    })
    .from(transactions)
    .where(
      and(
        ...baseClauses,
        from ? gte(transactions.date, from) : undefined,
        to ? lte(transactions.date, to) : undefined,
      ),
    )) as [
    {
      realizedIncome: number | string;
      forecastIncome: number | string;
      realizedExpense: number | string;
      forecastExpense: number | string;
      realizedTransferDelta: number | string;
      forecastTransferDelta: number | string;
    },
  ];

  const realizedIncome = Number(rangeRow?.realizedIncome ?? 0);
  const forecastIncome = Number(rangeRow?.forecastIncome ?? 0);
  const realizedExpense = Number(rangeRow?.realizedExpense ?? 0);
  const forecastExpense = Number(rangeRow?.forecastExpense ?? 0);
  const realizedTransferDelta = Number(rangeRow?.realizedTransferDelta ?? 0);
  const forecastTransferDelta = Number(rangeRow?.forecastTransferDelta ?? 0);

  const currentBalance = previousBalance + realizedIncome - realizedExpense + realizedTransferDelta;
  const forecastBalance = currentBalance + forecastIncome - forecastExpense + forecastTransferDelta;

  return {
    mode: "cashflow",
    previousBalanceCents: previousBalance,
    realizedIncomeCents: realizedIncome,
    forecastedIncomeCents: forecastIncome,
    realizedExpenseCents: realizedExpense,
    forecastedExpenseCents: forecastExpense,
    currentBalanceCents: currentBalance,
    forecastBalanceCents: forecastBalance,
  };
}
