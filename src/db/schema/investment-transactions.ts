import { bigint, date, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { investmentTransactionType } from "./_enums";
import { investments } from "./investments";
import { tenantColumns } from "./_shared";

export const investmentTransactions = pgTable("investment_transactions", {
  ...tenantColumns,
  investmentId: uuid("investment_id")
    .notNull()
    .references(() => investments.id, { onDelete: "cascade" }),
  type: investmentTransactionType().notNull(),
  date: date().notNull(),
  quantity: numeric({ precision: 20, scale: 8 }).notNull(),
  priceCents: bigint("price_cents", { mode: "number" }).notNull(),
  feesCents: bigint("fees_cents", { mode: "number" }).default(0).notNull(),
  notes: text(),
});
