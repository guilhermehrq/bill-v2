import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { importStatus } from "./_enums";
import { tenantColumns } from "./_shared";

export const imports = pgTable("imports", {
  ...tenantColumns,
  source: text().notNull(),
  filename: text().notNull(),
  rowCount: integer("row_count").default(0).notNull(),
  importedCount: integer("imported_count").default(0).notNull(),
  skippedCount: integer("skipped_count").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  status: importStatus().default("pending").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  logUrl: text("log_url"),
  metadata: jsonb().default({}).notNull(),
});
