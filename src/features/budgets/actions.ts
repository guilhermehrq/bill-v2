"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  bulkUpsertBudgetsSchema,
  copyBudgetsSchema,
  upsertBudgetSchema,
  type BulkUpsertBudgetsInput,
  type CopyBudgetsInput,
  type UpsertBudgetInput,
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
  revalidatePath("/orcamentos");
  revalidatePath("/");
}

export async function upsertBudgetAction(input: UpsertBudgetInput): Promise<ActionResult> {
  const parsed = upsertBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  await db
    .insert(budgets)
    .values({
      userId: uid,
      categoryId: parsed.data.categoryId,
      month: parsed.data.month,
      amountCents: parsed.data.amountCents,
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: { amountCents: parsed.data.amountCents, updatedAt: new Date() },
    });

  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteBudgetAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, uid)))
    .returning({ id: budgets.id });

  if (result.length === 0) return { ok: false, error: "Orçamento não encontrado" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function bulkUpsertBudgetsAction(
  input: BulkUpsertBudgetsInput,
): Promise<ActionResult<{ saved: number; deleted: number }>> {
  const parsed = bulkUpsertBudgetsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const toUpsert = parsed.data.entries.filter((e) => e.amountCents > 0);
  const toDelete = parsed.data.entries.filter((e) => e.amountCents === 0);

  let saved = 0;
  let deleted = 0;

  if (toUpsert.length > 0) {
    const values = toUpsert.map((e) => ({
      userId: uid,
      categoryId: e.categoryId,
      month: parsed.data.month,
      amountCents: e.amountCents,
    }));
    const result = await db
      .insert(budgets)
      .values(values)
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.categoryId, budgets.month],
        set: {
          amountCents: sql`EXCLUDED.amount_cents`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: budgets.id });
    saved = result.length;
  }

  if (toDelete.length > 0) {
    const result = await db
      .delete(budgets)
      .where(
        and(
          eq(budgets.userId, uid),
          eq(budgets.month, parsed.data.month),
          inArray(
            budgets.categoryId,
            toDelete.map((e) => e.categoryId),
          ),
        ),
      )
      .returning({ id: budgets.id });
    deleted = result.length;
  }

  revalidate();
  return { ok: true, data: { saved, deleted } };
}

export async function copyBudgetsFromMonthAction(
  input: CopyBudgetsInput,
): Promise<ActionResult<{ copied: number }>> {
  const parsed = copyBudgetsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  // Copy every budget from source month to target month. ON CONFLICT keeps
  // existing target-month budgets unchanged (so a user-created row isn't
  // overwritten by the copy).
  const result = await db.execute(sql`
    INSERT INTO budgets (user_id, category_id, month, amount_cents)
    SELECT user_id, category_id, ${parsed.data.toMonth}::date, amount_cents
    FROM budgets
    WHERE user_id = ${uid} AND month = ${parsed.data.fromMonth}::date
    ON CONFLICT (user_id, category_id, month) DO NOTHING
    RETURNING id
  `);

  revalidate();
  return { ok: true, data: { copied: result.length } };
}
