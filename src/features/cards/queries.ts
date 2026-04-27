import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, creditCardInvoices, creditCards } from "@/db/schema";

export type CardWithInvoice = {
  id: string;
  name: string;
  brand: string | null;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  defaultAccountId: string | null;
  defaultAccountName: string | null;
  color: string | null;
  icon: string | null;
  archived: boolean;
  currentInvoice: {
    id: string;
    totalCents: number;
    paidCents: number;
    closingDate: string;
    dueDate: string;
    status: "open" | "closed" | "paid" | "overdue" | "partial";
  } | null;
  limitUsedPct: number;
};

export async function listCardsWithCurrentInvoice(userId: string): Promise<CardWithInvoice[]> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const rows = await db
    .select({
      id: creditCards.id,
      name: creditCards.name,
      brand: creditCards.brand,
      limitCents: creditCards.limitCents,
      closingDay: creditCards.closingDay,
      dueDay: creditCards.dueDay,
      defaultAccountId: creditCards.defaultAccountId,
      defaultAccountName: accounts.name,
      color: creditCards.color,
      icon: creditCards.icon,
      archived: creditCards.archived,
    })
    .from(creditCards)
    .leftJoin(accounts, eq(creditCards.defaultAccountId, accounts.id))
    .where(eq(creditCards.userId, userId))
    .orderBy(creditCards.archived, creditCards.createdAt);

  if (rows.length === 0) return [];

  // Grab current open invoice per card — the one whose closing_date >= today
  // and reference_month is the latest <= today + 1 month (current cycle).
  const invoiceRows = await db
    .select({
      id: creditCardInvoices.id,
      cardId: creditCardInvoices.creditCardId,
      totalCents: creditCardInvoices.totalCents,
      paidCents: creditCardInvoices.paidCents,
      closingDate: creditCardInvoices.closingDate,
      dueDate: creditCardInvoices.dueDate,
      status: creditCardInvoices.status,
    })
    .from(creditCardInvoices)
    .where(
      and(
        eq(creditCardInvoices.userId, userId),
        sql`${creditCardInvoices.closingDate} >= ${today}`,
      ),
    )
    .orderBy(desc(creditCardInvoices.closingDate));

  // Pick the first (earliest closing date >= today) per card.
  const currentByCard = new Map<string, (typeof invoiceRows)[number]>();
  for (const inv of [...invoiceRows].reverse()) {
    currentByCard.set(inv.cardId, inv);
  }

  return rows.map((r) => {
    const invoice = currentByCard.get(r.id);
    const totalInvoice = invoice ? Number(invoice.totalCents) : 0;
    return {
      id: r.id,
      name: r.name,
      brand: r.brand,
      limitCents: Number(r.limitCents),
      closingDay: r.closingDay,
      dueDay: r.dueDay,
      defaultAccountId: r.defaultAccountId,
      defaultAccountName: r.defaultAccountName,
      color: r.color,
      icon: r.icon,
      archived: r.archived,
      currentInvoice: invoice
        ? {
            id: invoice.id,
            totalCents: totalInvoice,
            paidCents: Number(invoice.paidCents),
            closingDate: invoice.closingDate,
            dueDate: invoice.dueDate,
            status: invoice.status,
          }
        : null,
      limitUsedPct:
        Number(r.limitCents) > 0
          ? Math.min(100, Math.round((totalInvoice / Number(r.limitCents)) * 100))
          : 0,
    };
  });
}

export type FormCardOption = {
  id: string;
  name: string;
  color: string | null;
};

export async function listFormCardOptions(userId: string): Promise<FormCardOption[]> {
  return await db
    .select({
      id: creditCards.id,
      name: creditCards.name,
      color: creditCards.color,
    })
    .from(creditCards)
    .where(and(eq(creditCards.userId, userId), eq(creditCards.archived, false)))
    .orderBy(creditCards.name);
}
