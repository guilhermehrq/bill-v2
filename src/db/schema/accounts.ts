import { bigint, boolean, pgTable, text } from "drizzle-orm/pg-core";
import { accountType } from "./_enums";
import { tenantColumns } from "./_shared";

export const accounts = pgTable("accounts", {
  ...tenantColumns,
  name: text().notNull(),
  type: accountType().notNull(),
  institution: text(),
  color: text(),
  icon: text(),
  initialBalanceCents: bigint("initial_balance_cents", { mode: "number" }).default(0).notNull(),
  currency: text().default("BRL").notNull(),
  archived: boolean().default(false).notNull(),
  includeInTotalBalance: boolean("include_in_total_balance").default(true).notNull(),
});
