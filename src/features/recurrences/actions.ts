"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { recurrences, transactions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { generateUpcoming } from "./generator";
import {
  createRecurrenceSchema,
  updateRecurrenceSchema,
  type CreateRecurrenceInput,
  type UpdateRecurrenceInput,
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
  revalidatePath("/recorrencias");
  revalidatePath("/extrato");
  revalidatePath("/");
}

export async function createRecurrenceAction(
  input: CreateRecurrenceInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createRecurrenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [row] = await db
    .insert(recurrences)
    .values({
      userId: uid,
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      type: parsed.data.type,
      categoryId: parsed.data.categoryId ?? null,
      accountId: parsed.data.accountId ?? null,
      creditCardId: parsed.data.creditCardId ?? null,
      frequency: parsed.data.frequency,
      interval: parsed.data.interval,
      dayOfMonth: parsed.data.dayOfMonth ?? null,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      maxOccurrences: parsed.data.maxOccurrences ?? null,
      lastGeneratedDate: parsed.data.lastGeneratedDate ?? null,
      active: true,
    })
    .returning({ id: recurrences.id });

  if (!row) return { ok: false, error: "Falha ao criar recorrência" };

  // Generate the next 30 days of occurrences so the user sees them immediately.
  await generateUpcoming({ userId: uid }, 30);

  revalidate();
  return { ok: true, data: { id: row.id } };
}

export async function updateRecurrenceAction(
  id: string,
  input: UpdateRecurrenceInput,
): Promise<ActionResult> {
  const parsed = updateRecurrenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const updates: Partial<typeof recurrences.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.amountCents !== undefined) updates.amountCents = parsed.data.amountCents;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId ?? null;
  if (parsed.data.frequency !== undefined) updates.frequency = parsed.data.frequency;
  if (parsed.data.interval !== undefined) updates.interval = parsed.data.interval;
  if (parsed.data.dayOfMonth !== undefined) updates.dayOfMonth = parsed.data.dayOfMonth ?? null;
  if (parsed.data.dayOfWeek !== undefined) updates.dayOfWeek = parsed.data.dayOfWeek ?? null;
  if (parsed.data.endDate !== undefined) updates.endDate = parsed.data.endDate ?? null;
  if (parsed.data.maxOccurrences !== undefined)
    updates.maxOccurrences = parsed.data.maxOccurrences ?? null;

  const result = await db
    .update(recurrences)
    .set(updates)
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, uid)))
    .returning({ id: recurrences.id });

  if (result.length === 0) return { ok: false, error: "Recorrência não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function setRecurrenceActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(recurrences)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, uid)))
    .returning({ id: recurrences.id });

  if (result.length === 0) return { ok: false, error: "Recorrência não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteRecurrenceAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  // Unlink any generated-not-yet-paid transactions so they stay visible; delete the recurrence.
  await db
    .update(transactions)
    .set({ recurrenceId: null })
    .where(
      and(
        eq(transactions.userId, uid),
        eq(transactions.recurrenceId, id),
        eq(transactions.isPaid, false),
      ),
    );

  const result = await db
    .delete(recurrences)
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, uid)))
    .returning({ id: recurrences.id });

  if (result.length === 0) return { ok: false, error: "Recorrência não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

// Keeps unused import from being stripped if the type narrowing optimizer runs.
void isNotNull;
