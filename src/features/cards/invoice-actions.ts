"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { accounts, creditCardInvoices, creditCards, transactions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireUserId(): Promise<string | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  return user.id;
}

export const payInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  accountId: z.string().uuid(),
  amountCents: z.number().int().positive("Valor precisa ser maior que zero"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;

export async function payInvoiceAction(input: PayInvoiceInput): Promise<ActionResult> {
  const parsed = payInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const { invoiceId, accountId, amountCents, date } = parsed.data;

  const [invoice] = await db
    .select({
      id: creditCardInvoices.id,
      totalCents: creditCardInvoices.totalCents,
      paidCents: creditCardInvoices.paidCents,
      cardId: creditCardInvoices.creditCardId,
      referenceMonth: creditCardInvoices.referenceMonth,
    })
    .from(creditCardInvoices)
    .where(and(eq(creditCardInvoices.id, invoiceId), eq(creditCardInvoices.userId, uid)))
    .limit(1);

  if (!invoice) return { ok: false, error: "Fatura não encontrada" };

  const total = Number(invoice.totalCents);
  const paid = Number(invoice.paidCents);
  const remaining = total - paid;
  if (remaining <= 0) return { ok: false, error: "Fatura já está paga" };
  if (amountCents > remaining) {
    return { ok: false, error: "Valor maior que o saldo devedor da fatura" };
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, uid)))
    .limit(1);

  if (!account) return { ok: false, error: "Conta não encontrada" };

  const [card] = await db
    .select({ name: creditCards.name })
    .from(creditCards)
    .where(and(eq(creditCards.id, invoice.cardId), eq(creditCards.userId, uid)))
    .limit(1);

  const monthLabel = monthShort(invoice.referenceMonth);
  const description = card
    ? `Pagamento fatura ${card.name} ${monthLabel}`
    : `Pagamento fatura ${monthLabel}`;

  const newPaid = paid + amountCents;
  const newStatus = newPaid >= total ? "paid" : "partial";

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId: uid,
      type: "expense",
      description,
      amountCents,
      date,
      purchaseDate: date,
      accountId,
      isPaid: true,
      paidAt: date,
      notes: `Referente à fatura de ${monthLabel}`,
      tags: ["pagamento-fatura"],
    });

    await tx
      .update(creditCardInvoices)
      .set({ paidCents: newPaid, status: newStatus, updatedAt: new Date() })
      .where(and(eq(creditCardInvoices.id, invoiceId), eq(creditCardInvoices.userId, uid)));
  });

  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${invoice.cardId}`);
  revalidatePath("/");
  revalidatePath("/extrato");

  return { ok: true, data: undefined };
}

function monthShort(yyyymmdd: string): string {
  const [y, m] = yyyymmdd.split("-").map(Number) as [number, number, number];
  const names = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${names[m - 1]}/${String(y).slice(-2)}`;
}
