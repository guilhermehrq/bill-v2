import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, creditCardInvoices, creditCards, transactions } from "@/db/schema";

export type InvoiceTransaction = {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  purchaseDate: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  category: { id: string; name: string; color: string | null; parentName: string | null } | null;
};

export type InvoiceDetail = {
  id: string;
  cardId: string;
  cardName: string;
  cardColor: string | null;
  cardLimitCents: number;
  cardClosingDay: number;
  cardDueDay: number;
  cardDefaultAccountId: string | null;
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
  status: "open" | "closed" | "paid" | "overdue" | "partial";
  totalCents: number;
  paidCents: number;
  transactions: InvoiceTransaction[];
  byCategory: Array<{
    categoryName: string;
    color: string | null;
    totalCents: number;
    percentage: number;
  }>;
};

export type InvoiceNavItem = {
  id: string;
  referenceMonth: string;
  totalCents: number;
  status: "open" | "closed" | "paid" | "overdue" | "partial";
};

// Loads the invoice for a card + reference month. If the invoice doesn't
// exist yet (no transactions in this cycle), returns null and the page can
// render an empty state.
export async function getInvoiceByMonth(
  userId: string,
  cardId: string,
  referenceMonth: string, // YYYY-MM-01
): Promise<InvoiceDetail | null> {
  const [cardRow] = await db
    .select({
      id: creditCards.id,
      name: creditCards.name,
      color: creditCards.color,
      limitCents: creditCards.limitCents,
      closingDay: creditCards.closingDay,
      dueDay: creditCards.dueDay,
      defaultAccountId: creditCards.defaultAccountId,
    })
    .from(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)))
    .limit(1);

  if (!cardRow) return null;

  const [invoiceRow] = await db
    .select()
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.creditCardId, cardId),
        eq(creditCardInvoices.referenceMonth, referenceMonth),
      ),
    )
    .limit(1);

  if (!invoiceRow) return null;

  const parent = alias(categories, "parent_category");

  const txRows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amountCents: transactions.amountCents,
      date: transactions.date,
      purchaseDate: transactions.purchaseDate,
      installmentNumber: transactions.installmentNumber,
      installmentTotal: transactions.installmentTotal,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      parentName: parent.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.invoiceId, invoiceRow.id)))
    .orderBy(asc(transactions.date));

  const items: InvoiceTransaction[] = txRows.map((r) => ({
    id: r.id,
    description: r.description,
    amountCents: Number(r.amountCents),
    date: r.date,
    purchaseDate: r.purchaseDate,
    installmentNumber: r.installmentNumber,
    installmentTotal: r.installmentTotal,
    category: r.categoryId
      ? {
          id: r.categoryId,
          name: r.categoryName!,
          color: r.categoryColor,
          parentName: r.parentName ?? null,
        }
      : null,
  }));

  const total = Number(invoiceRow.totalCents);
  const byCategoryMap = new Map<string, { color: string | null; total: number }>();
  for (const t of items) {
    const key = t.category?.name ?? "Sem categoria";
    const entry = byCategoryMap.get(key) ?? { color: t.category?.color ?? null, total: 0 };
    entry.total += t.amountCents;
    byCategoryMap.set(key, entry);
  }
  const byCategory = Array.from(byCategoryMap.entries())
    .map(([name, v]) => ({
      categoryName: name,
      color: v.color,
      totalCents: v.total,
      percentage: total > 0 ? Math.round((v.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    id: invoiceRow.id,
    cardId: cardRow.id,
    cardName: cardRow.name,
    cardColor: cardRow.color,
    cardLimitCents: Number(cardRow.limitCents),
    cardClosingDay: cardRow.closingDay,
    cardDueDay: cardRow.dueDay,
    cardDefaultAccountId: cardRow.defaultAccountId,
    referenceMonth: invoiceRow.referenceMonth,
    closingDate: invoiceRow.closingDate,
    dueDate: invoiceRow.dueDate,
    status: invoiceRow.status,
    totalCents: total,
    paidCents: Number(invoiceRow.paidCents),
    transactions: items,
    byCategory,
  };
}

export async function listInvoicesForCard(
  userId: string,
  cardId: string,
): Promise<InvoiceNavItem[]> {
  const rows = await db
    .select({
      id: creditCardInvoices.id,
      referenceMonth: creditCardInvoices.referenceMonth,
      totalCents: creditCardInvoices.totalCents,
      status: creditCardInvoices.status,
    })
    .from(creditCardInvoices)
    .where(and(eq(creditCardInvoices.userId, userId), eq(creditCardInvoices.creditCardId, cardId)))
    .orderBy(desc(creditCardInvoices.referenceMonth));

  return rows.map((r) => ({
    id: r.id,
    referenceMonth: r.referenceMonth,
    totalCents: Number(r.totalCents),
    status: r.status,
  }));
}

export async function getCurrentInvoiceMonth(
  userId: string,
  cardId: string,
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select({ referenceMonth: creditCardInvoices.referenceMonth })
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.userId, userId),
        eq(creditCardInvoices.creditCardId, cardId),
        sql`${creditCardInvoices.closingDate} >= ${today}`,
      ),
    )
    .orderBy(asc(creditCardInvoices.referenceMonth))
    .limit(1);

  return row?.referenceMonth ?? null;
}
