"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  contributeGoalSchema,
  createGoalSchema,
  updateGoalSchema,
  type ContributeGoalInput,
  type CreateGoalInput,
  type UpdateGoalInput,
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
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function createGoalAction(
  input: CreateGoalInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [row] = await db
    .insert(goals)
    .values({
      userId: uid,
      name: parsed.data.name,
      targetCents: parsed.data.targetCents,
      targetDate: parsed.data.targetDate ?? null,
      accountId: parsed.data.accountId ?? null,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
    })
    .returning({ id: goals.id });

  if (!row) return { ok: false, error: "Falha ao criar meta" };

  revalidate();
  return { ok: true, data: { id: row.id } };
}

export async function updateGoalAction(id: string, input: UpdateGoalInput): Promise<ActionResult> {
  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const updates: Partial<typeof goals.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.targetCents !== undefined) updates.targetCents = parsed.data.targetCents;
  if (parsed.data.targetDate !== undefined) updates.targetDate = parsed.data.targetDate ?? null;
  if (parsed.data.accountId !== undefined) updates.accountId = parsed.data.accountId ?? null;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon ?? null;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color ?? null;

  const result = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, uid)))
    .returning({ id: goals.id });

  if (result.length === 0) return { ok: false, error: "Meta não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function setGoalArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(goals)
    .set({ archived, updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, uid)))
    .returning({ id: goals.id });

  if (result.length === 0) return { ok: false, error: "Meta não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, uid)))
    .returning({ id: goals.id });

  if (result.length === 0) return { ok: false, error: "Meta não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

// Manual contribution for goals without a linked account.
export async function contributeGoalAction(input: ContributeGoalInput): Promise<ActionResult> {
  const parsed = contributeGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [existing] = await db
    .select({ accountId: goals.accountId, currentCents: goals.currentCents })
    .from(goals)
    .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, uid)))
    .limit(1);

  if (!existing) return { ok: false, error: "Meta não encontrada" };
  if (existing.accountId) {
    return {
      ok: false,
      error: "Meta vinculada a uma conta — o progresso é calculado do saldo automaticamente",
    };
  }

  await db
    .update(goals)
    .set({
      currentCents: sql`${goals.currentCents} + ${parsed.data.amountCents}`,
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, parsed.data.goalId), eq(goals.userId, uid)));

  revalidate();
  return { ok: true, data: undefined };
}
