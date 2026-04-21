import { sql } from "drizzle-orm";
import { bigint, check, date, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { tenantColumns } from "./_shared";

export const budgets = pgTable(
  "budgets",
  {
    ...tenantColumns,
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: date().notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_budgets_user_category_month").on(t.userId, t.categoryId, t.month),
    check("chk_budgets_amount_positive", sql`${t.amountCents} > 0`),
  ],
);
