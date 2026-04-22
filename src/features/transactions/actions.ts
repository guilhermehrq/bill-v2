"use server";

import { and, eq } from "drizzle-orm";
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

  const { type, accountId, categoryId, amountCents, description, date, isPaid, notes, tags } =
    parsed.data;

  const [row] = await db
    .insert(transactions)
    .values({
      userId: uid,
      type,
      description,
      amountCents,
      date,
      purchaseDate: date, // trigger also sets this, but providing explicitly as belt-and-suspenders
      accountId,
      categoryId: categoryId ?? null,
      isPaid,
      paidAt: isPaid ? date : null,
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

  const updates: Partial<typeof transactions.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.amountCents !== undefined) updates.amountCents = parsed.data.amountCents;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.accountId !== undefined) updates.accountId = parsed.data.accountId ?? null;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId ?? null;
  if (parsed.data.isPaid !== undefined) {
    updates.isPaid = parsed.data.isPaid;
    updates.paidAt = parsed.data.isPaid ? (parsed.data.date ?? undefined) : null;
  }
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;

  const result = await db
    .update(transactions)
    .set(updates)
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .returning({ id: transactions.id });

  if (result.length === 0) return { ok: false, error: "Transação não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

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

  // For transfers, delete both sides.
  const [existing] = await db
    .select({ type: transactions.type, pairId: transactions.transferPairId })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
    .limit(1);

  if (!existing) return { ok: false, error: "Transação não encontrada" };

  if (existing.type === "transfer" && existing.pairId) {
    await db.delete(transactions).where(
      and(
        eq(transactions.userId, uid),
        // delete both rows
      ),
    );
    // Re-issue as two explicit deletes to keep WHERE clauses simple.
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, uid)));
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, existing.pairId), eq(transactions.userId, uid)));
  } else {
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, uid)));
  }

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
