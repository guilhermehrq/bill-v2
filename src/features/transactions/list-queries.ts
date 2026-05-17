import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { accounts, categories, creditCards, transactions } from "@/db/schema";

export type StatementMode = "cashflow" | "all_entries";

export type TransactionFilters = {
  from?: string | undefined; // YYYY-MM-DD
  to?: string | undefined;
  accountIds?: string[] | undefined;
  cardIds?: string[] | undefined;
  invoiceIds?: string[] | undefined;
  categoryIds?: string[] | undefined;
  types?: ("income" | "expense" | "transfer")[] | undefined;
  search?: string | undefined;
  mode?: StatementMode | undefined;
};

export type AccountRef = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
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
  installmentNumber: number | null;
  installmentTotal: number | null;
  tags: string[];
  account: AccountRef | null;
  card: { id: string; name: string; color: string | null; icon: string | null } | null;
  pairAccount: AccountRef | null;
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    parentName: string | null;
    parentColor: string | null;
    parentIcon: string | null;
  } | null;
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
  if (filters.invoiceIds && filters.invoiceIds.length > 0)
    clauses.push(inArray(transactions.invoiceId, filters.invoiceIds));
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

  // Statement mode filtering:
  //  - cashflow: only entries that affect the cash balance directly. Hide
  //    individual card purchases (they'll be replaced by virtual invoice rows
  //    elsewhere). Keep transfers, account income/expense, and invoice payments.
  //  - all_entries: show everything except invoice payments (avoid duplication
  //    with the individual card purchases that ARE shown in this mode).
  if (filters.mode === "cashflow") {
    clauses.push(isNull(transactions.creditCardId));
  } else if (filters.mode === "all_entries") {
    clauses.push(sql`NOT (${transactions.tags} @> ARRAY['pagamento-fatura']::text[])`);
  }

  // For transfers we render two rows from the DB (one per leg). To avoid
  // duplicating the user's perceived "movement", we hide the OUT side and
  // keep the IN side, then derive the source via transferPairId.
  // Exception: when the user filters by source-account or source-card, the
  // OUT rows are what they want; in that case we leave both legs visible.
  const filteringByAccountSubset =
    (filters.accountIds && filters.accountIds.length > 0) ||
    (filters.cardIds && filters.cardIds.length > 0);
  if (!filteringByAccountSubset) {
    clauses.push(or(ne(transactions.type, "transfer"), eq(transactions.transferDirection, "in"))!);
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
      installmentNumber: transactions.installmentNumber,
      installmentTotal: transactions.installmentTotal,
      tags: transactions.tags,
      accountId: accounts.id,
      accountName: accounts.name,
      accountColor: accounts.color,
      accountIcon: accounts.icon,
      cardId: creditCards.id,
      cardName: creditCards.name,
      cardColor: creditCards.color,
      cardIcon: creditCards.icon,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      parentCategoryName: parent.name,
      parentCategoryColor: parent.color,
      parentCategoryIcon: parent.icon,
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

  // For visible transfers, fetch the paired account in one extra query.
  const pairIds = rows
    .filter((r) => r.type === "transfer" && r.transferPairId)
    .map((r) => r.transferPairId as string);
  const pairAccountByPairId = new Map<string, AccountRef>();
  if (pairIds.length > 0) {
    const pairRows = await db
      .select({
        pairId: transactions.id,
        accountId: accounts.id,
        accountName: accounts.name,
        accountColor: accounts.color,
        accountIcon: accounts.icon,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.userId, userId), inArray(transactions.id, pairIds)));
    for (const p of pairRows) {
      if (p.accountId) {
        pairAccountByPairId.set(p.pairId, {
          id: p.accountId,
          name: p.accountName!,
          color: p.accountColor,
          icon: p.accountIcon,
        });
      }
    }
  }

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
    installmentNumber: r.installmentNumber,
    installmentTotal: r.installmentTotal,
    tags: r.tags ?? [],
    account: r.accountId
      ? {
          id: r.accountId,
          name: r.accountName!,
          color: r.accountColor,
          icon: r.accountIcon,
        }
      : null,
    card: r.cardId
      ? { id: r.cardId, name: r.cardName!, color: r.cardColor, icon: r.cardIcon }
      : null,
    pairAccount: r.transferPairId ? (pairAccountByPairId.get(r.transferPairId) ?? null) : null,
    category: r.categoryId
      ? {
          id: r.categoryId,
          name: r.categoryName!,
          color: r.categoryColor,
          icon: r.categoryIcon,
          parentName: r.parentCategoryName ?? null,
          parentColor: r.parentCategoryColor ?? null,
          parentIcon: r.parentCategoryIcon ?? null,
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
      installmentNumber: transactions.installmentNumber,
      installmentTotal: transactions.installmentTotal,
      tags: transactions.tags,
      accountId: accounts.id,
      accountName: accounts.name,
      accountColor: accounts.color,
      accountIcon: accounts.icon,
      cardId: creditCards.id,
      cardName: creditCards.name,
      cardColor: creditCards.color,
      cardIcon: creditCards.icon,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      parentCategoryName: parent.name,
      parentCategoryColor: parent.color,
      parentCategoryIcon: parent.icon,
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
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    tags: row.tags ?? [],
    account: row.accountId
      ? {
          id: row.accountId,
          name: row.accountName!,
          color: row.accountColor,
          icon: row.accountIcon,
        }
      : null,
    card: row.cardId
      ? { id: row.cardId, name: row.cardName!, color: row.cardColor, icon: row.cardIcon }
      : null,
    pairAccount: null,
    category: row.categoryId
      ? {
          id: row.categoryId,
          name: row.categoryName!,
          color: row.categoryColor,
          icon: row.categoryIcon,
          parentName: row.parentCategoryName ?? null,
          parentColor: row.parentCategoryColor ?? null,
          parentIcon: row.parentCategoryIcon ?? null,
        }
      : null,
  };
}

// Helper for asc ordering — unused import guard (keeps tree-shaking happy while signalling intent).
void asc;
void isNotNull;
