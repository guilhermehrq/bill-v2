import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, creditCards, recurrences, transactions } from "@/db/schema";

export type RecurrenceListItem = {
  id: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  startDate: string;
  endDate: string | null;
  maxOccurrences: number | null;
  active: boolean;
  lastGeneratedDate: string | null;
  accountId: string | null;
  accountName: string | null;
  creditCardId: string | null;
  creditCardName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  parentCategoryName: string | null;
  nextDate: string | null;
};

export async function listRecurrences(userId: string): Promise<RecurrenceListItem[]> {
  const parent = alias(categories, "parent_category");

  const rows = await db
    .select({
      id: recurrences.id,
      description: recurrences.description,
      amountCents: recurrences.amountCents,
      type: recurrences.type,
      frequency: recurrences.frequency,
      interval: recurrences.interval,
      dayOfMonth: recurrences.dayOfMonth,
      dayOfWeek: recurrences.dayOfWeek,
      startDate: recurrences.startDate,
      endDate: recurrences.endDate,
      maxOccurrences: recurrences.maxOccurrences,
      active: recurrences.active,
      lastGeneratedDate: recurrences.lastGeneratedDate,
      accountId: accounts.id,
      accountName: accounts.name,
      creditCardId: creditCards.id,
      creditCardName: creditCards.name,
      categoryId: categories.id,
      categoryName: categories.name,
      parentCategoryName: parent.name,
    })
    .from(recurrences)
    .leftJoin(accounts, eq(recurrences.accountId, accounts.id))
    .leftJoin(creditCards, eq(recurrences.creditCardId, creditCards.id))
    .leftJoin(categories, eq(recurrences.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(eq(recurrences.userId, userId))
    .orderBy(recurrences.description);

  return rows.map<RecurrenceListItem>((r) => {
    const base = r.lastGeneratedDate ?? null;
    let nextDate: string | null = null;
    if (r.active && (!r.endDate || (base ?? r.startDate) <= r.endDate)) {
      nextDate = computeNextDateString(
        r.frequency,
        r.interval,
        r.dayOfMonth,
        r.dayOfWeek,
        r.startDate,
        base,
      );
      if (r.endDate && nextDate > r.endDate) nextDate = null;
    }
    if (r.type === "transfer") throw new Error("Recurrence type transfer not supported");

    return {
      id: r.id,
      description: r.description,
      amountCents: Number(r.amountCents),
      type: r.type,
      frequency: r.frequency,
      interval: r.interval,
      dayOfMonth: r.dayOfMonth,
      dayOfWeek: r.dayOfWeek,
      startDate: r.startDate,
      endDate: r.endDate,
      maxOccurrences: r.maxOccurrences,
      active: r.active,
      lastGeneratedDate: r.lastGeneratedDate,
      accountId: r.accountId,
      accountName: r.accountName,
      creditCardId: r.creditCardId,
      creditCardName: r.creditCardName,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      parentCategoryName: r.parentCategoryName,
      nextDate,
    };
  });
}

export type UpcomingTransaction = {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  accountName: string | null;
  cardName: string | null;
  categoryName: string | null;
  recurrenceId: string | null;
};

export async function listUpcomingTransactions(
  userId: string,
  untilDate: string,
): Promise<UpcomingTransaction[]> {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amountCents: transactions.amountCents,
      type: transactions.type,
      accountName: accounts.name,
      cardName: creditCards.name,
      categoryName: categories.name,
      recurrenceId: transactions.recurrenceId,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isPaid, false),
        gte(transactions.date, today),
      ),
    )
    .orderBy(transactions.date);

  return rows
    .filter((r) => r.date <= untilDate)
    .map<UpcomingTransaction>((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amountCents: Number(r.amountCents),
      type: r.type,
      accountName: r.accountName,
      cardName: r.cardName,
      categoryName: r.categoryName,
      recurrenceId: r.recurrenceId,
    }));
}

// Keeps the generator and the list view in sync — computes the next
// occurrence for a recurrence given its last-generated date (or null).
export function computeNextDateString(
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
  dayOfMonth: number | null,
  dayOfWeek: number | null,
  startDate: string,
  lastGenerated: string | null,
): string {
  const start = parseISODate(startDate);
  const last = lastGenerated ? parseISODate(lastGenerated) : null;

  if (!last) return startDate;

  const current = new Date(last);

  switch (frequency) {
    case "daily": {
      current.setDate(current.getDate() + interval);
      return formatISODate(current);
    }
    case "weekly": {
      current.setDate(current.getDate() + interval * 7);
      if (dayOfWeek !== null && current.getDay() !== dayOfWeek) {
        const diff = (dayOfWeek - current.getDay() + 7) % 7;
        current.setDate(current.getDate() + diff);
      }
      return formatISODate(current);
    }
    case "monthly": {
      const target = new Date(current.getFullYear(), current.getMonth() + interval, 1);
      const day = dayOfMonth ?? start.getDate();
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(day, lastDay));
      return formatISODate(target);
    }
    case "yearly": {
      const target = new Date(current.getFullYear() + interval, start.getMonth(), start.getDate());
      return formatISODate(target);
    }
  }

  // Unreachable — exhaustive switch
  // Keep TS guard happy in case frequency becomes a wider type.
  void isNotNull;
  return startDate;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function formatISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
