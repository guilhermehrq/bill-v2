import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { categoryType } from "./_enums";
import { tenantColumns } from "./_shared";

export const categories = pgTable("categories", {
  ...tenantColumns,
  name: text().notNull(),
  type: categoryType().notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "set null",
  }),
  icon: text(),
  color: text(),
  isSystem: boolean("is_system").default(false).notNull(),
});
