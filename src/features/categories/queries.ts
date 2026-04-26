import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";

export type CategoryRow = {
  id: string;
  name: string;
  type: "income" | "expense";
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  archivedAt: Date | null;
  transactionCount: number;
};

export type CategoryNode = CategoryRow & {
  children: CategoryRow[];
};

export async function listCategoriesWithCounts(userId: string): Promise<CategoryNode[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      parentId: categories.parentId,
      icon: categories.icon,
      color: categories.color,
      isSystem: categories.isSystem,
      archivedAt: categories.archivedAt,
      transactionCount: sql<number>`COUNT(${transactions.id})::int`,
    })
    .from(categories)
    .leftJoin(
      transactions,
      and(eq(transactions.categoryId, categories.id), eq(transactions.userId, categories.userId)),
    )
    .where(eq(categories.userId, userId))
    .groupBy(categories.id)
    .orderBy(categories.type, categories.name);

  const byId = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const r of rows) {
    byId.set(r.id, { ...r, transactionCount: Number(r.transactionCount), children: [] });
  }

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
