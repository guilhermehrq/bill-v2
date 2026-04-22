import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { accounts, categories, creditCards, transactions } from "@/db/schema";

export type TransactionFilters = {
  from?: string | undefined; // YYYY-MM-DD
  to?: string | undefined;
  accountIds?: string[] | undefined;
  cardIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  types?: ("income" | "expense" | "transfer")[] | undefined;
  search?: string | undefined;
};

export type TransactionListItem = {
  id: string;
  description: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  date: string;
  isPaid: boolean;
  notes: string | null;
  transferDirection: "in" | "out" | null;
  transferPairId: string | null;
  account: { id: string; name: string; color: string | null } | null;
  card: { id: string; name: string; color: string | null } | null;
  category: { id: string; name: string; color: string | null; parentName: string | null } | null;
};

const PAGE_SIZE = 50;

export async function searchTransactions(
  userId: string,
  filters: TransactionFilters,
  page = 0,
): Promise<{ items: TransactionListItem[]; hasMore: boolean; total: number }> {
  const parent = alias(categories, "parent_category");

  const clauses: SQL[] = [eq(transactions.userId, userId)];

  if (filters.from) clauses.push(gte(transactions.date, filters.from));
  if (filters.to) clauses.push(lte(transactions.date, filters.to));
  if (filters.types && filters.types.length > 0)
    clauses.push(inArray(transactions.type, filters.types));
  if (filters.accountIds && filters.accountIds.length > 0)
    clauses.push(inArray(transactions.accountId, filters.accountIds));
  if (filters.cardIds && filters.cardIds.length > 0)
    clauses.push(inArray(transactions.creditCardId, filters.cardIds));
  if (filters.categoryIds && filters.categoryIds.length > 0)
    clauses.push(inArray(transactions.categoryId, filters.categoryIds));
  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    clauses.push(
      or(
        sql`${transactions.description} ILIKE ${"%" + term + "%"}`,
        sql`similarity(${transactions.description}, ${term}) > 0.3`,
      )!,
    );
  }

  const where = and(...clauses);

  const [{ count }] = (await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(where)) as [{ count: number }];

  const rows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amountCents: transactions.amountCents,
      type: transactions.type,
      date: transactions.date,
      isPaid: transactions.isPaid,
      notes: transactions.notes,
      transferDirection: transactions.transferDirection,
      transferPairId: transactions.transferPairId,
      accountId: accounts.id,
      accountName: accounts.name,
      accountColor: accounts.color,
      cardId: creditCards.id,
      cardName: creditCards.name,
      cardColor: creditCards.color,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      parentCategoryName: parent.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(where)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);

  const items = rows.map<TransactionListItem>((r) => ({
    id: r.id,
    description: r.description,
    amountCents: Number(r.amountCents),
    type: r.type,
    date: r.date,
    isPaid: r.isPaid,
    notes: r.notes,
    transferDirection: r.transferDirection,
    transferPairId: r.transferPairId,
    account: r.accountId ? { id: r.accountId, name: r.accountName!, color: r.accountColor } : null,
    card: r.cardId ? { id: r.cardId, name: r.cardName!, color: r.cardColor } : null,
    category: r.categoryId
      ? {
          id: r.categoryId,
          name: r.categoryName!,
          color: r.categoryColor,
          parentName: r.parentCategoryName ?? null,
        }
      : null,
  }));

  return {
    items,
    hasMore: (page + 1) * PAGE_SIZE < count,
    total: count,
  };
}

export async function getTransactionById(
  userId: string,
  id: string,
): Promise<TransactionListItem | null> {
  const parent = alias(categories, "parent_category");
  const [row] = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amountCents: transactions.amountCents,
      type: transactions.type,
      date: transactions.date,
      isPaid: transactions.isPaid,
      notes: transactions.notes,
      transferDirection: transactions.transferDirection,
      transferPairId: transactions.transferPairId,
      accountId: accounts.id,
      accountName: accounts.name,
      accountColor: accounts.color,
      cardId: creditCards.id,
      cardName: creditCards.name,
      cardColor: creditCards.color,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      parentCategoryName: parent.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    description: row.description,
    amountCents: Number(row.amountCents),
    type: row.type,
    date: row.date,
    isPaid: row.isPaid,
    notes: row.notes,
    transferDirection: row.transferDirection,
    transferPairId: row.transferPairId,
    account: row.accountId
      ? { id: row.accountId, name: row.accountName!, color: row.accountColor }
      : null,
    card: row.cardId ? { id: row.cardId, name: row.cardName!, color: row.cardColor } : null,
    category: row.categoryId
      ? {
          id: row.categoryId,
          name: row.categoryName!,
          color: row.categoryColor,
          parentName: row.parentCategoryName ?? null,
        }
      : null,
  };
}

// Helper for asc ordering — unused import guard (keeps tree-shaking happy while signalling intent).
void asc;
