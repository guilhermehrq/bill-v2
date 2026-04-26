"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  mergeCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type MergeCategoryInput,
  type UpdateCategoryInput,
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
  revalidatePath("/categorias");
  revalidatePath("/extrato");
  revalidatePath("/");
}

export async function createCategoryAction(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  // Enforce 2-level hierarchy — a child cannot have a parent that itself has a parent.
  if (parsed.data.parentId) {
    const [parent] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, parsed.data.parentId), eq(categories.userId, uid)))
      .limit(1);
    if (!parent) return { ok: false, error: "Categoria pai não encontrada" };
    if (parent.parentId) return { ok: false, error: "Hierarquia é limitada a 2 níveis" };
  }

  const [row] = await db
    .insert(categories)
    .values({
      userId: uid,
      name: parsed.data.name,
      type: parsed.data.type,
      parentId: parsed.data.parentId ?? null,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      isSystem: false,
    })
    .returning({ id: categories.id });

  if (!row) return { ok: false, error: "Falha ao criar categoria" };

  revalidate();
  return { ok: true, data: { id: row.id } };
}

export async function updateCategoryAction(
  id: string,
  input: UpdateCategoryInput,
): Promise<ActionResult> {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const updates: Partial<typeof categories.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon ?? null;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color ?? null;
  // type and parentId intentionally not editable after creation to keep hierarchy sane.

  const result = await db
    .update(categories)
    .set(updates)
    .where(and(eq(categories.id, id), eq(categories.userId, uid)))
    .returning({ id: categories.id });

  if (result.length === 0) return { ok: false, error: "Categoria não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function archiveCategoryAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(categories)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, uid)))
    .returning({ id: categories.id });

  if (result.length === 0) return { ok: false, error: "Categoria não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function unarchiveCategoryAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const result = await db
    .update(categories)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, uid)))
    .returning({ id: categories.id });

  if (result.length === 0) return { ok: false, error: "Categoria não encontrada" };

  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const [row] = await db
    .select({ isSystem: categories.isSystem, archivedAt: categories.archivedAt })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, uid)))
    .limit(1);

  if (!row) return { ok: false, error: "Categoria não encontrada" };
  if (row.isSystem) {
    return {
      ok: false,
      error: "Categoria padrão do sistema — não pode ser excluída. Arquive-a no lugar.",
    };
  }
  if (!row.archivedAt) {
    return {
      ok: false,
      error: "Arquive a categoria antes de excluir.",
    };
  }

  // Block delete if there are transactions; force user to merge first.
  const [{ count }] = (await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, uid), eq(transactions.categoryId, id)))) as [
    { count: number },
  ];

  if (Number(count) > 0) {
    return {
      ok: false,
      error: `Esta categoria tem ${count} ${count === 1 ? "transação" : "transações"} associadas. Mescle em outra antes de excluir.`,
    };
  }

  // Also block if it has children — they'd be orphaned. Force merge first.
  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, uid), eq(categories.parentId, id)))
    .limit(1);

  if (children.length > 0) {
    return {
      ok: false,
      error: "Esta categoria tem subcategorias. Mescle em outra antes de excluir.",
    };
  }

  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, uid)));

  revalidate();
  return { ok: true, data: undefined };
}

export async function mergeCategoryAction(input: MergeCategoryInput): Promise<ActionResult> {
  const parsed = mergeCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  if (parsed.data.sourceId === parsed.data.targetId) {
    return { ok: false, error: "Origem e destino precisam ser diferentes" };
  }

  const uid = await requireUserId();
  if (typeof uid !== "string") return { ok: false, error: uid.error };

  const rows = await db
    .select({ id: categories.id, type: categories.type })
    .from(categories)
    .where(
      and(
        eq(categories.userId, uid),
        // both rows must belong to user
      ),
    );

  const source = rows.find((r) => r.id === parsed.data.sourceId);
  const target = rows.find((r) => r.id === parsed.data.targetId);
  if (!source || !target) return { ok: false, error: "Categoria não encontrada" };
  if (source.type !== target.type) {
    return { ok: false, error: "Só é possível mesclar categorias do mesmo tipo" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ categoryId: parsed.data.targetId, updatedAt: new Date() })
      .where(and(eq(transactions.userId, uid), eq(transactions.categoryId, parsed.data.sourceId)));

    // Re-parent direct children of source to target (keeps subcategories)
    await tx
      .update(categories)
      .set({ parentId: parsed.data.targetId, updatedAt: new Date() })
      .where(and(eq(categories.userId, uid), eq(categories.parentId, parsed.data.sourceId)));

    await tx
      .delete(categories)
      .where(and(eq(categories.id, parsed.data.sourceId), eq(categories.userId, uid)));
  });

  revalidate();
  return { ok: true, data: undefined };
}
