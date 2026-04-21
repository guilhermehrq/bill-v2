import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/features/categories/default-categories";

// Populates the signed-in user's categories with the canonical pt-BR set
// on the first run — no-op afterwards. Call from onboarding flows.
export async function seedDefaultCategoriesIfEmpty(userId: string): Promise<number> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);

  if (existing.length > 0) return 0;

  let inserted = 0;

  for (const parent of DEFAULT_CATEGORIES) {
    const [parentRow] = await db
      .insert(categories)
      .values({
        userId,
        name: parent.name,
        type: parent.type,
        icon: parent.icon,
        color: parent.color,
        isSystem: true,
      })
      .returning({ id: categories.id });

    if (!parentRow) continue;
    inserted += 1;

    if (parent.children && parent.children.length > 0) {
      const rows = parent.children.map((child) => ({
        userId,
        name: child.name,
        type: parent.type,
        icon: child.icon,
        color: parent.color,
        parentId: parentRow.id,
        isSystem: true,
      }));
      await db.insert(categories).values(rows);
      inserted += rows.length;
    }
  }

  return inserted;
}

export async function hasAnyCategory(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId)))
    .limit(1);
  return row !== undefined;
}
