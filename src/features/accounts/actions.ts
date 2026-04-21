"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "./schemas";
import { seedDefaultCategoriesIfEmpty } from "./seed-categories";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireUserId(): Promise<string | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  return user.id;
}

export async function createAccountAction(
  input: CreateAccountInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  // Seed default categories on the first account creation (idempotent).
  await seedDefaultCategoriesIfEmpty(uid);

  const [row] = await db
    .insert(accounts)
    .values({
      userId: uid,
      name: parsed.data.name,
      type: parsed.data.type,
      institution: parsed.data.institution || null,
      initialBalanceCents: parsed.data.initialBalanceCents,
      color: parsed.data.color ?? null,
      icon: parsed.data.icon ?? null,
    })
    .returning({ id: accounts.id });

  if (!row) return { ok: false, error: "Falha ao criar conta" };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true, data: { id: row.id } };
}

export async function updateAccountAction(
  id: string,
  input: UpdateAccountInput,
): Promise<ActionResult> {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const updates: Partial<typeof accounts.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.institution !== undefined) updates.institution = parsed.data.institution || null;
  if (parsed.data.initialBalanceCents !== undefined)
    updates.initialBalanceCents = parsed.data.initialBalanceCents;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color ?? null;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon ?? null;

  const result = await db
    .update(accounts)
    .set(updates)
    .where(and(eq(accounts.id, id), eq(accounts.userId, uid)))
    .returning({ id: accounts.id });

  if (result.length === 0) return { ok: false, error: "Conta não encontrada" };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function setAccountArchivedAction(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(accounts)
    .set({ archived, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.userId, uid)))
    .returning({ id: accounts.id });

  if (result.length === 0) return { ok: false, error: "Conta não encontrada" };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, uid)))
    .returning({ id: accounts.id });

  if (result.length === 0) return { ok: false, error: "Conta não encontrada" };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
