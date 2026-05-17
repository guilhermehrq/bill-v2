"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  createIncomeOrExpenseSchema,
  createTransferSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "./schemas";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireUserId(): Promise<string | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  return user.id;
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/extrato");
  revalidatePath("/contas");
  revalidatePath("/categorias");
}

export async function createTransactionAction(
  input: CreateTransactionInput,
): Promise<ActionResult<{ id: string }>> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  if (input.type === "transfer") {
    const parsed = createTransferSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
    }
    const { sourceAccountId, destinationAccountId, amountCents, description, date, notes, tags } =
      parsed.data;

    try {
      const [source] = await db.transaction(async (tx) => {
        const [srcRow] = await tx
          .insert(transactions)
          .values({
            userId: uid,
            type: "transfer",
            description,
            amountCents,
            date,
            purchaseDate: date,
            accountId: sourceAccountId,
            transferDirection: "out",
            notes: notes || null,
            tags: tags ?? [],
            isPaid: true,
          })
          .returning({ id: transactions.id });
        if (!srcRow) throw new Error("Falha ao criar transferência (origem)");

        const [destRow] = await tx
          .insert(transactions)
          .values({
            userId: uid,
            type: "transfer",
            description,
            amountCents,
            date,
            purchaseDate: date,
            accountId: destinationAccountId,
            transferDirection: "in",
            transferPairId: srcRow.id,
            notes: notes || null,
            tags: tags ?? [],
            isPaid: true,
          })
          .returning({ id: transactions.id });
        if (!destRow) throw new Error("Falha ao criar transferência (destino)");

        await tx
          .update(transactions)
          .set({ transferPairId: destRow.id, updatedAt: new Date() })
          .where(eq(transactions.id, srcRow.id));

        return [srcRow, destRow] as const;
      });

      revalidate();
      return { ok: true, data: { id: source.id } };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha ao criar transferência" };
    }
  }

  const parsed = createIncomeOrExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const {
    type,
    accountId,
    creditCardId,
    categoryId,
    invoiceId,
    amountCents,
    description,
    date,
    isPaid,
    notes,
    tags,
    installmentTotal,
  } = parsed.data;

  // Installments: split amount across N rows with distributable cents.
  if (installmentTotal && installmentTotal > 1 && creditCardId) {
    const firstId = await createInstallments(uid, {
      creditCardId,
      categoryId: categoryId ?? null,
      description,
      amountCents,
      date,
      notes: notes || null,
      tags: tags ?? [],
      installmentTotal,
    });
    if (!firstId) return { ok: false, error: "Falha ao criar parcelamento" };
    revalidate();
    return { ok: true, data: { id: firstId } };
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId: uid,
      type,
      description,
      amountCents,
      date,
      // purchase_date is filled by trigger; the explicit value is a no-op safety net.
      purchaseDate: date,
      accountId: accountId ?? null,
      creditCardId: creditCardId ?? null,
      categoryId: categoryId ?? null,
      // When invoiceId is set, fn_assign_invoice trigger respects it (early return).
      invoiceId: invoiceId ?? null,
      // Card transactions default to isPaid=true; they'll be reconciled when the invoice is paid.
      isPaid: creditCardId ? true : isPaid,
      paidAt: (creditCardId ? true : isPaid) ? date : null,
      notes: notes || null,
      tags: tags ?? [],
    })
    .returning({ id: transactions.id });

  if (!row) return { ok: false, error: "Falha ao criar transação" };

  revalidate();
  return { ok: true, data: { id: row.id } };
}

export async function updateTransactionAction(
  id: string,
  input: UpdateTransactionInput,
): Promise<ActionResult> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  // Check if this is a transfer — transfers mirror updates to both rows
  // so the pair stays in sync (except for accountId, which is unique per row).
  const [existing] = await db
    .select({ type: transactions.type, pairId: transactions.transferPairId })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .limit(1);

  if (!existing) return { ok: false, error: "Transação não encontrada" };

  const updates: Partial<typeof transactions.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.amountCents !== undefined) updates.amountCents = parsed.data.amountCents;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId ?? null;
  if (parsed.data.isPaid !== undefined) {
    updates.isPaid = parsed.data.isPaid;
    updates.paidAt = parsed.data.isPaid ? (parsed.data.date ?? undefined) : null;
  }
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;

  // accountId / creditCardId / invoiceId are per-row (transfers mirror the rest only).
  const perRowUpdates = { ...updates };
  if (parsed.data.accountId !== undefined) perRowUpdates.accountId = parsed.data.accountId ?? null;
  if (parsed.data.creditCardId !== undefined)
    perRowUpdates.creditCardId = parsed.data.creditCardId ?? null;
  if (parsed.data.invoiceId !== undefined) perRowUpdates.invoiceId = parsed.data.invoiceId ?? null;

  const targetIds = existing.type === "transfer" && existing.pairId ? [id, existing.pairId] : [id];

  if (existing.type === "transfer" && existing.pairId) {
    // For the edited row apply account change, for the mirror keep its account but sync the rest.
    await db
      .update(transactions)
      .set(perRowUpdates)
      .where(and(eq(transactions.id, id), eq(transactions.userId, uid)));
    await db
      .update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, existing.pairId), eq(transactions.userId, uid)));
  } else {
    await db
      .update(transactions)
      .set(perRowUpdates)
      .where(and(inArray(transactions.id, targetIds), eq(transactions.userId, uid)));
  }

  revalidate();
  return { ok: true, data: undefined };
}

export async function loadTransactionForEditAction(
  id: string,
): Promise<ActionResult<TransactionForEdit>> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [row] = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amountCents: transactions.amountCents,
      type: transactions.type,
      date: transactions.date,
      isPaid: transactions.isPaid,
      notes: transactions.notes,
      accountId: transactions.accountId,
      creditCardId: transactions.creditCardId,
      invoiceId: transactions.invoiceId,
      categoryId: transactions.categoryId,
      transferPairId: transactions.transferPairId,
      transferDirection: transactions.transferDirection,
    })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .limit(1);

  if (!row) return { ok: false, error: "Transação não encontrada" };

  let mirrorAccountId: string | null = null;
  if (row.type === "transfer" && row.transferPairId) {
    const [mirror] = await db
      .select({ accountId: transactions.accountId })
      .from(transactions)
      .where(and(eq(transactions.id, row.transferPairId), eq(transactions.userId, uid)))
      .limit(1);
    mirrorAccountId = mirror?.accountId ?? null;
  }

  return {
    ok: true,
    data: {
      id: row.id,
      description: row.description,
      amountCents: Number(row.amountCents),
      type: row.type,
      date: row.date,
      isPaid: row.isPaid,
      notes: row.notes,
      accountId: row.accountId,
      creditCardId: row.creditCardId,
      invoiceId: row.invoiceId,
      categoryId: row.categoryId,
      transferDirection: row.transferDirection,
      transferPairAccountId: mirrorAccountId,
    },
  };
}

export type TransactionForEdit = {
  id: string;
  description: string;
  amountCents: number;
  type: "income" | "expense" | "transfer";
  date: string;
  isPaid: boolean;
  notes: string | null;
  accountId: string | null;
  creditCardId: string | null;
  invoiceId: string | null;
  categoryId: string | null;
  transferDirection: "in" | "out" | null;
  transferPairAccountId: string | null;
};

export async function togglePaidAction(id: string, isPaid: boolean): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(transactions)
    .set({
      isPaid,
      paidAt: isPaid ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .returning({ id: transactions.id });

  if (result.length === 0) return { ok: false, error: "Transação não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [existing] = await db
    .select({ type: transactions.type, pairId: transactions.transferPairId })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .limit(1);

  if (!existing) return { ok: false, error: "Transação não encontrada" };

  const idsToDelete =
    existing.type === "transfer" && existing.pairId ? [id, existing.pairId] : [id];

  await db
    .delete(transactions)
    .where(and(inArray(transactions.id, idsToDelete), eq(transactions.userId, uid)));

  revalidate();
  return { ok: true, data: undefined };
}

export async function duplicateTransactionAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [original] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .limit(1);

  if (!original) return { ok: false, error: "Transação não encontrada" };
  if (original.type === "transfer") {
    return { ok: false, error: "Duplicar transferência não é suportado no MVP" };
  }

  const today = new Date().toISOString().slice(0, 10);

  const [copy] = await db
    .insert(transactions)
    .values({
      userId: uid,
      type: original.type,
      description: `${original.description} (cópia)`,
      amountCents: original.amountCents,
      date: today,
      purchaseDate: today,
      accountId: original.accountId,
      categoryId: original.categoryId,
      isPaid: false,
      tags: original.tags ?? [],
      notes: original.notes,
    })
    .returning({ id: transactions.id });

  if (!copy) return { ok: false, error: "Falha ao duplicar transação" };

  revalidate();
  return { ok: true, data: { id: copy.id } };
}

async function createInstallments(
  userId: string,
  params: {
    creditCardId: string;
    categoryId: string | null;
    description: string;
    amountCents: number;
    date: string;
    notes: string | null;
    tags: string[];
    installmentTotal: number;
  },
): Promise<string | null> {
  const { installmentTotal, amountCents } = params;
  const base = Math.floor(amountCents / installmentTotal);
  const remainder = amountCents - base * installmentTotal;
  const amounts = Array.from({ length: installmentTotal }, (_, i) =>
    i < remainder ? base + 1 : base,
  );

  const [year, month, day] = params.date.split("-").map(Number) as [number, number, number];
  const installmentDates: string[] = [];
  for (let i = 0; i < installmentTotal; i++) {
    const d = new Date(year, month - 1 + i, day);
    // Clamp to last day of month if day overflowed.
    const lastDayOfTargetMonth = new Date(year, month + i, 0).getDate();
    if (d.getDate() !== day) d.setDate(lastDayOfTargetMonth);
    installmentDates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  return await db.transaction(async (tx) => {
    const firstDate = installmentDates[0]!;
    const [first] = await tx
      .insert(transactions)
      .values({
        userId,
        type: "expense",
        description: `${params.description} (1/${installmentTotal})`,
        amountCents: amounts[0]!,
        date: firstDate,
        purchaseDate: firstDate,
        creditCardId: params.creditCardId,
        categoryId: params.categoryId,
        isPaid: true,
        installmentNumber: 1,
        installmentTotal,
        notes: params.notes,
        tags: params.tags,
      })
      .returning({ id: transactions.id });

    if (!first) return null;

    for (let i = 1; i < installmentTotal; i++) {
      await tx.insert(transactions).values({
        userId,
        type: "expense",
        description: `${params.description} (${i + 1}/${installmentTotal})`,
        amountCents: amounts[i]!,
        date: installmentDates[i]!,
        // purchase_date is copied from the first row by trigger fn_set_purchase_date.
        purchaseDate: firstDate,
        creditCardId: params.creditCardId,
        categoryId: params.categoryId,
        isPaid: true,
        installmentOfId: first.id,
        installmentNumber: i + 1,
        installmentTotal,
        tags: params.tags,
      });
    }

    return first.id;
  });
}
