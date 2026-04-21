import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { importSourceType, importTargetType } from "./_enums";
import { tenantColumns } from "./_shared";

export const importMappings = pgTable(
  "import_mappings",
  {
    ...tenantColumns,
    source: text().notNull(),
    sourceType: importSourceType("source_type").notNull(),
    sourceValue: text("source_value").notNull(),
    targetType: importTargetType("target_type").notNull(),
    targetId: uuid("target_id"),
  },
  (t) => [
    uniqueIndex("uq_import_mappings_user_source_value").on(
      t.userId,
      t.source,
      t.sourceType,
      t.sourceValue,
    ),
  ],
);
