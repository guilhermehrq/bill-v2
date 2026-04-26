import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { FormAccountOption, FormCategoryOption } from "./types";

export type TransactionListItem = {
  id: string;
  description: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  date: string;
  isPaid: boolean;
  transferDirection: "in" | "out" | null;
  transferPairId: string | null;
  account: { id: string; name: string; color: string | null } | null;
  category: { id: string; name: string; color: string | null } | null;
};

export async function listRecentTransactions(
  userId: string,
  limit = 50,
): Promise<TransactionListItem[]> {
  const rows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amountCents: transactions.amountCents,
      type: transactions.type,
      date: transactions.date,
      isPaid: transactions.isPaid,
      transferDirection: transactions.transferDirection,
      transferPairId: transactions.transferPairId,
      accountId: accounts.id,
      accountName: accounts.name,
      accountColor: accounts.color,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amountCents: Number(r.amountCents),
    type: r.type,
    date: r.date,
    isPaid: r.isPaid,
    transferDirection: r.transferDirection,
    transferPairId: r.transferPairId,
    account: r.accountId ? { id: r.accountId, name: r.accountName!, color: r.accountColor } : null,
    category: r.categoryId
      ? { id: r.categoryId, name: r.categoryName!, color: r.categoryColor }
      : null,
  }));
}

export async function listFormAccountOptions(userId: string): Promise<FormAccountOption[]> {
  const rows = await db
    .select({ id: accounts.id, name: accounts.name, color: accounts.color })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))
    .orderBy(accounts.name);
  return rows;
}

export async function listFormCategoryOptions(userId: string): Promise<FormCategoryOption[]> {
  const parent = alias(categories, "parent");
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      color: categories.color,
      icon: categories.icon,
      parentName: parent.name,
      parentColor: parent.color,
      parentIcon: parent.icon,
    })
    .from(categories)
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(and(eq(categories.userId, userId), isNull(categories.archivedAt)))
    .orderBy(categories.type, categories.name);

  return rows;
}
