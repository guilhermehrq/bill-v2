"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { creditCards } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  createCardSchema,
  updateCardSchema,
  type CreateCardInput,
  type UpdateCardInput,
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
  revalidatePath("/cartoes");
  revalidatePath("/");
  revalidatePath("/extrato");
}

export async function createCardAction(
  input: CreateCardInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [row] = await db
    .insert(creditCards)
    .values({
      userId: uid,
      name: parsed.data.name,
      brand: parsed.data.brand || null,
      lastDigits: parsed.data.lastDigits || null,
      limitCents: parsed.data.limitCents,
      closingDay: parsed.data.closingDay,
      dueDay: parsed.data.dueDay,
      defaultAccountId: parsed.data.defaultAccountId ?? null,
      color: parsed.data.color ?? null,
      icon: parsed.data.icon ?? null,
    })
    .returning({ id: creditCards.id });

  if (!row) return { ok: false, error: "Falha ao criar cartão" };

  revalidate();
  return { ok: true, data: { id: row.id } };
}

export async function updateCardAction(id: string, input: UpdateCardInput): Promise<ActionResult> {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const updates: Partial<typeof creditCards.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.brand !== undefined) updates.brand = parsed.data.brand || null;
  if (parsed.data.lastDigits !== undefined) updates.lastDigits = parsed.data.lastDigits || null;
  if (parsed.data.limitCents !== undefined) updates.limitCents = parsed.data.limitCents;
  if (parsed.data.closingDay !== undefined) updates.closingDay = parsed.data.closingDay;
  if (parsed.data.dueDay !== undefined) updates.dueDay = parsed.data.dueDay;
  if (parsed.data.defaultAccountId !== undefined)
    updates.defaultAccountId = parsed.data.defaultAccountId ?? null;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color ?? null;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon ?? null;

  const result = await db
    .update(creditCards)
    .set(updates)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, uid)))
    .returning({ id: creditCards.id });

  if (result.length === 0) return { ok: false, error: "Cartão não encontrado" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function setCardArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(creditCards)
    .set({ archived, updatedAt: new Date() })
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, uid)))
    .returning({ id: creditCards.id });

  if (result.length === 0) return { ok: false, error: "Cartão não encontrado" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteCardAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, uid)))
    .returning({ id: creditCards.id });

  if (result.length === 0) return { ok: false, error: "Cartão não encontrado" };

  revalidate();
  return { ok: true, data: undefined };
}
